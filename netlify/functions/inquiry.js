const clip = (value, maxLength) => String(value ?? "").trim().slice(0, maxLength);

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body)
});

exports.handler = async event => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let data;
  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString("utf8")
      : event.body || "{}";
    data = JSON.parse(rawBody);
  } catch {
    return json(400, { error: "Invalid JSON request body." });
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return json(400, { error: "Invalid request body." });
  }
  if (data.website) return json(200, { ok: true });

  const isApplication = data.type === "application";
  const webhookUrl = isApplication
    ? process.env.DISCORD_WEBHOOK_CAREERS || process.env.DISCORD_WEBHOOK_CONTACT
    : process.env.DISCORD_WEBHOOK_CONTACT;
  if (!webhookUrl) return json(500, { error: "Webhook not configured." });

  const name = clip(data.name, 80);
  const message = clip(data.message, isApplication ? 1500 : 1800);
  if (!name || !message) return json(400, { error: "Please fill in your name and message." });

  const field = (label, value, inline = true) =>
    value ? { name: label, value: clip(value, 1000), inline } : null;
  const fields = (isApplication ? [
    field("👤 Name", name),
    field("💬 Discord", data.discord),
    field("📧 Email", data.email),
    field("🎯 Role", data.role),
    field("🔗 Portfolio", data.portfolio, false)
  ] : [
    field("👤 Name", name),
    field("💬 Discord", data.discord),
    field("📧 Email", data.email),
    field("📌 Topic", data.topic)
  ]).filter(Boolean);

  const payload = {
    username: "Ryft Website",
    allowed_mentions: { parse: [] },
    embeds: [{
      title: isApplication ? "📝 New Application" : "📩 New Inquiry",
      description: `**Message**\n${message}`,
      color: isApplication ? 0x22d3ee : 0x8b5cf6,
      fields,
      footer: { text: "Ryft Entertainment • website form" },
      timestamp: new Date().toISOString()
    }]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.error(`Discord webhook returned HTTP ${response.status}`);
      return json(502, { error: "Couldn't deliver your message. Please try Discord instead." });
    }
    return json(200, { ok: true });
  } catch (error) {
    console.error("Discord webhook delivery failed:", error);
    return json(502, { error: "Couldn't deliver your message. Please try Discord instead." });
  }
};
