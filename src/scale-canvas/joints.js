/** Always required for scale placement. */
export const SCALE_REQUIRED_JOINTS = Object.freeze(["origin", "top"]);

/** Optional: enables toggling height-to-head vs total height (ears/horns/antlers). */
export const SCALE_OPTIONAL_JOINTS = Object.freeze(["top-of-head"]);

/** @deprecated use SCALE_REQUIRED_JOINTS */
export const SCALE_JOINTS = SCALE_REQUIRED_JOINTS;

/**
 * @typedef {'top' | 'top-of-head'} HeightMeasure
 */

/**
 * @param {import("../sprite.js").Sprite} sprite
 * @returns {boolean}
 */
export function canMeasureToHead(sprite) {
  return sprite.hasJoint("top-of-head");
}

/**
 * @param {import("../sprite.js").Sprite} sprite
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
 * @param {import("../sprite.js").Sprite} sprite
 * @param {HeightMeasure | undefined} measure
 * @returns {HeightMeasure}
 */
export function resolveMeasure(sprite, measure) {
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
