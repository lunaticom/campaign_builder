// src/App.jsx
import React, { useState } from "react";

const INITIAL = {
  subject: "",
  preheader: "",
  templateType: "CASINO",
  body: "",
  cta_text: "",
  cta_link: "",
  terms: "",
  imageClickLink: "",
  fileName: "", // ✅ controls download file names (HTML + brief)
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
  let lastWasBreak = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("- ")) {
      if (!inList) {
        // If we were adding breaks, stop doubling before starting a list
        lastWasBreak = false;
        html += "<ul>";
        inList = true;
      }

      const content = trimmed
        .slice(2)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

      html += `<li>${content}</li>`;
      continue;
    }

    // close list if needed
    if (inList) {
      html += "</ul>";
      inList = false;
      lastWasBreak = false;
    }

    // blank line → single <br> max
    if (trimmed === "") {
      if (!lastWasBreak) {
        html += "<br>";
        lastWasBreak = true;
      }
      continue;
    }

    // normal line
    const withBold = trimmed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html += `${withBold}<br>`;
    lastWasBreak = true;
  }

  if (inList) html += "</ul>";
  return html;
}

// Filename helper (client-side)
// - spaces -> underscores
// - removes weird chars
function safeUserFilename(input = "") {
  return input
    .toString()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function getStamp() {
  return new Date().toISOString().slice(0, 10);
}

export default function App() {
  const [form, setForm] = useState(INITIAL);
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

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

  const downloadBlob = async (response, forcedFilename) => {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = forcedFilename || "";
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      setStatus({
        type: "info",
        message: "Uploading image and generating files...",
      });

      // Require image file
      if (!imageFile) {
        throw new Error("Please upload an image file (required).");
      }

      // Require click link (you said you need both)
      if (!(form.imageClickLink || "").trim()) {
        throw new Error("Please add the Image click link (required).");
      }

      // 1) Upload to ImgBB -> URL for <img src>
      const base64 = await fileToBase64(imageFile);

      const uploadRes = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          name: imageFile.name, // optional, just for ImgBB metadata
        }),
      });

      const uploadJson = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploadJson?.url) {
        console.error("upload-image error:", uploadJson);
        throw new Error(uploadJson?.error || "Image upload failed");
      }

      const uploadedImageUrl = uploadJson.url;

      // ✅ Build the download filenames (single source of truth = fileName field)
      const stamp = getStamp();
      const t = (form.templateType || "CASINO").toString().toUpperCase();
      const clean = safeUserFilename(form.fileName || "");

      const htmlFilename = clean ? `${clean}.html` : `${t}_${stamp}.html`;
      const briefFilename = clean
        ? `${clean}_brief.txt`
        : `${t}_${stamp}_brief.txt`;

      // 2) Payload (send file_name to backend so headers match too)
      const payload = {
        ...form,
        file_name: form.fileName, // backend reads file_name / fileName
        image_url: uploadedImageUrl,
        image_click_link: (form.imageClickLink || "").trim(),
        submitted_at: new Date().toISOString(),
      };

      // 3) Download HTML
      const generateRes = await fetch("/api/generate-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!generateRes.ok) {
        const err = await generateRes.json().catch(() => ({}));
        console.error("generate-html error:", err);
        throw new Error(err?.error || "HTML generation failed");
      }

      await downloadBlob(generateRes, htmlFilename);

      // 4) Download brief
      const briefRes = await fetch("/api/generate-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!briefRes.ok) {
        const err = await briefRes.json().catch(() => ({}));
        console.error("generate-brief error:", err);
        throw new Error(err?.error || "Brief generation failed");
      }

      await downloadBlob(briefRes, briefFilename);

      // 5) Reset
      setForm(INITIAL);
      setImageFile(null);
      setStatus({ type: "success", message: "Downloaded: HTML + brief" });
    } catch (err) {
      console.error(err);
      setStatus({
        type: "danger",
        message: err?.message || "Something went wrong",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-4 py-md-5">
      <div className="mx-auto" style={{ maxWidth: 900 }}>
        <div className="card shadow-sm">
          <div className="card-body p-3 p-md-4">
            <h1 className="h4 mb-2">Campaign Builder</h1>
            <p className="text-secondary mb-3">
              Formatting tips: use <b>**bold**</b>, use <b>-</b> for bullets,
              and press Enter for new lines.
            </p>

            {status.message && (
              <div
                className={`alert alert-${status.type || "info"} mb-4`}
                role="alert"
              >
                {status.message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* SECTION 1: Campaign details */}
              <div className="border rounded p-3 mb-3">
                <h2 className="h6 mb-2">Campaign details</h2>

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

                  <div className="col-12 col-md-6">
                    <label className="form-label">Preheader</label>
                    <input
                      className="form-control"
                      name="preheader"
                      value={form.preheader}
                      onChange={onChange}
                    />
                  </div>

                  <div className="col-12 col-md-6">
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

                  {/* ✅ File name (optional) */}
                  <div className="col-12">
                    <label className="form-label">File name (optional)</label>
                    <input
                      className="form-control"
                      name="fileName"
                      value={form.fileName}
                      onChange={onChange}
                      placeholder="welcome bonus"
                    />
                    <div className="form-text">
                      If empty: uses <code>TEMPLATE_YYYY-MM-DD</code>. Spaces
                      become underscores.
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Header image */}
              <div className="border rounded p-3 mb-3">
                <h2 className="h6 mb-2">Header image</h2>

                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Upload Image *</label>
                    <input
                      className="form-control"
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setImageFile(e.target.files?.[0] || null)
                      }
                    />
                    <div className="form-text">
                      Required: becomes the &lt;img src&gt;.
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Image click link *</label>
                    <input
                      className="form-control"
                      type="url"
                      name="imageClickLink"
                      value={form.imageClickLink}
                      onChange={onChange}
                      placeholder="https://..."
                      required
                    />
                    <div className="form-text">
                      Required: becomes the &lt;a href&gt; around the image.
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Content */}
              <div className="border rounded p-3 mb-3">
                <h2 className="h6 mb-2">Content</h2>

                <div className="row g-3">
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
                      style={{ minHeight: 120, overflowWrap: "anywhere" }}
                      dangerouslySetInnerHTML={{
                        __html: formatTextToPreviewHtml(form.body),
                      }}
                    />
                    <div className="form-text">
                      Preview supports <b>**bold**</b>, <b>- bullets</b>, and
                      new lines.
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: CTA */}
              <div className="border rounded p-3 mb-3">
                <h2 className="h6 mb-2">CTA</h2>

                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">CTA Text</label>
                    <input
                      className="form-control"
                      name="cta_text"
                      value={form.cta_text}
                      onChange={onChange}
                    />
                  </div>

                  <div className="col-12 col-md-6">
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
                </div>
              </div>

              {/* SECTION 5: Terms */}
              <div className="border rounded p-3 mb-3">
                <h2 className="h6 mb-2">Terms</h2>

                <div className="row g-3">
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
                </div>
              </div>

              {/* ACTIONS */}
              <div className="d-flex gap-2 flex-wrap mt-2">
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting
                    ? "Generating..."
                    : "Generate & Download (2 files)"}
                </button>

                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => {
                    setForm(INITIAL);
                    setImageFile(null);
                    setStatus({ type: "", message: "" });
                  }}
                  disabled={submitting}
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="alert alert-info mt-3 mb-0">
          Downloads: <code>email.html</code> + <code>brief.txt</code>
        </div>
      </div>
    </div>
  );
}
