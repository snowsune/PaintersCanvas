/**
 * Scale canvas package
 * --------------------
 *   joints.js       required joints + measure resolution
 *   format.js       height labels + fine-grid threshold
 *   metrics.js      world-space sizes from joints
 *   draw-grid.js    inch / foot background lines
 *   draw-marks.js   dashed per-sprite height marks
 *   scale-canvas.js ScaleCanvas class + createScaleCanvas
 */

export {
  SCALE_REQUIRED_JOINTS,
  SCALE_OPTIONAL_JOINTS,
  SCALE_JOINTS,
  canMeasureToHead,
  assertScaleJoints,
  resolveMeasure,
} from "./joints.js";

export { FINE_GRID_BELOW_INCHES, formatHeightInches } from "./format.js";

export { heightPixels, worldMetrics } from "./metrics.js";

export { ScaleCanvas, createScaleCanvas } from "./scale-canvas.js";
