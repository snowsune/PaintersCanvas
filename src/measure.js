/**
 * World size measurement
 * -----------------------
 * A "measure" is just a span between two named joints. The scale canvas maps
 * that pixel span onto a real-world length (inches today).
 *
 *   height:  { from: "origin", to: "top",          axis: "y" }
 *   head h:  { from: "origin", to: "top-of-head",  axis: "y" }
 *   length:  { from: "nose",   to: "tail",         axis: "x" }  // same math
 *
 * Accuracy rule: world size ALWAYS comes from joints after compose/bake.
 * Part scales (big head, tiny hands) only change proportions; they change the
 * pixel span, and draw-scale is recomputed so inches stay exact.
 *
 * Image space: origin top-left, +x right, +y down (canvas convention).
 * World space for the scale canvas today: ground at origin, +y up.
 */

/**
 * @typedef {'x' | 'y'} Axis
 *
 * @typedef {{
 *   from: string,
 *   to: string,
 *   axis?: Axis,
 * }} MeasureSpec
 */

/** @type {MeasureSpec} */
export const MEASURE_HEIGHT_TOP = Object.freeze({
  from: "origin",
  to: "top",
  axis: "y",
});

/** @type {MeasureSpec} */
export const MEASURE_HEIGHT_HEAD = Object.freeze({
  from: "origin",
  to: "top-of-head",
  axis: "y",
});

/**
 * Pixel length of a joint span. Axis defaults to "y" (height).
 *
 * @param {import("./sprite.js").Sprite} sprite
 * @param {MeasureSpec} spec
 */
export function spanPixels(sprite, spec) {
  const axis = spec.axis ?? "y";
  const a = sprite.joint(spec.from);
  const b = sprite.joint(spec.to);
  const px = axis === "x" ? a.x - b.x : a.y - b.y;
  // Use absolute value so nose-to-tail order does not matter for length.
  // For height we still expect `to` above `from` (smaller y); callers validate.
  return Math.abs(px);
}

/**
 * Map a named height target (`top` / `top-of-head`) to a MeasureSpec.
 * Kept so the public ScaleCanvas API stays small.
 *
 * @param {'top' | 'top-of-head'} measure
 * @returns {MeasureSpec}
 */
export function heightMeasureSpec(measure) {
  return measure === "top-of-head" ? MEASURE_HEIGHT_HEAD : MEASURE_HEIGHT_TOP;
}
