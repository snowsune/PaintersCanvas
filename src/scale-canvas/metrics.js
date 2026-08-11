import { heightMeasureSpec, spanPixels } from "../measure.js";

/**
 * @typedef {import("./joints.js").HeightMeasure} HeightMeasure
 *
 * @typedef {{
 *   sprite: import("../sprite.js").Sprite,
 *   heightInches: number,
 *   measure: HeightMeasure,
 *   heightMark: boolean,
 *   label?: string,
 *   caption?: string,
 * }} PlacedSprite
 *
 * @typedef {{
 *   widthInches: number,
 *   aboveOriginInches: number,
 *   belowOriginInches: number,
 *   topInches: number,
 *   topOfHeadInches: number | null,
 *   originXInches: number,
 *   inchesPerPixel: number,
 *   heightPx: number,
 *   measure: HeightMeasure,
 * }} WorldMetrics
 */

/**
 * Pixel span used for the declared world height (origin to measure joint).
 * @param {import("../sprite.js").Sprite} sprite
 * @param {HeightMeasure} measure
 */
export function heightPixels(sprite, measure) {
  return spanPixels(sprite, heightMeasureSpec(measure));
}

/**
 * World-space (inches) metrics for a placed sprite.
 * Ground is y=0 at origin; +y is up.
 * @param {PlacedSprite} item
 * @returns {WorldMetrics}
 */
export function worldMetrics(item) {
  const { sprite, heightInches, measure } = item;
  const origin = sprite.joint("origin");
  const heightPx = heightPixels(sprite, measure);
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
