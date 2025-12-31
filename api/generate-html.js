import fs from "fs";
import path from "path";

// --- helpers ---
function safeFilename(s = "campaign") {
  return s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// supports **bold**, - bullets, and new lines → safe HTML (same logic you used before)
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = req.body || {};

    const templateType = (payload.templateType || "CASINO")
      .toString()
      .toUpperCase();
    const subject = payload.subject || "";
    const preheader = payload.preheader || "";

    const imageUrl = payload.image_url || payload.imageLink || "";
    if (!imageUrl) {
      return res
        .status(400)
        .json({ error: "image_url is required (upload or paste Image URL)" });
    }
    console.log("IMAGE URL USED:", imageUrl);

    // Load template file from /api/templates/template_base.html
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

    // Replace placeholders used in your big template
    html = replaceAllSafe(html, "Titolo", escapeHtml(subject)); // optional if template uses it
    html = replaceAllSafe(html, "Preheader", escapeHtml(preheader)); // hidden preheader block
    html = replaceAllSafe(html, "Descrizione", descrizioneHtml);
    html = replaceAllSafe(
      html,
      "Testo_CTA",
      escapeHtml(payload.cta_text || "")
    );
    html = replaceAllSafe(html, "Link_CTA", escapeHtml(payload.cta_link || ""));
    html = replaceAllSafe(html, "Immagine_URL", escapeHtml(imageUrl));
    const imageClickLink = (
      payload.image_click_link ||
      payload.imageClickLink ||
      ""
    )
      .toString()
      .trim();

    html = replaceAllSafe(
      html,
      "Link_img_header",
      escapeHtml(imageClickLink || payload.cta_link || "")
    );
    html = replaceAllSafe(html, "T_C", tcHtml);

    // Optional: if you want to show template type somewhere in HTML for debugging
    html = replaceAllSafe(html, "TemplateType", escapeHtml(templateType));

    // Download headers
    const stamp = new Date().toISOString().slice(0, 10);
    const name = safeFilename(subject || templateType);
    const filename = `${templateType}_${stamp}_${name}.html`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    return res.status(200).send(html);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
