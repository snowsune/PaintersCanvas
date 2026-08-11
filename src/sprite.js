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
 * Loaded sprite ready to attach / place on a canvas.
 */
export class Sprite {
  /**
   * @param {{
   *   name: string,
   *   image: HTMLImageElement,
   *   joints: Record<string, Joint>,
   * }} opts
   */
  constructor({ name, image, joints }) {
    this.name = name;
    this.image = image;
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
 * @returns {Promise<Sprite>}
 */
export async function loadSprite(jsonUrl) {
  const response = await fetch(jsonUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch sprite JSON: ${jsonUrl} (${response.status})`);
  }

  const data = await response.json();
  const { name, imagePath, joints } = parseSpriteJson(data, jsonUrl);
  const imageUrl = new URL(imagePath, new URL(jsonUrl, window.location.href)).href;
  const image = await loadImage(imageUrl);

  return new Sprite({ name, image, joints });
}
