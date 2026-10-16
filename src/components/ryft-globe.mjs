export class RyftGlobe {
  constructor(container, { src = "", mode = "transition" } = {}) {
    this.container = container;
    this.src = src;
    this.mode = mode;
    this.image = null;
    this.render();
  }

  render() {
    if (!this.container || !this.src) return;
    const image = document.createElement("img");
    image.className = `ryft-globe ryft-globe--${this.mode}`;
    image.src = this.src;
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.addEventListener("error", () => image.remove(), { once: true });
    this.container.replaceChildren(image);
    this.image = image;
  }
}
