/**
 * Vixi's Painter's Canvas!
 *
 * TODO: Write some more
 */

export const name = "Painter's Canvas";
export const version = "0.1.0";
export const author = "Vixi";

export { Sprite, loadSprite } from "./sprite.js";
export { attachAt } from "./compose.js";
export {
  spanPixels,
  heightMeasureSpec,
  MEASURE_HEIGHT_TOP,
  MEASURE_HEIGHT_HEAD,
} from "./measure.js";
export {
  ScaleCanvas,
  createScaleCanvas,
  assertScaleJoints,
  canMeasureToHead,
  SCALE_JOINTS,
  SCALE_REQUIRED_JOINTS,
  SCALE_OPTIONAL_JOINTS,
} from "./scale-canvas.js";
