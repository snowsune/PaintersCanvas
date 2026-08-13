/**
 * Node entry: install a minimal DOM canvas shim via @napi-rs/canvas so the
 * browser-oriented APIs (document.createElement, Image, fetch(file:), …)
 * work under Node for server-side rendering.
 *
 *   import { installNodeCanvas } from "painters-canvas/node";
 *   await installNodeCanvas();
 *   // then import / use the rest of painters-canvas as usual
 */

import { createCanvas, Image as SkImage } from "@napi-rs/canvas";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

let installed = false;

/**
 * @returns {Promise<void>}
 */
export async function installNodeCanvas() {
  if (installed) return;
  installed = true;

  class HTMLElement {}
  class HTMLCanvasElement {}
  globalThis.HTMLElement = HTMLElement;
  globalThis.HTMLCanvasElement = HTMLCanvasElement;

  // Make every napi Canvas pass `instanceof HTMLCanvasElement`.
  const probe = createCanvas(1, 1);
  Object.setPrototypeOf(Object.getPrototypeOf(probe), HTMLCanvasElement.prototype);

  /** @param {string} src */
  function loadableSrc(src) {
    if (typeof src === "string" && src.startsWith("file:")) {
      return fileURLToPath(src);
    }
    return src;
  }

  // Browser-like Image: path / Buffer / data URL / http(s). file: → filesystem path.
  globalThis.Image = class Image extends SkImage {
    /** @param {string | Buffer} value */
    set src(value) {
      super.src = typeof value === "string" ? loadableSrc(value) : value;
    }
    get src() {
      return super.src;
    }
  };

  globalThis.document = {
    /**
     * @param {string} tag
     * @returns {import("@napi-rs/canvas").Canvas}
     */
    createElement(tag) {
      if (String(tag).toLowerCase() !== "canvas") {
        throw new Error(`document.createElement("${tag}") is not supported in Node`);
      }
      const canvas = createCanvas(300, 150);
      if (!canvas.style) {
        canvas.style = {};
      }
      return canvas;
    },
  };

  if (!globalThis.window) {
    globalThis.window = globalThis;
  }
  if (!globalThis.location) {
    globalThis.location = { href: "file:///" };
  }
  if (!globalThis.window.location) {
    globalThis.window.location = globalThis.location;
  }

  const origFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : String(input?.url ?? input);
    if (url.startsWith("file:")) {
      const body = await readFile(fileURLToPath(url));
      const lower = url.toLowerCase();
      const type = lower.endsWith(".json")
        ? "application/json"
        : lower.endsWith(".png")
          ? "image/png"
          : "application/octet-stream";
      return new Response(body, {
        status: 200,
        headers: { "Content-Type": type },
      });
    }
    return origFetch(input, init);
  };
}

export { createCanvas, SkImage as Image };
