# Ryft Entertainment website

## Add your files (assets/img/)
- ryft.png  → top-right logo (falls back to "RYFT" text until added)
- icon.png  → favicon + career card icon

## Deploy (Vercel – free)
1. Push this folder to GitHub → import in vercel.com (or `npx vercel` in this folder).
2. Project → Settings → Environment Variables:
   - DISCORD_BOT_TOKEN        (bot token; used to read team profiles)
   - DISCORD_WEBHOOK_CONTACT  (webhook URL for contact inquiries)
   - DISCORD_WEBHOOK_CAREERS  (webhook URL for applications — optional, falls back to contact)
3. Redeploy.

## Deploy (Netlify)
1. Import this repository in Netlify with the repository root as the base directory.
2. Leave the build command empty and use `.` as the publish directory. `netlify.toml` configures the functions directory and `/api/*` routes.
3. Add these environment variables in Site configuration → Environment variables:
   - `DISCORD_BOT_TOKEN` (bot token; used to read team profiles)
   - `DISCORD_WEBHOOK_CONTACT` (webhook URL for contact inquiries)
   - `DISCORD_WEBHOOK_CAREERS` (optional; applications fall back to the contact webhook)
4. Deploy or trigger a new deploy after setting the variables.

## Edit things
- assets/js/config.js → nav links, Discord invite, stats, team Discord IDs
- careers.html → copy the ROLE CARD TEMPLATE for each role
