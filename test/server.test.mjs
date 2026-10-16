import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";

test("server routes, validation, and webhook configuration failures", async (t) => {
  const port = 31000 + Math.floor(Math.random() * 20000);
  const child = spawn(process.execPath, ["server.mjs"], {
    env: {
      ...process.env,
      PORT: String(port),
      CONTACT_DISCORD_WEBHOOK_URL: "",
      CAREERS_DISCORD_WEBHOOK_URL: "",
      SITE_URL: ""
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => { output += chunk; });
  child.stderr.setEncoding("utf8").on("data", (chunk) => { output += chunk; });
  t.after(() => child.kill());

  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(base);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      await delay(50);
    }
  }
  assert.equal(ready, true, `server did not start: ${output}`);

  const home = await fetch(base);
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-type"), /text\/html/);
  assert.match(home.headers.get("content-security-policy"), /default-src 'self'/);
  assert.match(await home.text(), /Ryft Entertainment/);
  const logo = await fetch(`${base}/ryftlogo.png`);
  assert.equal(logo.status, 200);
  assert.match(logo.headers.get("content-type"), /image\/png/);
  assert.equal((await fetch(`${base}/ryft.png`)).status, 200);
  const appModule = await fetch(`${base}/src/app.mjs`);
  assert.equal(appModule.status, 200);
  assert.equal(appModule.headers.get("cache-control"), "no-cache");
  const siteConfig = await fetch(`${base}/src/data/site.mjs`);
  assert.match(await siteConfig.text(), /logoPath:\s*"\/ryft\.png"/);

  const directPage = await fetch(`${base}/team`);
  assert.equal(directPage.status, 200);
  assert.match(await directPage.text(), /src\/app\.mjs/);
  assert.equal((await fetch(`${base}/not-a-route`)).status, 404);
  const unknownProject = await fetch(`${base}/projects/not-configured`);
  assert.equal(unknownProject.status, 404);
  assert.match(await unknownProject.text(), /src\/app\.mjs/);
  assert.equal((await fetch(`${base}/api/contact`)).status, 405);

  const invalidContact = await fetch(`${base}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "invalid-contact" },
    body: JSON.stringify({ name: "", category: "Unknown", message: "" })
  });
  assert.equal(invalidContact.status, 400);
  assert.match((await invalidContact.json()).error, /name/i);

  const longContact = await fetch(`${base}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "contact-too-long" },
    body: JSON.stringify({
      name: "V".repeat(101),
      email: "visitor@example.com",
      category: "General",
      subject: "A question",
      message: "Hello"
    })
  });
  assert.equal(longContact.status, 400);
  assert.match((await longContact.json()).error, /100 characters/);

  const unconfiguredContact = await fetch(`${base}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "contact-no-webhook" },
    body: JSON.stringify({
      name: "Visitor",
      email: "visitor@example.com",
      category: "General",
      subject: "A question",
      message: "Hello"
    })
  });
  assert.equal(unconfiguredContact.status, 503);
  assert.match((await unconfiguredContact.json()).error, /not configured/i);

  const closedCareer = await fetch(`${base}/api/careers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "career-closed" },
    body: JSON.stringify({
      name: "Applicant",
      discord: "applicant",
      position: "Unavailable role",
      experience: "Experience",
      motivation: "Motivation",
      privacy: true
    })
  });
  assert.equal(closedCareer.status, 400);
  assert.match((await closedCareer.json()).error, /currently open/i);

  const fifthRequest = await fetch(`${base}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "contact-rate-limit" },
    body: JSON.stringify({ name: "", category: "Invalid", subject: "", message: "" })
  });
  assert.equal(fifthRequest.status, 400);
  const rateLimited = await fetch(`${base}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "contact-rate-limited" },
    body: JSON.stringify({ name: "Visitor", category: "General", subject: "Subject", message: "Message" })
  });
  assert.equal(rateLimited.status, 429);
});
