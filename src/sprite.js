/**
 * Sprite = one image + named joints in image pixel space.
 *
 * Joints are the whole system: attach points (`head`), ground (`origin`),
 * and size refs (`top`, `top-of-head`). JSON sidecars next to PNGs keep art
 * and metadata editable without touching library code.
 *
 * Coords: top-left origin, +x right, +y down (HTML canvas).
 *
 * @typedef {{ x: number, y: number }} Joint
 */

/**
 * You can use the black mask for tint/color
 *
 * @param {CanvasImageSource} source
 * @param {string} color CSS color (e.g. "#c45c26", "rebeccapurple")
 * @returns {Promise<HTMLImageElement>}
 */
export async function tintMask(source, color) {
  const width =
    /** @type {any} */ (source).naturalWidth ??
    /** @type {any} */ (source).videoWidth ??
    /** @type {any} */ (source).width;
  const height =
    /** @type {any} */ (source).naturalHeight ??
    /** @type {any} */ (source).videoHeight ??
    /** @type {any} */ (source).height;

  if (!(width > 0 && height > 0)) {
    throw new Error("tintMask(): source has no dimensions yet");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("tintMask(): could not get 2d context");
  }

  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  const image = new Image();
  image.src = canvas.toDataURL("image/png");
  if (image.decode) {
    await image.decode();
  } else {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("tintMask(): failed to decode"));
    });
  }
  return image;
}

/**
 * Loaded sprite ready to attach / place on a canvas.
 */
export class Sprite {
  /**
   * @param {{
   *   name: string,
   *   image: HTMLImageElement,
   *   joints: Record<string, Joint>,
   *   color?: string | null,
   * }} opts
   */
  constructor({ name, image, joints, color = null }) {
    this.name = name;
    this.image = image;
    /** @type {string | null} */
    this.color = color;
    /** @type {Readonly<Record<string, Joint>>} */
    this.joints = Object.freeze(
      Object.fromEntries(
        Object.entries(joints).map(([key, { x, y }]) => [
          key,
          Object.freeze({ x, y }),
        ]),
      ),
    );
  }

  get width() {
    return this.image.naturalWidth;
  }

  get height() {
    return this.image.naturalHeight;
  }

  /** @param {string} name */
  hasJoint(name) {
    return Object.prototype.hasOwnProperty.call(this.joints, name);
  }

  /**
   * @param {string} name
   * @returns {Joint}
   */
  joint(name) {
    if (!this.hasJoint(name)) {
      throw new Error(`Sprite "${this.name}" has no joint "${name}!"`);
    }
    return this.joints[name];
  }

  /**
   * Recolor using an existing sprite
   *
   * @param {string} color
   * @returns {Promise<Sprite>}
   */
  async recolor(color) {
    const image = await tintMask(this.image, color);
    return new Sprite({
      name: this.name,
      image,
      joints: this.joints,
      color,
    });
  }
}

/**
 * @param {unknown} data
 * @param {string} jsonUrl
 */
function parseSpriteJson(data, jsonUrl) {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`Invalid sprite JSON at ${jsonUrl}: expected an object`);
  }

  const { name, image, joints } = /** @type {Record<string, unknown>} */ (data);

  if (typeof name !== "string" || name.length === 0) {
    throw new Error(`Invalid sprite JSON at ${jsonUrl}: "name" must be a non-empty string`);
  }
  if (typeof image !== "string" || image.length === 0) {
    throw new Error(`Invalid sprite JSON at ${jsonUrl}: "image" must be a non-empty string`);
  }
  if (joints === null || typeof joints !== "object" || Array.isArray(joints)) {
    throw new Error(`Invalid sprite JSON at ${jsonUrl}: "joints" must be an object`);
  }

  /** @type {Record<string, Joint>} */
  const parsedJoints = {};
  for (const [jointName, point] of Object.entries(joints)) {
    if (point === null || typeof point !== "object" || Array.isArray(point)) {
      throw new Error(
        `Invalid sprite JSON at ${jsonUrl}: joint "${jointName}" must be {x, y}`,
      );
    }
    const { x, y } = /** @type {Record<string, unknown>} */ (point);
    if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(
        `Invalid sprite JSON at ${jsonUrl}: joint "${jointName}" x/y must be finite numbers`,
      );
    }
    parsedJoints[jointName] = { x, y };
  }

  return { name, imagePath: image, joints: parsedJoints };
}

/**
 * @param {string} url
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Fetch a sprite JSON, load its image, then construct and return a Sprite.
 *
 * @param {string} jsonUrl URL to the `.json` metadata file
 * @param {{ color?: string }} [opts]
 * @returns {Promise<Sprite>}
 */
export async function loadSprite(jsonUrl, opts = {}) {
  const response = await fetch(jsonUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch sprite JSON: ${jsonUrl} (${response.status})`);
  }

  const data = await response.json();
  const { name, imagePath, joints } = parseSpriteJson(data, jsonUrl);
  const imageUrl = new URL(imagePath, new URL(jsonUrl, window.location.href)).href;
  let image = await loadImage(imageUrl);

  const color = opts.color ?? null;
  if (color) {
    image = await tintMask(image, color);
  }

  return new Sprite({ name, image, joints, color });
}
