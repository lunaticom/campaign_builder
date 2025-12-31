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

    // Bullet line: "- something"
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
      // Close list if we were in one
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

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
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

            <form
              onSubmit={(e) => {
                e.preventDefault();
                f;
                console.log("FORM DATA:", form);
                console.log("IMAGE FILE:", imageFile);
                alert("Form is working. Next step: connect APIs.");
              }}
            >
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
                  <button className="btn btn-primary" type="submit">
                    Submit (test)
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => {
                      setForm(INITIAL);
                      setImageFile(null);
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="alert alert-info mt-3">
          Next: we’ll connect this submit button to{" "}
          <code>/api/upload-image</code> (ImgBB) and <code>/api/submit</code>{" "}
          (Zapier).
        </div>
      </div>
    </div>
  );
}
