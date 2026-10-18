// POST /api/inquiry → formats the form as a Discord embed and posts it to a webhook.
// Env vars: DISCORD_WEBHOOK_CONTACT (contact form), DISCORD_WEBHOOK_CAREERS (applications; falls back to contact).
const clip = (s, n) => String(s ?? "").trim().slice(0, n);
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  if (b.website) return res.status(200).json({ ok: true }); // honeypot (bots)
  const isApp = b.type === "application";
  const url = isApp ? (process.env.DISCORD_WEBHOOK_CAREERS || process.env.DISCORD_WEBHOOK_CONTACT) : process.env.DISCORD_WEBHOOK_CONTACT;
  if (!url) return res.status(500).json({ error: "Webhook not configured." });
  const name = clip(b.name, 80), message = clip(b.message, isApp ? 1500 : 1800);
  if (!name || !message) return res.status(400).json({ error: "Please fill in your name and message." });

  const f = (n, v, inline = true) => v ? { name: n, value: clip(v, 1000), inline } : null;
  const fields = (isApp ? [
    f("👤 Name", name), f("💬 Discord", b.discord), f("📧 Email", b.email), f("🎯 Role", b.role),
    f("🔗 Portfolio", b.portfolio, false)
  ] : [
    f("👤 Name", name), f("💬 Discord", b.discord), f("📧 Email", b.email), f("📌 Topic", b.topic)
  ]).filter(Boolean);

  const body = {
    username: "Ryft Website",
    allowed_mentions: { parse: [] }, // never ping anyone from user input
    embeds: [{
      title: isApp ? "📝 New Application" : "📩 New Inquiry",
      description: "**Message**\n" + message,
      color: isApp ? 0x22d3ee : 0x8b5cf6,
      fields,
      footer: { text: "Ryft Entertainment • website form" },
      timestamp: new Date().toISOString()
    }]
  };
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error();
    res.json({ ok: true });
  } catch { res.status(502).json({ error: "Couldn't deliver your message. Please try Discord instead." }); }
};
