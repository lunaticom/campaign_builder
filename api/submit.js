function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Supports **bold**, - bullets, and new lines → safe email HTML
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const hook = process.env.ZAPIER_HOOK_URL;
    if (!hook) {
      return res.status(500).json({ error: "ZAPIER_HOOK_URL missing" });
    }

    const payload = req.body || {};

    // Build final output (keep both text + html)
    const out = {
      subject: payload.subject || "",
      preheader: payload.preheader || "",
      templateType: payload.templateType || "",
      body_text: payload.body || "",
      body_html: formatTextToSafeHtml(payload.body || ""),
      cta_text: payload.cta_text || "",
      cta_link: payload.cta_link || "",
      terms_text: payload.terms || "",
      terms_html: formatTextToSafeHtml(payload.terms || ""),
      image_url: payload.image_url || payload.imageLink || "",
      submitted_at: payload.submitted_at || new Date().toISOString(),
      source: "react-form",
      user: payload.user || "", // optional if you add it later
    };

    if (!out.image_url) {
      return res.status(400).json({ error: "image_url is required" });
    }

    const r = await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(out),
    });

    if (!r.ok) {
      const text = await r.text();
      return res
        .status(502)
        .json({ error: "Zapier hook failed", details: text });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
