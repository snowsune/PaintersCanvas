import { assertScaleJoints, resolveMeasure } from "./joints.js";
import { formatHeightInches } from "./format.js";
import { heightPixels, worldMetrics } from "./metrics.js";
import { drawGrid } from "./draw-grid.js";
import { drawHeightMark } from "./draw-marks.js";

/**
 * @typedef {import("./joints.js").HeightMeasure} HeightMeasure
 * @typedef {import("./metrics.js").PlacedSprite} PlacedSprite
 */

/**
 * Scale canvas
 * ------------
 * Places sprites in a shared world (inches) and draw them so a chosen joint
 * span comes out to the desired size (kinda no matter what)
 *
 *   1. put(sprite, { heightInches, measure })
 *   2. pixelSpan = |origin -> measure joint| on the sprite
 *   3. scene PPI fits everyone; drawScale = (heightInches * ppi) / pixelSpan
 *
 * Grid: under 30in overall -> 1in lines; otherwise foot marks + thinner 4in lines.
 * Optional dashed mark at the measure joint, sprite-width wide.
 */
export class ScaleCanvas {
  /**
   * @param {HTMLCanvasElement | HTMLElement} target
   * @param {{
   *   padding?: number,
   *   gapInches?: number,
   *   maxWidth?: number,
   *   maxHeight?: number,
   *   background?: string | null,
   *   showGrid?: boolean,
   *   showHeightMarks?: boolean,
   *   pixelRatio?: number,
   * }} [options]
   */
  constructor(target, options = {}) {
    if (target instanceof HTMLCanvasElement) {
      this.canvas = target;
    } else if (target instanceof HTMLElement) {
      this.canvas = document.createElement("canvas");
      target.appendChild(this.canvas);
    } else {
      throw new Error("createScaleCanvas expects a canvas or parent element");
    }

    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) {
      throw new Error("Could not get 2d context");
    }

    this.padding = options.padding ?? 24;
    this.gapInches = options.gapInches ?? 0.5;
    this.maxWidth = options.maxWidth ?? 900;
    this.maxHeight = options.maxHeight ?? 600;
    this.background = options.background ?? "#f0f0f0";
    this.showGrid = options.showGrid ?? true;
    this.showHeightMarks = options.showHeightMarks ?? true;
    const dpr =
      typeof options.pixelRatio === "number" && options.pixelRatio > 0
        ? options.pixelRatio
        : typeof window !== "undefined"
          ? window.devicePixelRatio || 1
          : 1;
    this.pixelRatio = Math.max(1, Math.min(dpr, 3));

    /** @type {PlacedSprite[]} */
    this._items = [];
  }

  /**
   * Size the backing store for sharp drawing on HiDPI, keep CSS layout size.
   * @param {number} cssWidth
   * @param {number} cssHeight
   */
  _setCanvasSize(cssWidth, cssHeight) {
    const dpr = this.pixelRatio;
    const w = Math.max(1, Math.ceil(cssWidth));
    const h = Math.max(1, Math.ceil(cssHeight));
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in this.ctx) {
      this.ctx.imageSmoothingQuality = "high";
    }
  }

  /** @returns {readonly PlacedSprite[]} */
  get items() {
    return this._items;
  }

  /** @deprecated use resolveMeasure from joints.js */
  static resolveMeasure(sprite, measure) {
    return resolveMeasure(sprite, measure);
  }

  /** @deprecated use heightPixels from metrics.js */
  static heightPixels(sprite, measure) {
    return heightPixels(sprite, measure);
  }

  /** @deprecated use worldMetrics from metrics.js */
  static worldMetrics(item) {
    return worldMetrics(item);
  }

  /**
   * Place a sprite at the given world height (inches).
   *
   * @param {import("../sprite.js").Sprite} sprite
   * @param {{
   *   heightInches: number,
   *   measure?: HeightMeasure,
   *   heightMark?: boolean,
   *   label?: string,
   *   caption?: string,
   * }} opts
   * @returns {ScaleCanvas}
   */
  put(sprite, opts) {
    if (!opts || typeof opts.heightInches !== "number" || !(opts.heightInches > 0)) {
      throw new Error("put() requires { heightInches: positive number }");
    }
    assertScaleJoints(sprite);
    const measure = resolveMeasure(sprite, opts.measure);
    this._items.push({
      sprite,
      heightInches: opts.heightInches,
      measure,
      heightMark: opts.heightMark ?? true,
      label: opts.label,
      caption: opts.caption,
    });
    this.render();
    return this;
  }

  /**
   * Change how an item's heightInches is measured (`top` vs `top-of-head`).
   * @param {number} index
   * @param {HeightMeasure} measure
   */
  setMeasure(index, measure) {
    const item = this._items[index];
    if (!item) {
      throw new Error(`setMeasure(): bad index ${index}`);
    }
    item.measure = resolveMeasure(item.sprite, measure);
    this.render();
    return this;
  }

  /**
   * Toggle the dashed measure line for one placed sprite.
   * @param {number} index
   * @param {boolean} [on]
   */
  setHeightMark(index, on) {
    const item = this._items[index];
    if (!item) {
      throw new Error(`setHeightMark(): bad index ${index}`);
    }
    item.heightMark = on ?? !item.heightMark;
    this.render();
    return this;
  }

  /** @param {boolean} on */
  setShowGrid(on) {
    this.showGrid = Boolean(on);
    this.render();
    return this;
  }

  /** @param {boolean} on */
  setShowHeightMarks(on) {
    this.showHeightMarks = Boolean(on);
    this.render();
    return this;
  }

  /**
   * Snapshot the current scene as a PNG blob.
   * Optionally re-fit into a fixed frame
   *
   * @param {{
   *   maxWidth?: number,
   *   maxHeight?: number,
   *   pixelRatio?: number,
   *   frameWidth?: number,
   *   frameHeight?: number,
   *   frameBackground?: string | null,
   * }} [opts]
   * @returns {Promise<Blob>}
   */
  async exportPngBlob(opts = {}) {
    const prev = {
      maxWidth: this.maxWidth,
      maxHeight: this.maxHeight,
      pixelRatio: this.pixelRatio,
    };

    if (typeof opts.maxWidth === "number") this.maxWidth = opts.maxWidth;
    if (typeof opts.maxHeight === "number") this.maxHeight = opts.maxHeight;
    if (typeof opts.pixelRatio === "number") {
      this.pixelRatio = Math.max(1, Math.min(opts.pixelRatio, 3));
    } else {
      // exports should be crisp without depending on the viewer's screen
      this.pixelRatio = 1;
    }

    try {
      this.render();

      const src = this.canvas;
      const frameW = opts.frameWidth;
      const frameH = opts.frameHeight;

      /** @type {HTMLCanvasElement} */
      let exportCanvas = src;
      if (frameW && frameH) {
        exportCanvas = document.createElement("canvas");
        exportCanvas.width = frameW;
        exportCanvas.height = frameH;
        const ectx = exportCanvas.getContext("2d");
        if (!ectx) throw new Error("exportPngBlob(): no 2d context");

        const bg = opts.frameBackground ?? this.background ?? "#ffffff";
        if (bg) {
          ectx.fillStyle = bg;
          ectx.fillRect(0, 0, frameW, frameH);
        }

        // canvas is already in device pixels (== css when pixelRatio is 1)
        const sw = src.width;
        const sh = src.height;
        const scale = Math.min(frameW / sw, frameH / sh);
        const dw = sw * scale;
        const dh = sh * scale;
        ectx.imageSmoothingEnabled = true;
        if ("imageSmoothingQuality" in ectx) {
          ectx.imageSmoothingQuality = "high";
        }
        ectx.drawImage(src, (frameW - dw) / 2, (frameH - dh) / 2, dw, dh);
      }

      const blob = await new Promise((resolve, reject) => {
        exportCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("exportPngBlob(): toBlob failed"))),
          "image/png",
        );
      });
      return blob;
    } finally {
      this.maxWidth = prev.maxWidth;
      this.maxHeight = prev.maxHeight;
      this.pixelRatio = prev.pixelRatio;
      this.render();
    }
  }

  /**
   * Swap the art on placed items that still reference `from`, keeping each
   * item's heightInches (and measure when still valid). Height stays accurate
   * because draw scale is always derived from origin to measure joints.
   *
   * @param {import("../sprite.js").Sprite} from
   * @param {import("../sprite.js").Sprite} to
   * @returns {ScaleCanvas}
   */
  replaceSprite(from, to) {
    assertScaleJoints(to);
    for (const item of this._items) {
      if (item.sprite !== from) continue;
      item.sprite = to;
      if (item.measure === "top-of-head" && !to.hasJoint("top-of-head")) {
        item.measure = "top";
      } else {
        item.measure = resolveMeasure(to, item.measure);
      }
    }
    this.render();
    return this;
  }

  /**
   * Remove one placed sprite by index.
   * @param {number} index
   * @returns {ScaleCanvas}
   */
  remove(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this._items.length) {
      throw new Error(`remove(): bad index ${index}`);
    }
    this._items.splice(index, 1);
    this.render();
    return this;
  }

  /** Remove all sprites and clear the canvas. */
  clear() {
    this._items = [];
    this.render();
    return this;
  }

  render() {
    const ctx = this.ctx;
    const pad = this.padding;
    const labelGutter = this.showGrid ? 36 : 0;

    if (this._items.length === 0) {
      this._setCanvasSize(320, 180);
      if (this.background) {
        ctx.fillStyle = this.background;
        ctx.fillRect(0, 0, 320, 180);
      } else {
        ctx.clearRect(0, 0, 320, 180);
      }
      return this;
    }

    const metrics = this._items.map((item) => worldMetrics(item));

    let totalWidthInches = 0;
    for (let i = 0; i < metrics.length; i++) {
      totalWidthInches += metrics[i].widthInches;
      if (i < metrics.length - 1) totalWidthInches += this.gapInches;
    }

    let maxAbove = 0;
    let maxBelow = 0;
    let overallInches = 0;
    for (let i = 0; i < this._items.length; i++) {
      maxAbove = Math.max(maxAbove, metrics[i].aboveOriginInches);
      maxBelow = Math.max(maxBelow, metrics[i].belowOriginInches);
      overallInches = Math.max(overallInches, this._items[i].heightInches);
    }

    const totalHeightInches = maxAbove + maxBelow;
    const captionRoom = this._items.some((item) => item.caption) ? 36 : 0;
    const innerMaxW = Math.max(1, this.maxWidth - pad * 2 - labelGutter);
    const innerMaxH = Math.max(1, this.maxHeight - pad * 2 - captionRoom);
    const ppi = Math.min(
      innerMaxW / totalWidthInches,
      innerMaxH / totalHeightInches,
    );

    const contentLeft = pad + labelGutter;
    const width = Math.ceil(totalWidthInches * ppi + contentLeft + pad);
    const height = Math.ceil(totalHeightInches * ppi + pad * 2 + captionRoom);
    this._setCanvasSize(width, height);

    if (this.background) {
      ctx.fillStyle = this.background;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    const groundY = pad + maxAbove * ppi;
    const contentRight = width - pad;

    if (this.showGrid) {
      drawGrid(ctx, {
        groundY,
        maxAbove,
        ppi,
        left: contentLeft,
        right: contentRight,
        overallInches,
      });
    } else {
      ctx.strokeStyle = "#bbb";
      ctx.beginPath();
      ctx.moveTo(contentLeft, groundY);
      ctx.lineTo(contentRight, groundY);
      ctx.stroke();
    }

    let cursorX = contentLeft;
    /** @type {{ slotLeft: number, widthPx: number, markY: number, label: string }[]} */
    const marks = [];
    /** @type {{ x: number, text: string, color: string }[]} */
    const captions = [];

    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i];
      const m = metrics[i];
      const { sprite, heightInches } = item;
      const drawScale = (heightInches * ppi) / m.heightPx;
      const origin = sprite.joint("origin");

      const originCanvasX = cursorX + m.originXInches * ppi;
      const originCanvasY = groundY;
      const widthPx = m.widthInches * ppi;

      ctx.save();
      ctx.translate(originCanvasX, originCanvasY);
      ctx.scale(drawScale, drawScale);
      ctx.drawImage(sprite.image, -origin.x, -origin.y);
      ctx.restore();

      if (this.showHeightMarks && item.heightMark) {
        // heightInches is exactly the origin -> measure-joint span in world space
        const markY = groundY - heightInches * ppi;
        marks.push({
          slotLeft: cursorX,
          widthPx,
          markY,
          // Custom label is used as-is; otherwise name + height
          label:
            item.label ??
            `${sprite.name} ${formatHeightInches(heightInches)}`,
        });
      }

      if (item.caption) {
        captions.push({
          x: originCanvasX,
          text: item.caption,
          color: sprite.color || "#222",
        });
      }

      cursorX += widthPx;
      if (i < this._items.length - 1) {
        cursorX += this.gapInches * ppi;
      }
    }

    for (const mark of marks) {
      drawHeightMark(ctx, mark);
    }

    if (captions.length) {
      ctx.save();
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (const cap of captions) {
        ctx.fillStyle = cap.color;
        ctx.fillText(cap.text, cap.x, groundY + 8);
      }
      ctx.restore();
    }

    return this;
  }
}

/**
 * @param {HTMLCanvasElement | HTMLElement} target
 * @param {ConstructorParameters<typeof ScaleCanvas>[1]} [options]
 */
export function createScaleCanvas(target, options) {
  return new ScaleCanvas(target, options);
}
