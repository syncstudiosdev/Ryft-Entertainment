const CDN = "https://cdn.discordapp.com";

const json = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  body: JSON.stringify(body)
});

exports.handler = async event => {
  const id = String(event.queryStringParameters?.id || "");
  if (!/^\d{15,22}$/.test(id)) return json(400, { error: "bad id" });
  if (!process.env.DISCORD_BOT_TOKEN) {
    return json(503, { error: "Discord profile API is not configured (missing DISCORD_BOT_TOKEN)" });
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/users/${id}`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
    });
    if (!response.ok) {
      return json(response.status, { error: `Discord API request failed (HTTP ${response.status})` });
    }

    const user = await response.json();
    const avatar = user.avatar
      ? `${CDN}/avatars/${id}/${user.avatar}.${user.avatar.startsWith("a_") ? "gif" : "png"}?size=256`
      : `${CDN}/embed/avatars/${Number((BigInt(id) >> 22n) % 6n)}.png`;
    const nameplate = user.collectibles && user.collectibles.nameplate;

    return json(200, {
      id,
      username: user.username,
      displayName: user.global_name || user.username,
      avatar,
      decoration: user.avatar_decoration_data
        ? `${CDN}/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=240&passthrough=true`
        : null,
      nameplate: nameplate ? {
        palette: nameplate.palette,
        label: nameplate.label,
        video: `${CDN}/assets/collectibles/${nameplate.asset}asset.webm`,
        image: `${CDN}/assets/collectibles/${nameplate.asset}static.png`
      } : null
    }, { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" });
  } catch (error) {
    console.error("Discord profile lookup failed:", error);
    return json(500, { error: "Discord profile lookup failed unexpectedly" });
  }
};
