import { heightMeasureSpec, spanPixels } from "./measure.js";

/**
 * Scale canvas
 * ------------
 * Places sprites in a shared world (inches) and draw them so a chosen joint
 * span comes out to the desired size (kinda no matter what)
 *
 *   1. put(sprite, { heightInches, measure })
 *   2. pixelSpan = |origin -> measure joint| on the sprite
 *   3. scene PPI fits everyone; drawScale = (heightInches * ppi) / pixelSpan
 */

/** Always required for scale placement. */
export const SCALE_REQUIRED_JOINTS = Object.freeze(["origin", "top"]);

/** Optional: enables toggling height-to-head vs total height (ears/horns/antlers). */
export const SCALE_OPTIONAL_JOINTS = Object.freeze(["top-of-head"]);

/** @deprecated use SCALE_REQUIRED_JOINTS */
export const SCALE_JOINTS = SCALE_REQUIRED_JOINTS;

/**
 * @param {import("./sprite.js").Sprite} sprite
 * @returns {boolean}
 */
export function canMeasureToHead(sprite) {
  return sprite.hasJoint("top-of-head");
}

/**
 * @param {import("./sprite.js").Sprite} sprite
 */
export function assertScaleJoints(sprite) {
  for (const name of SCALE_REQUIRED_JOINTS) {
    if (!sprite.hasJoint(name)) {
      throw new Error(
        `Sprite "${sprite.name}" is missing required scale joint "${name}"`,
      );
    }
  }

  const origin = sprite.joint("origin");
  const top = sprite.joint("top");

  if (!(top.y < origin.y)) {
    throw new Error(
      `Sprite "${sprite.name}": top must be above origin (smaller y)`,
    );
  }

  if (sprite.hasJoint("top-of-head")) {
    const head = sprite.joint("top-of-head");
    if (!(head.y < origin.y)) {
      throw new Error(
        `Sprite "${sprite.name}": top-of-head must be above origin (smaller y)`,
      );
    }
    if (!(top.y <= head.y)) {
      throw new Error(
        `Sprite "${sprite.name}": top must be at or above top-of-head (smaller or equal y)`,
      );
    }
  }
}

/**
 * @typedef {'top' | 'top-of-head'} HeightMeasure
 *
 * @typedef {{
 *   sprite: import("./sprite.js").Sprite,
 *   heightInches: number,
 *   measure: HeightMeasure,
 * }} PlacedSprite
 */

/**
 * Scale canvas
 * ------------
 * Drop in sprites with a real-world height (inches).
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

    /** @type {PlacedSprite[]} */
    this._items = [];
  }

  /** @returns {readonly PlacedSprite[]} */
  get items() {
    return this._items;
  }

  /**
   * @param {import("./sprite.js").Sprite} sprite
   * @param {HeightMeasure | undefined} measure
   * @returns {HeightMeasure}
   */
  static resolveMeasure(sprite, measure) {
    if (measure === "top-of-head") {
      if (!sprite.hasJoint("top-of-head")) {
        throw new Error(
          `Sprite "${sprite.name}" has no top-of-head joint (cannot toggle head height)`,
        );
      }
      return "top-of-head";
    }
    if (measure === "top" || measure === undefined) {
      return "top";
    }
    throw new Error(`Unknown height measure "${measure}"`);
  }

  /**
   * Place a sprite at the given world height (inches).
   *
   * @param {import("./sprite.js").Sprite} sprite
   * @param {{ heightInches: number, measure?: HeightMeasure }} opts
   * @returns {ScaleCanvas}
   */
  put(sprite, opts) {
    if (!opts || typeof opts.heightInches !== "number" || !(opts.heightInches > 0)) {
      throw new Error("put() requires { heightInches: positive number }");
    }
    assertScaleJoints(sprite);
    const measure = ScaleCanvas.resolveMeasure(sprite, opts.measure);
    this._items.push({ sprite, heightInches: opts.heightInches, measure });
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
    item.measure = ScaleCanvas.resolveMeasure(item.sprite, measure);
    this.render();
    return this;
  }

  /**
   * Swap the art on placed items that still reference `from`, keeping each
   * item's heightInches (and measure when still valid). Height stays accurate
   * because draw scale is always derived from origin to measure joints.
   *
   * @param {import("./sprite.js").Sprite} from
   * @param {import("./sprite.js").Sprite} to
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
        item.measure = ScaleCanvas.resolveMeasure(to, item.measure);
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

  /**
   * Pixel span used for the declared world height (origin to measure joint).
   * @param {import("./sprite.js").Sprite} sprite
   * @param {HeightMeasure} measure
   */
  static heightPixels(sprite, measure) {
    return spanPixels(sprite, heightMeasureSpec(measure));
  }

  /**
   * World-space (inches) metrics for a placed sprite.
   * Ground is y=0 at origin; +y is up.
   * @param {PlacedSprite} item
   */
  static worldMetrics(item) {
    const { sprite, heightInches, measure } = item;
    const origin = sprite.joint("origin");
    const heightPx = ScaleCanvas.heightPixels(sprite, measure);
    const inchesPerPixel = heightInches / heightPx;

    const widthInches = sprite.width * inchesPerPixel;
    const aboveOriginInches = origin.y * inchesPerPixel;
    const belowOriginInches = (sprite.height - origin.y) * inchesPerPixel;
    const topInches = (origin.y - sprite.joint("top").y) * inchesPerPixel;
    const topOfHeadInches = sprite.hasJoint("top-of-head")
      ? (origin.y - sprite.joint("top-of-head").y) * inchesPerPixel
      : null;
    const originXInches = origin.x * inchesPerPixel;

    return {
      widthInches,
      aboveOriginInches,
      belowOriginInches,
      topInches,
      topOfHeadInches,
      originXInches,
      inchesPerPixel,
      heightPx,
      measure,
    };
  }

  render() {
    const ctx = this.ctx;
    const pad = this.padding;

    if (this._items.length === 0) {
      this.canvas.width = 320;
      this.canvas.height = 180;
      if (this.background) {
        ctx.fillStyle = this.background;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      } else {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
      return this;
    }

    const metrics = this._items.map((item) => ScaleCanvas.worldMetrics(item));

    let totalWidthInches = 0;
    for (let i = 0; i < metrics.length; i++) {
      totalWidthInches += metrics[i].widthInches;
      if (i < metrics.length - 1) totalWidthInches += this.gapInches;
    }

    let maxAbove = 0;
    let maxBelow = 0;
    for (const m of metrics) {
      maxAbove = Math.max(maxAbove, m.aboveOriginInches);
      maxBelow = Math.max(maxBelow, m.belowOriginInches);
    }

    const totalHeightInches = maxAbove + maxBelow;
    const innerMaxW = Math.max(1, this.maxWidth - pad * 2);
    const innerMaxH = Math.max(1, this.maxHeight - pad * 2);
    const ppi = Math.min(
      innerMaxW / totalWidthInches,
      innerMaxH / totalHeightInches,
    );

    const width = Math.ceil(totalWidthInches * ppi + pad * 2);
    const height = Math.ceil(totalHeightInches * ppi + pad * 2);
    this.canvas.width = width;
    this.canvas.height = height;

    if (this.background) {
      ctx.fillStyle = this.background;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    const groundY = pad + maxAbove * ppi;
    ctx.strokeStyle = "#bbb";
    ctx.beginPath();
    ctx.moveTo(pad, groundY);
    ctx.lineTo(width - pad, groundY);
    ctx.stroke();

    let cursorX = pad;
    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i];
      const m = metrics[i];
      const { sprite, heightInches } = item;
      const drawScale = (heightInches * ppi) / m.heightPx;
      const origin = sprite.joint("origin");

      const originCanvasX = cursorX + m.originXInches * ppi;
      const originCanvasY = groundY;

      ctx.save();
      ctx.translate(originCanvasX, originCanvasY);
      ctx.scale(drawScale, drawScale);
      ctx.drawImage(sprite.image, -origin.x, -origin.y);
      ctx.restore();

      cursorX += m.widthInches * ppi;
      if (i < this._items.length - 1) {
        cursorX += this.gapInches * ppi;
      }
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
