export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imageBase64, name } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 required" });
    }

    const key = process.env.IMGBB_API_KEY;
    if (!key) {
      return res.status(500).json({ error: "IMGBB_API_KEY missing" });
    }

    const params = new URLSearchParams();
    params.append("key", key);
    params.append("image", imageBase64);
    if (name) params.append("name", name);

    const r = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const j = await r.json();

    if (!r.ok || !j?.data?.url) {
      return res.status(502).json({ error: "ImgBB upload failed", details: j });
    }

    return res.status(200).json({
      url: j.data.url,
      display_url: j.data.display_url,
      delete_url: j.data.delete_url,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
