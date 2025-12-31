import React, { useState } from "react";

const INITIAL = {
  subject: "",
  preheader: "",
  templateType: "CASINO",
  body: "",
  cta_text: "",
  cta_link: "",
  terms: "",
  imageLink: "",
};

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTextToPreviewHtml(input = "") {
  const escaped = escapeHtml(input);
  const lines = escaped.split(/\r\n|\n|\r/);

  let html = "";
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("- ")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }

      const content = trimmed
        .slice(2)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

      html += `<li>${content}</li>`;
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }

      if (trimmed === "") {
        html += "<br>";
      } else {
        const withBold = trimmed.replace(
          /\*\*(.+?)\*\*/g,
          "<strong>$1</strong>"
        );
        html += `${withBold}<br>`;
      }
    }
  }

  if (inList) html += "</ul>";
  return html;
}

export default function App() {
  const [form, setForm] = useState(INITIAL);
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result; // data:image/png;base64,....
        const base64 = String(result).split(",")[1] || "";
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const downloadBlob = async (response) => {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ""; // filename comes from server headers
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let finalImageUrl = (form.imageLink || "").trim();

      // 1) Upload image if user selected a file
      if (!finalImageUrl && imageFile) {
        const base64 = await fileToBase64(imageFile);

        const uploadRes = await fetch("/api/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, name: imageFile.name }),
        });

        const uploadJson = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          console.error("upload-image error:", uploadJson);
          throw new Error(uploadJson?.error || "Image upload failed");
        }

        finalImageUrl = uploadJson?.url;
        if (!finalImageUrl) throw new Error("No image URL returned from ImgBB");
      }

      if (!finalImageUrl) {
        throw new Error("Please upload an image OR paste an image URL.");
      }

      // 2) Generate downloadable HTML
      const generateRes = await fetch("/api/generate-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          image_url: finalImageUrl,
          submitted_at: new Date().toISOString(),
        }),
      });

      if (!generateRes.ok) {
        const err = await generateRes.json().catch(() => ({}));
        console.error("generate-html error:", err);
        throw new Error(err?.error || "HTML generation failed");
      }

      // 3) Download
      await downloadBlob(generateRes);

      // Optional reset after success
      setForm(INITIAL);
      setImageFile(null);
      alert("✅ HTML generated and downloaded!");
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.message || "Something went wrong"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="mx-auto" style={{ maxWidth: 900 }}>
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h1 className="h4 mb-2">Campaign Builder</h1>
            <p className="text-secondary mb-4">
              Formatting tips: use <b>**bold**</b>, use <b>-</b> for bullets,
              and press Enter for new lines.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label">Subject *</label>
                  <input
                    className="form-control"
                    name="subject"
                    value={form.subject}
                    onChange={onChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Preheader</label>
                  <input
                    className="form-control"
                    name="preheader"
                    value={form.preheader}
                    onChange={onChange}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Template Type</label>
                  <select
                    className="form-select"
                    name="templateType"
                    value={form.templateType}
                    onChange={onChange}
                  >
                    <option value="CASINO">CASINO</option>
                    <option value="SPORT">SPORT</option>
                    <option value="BINGO">BINGO</option>
                    <option value="VIRTUAL">VIRTUAL</option>
                    <option value="LOTTERY">LOTTERY</option>
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label">Body *</label>
                  <textarea
                    className="form-control"
                    name="body"
                    rows={6}
                    value={form.body}
                    onChange={onChange}
                    required
                    placeholder={`Example:\nHello!\n- First benefit\n- Second benefit\n\n**Important:** Terms apply`}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Live Preview</label>
                  <div
                    className="border rounded p-3 bg-white"
                    style={{ minHeight: 120 }}
                    dangerouslySetInnerHTML={{
                      __html: formatTextToPreviewHtml(form.body),
                    }}
                  />
                  <div className="form-text">
                    Preview supports <b>**bold**</b>, <b>- bullets</b>, and new
                    lines.
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label">CTA Text</label>
                  <input
                    className="form-control"
                    name="cta_text"
                    value={form.cta_text}
                    onChange={onChange}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">CTA Link</label>
                  <input
                    className="form-control"
                    type="url"
                    name="cta_link"
                    value={form.cta_link}
                    onChange={onChange}
                    placeholder="https://..."
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Terms & Conditions</label>
                  <textarea
                    className="form-control"
                    name="terms"
                    rows={4}
                    value={form.terms}
                    onChange={onChange}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Upload Image</label>
                  <input
                    className="form-control"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  />
                  <div className="form-text">
                    Upload a file OR paste a public URL on the right.
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Image URL (optional)</label>
                  <input
                    className="form-control"
                    type="url"
                    name="imageLink"
                    value={form.imageLink}
                    onChange={onChange}
                    placeholder="https://..."
                  />
                </div>

                <div className="col-12 d-flex gap-2 mt-2">
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? "Generating..." : "Generate & Download HTML"}
                  </button>

                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => {
                      setForm(INITIAL);
                      setImageFile(null);
                    }}
                    disabled={submitting}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="alert alert-info mt-3">
          This version uses <code>/api/upload-image</code> (ImgBB) +{" "}
          <code>/api/generate-html</code> (download).
        </div>
      </div>
    </div>
  );
}
