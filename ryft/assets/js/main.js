(() => {
  const C = window.RYFT;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const page = document.body.dataset.page;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* favicon */
  const fav = document.createElement("link"); fav.rel = "icon"; fav.href = C.icon; document.head.appendChild(fav);

  /* ambient background */
  document.body.insertAdjacentHTML("afterbegin",
    `<div class="bg"><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div><div class="grid"></div></div><div class="glow"></div>`);

  /* header */
  $("#site-header").outerHTML = `
  <header class="nav" id="nav"><div class="nav-in">
    <ul class="links">${C.nav.map(n => `<li><a href="${n.href}" class="${n.page === page ? "active" : ""}">${esc(n.label)}</a></li>`).join("")}</ul>
    <a class="brand" href="index.html" aria-label="${esc(C.name)}">
      <img src="${esc(C.logo)}" alt="${esc(C.name)} logo" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'wordmark',textContent:'RYFT'}))">
    </a>
    <button class="burger" aria-label="Menu">☰</button>
  </div></header>`;
  const nav = $("#nav");
  $(".burger").onclick = () => nav.classList.toggle("nav-open");
  $$(".links a").forEach(a => a.addEventListener("click", () => nav.classList.remove("nav-open")));
  const onScroll = () => nav.classList.toggle("scrolled", scrollY > 20);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* footer */
  $("#site-footer").outerHTML = `
  <footer><div class="wrap foot">
    <small>© ${new Date().getFullYear()} ${esc(C.name)}. All rights reserved.</small>
    <ul>${C.nav.map(n => `<li><a href="${n.href}">${esc(n.label)}</a></li>`).join("")}<li><a href="${esc(C.discordInvite)}" target="_blank" rel="noopener">Discord ↗</a></li></ul>
  </div></footer>`;
  $$("[data-discord]").forEach(a => { a.href = C.discordInvite; a.target = "_blank"; a.rel = "noopener"; });

  /* cursor spotlight + card glow + tilt */
  addEventListener("pointermove", e => {
    document.documentElement.style.setProperty("--mx", e.clientX + "px");
    document.documentElement.style.setProperty("--my", e.clientY + "px");
  }, { passive: true });
  document.addEventListener("pointermove", e => {
    const el = e.target.closest?.(".card,.member");
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", e.clientX - r.left + "px");
    el.style.setProperty("--y", e.clientY - r.top + "px");
    if (el.classList.contains("tilt")) {
      const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(900px) rotateY(${px * 7}deg) rotateX(${-py * 7}deg) translateY(-4px)`;
    }
  });
  document.addEventListener("pointerout", e => { const el = e.target.closest?.(".tilt"); if (el) el.style.transform = ""; });

  /* scroll reveal */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
  const watch = () => $$(".reveal:not(.in)").forEach(el => io.observe(el));
  watch();

  /* ---------- stats ---------- */
  const statsEl = $("#stats-grid");
  if (statsEl) {
    const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B" : n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e4 ? (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K" : Math.round(n).toLocaleString();
    const render = () => {
      statsEl.innerHTML = C.stats.map(s => `<div class="stat"><div class="num" data-key="${esc(s.key)}">-</div><div class="lab">${esc(s.label)}</div></div>`).join("");
      const go = () => $$(".num", statsEl).forEach((el, i) => {
        const v = C.stats[i].value;
        if (typeof v !== "number") return;
        const t0 = performance.now(), dur = 1800;
        const tick = t => { const p = Math.min((t - t0) / dur, 1); el.textContent = fmt(v * (1 - Math.pow(1 - p, 4))); if (p < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      });
      new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { go(); o.disconnect(); } }, { threshold: .4 }).observe(statsEl);
    };
    render();
    if (C.statsEndpoint) fetch(C.statsEndpoint).then(r => r.json()).then(d => { C.stats.forEach(s => { if (typeof d[s.key] === "number") s.value = d[s.key]; }); render(); }).catch(() => {});
  }

  /* ---------- team (live Discord profiles) ---------- */
  const teamRoot = $("#team-root");
  if (teamRoot) {
    const PAL = { crimson: "#a8243b", berry: "#9b2a7a", sky: "#2b8fd6", teal: "#1f9c93", forest: "#2c7a45", bubble_gum: "#e86fb0", violet: "#7b4fd8", cobalt: "#2f4fd0", clover: "#4aa04a" };
    const CDN = "https://cdn.discordapp.com";
    const card = (m, i) => `<article class="member tilt reveal skeleton ${m.id ? "" : "empty"}" style="--d:${i * .08}s" data-id="${esc(m.id)}">
      <div class="plate"></div><div class="shade"></div>
      <div class="mem-body"><div class="av-wrap"><img class="av" alt=""></div>
        <div><h3>${m.id ? "Loading…" : "Your Name Here"}</h3><div class="handle">${m.id ? "" : "Add a Discord ID in config.js"}</div><span class="pill">${esc(m.role)}</span></div>
      </div></article>`;
    let n = 0;
    teamRoot.innerHTML = C.team.map(g => `<div class="group-title reveal">${esc(g.group)}</div><div class="members">${g.members.map(m => card(m, n++)).join("")}</div>`).join("");
    watch();
    $$(".member[data-id]").forEach(async el => {
      const id = el.dataset.id; if (!id) { el.classList.remove("skeleton"); return; }
      try {
        const profileUrl = new URL("api/discord-user", document.baseURI);
        profileUrl.searchParams.set("id", id);
        const response = await fetch(profileUrl);
        let u;
        try { u = await response.json(); }
        catch { throw new Error(`Profile API returned an invalid response (HTTP ${response.status})`); }
        if (!response.ok || u.error) throw new Error(u.error || `Profile API returned HTTP ${response.status}`);
        el.classList.remove("skeleton");
        $(".av", el).src = u.avatar;
        $("h3", el).textContent = u.displayName;
        $(".handle", el).textContent = "@" + u.username;
        if (u.decoration) $(".av-wrap", el).insertAdjacentHTML("beforeend", `<img class="deco" alt="" src="${esc(u.decoration)}">`);
        if (u.nameplate) {
          if (PAL[u.nameplate.palette]) el.style.setProperty("--c1", PAL[u.nameplate.palette]);
          const plate = $(".plate", el);
          plate.innerHTML = `<video autoplay loop muted playsinline poster="${esc(u.nameplate.image)}" src="${esc(u.nameplate.video)}"></video>`;
          $("video", plate).onerror = () => { plate.innerHTML = `<img alt="" src="${esc(u.nameplate.image)}" onerror="this.remove()">`; };
        }
      } catch (error) {
        console.error(`Unable to load Discord profile ${id}:`, error);
        el.classList.remove("skeleton");
        $("h3", el).textContent = "Profile unavailable";
        $(".handle", el).textContent = error.message || "Discord profile request failed";
      }
    });
  }

  /* ---------- careers: role select ---------- */
  const roleSel = $("#role-select");
  if (roleSel) {
    $$(".role-card").forEach(c => {
      const open = c.dataset.status === "open";
      const st = $(".status", c); st.className = "status " + (open ? "open" : "closed"); st.textContent = open ? "Open position" : "Not hiring";
      if (open) roleSel.insertAdjacentHTML("beforeend", `<option>${esc(c.dataset.role)}</option>`);
      $(".apply", c)?.addEventListener("click", () => { roleSel.value = c.dataset.role; $("#apply").scrollIntoView({ behavior: "smooth" }); });
    });
  }

  /* ---------- forms -> /api/inquiry -> Discord webhook ---------- */
  $$("form[data-type]").forEach(f => {
    const msg = $(".msg", f), btn = $("button[type=submit]", f);
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(f)); data.type = f.dataset.type;
      btn.disabled = true; const old = btn.textContent; btn.textContent = "Sending…"; msg.className = "msg";
      try {
        const r = await fetch("/api/inquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Something went wrong.");
        f.reset(); msg.textContent = "✓ Sent! We'll get back to you on Discord or email soon."; msg.className = "msg ok";
      } catch (err) { msg.textContent = "✗ " + err.message; msg.className = "msg err"; }
      btn.disabled = false; btn.textContent = old;
    });
  });
})();
