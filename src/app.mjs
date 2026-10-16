import { site } from "./data/site.mjs";
import { team, departments } from "./data/team.mjs";
import { projects } from "./data/projects.mjs";
import { games } from "./data/games.mjs";
import { positions } from "./data/careers.mjs";
import { PageTransition } from "./components/page-transition.mjs";
import { RyftGlobe } from "./components/ryft-globe.mjs";

const app = document.querySelector("#app");
const transition = new PageTransition({
  layer: document.querySelector("#transition-layer"),
  globe: document.querySelector("#transition-globe"),
  logoPath: site.logoPath
});
const openPositions = positions.filter((position) => position.open);
let currentPath = window.location.pathname;
let mobileMenuOpen = false;
let queuedNavigation = null;

const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function externalLink(url, label, className = "") {
  const safeUrl = safeExternalUrl(url);
  if (!safeUrl) return "";
  return `<a class="${className}" href="${escapeHTML(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)}<span aria-hidden="true"> ↗</span></a>`;
}

function internalLink(path, label, className = "") {
  return `<a class="${className}" href="${escapeHTML(path)}" data-link>${label}</a>`;
}

function updateMeta(title, description) {
  document.title = `${title} — ${site.name}`;
  document.querySelector('meta[name="description"]').content = description;
  document.querySelector('meta[property="og:title"]').content = document.title;
  document.querySelector('meta[property="og:description"]').content = description;
  document.querySelector('meta[property="og:url"]')?.remove();
  if (site.baseUrl) {
    try {
      const baseUrl = new URL(site.baseUrl);
      if (baseUrl.protocol === "https:" || baseUrl.hostname === "localhost") {
        const meta = document.createElement("meta");
        meta.setAttribute("property", "og:url");
        meta.content = new URL(currentPath, baseUrl).href;
        document.head.append(meta);
      }
    } catch {
      // An invalid optional production URL should not prevent the page from rendering.
    }
  }
}

function navLink(path, label) {
  const active = currentPath === path || (path !== "/" && currentPath.startsWith(`${path}/`));
  return `<a href="${path}" data-link class="nav-link${active ? " is-current" : ""}"${active ? ' aria-current="page"' : ""}>${label}</a>`;
}

function header() {
  const logo = site.logoPath
    ? `<img src="${escapeHTML(site.logoPath)}" alt="" class="brand-image">`
    : `<span class="brand-type" aria-hidden="true">RYFT<span class="brand-dot">.</span></span>`;
  const menuLabel = mobileMenuOpen ? "Close navigation" : "Open navigation";
  return `<header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/" data-link aria-label="Ryft Entertainment home">${logo}</a>
      <button class="menu-toggle" type="button" aria-expanded="${mobileMenuOpen}" aria-label="${menuLabel}" aria-controls="primary-navigation">
        <span></span><span></span>
      </button>
      <nav id="primary-navigation" class="primary-nav${mobileMenuOpen ? " is-open" : ""}" aria-label="Main navigation">
        ${navLink("/", "Home")}${navLink("/team", "Team")}${navLink("/projects", "Projects")}${navLink("/careers", "Careers")}${navLink("/contact", "Contact")}
        <div class="nav-secondary">${navLink("/games", "Games")}${navLink("/about", "About")}</div>
        ${site.socials.discord ? externalLink(site.socials.discord, "Discord", "nav-discord") : ""}
      </nav>
    </div>
  </header>`;
}

function footer() {
  const links = [
    ["discord", "Discord"], ["roblox", "Roblox"], ["youtube", "YouTube"],
    ["twitter", "X"], ["instagram", "Instagram"]
  ].filter(([key]) => safeExternalUrl(site.socials[key]));
  return `<footer class="site-footer">
    <div class="footer-main">
      <div class="footer-brand">
        <a href="/" data-link class="footer-wordmark" aria-label="Ryft Entertainment home">RYFT<span>.</span></a>
        <p>${escapeHTML(site.slogan)}</p>
      </div>
      <div class="footer-nav" aria-label="Footer navigation">
        ${internalLink("/projects", "Projects")}${internalLink("/team", "Team")}${internalLink("/about", "About")}${internalLink("/careers", "Careers")}${internalLink("/contact", "Contact")}
      </div>
      ${links.length ? `<div class="footer-socials">${links.map(([key, label]) => externalLink(site.socials[key], label)).join("")}</div>` : ""}
    </div>
    <div class="footer-bottom"><span>© ${new Date().getFullYear()} ${escapeHTML(site.name)}</span><span>Made with intention.</span></div>
  </footer>`;
}

function pageShell(content) {
  return `${header()}<main id="main-content" tabindex="-1">${content}</main>${footer()}`;
}

function pageIntro(kicker, title, copy) {
  return `<section class="page-intro reveal"><p class="eyebrow">${escapeHTML(kicker)}</p><h1>${title}</h1><p class="intro-copy">${escapeHTML(copy)}</p></section>`;
}

function projectCard(project) {
  const path = `/projects/${encodeURIComponent(project.slug)}`;
  const image = safeExternalUrl(project.image) || (project.image?.startsWith("/") ? project.image : "");
  return `<article class="project-card reveal">
    <a class="project-card-link" href="${path}" data-link aria-label="View ${escapeHTML(project.name)}">
      <div class="project-art">${image ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(project.imageAlt || `${project.name} project artwork`)}" loading="lazy">` : `<span class="art-mark">${escapeHTML(project.name.slice(0, 1))}</span>`}<span class="card-arrow" aria-hidden="true">↗</span></div>
      <div class="project-card-copy"><div class="card-meta">${escapeHTML(project.status)}${project.genre ? `<span>${escapeHTML(project.genre)}</span>` : ""}</div><h3>${escapeHTML(project.name)}</h3><p>${escapeHTML(project.description)}</p></div>
    </a>
  </article>`;
}

function renderHome() {
  const featured = projects.filter((project) => project.featured);
  return `<div class="home-page">
    <section class="hero section-wrap">
      <div class="hero-content reveal"><p class="eyebrow"><span class="eyebrow-line"></span> Roblox game development studio</p>
        <h1>RYFT<br><span>ENTERTAINMENT</span></h1>
        <p class="hero-slogan">${escapeHTML(site.slogan)}</p>
        <p class="hero-copy">${escapeHTML(site.description)}</p>
        <div class="button-row">${internalLink("/projects", "Explore projects", "button button-primary")}${internalLink("/team", "Meet the team", "button button-secondary")}</div>
      </div>
      <div class="hero-aside" aria-hidden="true"><span class="hero-orbit"></span>${site.logoPath ? `<img class="hero-logo" src="${escapeHTML(site.logoPath)}" alt="" loading="lazy">` : ""}<span class="hero-side-label">Intentional by design</span></div>
      <div class="hero-footer"><span>ROBLOX GAME DEVELOPMENT</span><span>BUILT WITH INTENT</span></div>
    </section>
    <section class="section-wrap section-block">
      <div class="section-heading reveal"><div><p class="eyebrow">Selected work</p><h2>Featured projects.</h2></div>${internalLink("/projects", "All projects", "text-link")}</div>
      ${featured.length ? `<div class="project-grid">${featured.map(projectCard).join("")}</div>` : `<div class="empty-inline reveal"><span class="empty-symbol">✳</span><div><h3>The work starts here.</h3><p>Project details will appear here once they are ready to share.</p></div>${internalLink("/projects", "Explore projects", "text-link")}</div>`}
    </section>
    <section class="manifesto section-wrap section-block reveal"><div class="manifesto-label"><span class="eyebrow">How we work</span><span class="manifesto-index">OUR APPROACH</span></div><div><h2>Every detail has a reason.<br><span>Every choice moves play forward.</span></h2><p>We bring thoughtful design and collaborative craft to every experience we create.</p>${internalLink("/about", "Our approach", "text-link")}</div></section>
    <section class="team-preview section-wrap section-block reveal"><div><p class="eyebrow">The people behind the play</p><h2>Good games begin<br>with good collaboration.</h2></div><div class="team-preview-side"><p>Meet the people bringing care, craft, and curiosity to the work.</p>${internalLink("/team", "Meet the team", "button button-secondary")}</div></section>
    <section class="careers-banner section-wrap reveal"><div><p class="eyebrow">Make something meaningful</p><h2>Built by people<br>who care about play.</h2></div><div><p>Interested in working with Ryft? See what opportunities are currently open.</p>${internalLink("/careers", "Explore careers", "button button-primary")}</div></section>
  </div>`;
}

function profileCard(member) {
  const avatar = safeExternalUrl(member.avatar) || (member.avatar?.startsWith("/") ? member.avatar : "");
  const labels = { discord: "Discord", roblox: "Roblox", github: "GitHub", portfolio: "Portfolio", youtube: "YouTube", twitch: "Twitch" };
  const social = Object.entries(member.links || {})
    .map(([key, url]) => externalLink(url, labels[key.toLowerCase()] || key))
    .filter(Boolean)
    .join("");
  return `<article class="profile-card reveal">
    <div class="profile-avatar">${avatar ? `<img src="${escapeHTML(avatar)}" alt="${escapeHTML(member.name)}" loading="lazy">` : `<span aria-hidden="true">${escapeHTML(member.name.slice(0, 1).toUpperCase())}</span>`}</div>
    <div class="profile-details"><div class="profile-role">${escapeHTML(member.rank || member.role)}${member.department ? `<span>${escapeHTML(member.department)}</span>` : ""}</div><h3>${escapeHTML(member.name)}</h3>${member.bio ? `<p>${escapeHTML(member.bio)}</p>` : ""}${member.skills?.length ? `<ul class="tag-list" aria-label="Skills">${member.skills.map((skill) => `<li>${escapeHTML(skill)}</li>`).join("")}</ul>` : ""}${member.projects?.length ? `<p class="profile-projects">Projects: ${member.projects.map(escapeHTML).join(", ")}</p>` : ""}${social ? `<div class="profile-links">${social}</div>` : ""}</div>
  </article>`;
}

function renderTeam() {
  const leadership = team.filter((person) => ["Executive Leadership", "Department Leadership"].includes(person.department));
  const departmentOrder = [...departments, ...new Set(team.map((person) => person.department).filter((department) => department && !departments.includes(department)))];
  const groups = departmentOrder.map((department) => {
    const members = team.filter((person) => person.department === department && !leadership.includes(person));
    return members.length ? `<section class="team-group"><div class="section-heading"><div><p class="eyebrow">Team directory</p><h2>${escapeHTML(department)}</h2></div><span class="count-label">${String(members.length).padStart(2, "0")} MEMBERS</span></div><div class="profile-grid">${members.map(profileCard).join("")}</div></section>` : "";
  }).join("");
  return `${pageIntro("The people", "A team shaped by<br><span>shared intent.</span>", "We believe the best experiences come from people with different strengths working toward a clear purpose.")}${team.length ? `<div class="team-page-body">${leadership.length ? `<section class="team-group leadership-group"><div class="section-heading"><div><p class="eyebrow">Leadership</p><h2>Guided with care.</h2></div></div><div class="profile-grid">${leadership.map(profileCard).join("")}</div></section>` : ""}${groups}</div>` : `<section class="empty-state section-wrap"><div class="empty-orbit">R</div><p class="eyebrow">Growing together</p><h2>Team profiles<br>are coming soon.</h2><p>When people and roles are ready to share, you’ll find them here.</p></section>`}`;
}

function renderProjects() {
  return `${pageIntro("Our work", "Projects, with<br><span>purpose.</span>", "Explore the experiences we are building and the ideas behind them.")}<section class="catalogue section-wrap">${projects.length ? `<div class="filter-row"><label for="project-filter">Filter by status</label><select id="project-filter"><option value="all">All projects</option>${[...new Set(projects.map((item) => item.status))].map((status) => `<option value="${escapeHTML(status)}">${escapeHTML(status)}</option>`).join("")}</select></div><div class="project-grid" id="project-grid">${projects.map(projectCard).join("")}</div>` : `<div class="empty-state"><div class="empty-orbit">R</div><p class="eyebrow">In development</p><h2>Thoughtful work<br>takes the time it takes.</h2><p>We’ll share projects here when there is something meaningful to show.</p></div>`}</section>`;
}

function renderProjectDetail(slug) {
  let decodedSlug;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch {
    return renderNotFound();
  }
  const project = projects.find((entry) => entry.slug === decodedSlug);
  if (!project) return renderNotFound();
  const image = safeExternalUrl(project.image) || (project.image?.startsWith("/") ? project.image : "");
  const progress = Number.isFinite(project.progress) && project.progress >= 0 && project.progress <= 100
    ? `<div class="project-progress"><div><span>Development progress</span><strong>${project.progress}%</strong></div><progress value="${project.progress}" max="100" aria-label="Project development progress">${project.progress}%</progress></div>`
    : "";
  return `<div class="detail-page">${pageIntro(project.status || "Project", escapeHTML(project.name), project.description)}<article class="detail-content section-wrap">${image ? `<img class="detail-image" src="${escapeHTML(image)}" alt="${escapeHTML(project.imageAlt || `${project.name} artwork`)}">` : ""}<div class="detail-grid"><div><p class="eyebrow">The project</p><h2>${escapeHTML(project.name)}</h2>${project.longDescription ? `<p>${escapeHTML(project.longDescription)}</p>` : `<p>${escapeHTML(project.description)}</p>`}${progress}</div><aside>${project.genre ? `<p><span>Genre</span>${escapeHTML(project.genre)}</p>` : ""}${project.lead ? `<p><span>Project lead</span>${escapeHTML(project.lead)}</p>` : ""}${project.milestones?.length ? `<p><span>Milestones</span>${project.milestones.map(escapeHTML).join(", ")}</p>` : ""}${project.skills?.length ? `<p><span>Skills</span>${project.skills.map(escapeHTML).join(", ")}</p>` : ""}${externalLink(project.url, "External project link", "text-link")}</aside></div>${project.media?.length ? `<div class="media-grid">${project.media.map((url) => `<img src="${escapeHTML(safeExternalUrl(url))}" alt="${escapeHTML(project.name)} media" loading="lazy">`).join("")}</div>` : ""}${internalLink("/projects", "← All projects", "text-link")}</article></div>`;
}

function renderGames() {
  return `${pageIntro("Playable experiences", "Games made<br><span>for play.</span>", "Browse the Roblox games created and published by Ryft Entertainment.")}${games.length ? `<section class="catalogue section-wrap"><div class="game-grid">${games.map((game) => {
    const image = safeExternalUrl(game.thumbnail) || (game.thumbnail?.startsWith("/") ? game.thumbnail : "");
    return `<article class="game-card reveal"><div class="game-art">${image ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(game.name)} thumbnail" loading="lazy">` : `<span aria-hidden="true">R</span>`}</div><p class="eyebrow">${escapeHTML(game.status)}${game.genre ? ` · ${escapeHTML(game.genre)}` : ""}</p><h2>${escapeHTML(game.name)}</h2><p>${escapeHTML(game.description)}</p>${externalLink(game.url, "Play on Roblox", "button button-primary")}</article>`;
  }).join("")}</div></section>` : `<section class="empty-state section-wrap"><div class="empty-orbit">R</div><p class="eyebrow">Games catalogue</p><h2>Nothing to play<br>just yet.</h2><p>When a Ryft game is publicly playable, we’ll add it here.</p></section>`}`;
}

function renderAbout() {
  return `${pageIntro("About Ryft", "Made with intent.<br><span>Made to be played.</span>", "We are a Roblox game development studio focused on making experiences that feel considered from the first interaction to the last.")}<section class="about-content section-wrap"><div class="about-lead reveal"><p class="eyebrow">Our philosophy</p><h2>Thoughtful choices<br>make memorable play.</h2></div><div class="principle-list">
    <article class="principle reveal"><span>01</span><div><h3>Intentional design</h3><p>Every mechanic, interaction, and visual choice should earn its place in the experience.</p></div></article>
    <article class="principle reveal"><span>02</span><div><h3>Distinctive gameplay</h3><p>We seek clear ideas and satisfying play rather than familiar features without a purpose.</p></div></article>
    <article class="principle reveal"><span>03</span><div><h3>Thoughtful progression</h3><p>Progress should give players a meaningful reason to keep exploring and improving.</p></div></article>
    <article class="principle reveal"><span>04</span><div><h3>Collaborative craft</h3><p>Good games are built through clear communication, shared ownership, and care for the details.</p></div></article>
  </div></section>`;
}

function field(label, name, options = {}) {
  const { required = false, type = "text", placeholder = "", rows = 0, autocomplete = "" } = options;
  const input = rows
    ? `<textarea id="${name}" name="${name}" rows="${rows}" placeholder="${escapeHTML(placeholder)}"${required ? " required" : ""} maxlength="${options.maxlength || 5000}"></textarea>`
    : `<input id="${name}" name="${name}" type="${type}" placeholder="${escapeHTML(placeholder)}"${required ? " required" : ""} maxlength="${options.maxlength || 300}"${autocomplete ? ` autocomplete="${autocomplete}"` : ""}>`;
  return `<div class="form-field"><label for="${name}">${escapeHTML(label)}${required ? ' <span aria-hidden="true">*</span>' : ""}</label>${input}</div>`;
}

function formStatus() {
  return `<p class="form-status" aria-live="polite" role="status"></p>`;
}

function renderCareers() {
  const openings = openPositions.length ? `<section class="openings section-wrap"><div class="section-heading"><div><p class="eyebrow">Current opportunities</p><h2>Open positions.</h2></div></div><div class="opening-list">${openPositions.map((position) => `<article class="opening-card"><div><p class="opening-department">${escapeHTML(position.department || "Ryft Entertainment")}</p><h3>${escapeHTML(position.title)}</h3></div><div>${position.description ? `<p>${escapeHTML(position.description)}</p>` : ""}${position.responsibilities?.length ? `<h4>Responsibilities</h4><ul>${position.responsibilities.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>` : ""}${position.skills?.length ? `<h4>Skills</h4><ul class="tag-list">${position.skills.map((skill) => `<li>${escapeHTML(skill)}</li>`).join("")}</ul>` : ""}</div></article>`).join("")}</div></section>` : "";
  const form = openPositions.length ? `<section class="form-panel section-wrap"><div class="form-heading"><p class="eyebrow">Start a conversation</p><h2>Apply to join us.</h2><p>Tell us a little about yourself and the role you’re interested in.</p></div><form data-submit="careers" novalidate>
    ${field("Name or preferred display name", "name", { required: true, autocomplete: "name", maxlength: 100 })}
    ${field("Discord username or profile link", "discord", { required: true, placeholder: "username or profile URL", maxlength: 100 })}
    <div class="form-field"><label for="position">Position <span aria-hidden="true">*</span></label><select id="position" name="position" required><option value="">Choose an open position</option>${openPositions.map((position) => `<option value="${escapeHTML(position.title)}">${escapeHTML(position.title)}</option>`).join("")}</select></div>
    ${field("Relevant experience", "experience", { required: true, rows: 4, maxlength: 1400 })}
    ${field("Why are you interested in Ryft?", "motivation", { required: true, rows: 4, maxlength: 1400 })}
    ${field("Portfolio links", "portfolioLinks", { placeholder: "https://…", rows: 2, maxlength: 500 })}
    ${field("Roblox profile (optional)", "roblox", { type: "url" })}${field("GitHub profile (optional)", "github", { type: "url" })}${field("YouTube channel (optional)", "youtube", { type: "url" })}
    ${field("Anything else you’d like us to know?", "additional", { rows: 3, maxlength: 800 })}
    <div class="form-trap" aria-hidden="true"><label for="career-website">Leave this field empty</label><input id="career-website" name="website" tabindex="-1" autocomplete="off"></div>
    <label class="privacy-check"><input type="checkbox" name="privacy" required><span>I understand this information will be sent to Ryft to review my application.</span></label>
    ${formStatus()}<button type="submit" class="button button-primary">Send application <span aria-hidden="true">↗</span></button>
  </form></section>` : `<section class="empty-state section-wrap"><div class="empty-orbit">R</div><p class="eyebrow">Careers</p><h2>No open positions<br>at the moment.</h2><p>We don’t have any roles open right now. Check back when the team is growing.</p></section>`;
  return `${pageIntro("Careers at Ryft", "Bring your craft.<br><span>Bring your curiosity.</span>", "We value thoughtful work, clear communication, and people who care about making a great experience.")}<section class="careers-values section-wrap"><article><span>01</span><h2>Make with purpose.</h2><p>We care about the reason behind every part of a game.</p></article><article><span>02</span><h2>Build together.</h2><p>Different disciplines and perspectives make stronger work.</p></article></section>${openings}${form}`;
}

function renderContact() {
  return `${pageIntro("Contact Ryft", "Let’s start a<br><span>conversation.</span>", "For general, game-related, partnership, or business enquiries, send us a note.")}<section class="form-panel section-wrap"><div class="form-heading"><p class="eyebrow">Get in touch</p><h2>Tell us what’s on your mind.</h2><p>Fields marked with an asterisk are required.</p></div><form data-submit="contact" novalidate>
    ${field("Name", "name", { required: true, autocomplete: "name", maxlength: 100 })}
    <div class="form-grid">${field("Email (optional)", "email", { type: "email", autocomplete: "email", maxlength: 254 })}${field("Discord (optional)", "discord", { placeholder: "username or profile URL", maxlength: 100 })}</div>
    <div class="form-field"><label for="category">Enquiry category <span aria-hidden="true">*</span></label><select id="category" name="category" required><option value="">Choose a category</option><option value="General">General</option><option value="Game-related">Game-related</option><option value="Partnership">Partnership</option><option value="Business">Business</option></select></div>
    ${field("Subject", "subject", { required: true, maxlength: 160 })}
    ${field("Message", "message", { required: true, rows: 7, maxlength: 3500 })}
    ${field("Relevant links (optional)", "links", { placeholder: "https://…", rows: 2, maxlength: 500 })}
    <div class="form-trap" aria-hidden="true"><label for="contact-website">Leave this field empty</label><input id="contact-website" name="website" tabindex="-1" autocomplete="off"></div>
    ${formStatus()}<button type="submit" class="button button-primary">Send message <span aria-hidden="true">↗</span></button>
  </form></section>`;
}

function renderNotFound() {
  return `<section class="not-found section-wrap"><p class="eyebrow">404 / Page not found</p><h1>This page took<br><span>a different route.</span></h1><p>The page may have moved or may not exist.</p>${internalLink("/", "Back to home", "button button-primary")}</section>`;
}

function routeContent() {
  if (currentPath === "/") return ["Home", site.description, renderHome()];
  if (currentPath === "/team") return ["Team", "Meet the people and disciplines behind Ryft Entertainment.", renderTeam()];
  if (currentPath === "/projects") return ["Projects", "Explore projects and development work from Ryft Entertainment.", renderProjects()];
  if (currentPath.startsWith("/projects/")) {
    let slug;
    try {
      slug = decodeURIComponent(currentPath.slice("/projects/".length));
    } catch {
      return ["Not found", "The page you requested could not be found.", renderNotFound()];
    }
    const project = projects.find((entry) => entry.slug === slug);
    return project
      ? [project.name, project.description, renderProjectDetail(slug)]
      : ["Not found", "The page you requested could not be found.", renderNotFound()];
  }
  if (currentPath === "/games") return ["Games", "Discover publicly playable Roblox games from Ryft Entertainment.", renderGames()];
  if (currentPath === "/about") return ["About", "Our approach to intentional design and collaborative game development.", renderAbout()];
  if (currentPath === "/careers") return ["Careers", "Explore current career opportunities at Ryft Entertainment.", renderCareers()];
  if (currentPath === "/contact") return ["Contact", "Contact Ryft Entertainment for general, game-related, partnership, and business enquiries.", renderContact()];
  return ["Not found", "The page you requested could not be found.", renderNotFound()];
}

function observeReveals() {
  const elements = document.querySelectorAll(".reveal:not(.is-visible)");
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  elements.forEach((element) => observer.observe(element));
}

function renderPage({ focusMain = false } = {}) {
  const [title, description, content] = routeContent();
  updateMeta(title, description);
  app.innerHTML = pageShell(content);
  observeReveals();
  if (focusMain) {
    document.querySelector("#main-content").focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}

async function navigate(path) {
  return navigateTo(path, true);
}

async function navigateTo(path, pushHistory) {
  if (transition.busy) {
    queuedNavigation = { path, pushHistory };
    return;
  }
  if (path === currentPath) return;
  const destination = new URL(path, window.location.origin);
  if (destination.origin !== window.location.origin) return;
  if (pushHistory) window.history.pushState({}, "", destination.pathname);
  await transition.run(() => {
    if (window.location.pathname !== destination.pathname) return;
    currentPath = destination.pathname;
    mobileMenuOpen = false;
    renderPage({ focusMain: true });
  });
  if (queuedNavigation) {
    const next = queuedNavigation;
    queuedNavigation = null;
    await navigateTo(next.path, next.pushHistory);
  }
}

document.addEventListener("click", (event) => {
  const toggle = event.target.closest(".menu-toggle");
  if (toggle) {
    mobileMenuOpen = !mobileMenuOpen;
    const nav = document.querySelector("#primary-navigation");
    nav.classList.toggle("is-open", mobileMenuOpen);
    toggle.setAttribute("aria-expanded", String(mobileMenuOpen));
    toggle.setAttribute("aria-label", mobileMenuOpen ? "Close navigation" : "Open navigation");
    return;
  }
  const link = event.target.closest("a[data-link]");
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute("download")) return;
  const destination = new URL(link.href);
  if (destination.origin !== window.location.origin) return;
  event.preventDefault();
  navigate(destination.pathname);
});

window.addEventListener("popstate", () => {
  const path = window.location.pathname;
  if (path === currentPath) return;
  navigateTo(path, false);
});

document.addEventListener("change", (event) => {
  if (event.target.id !== "project-filter") return;
  const selected = event.target.value;
  const grid = document.querySelector("#project-grid");
  const visible = projects.filter((project) => selected === "all" || project.status === selected);
  grid.innerHTML = visible.length ? visible.map(projectCard).join("") : `<div class="empty-inline"><p>No projects match this status.</p></div>`;
  observeReveals();
});

function validateForm(form) {
  if (!form.reportValidity()) return false;
  if (form.dataset.submit === "contact" && !form.elements.email.value.trim() && !form.elements.discord.value.trim()) {
    form.elements.email.setCustomValidity("Enter either an email address or Discord username.");
    form.elements.discord.setCustomValidity("Enter either an email address or Discord username.");
    form.elements.email.reportValidity();
    form.elements.email.setCustomValidity("");
    form.elements.discord.setCustomValidity("");
    return false;
  }
  return true;
}

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-submit]");
  if (!form) return;
  event.preventDefault();
  if (!validateForm(form) || form.dataset.sending === "true") return;
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector(".form-status");
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.privacy = form.elements.privacy ? form.elements.privacy.checked : undefined;
  form.dataset.sending = "true";
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  status.className = "form-status";
  status.textContent = "Sending…";
  try {
    const response = await fetch(`/api/${form.dataset.submit}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(payload)
    });

    document.addEventListener("error", (event) => {
      if (!(event.target instanceof HTMLImageElement)) return;
      const image = event.target;
      const parent = image.parentElement;
      if (parent?.classList.contains("profile-avatar")) {
        parent.textContent = image.alt.slice(0, 1).toUpperCase();
      } else if (parent?.classList.contains("project-art")) {
        const mark = document.createElement("span");
        mark.className = "art-mark";
        mark.textContent = parent.closest(".project-card-link")?.getAttribute("aria-label")?.replace(/^View\s+/, "").slice(0, 1) || "R";
        parent.replaceChildren(mark);
      } else if (parent?.classList.contains("game-art")) {
        const mark = document.createElement("span");
        mark.setAttribute("aria-hidden", "true");
        mark.textContent = "R";
        parent.replaceChildren(mark);
      } else {
        image.hidden = true;
      }
    }, true);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "We couldn’t send your message. Please try again later.");
    form.reset();
    status.className = "form-status is-success";
    status.textContent = result.message || "Your message has been sent.";
  } catch (error) {
    status.className = "form-status is-error";
    status.textContent = error.message || "We couldn’t send your message. Please try again later.";
  } finally {
    form.dataset.sending = "false";
    button.disabled = false;
    button.removeAttribute("aria-busy");
  }
});

if (site.faviconPath) {
  const favicon = document.createElement("link");
  favicon.rel = "icon";
  favicon.href = site.faviconPath;
  document.head.append(favicon);
}

renderPage();
if (site.logoPath) new RyftGlobe(document.querySelector("#initial-globe"), { src: site.logoPath, mode: "loop" });
window.setTimeout(() => {
  const loader = document.querySelector("#initial-loader");
  loader.classList.add("is-hidden");
  window.setTimeout(() => loader.remove(), 400);
}, 650);
