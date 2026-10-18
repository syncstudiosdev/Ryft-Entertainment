/* ============================================================
   RYFT ENTERTAINMENT — SITE CONFIG  (edit everything here)
   ============================================================ */
window.RYFT = {
  name: "Ryft Entertainment",

  // Put your files in /assets/img/  (ryft.png = top-right logo, icon.png = favicon / emoji icon)
  logo: "assets/img/ryft.png",
  icon: "assets/img/icon.png",

  // Your Discord server invite
  discordInvite: "https://discord.gg/5VvMjYPAPB",

  nav: [
    { label: "Home",     href: "index.html",    page: "home" },
    { label: "About",    href: "about.html",    page: "about" },
    { label: "Team",     href: "team.html",     page: "team" },
    { label: "Projects", href: "projects.html", page: "projects" },
    { label: "Careers",  href: "careers.html",  page: "careers" },
    { label: "Contact",  href: "contact.html",  page: "contact" }
  ],

  /* ---------- STATISTICS ----------
     value: null  -> shows "-"
     value: 1300000 -> counts up and displays "1.3M"
     OPTIONAL live mode: set statsEndpoint to a URL returning JSON like
     { "online": 120, "monthly": 45000, "visits": 1300000, "community": 8200 }
     and the numbers update automatically on every page load. */
  statsEndpoint: "",
  stats: [
    { key: "online",    label: "Online now",      value: null },
    { key: "monthly",   label: "Monthly actives", value: null },
    { key: "visits",    label: "Total visits",    value: null },
    { key: "community", label: "Community",       value: null }
  ],

  /* ---------- TEAM ----------
     Paste each person's Discord USER ID in `id`.
     (Discord > Settings > Advanced > Developer Mode ON, then right-click profile > Copy User ID)
     Add a portfolio URL in `portfolio`; leave it blank or remove it to hide the portfolio link.
     Add as many executives as you want. */
  team: [
    { group: "Leadership", members: [
      { id: "1270007167541575854", role: "Chief Executive Officer", portfolio: "" },
    ]},
    { group: "Executives", members: [
      { id: "1117674442496159808", role: "Chief Management Officer", portfolio: "https://rize67.carrd.co/" },
      { id: "776776698104381440", role: "Chief Strategy Officer", portfolio: "https://amro1.netlify.app/" },
      { id: "1407208361560113162", role: "Chief Production Officer", portfolio: "https://tiredportfolioo.netlify.app/" },
      { id: "958354953301274694", role: "Chief Creative Officer", portfolio: "https://notrical.carrd.co/" },

    ]}
  ]
};
