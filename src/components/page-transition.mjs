import { RyftGlobe } from "./ryft-globe.mjs";

export class PageTransition {
  constructor({ layer, globe, logoPath }) {
    this.layer = layer;
    this.globe = globe;
    this.logoPath = logoPath;
    this.busy = false;
  }

  async run(updatePage) {
    if (this.busy) return;
    this.busy = true;
    this.layer.classList.remove("is-exiting");
    this.layer.classList.add("is-active");
    this.layer.setAttribute("aria-hidden", "false");
    new RyftGlobe(this.globe, {
      src: this.logoPath,
      mode: "transition"
    });
    try {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      await new Promise((resolve) => window.setTimeout(resolve, reducedMotion ? 0 : 560));
      await updatePage();
      this.layer.classList.add("is-exiting");
      await new Promise((resolve) => window.setTimeout(resolve, reducedMotion ? 0 : 320));
    } finally {
      this.layer.classList.remove("is-active", "is-exiting");
      this.layer.setAttribute("aria-hidden", "true");
      this.globe.replaceChildren();
      this.busy = false;
    }
  }
}
