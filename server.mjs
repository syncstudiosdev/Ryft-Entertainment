import http from "node:http";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { createReadStream, existsSync } from "node:fs";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { positions } from "./src/data/careers.mjs";
import { projects } from "./src/data/projects.mjs";
import { site } from "./src/data/site.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
try {
  const envContent = await readFile(path.join(root, ".env"), "utf8");
  for (const [index, line] of envContent.split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) throw new Error(`Invalid .env syntax on line ${index + 1}.`);
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else if (value.startsWith('"') || value.startsWith("'")) {
      throw new Error(`Unclosed .env value on line ${index + 1}.`);
    }
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};
const limits = new Map();
const seenRequests = new Map();
const inFlightRequests = new Set();
const RATE_LIMIT = 5;
const RATE_WINDOW = 15 * 60 * 1000;
const MAX_BODY = 16 * 1024;
const IDEMPOTENCY_TTL = 5 * 60 * 1000;

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
}

function plainText(response, status, message) {
  response.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(message);
}

function sanitize(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/@(?=everyone|here|[!&]?\d)/gi, "@\u200b")
    .trim();
}

function textField(body, key, maxLength, errors, label = key) {
  if (body[key] === undefined || body[key] === null) return "";
  if (typeof body[key] !== "string") {
    errors.push(`Enter a valid ${label}.`);
    return "";
  }
  const value = sanitize(body[key]);
  if (value.length > maxLength) errors.push(`${label} must be no longer than ${maxLength} characters.`);
  return value.slice(0, maxLength);
}

function isValidOptionalUrl(value) {
  if (!value) return true;
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function validateContact(body) {
  const errors = [];
  const data = {
    name: textField(body, "name", 100, errors, "name"),
    email: textField(body, "email", 254, errors, "email address"),
    discord: textField(body, "discord", 100, errors, "Discord username"),
    category: textField(body, "category", 30, errors, "enquiry category"),
    subject: textField(body, "subject", 160, errors, "subject"),
    message: textField(body, "message", 3500, errors, "message"),
    links: textField(body, "links", 500, errors, "links")
  };
  if (data.name.length < 1) errors.push("Enter your name.");
  if (!data.email && !data.discord) errors.push("Enter either an email address or Discord username.");
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push("Enter a valid email address.");
  if (!["General", "Game-related", "Partnership", "Business"].includes(data.category)) errors.push("Choose a valid enquiry category.");
  if (!data.subject) errors.push("Enter a subject.");
  if (data.message.length < 1) errors.push("Enter a message.");
  if (data.links && data.links.split(/\s+/).some((link) => !isValidOptionalUrl(link))) errors.push("Links must use http or https URLs.");
  return { data, errors };
}

function validateCareer(body) {
  const errors = [];
  const data = {
    name: textField(body, "name", 100, errors, "name"),
    discord: textField(body, "discord", 100, errors, "Discord username"),
    position: textField(body, "position", 160, errors, "position"),
    experience: textField(body, "experience", 1400, errors, "experience"),
    motivation: textField(body, "motivation", 1400, errors, "motivation"),
    portfolioLinks: textField(body, "portfolioLinks", 500, errors, "portfolio links"),
    roblox: textField(body, "roblox", 300, errors, "Roblox profile"),
    github: textField(body, "github", 300, errors, "GitHub profile"),
    youtube: textField(body, "youtube", 300, errors, "YouTube profile"),
    additional: textField(body, "additional", 800, errors, "additional information"),
    privacy: body.privacy === true
  };
  if (!openPositions().some((position) => position.title === data.position)) errors.push("Choose a currently open position.");
  if (!data.name) errors.push("Enter your name or preferred display name.");
  if (!data.discord) errors.push("Enter a Discord username or profile link.");
  if (!data.experience) errors.push("Tell us about your relevant experience.");
  if (!data.motivation) errors.push("Tell us why you are applying.");
  if (!data.privacy) errors.push("Please acknowledge how your application information will be used.");
  for (const key of ["roblox", "github", "youtube"]) {
    if (!isValidOptionalUrl(data[key])) errors.push(`${key} must be an http or https URL.`);
  }
  if (data.portfolioLinks && data.portfolioLinks.split(/\s+/).some((link) => !isValidOptionalUrl(link))) errors.push("Portfolio links must use http or https URLs.");
  return { data, errors };
}

async function readJson(request) {
  if (!request.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
    throw Object.assign(new Error("Content-Type must be application/json."), { status: 415 });
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error("The submitted form is too large."), { status: 413 });
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body;
  } catch {
    throw Object.assign(new Error("The submitted form is not valid JSON."), { status: 400 });
  }
}

function requestIp(request) {
  if (process.env.TRUST_PROXY === "true") {
    const forwarded = request.headers["x-real-ip"] || request.headers["x-forwarded-for"];
    const candidate = typeof forwarded === "string" ? forwarded.split(",").at(-1).trim() : "";
    if (isIP(candidate)) return candidate;
  }
  return request.socket.remoteAddress || "unknown";
}

function allowRequest(request) {
  const now = Date.now();
  for (const [key, entry] of limits) if (entry.reset <= now) limits.delete(key);
  while (limits.size >= 10000) limits.delete(limits.keys().next().value);
  const key = requestIp(request);
  const entry = limits.get(key);
  if (!entry || entry.reset <= now) {
    limits.set(key, { count: 1, reset: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

function configuredWebhook(kind) {
  const name = kind === "careers" ? "CAREERS_DISCORD_WEBHOOK_URL" : "CONTACT_DISCORD_WEBHOOK_URL";
  const value = process.env[name];
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "discord.com" || !/^\/api\/webhooks\/\d+\/[^/]+$/.test(url.pathname)) return "";
    return url.href;
  } catch {
    return "";
  }
}

function webhookMessage(kind, data) {
  const fields = kind === "contact"
    ? [["Name", data.name], ["Email", data.email || "Not provided"], ["Discord", data.discord || "Not provided"], ["Category", data.category], ["Subject", data.subject], ["Message", data.message], ["Links", data.links || "None"]]
    : [["Name", data.name], ["Discord", data.discord], ["Position", data.position], ["Experience", data.experience], ["Motivation", data.motivation], ["Portfolio", data.portfolioLinks || "None"], ["Roblox", data.roblox || "None"], ["GitHub", data.github || "None"], ["YouTube", data.youtube || "None"], ["Additional information", data.additional || "None"]];
  return {
    allowed_mentions: { parse: [] },
    embeds: [{
      title: kind === "contact" ? "New Ryft contact enquiry" : "New Ryft career application",
      color: 0xb59ac8,
      fields: fields.flatMap(([name, value]) => {
        const content = value || "Not provided";
        const parts = content.match(/[\s\S]{1,1024}/g) || ["Not provided"];
        return parts.map((part, index) => ({
          name: index === 0 ? name : `${name} (continued)`,
          value: part,
          inline: false
        }));
      })
    }]
  };
}

async function deliverWebhook(kind, data) {
  const webhook = configuredWebhook(kind);
  if (!webhook) return { ok: false, status: 503, message: `${kind === "contact" ? "Contact" : "Careers"} submissions are not configured yet. Please try again later.` };
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookMessage(kind, data)),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return { ok: false, status: 502, message: "We couldn’t deliver your message. Please try again later." };
    return { ok: true };
  } catch (error) {
    console.error(`Discord ${kind} webhook delivery failed:`, error.message);
    return { ok: false, status: 502, message: "We couldn’t deliver your message. Please try again later." };
  }
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

function idempotencyKey(request) {
  const value = request.headers["idempotency-key"];
  return typeof value === "string" && /^[\w-]{1,100}$/.test(value) ? `${requestIp(request)}:${value}` : "";
}

async function handleSubmission(request, response, kind) {
  if (!sameOrigin(request)) return sendJson(response, 403, { error: "The request origin could not be verified." });
  if (!allowRequest(request)) return sendJson(response, 429, { error: "Too many submissions. Please wait before trying again." });
  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    return sendJson(response, error.status || 400, { error: error.message });
  }
  if (sanitize(body.website).slice(0, 200)) return sendJson(response, 400, { error: "The form could not be accepted." });
  const { data, errors } = kind === "contact" ? validateContact(body) : validateCareer(body);
  if (errors.length) return sendJson(response, 400, { error: errors[0] });
  const idempotency = idempotencyKey(request);
  const fingerprint = createHash("sha256").update(JSON.stringify([kind, data])).digest("hex");
  const keys = [`${requestIp(request)}:${kind}:${fingerprint}`, ...(idempotency ? [idempotency] : [])];
  const now = Date.now();
  for (const [entryKey, entry] of seenRequests) if (entry.expires <= now) seenRequests.delete(entryKey);
  if (keys.some((key) => seenRequests.has(key) || inFlightRequests.has(key))) {
    return sendJson(response, 409, { error: "This submission has already been received." });
  }
  keys.forEach((key) => inFlightRequests.add(key));
  let result;
  try {
    result = await deliverWebhook(kind, data);
  } catch (error) {
    console.error(`Discord ${kind} submission failed:`, error.message);
    result = { ok: false, status: 502, message: "We couldn’t deliver your message. Please try again later." };
  } finally {
    keys.forEach((key) => inFlightRequests.delete(key));
  }
  if (result.ok) keys.forEach((key) => seenRequests.set(key, { expires: Date.now() + IDEMPOTENCY_TTL }));
  if (!result.ok) return sendJson(response, result.status, { error: result.message });
  return sendJson(response, 200, { message: kind === "contact" ? "Your message has been sent. Thank you for getting in touch." : "Your application has been sent. Thank you for your interest." });
}

function openPositions() {
  return positions.filter((position) => position.open);
}

function validSiteUrl() {
  const value = process.env.SITE_URL || site.baseUrl;
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.origin : "";
  } catch {
    return "";
  }
}

function handleSeoFile(request, response, pathname) {
  const base = validSiteUrl();
  if (pathname === "/robots.txt") {
    const content = `User-agent: *\nAllow: /\nDisallow: /api/\n${base ? `Sitemap: ${base}/sitemap.xml\n` : ""}`;
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" });
    return response.end(request.method === "HEAD" ? undefined : content);
  }
  if (!base) return plainText(response, 503, "Set SITE_URL to the production HTTPS origin to publish the sitemap.\n");
  const paths = ["/", "/team", "/projects", ...projects.map((project) => `/projects/${encodeURIComponent(project.slug)}`), "/games", "/about", "/careers", "/contact"];
  const body = paths.map((route) => `<url><loc>${base}${route}</loc></url>`).join("");
  response.writeHead(200, { "Content-Type": "application/xml; charset=utf-8", "X-Content-Type-Options": "nosniff" });
  response.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`);
}

async function serveStatic(request, response, pathname, status = 200) {
  const decoded = decodeURIComponent(pathname);
  if (decoded.split("/").some((part) => part.startsWith("."))) return false;
  const filePath = path.resolve(root, `.${decoded}`);
  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== path.join(root, "index.html")) return false;
  const relative = path.relative(root, filePath);
  if (!["index.html", "ryft.png", "ryftlogo.png"].includes(relative) && !relative.startsWith(`src${path.sep}`) && !relative.startsWith(`assets${path.sep}`)) return false;
  if (!existsSync(filePath)) return false;
  const [actualPath, details] = await Promise.all([realpath(filePath), stat(filePath)]);
  if (!actualPath.startsWith(`${root}${path.sep}`) || !details.isFile()) return false;
  response.writeHead(status, {
    "Content-Type": mimeTypes[path.extname(actualPath).toLowerCase()] || "application/octet-stream",
    "Content-Length": details.size,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    "Cache-Control": [".html", ".mjs", ".js", ".css"].includes(path.extname(actualPath).toLowerCase())
      ? "no-cache"
      : "public, max-age=3600"
  });
  if (request.method === "HEAD") response.end();
  else createReadStream(actualPath).pipe(response);
  return true;
}

export const server = http.createServer(async (request, response) => {
  let pathname;
  try {
    pathname = new URL(request.url, "http://localhost").pathname;
  } catch {
    return plainText(response, 400, "Bad request.\n");
  }
  if (pathname === "/api/contact" || pathname === "/api/careers") {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      return sendJson(response, 405, { error: "Method not allowed." });
    }
    return handleSubmission(request, response, pathname.endsWith("contact") ? "contact" : "careers");
  }
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.setHeader("Allow", "GET, HEAD");
      return plainText(response, 405, "Method not allowed.\n");
    }
    return handleSeoFile(request, response, pathname);
  }
  if (pathname === "/favicon.ico") {
    response.writeHead(204, { "Cache-Control": "public, max-age=3600" });
    return response.end();
  }
  if (!["GET", "HEAD"].includes(request.method)) {
    response.setHeader("Allow", "GET, HEAD");
    return plainText(response, 405, "Method not allowed.\n");
  }
  try {
    if (await serveStatic(request, response, pathname)) return;
  } catch (error) {
    console.error("Static file response failed:", error.message);
    return plainText(response, 500, "Unable to serve this page.\n");
  }
  if (pathname.startsWith("/projects/")) {
    let slug = "";
    try {
      slug = decodeURIComponent(pathname.slice("/projects/".length));
    } catch {
      return serveStatic(request, response, "/index.html", 404);
    }
    const status = projects.some((project) => project.slug === slug) ? 200 : 404;
    return serveStatic(request, response, "/index.html", status);
  }
  if (pathname === "/" || pathname === "/team" || pathname === "/projects" || ["/games", "/about", "/careers", "/contact"].includes(pathname)) {
    return serveStatic(request, response, "/index.html");
  }
  return plainText(response, 404, "Page not found.\n");
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  server.listen(port, "0.0.0.0", () => {
    console.log(`Ryft Entertainment running at http://localhost:${port}`);
  });
}
