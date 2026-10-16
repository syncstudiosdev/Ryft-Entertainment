// GET /api/discord-user?id=123  → public profile bits for the Team page.
// Needs env var DISCORD_BOT_TOKEN (any bot token; the bot needs no special permissions).
const CDN = "https://cdn.discordapp.com";
module.exports = async (req, res) => {
  const id = String(req.query.id || "");
  if (!/^\d{15,22}$/.test(id)) return res.status(400).json({ error: "bad id" });
  try {
    const r = await fetch(`https://discord.com/api/v10/users/${id}`, { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } });
    if (!r.ok) return res.status(r.status).json({ error: "discord " + r.status });
    const u = await r.json();
    const avatar = u.avatar
      ? `${CDN}/avatars/${id}/${u.avatar}.${u.avatar.startsWith("a_") ? "gif" : "png"}?size=256`
      : `${CDN}/embed/avatars/${Number((BigInt(id) >> 22n) % 6n)}.png`;
    const np = u.collectibles && u.collectibles.nameplate;
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600"); // refreshes ~every 5 min
    res.json({
      id,
      username: u.username,
      displayName: u.global_name || u.username,
      avatar,
      decoration: u.avatar_decoration_data ? `${CDN}/avatar-decoration-presets/${u.avatar_decoration_data.asset}.png?size=240&passthrough=true` : null,
      nameplate: np ? { palette: np.palette, label: np.label, video: `${CDN}/assets/collectibles/${np.asset}asset.webm`, image: `${CDN}/assets/collectibles/${np.asset}static.png` } : null
    });
  } catch (e) { res.status(500).json({ error: "failed" }); }
};
