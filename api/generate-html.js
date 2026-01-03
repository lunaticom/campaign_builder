// /api/generate-html.js
import fs from "fs";
import path from "path";

// --- helpers ---
function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// supports **bold**, - bullets, and new lines → safe HTML
function formatTextToSafeHtml(input = "") {
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

function replaceAllSafe(template, key, value) {
  const re = new RegExp(`{{\\s*${key}\\s*}}`, "g");
  return template.replace(re, value ?? "");
}

// Your agreed naming rules:
// - Only use what the user typed (no extra stuff added)
// - Convert spaces -> underscores
// - Strip weird chars
function safeUserFilename(input = "") {
  return input
    .toString()
    .trim()
    .replace(/\s+/g, "_") // spaces → underscores
    .replace(/[^a-zA-Z0-9_-]/g, "") // remove weird chars
    .replace(/_+/g, "_") // collapse ___
    .replace(/^_+|_+$/g, "") // trim underscores
    .slice(0, 60);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = req.body || {};

    const templateType = (payload.templateType || "CASINO")
      .toString()
      .toUpperCase();

    const subject = (payload.subject || "").toString();
    const preheader = (payload.preheader || "").toString();

    const imageUrl = (payload.image_url || payload.imageLink || "")
      .toString()
      .trim();

    if (!imageUrl) {
      return res.status(400).json({
        error: "image_url is required (upload image first)",
      });
    }

    // Load template file from /api/templates/{templateKey}.html
    const templateKey = (payload.templateType || "CASINO")
      .toString()
      .trim()
      .toLowerCase();

    const templatePath = path.join(
      process.cwd(),
      "api",
      "templates",
      `${templateKey}.html`
    );

    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({
        error: `Template file not found: api/templates/${templateKey}.html`,
      });
    }

    let html = fs.readFileSync(templatePath, "utf8");

    // Build dynamic values
    const descrizioneHtml = formatTextToSafeHtml(payload.body || "");
    const tcHtml = formatTextToSafeHtml(payload.terms || "");

    // Click link (separate from img src)
    const imageClickLink = (
      payload.image_click_link ||
      payload.imageClickLink ||
      ""
    )
      .toString()
      .trim();

    // Replace placeholders
    html = replaceAllSafe(html, "Titolo", escapeHtml(subject));
    html = replaceAllSafe(html, "Preheader", escapeHtml(preheader));
    html = replaceAllSafe(html, "Descrizione", descrizioneHtml);
    html = replaceAllSafe(
      html,
      "Testo_CTA",
      escapeHtml(payload.cta_text || "")
    );
    html = replaceAllSafe(html, "Link_CTA", escapeHtml(payload.cta_link || ""));
    html = replaceAllSafe(html, "Immagine_URL", escapeHtml(imageUrl));
    html = replaceAllSafe(
      html,
      "Link_img_header",
      escapeHtml(imageClickLink || payload.cta_link || "")
    );
    html = replaceAllSafe(html, "T_C", tcHtml);
    html = replaceAllSafe(html, "TemplateType", escapeHtml(templateType));

    // Filename (server side): support your CURRENT frontend key "imageName"
    // but also accept fileName/file_name if you add it later.
    const stamp = new Date().toISOString().slice(0, 10);

    const rawName = (
      payload.file_name ||
      payload.fileName ||
      payload.imageName || // ✅ matches your App.jsx
      ""
    )
      .toString()
      .trim();

    const filename = rawName
      ? `${safeUserFilename(rawName)}.html`
      : `${templateType}_${stamp}.html`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    return res.status(200).send(html);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
