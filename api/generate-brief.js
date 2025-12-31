// /api/generate-brief.js
function safeFilename(s = "campaign") {
  return s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

// Convert your body/terms into readable plain text (no HTML)
function toPlainText(input = "") {
  return input
    .toString()
    .replace(/\*\*(.+?)\*\*/g, "$1") // remove **bold**
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const payload = req.body || {};

    const templateType = (payload.templateType || "CASINO")
      .toString()
      .toUpperCase();
    const subject = (payload.subject || "").toString().trim();
    const preheader = (payload.preheader || "").toString().trim();
    const body = toPlainText(payload.body || "");
    const ctaText = (payload.cta_text || "").toString().trim();
    const ctaLink = (payload.cta_link || "").toString().trim();
    const terms = toPlainText(payload.terms || "");
    const imageUrl = (payload.image_url || payload.imageLink || "")
      .toString()
      .trim();
    const imageClickLink = (
      payload.image_click_link ||
      payload.imageClickLink ||
      ""
    )
      .toString()
      .trim();
    const stamp = new Date().toISOString().slice(0, 10);
    const name = safeFilename(subject || templateType);
    const filename = `${templateType}_${stamp}_${name}_brief.txt`;

    const text = `CAMPAIGN BRIEF
-------------
Template:  ${templateType}
Date:      ${stamp}

Subject:   ${subject}
Preheader: ${preheader}

Body:
${body}

CTA:
- Text: ${ctaText}
- Link: ${ctaLink}

Image URL:
${imageUrl}

Src (uploaded): ${imageUrl}
Click link:     ${imageClickLink}

Terms & Conditions:
${terms}
`;

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(text);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
