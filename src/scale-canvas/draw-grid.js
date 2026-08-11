import { FINE_GRID_BELOW_INCHES } from "./format.js";

/**
 * Draw horizontal scale lines + left labels.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *   groundY: number,
 *   maxAbove: number,
 *   ppi: number,
 *   left: number,
 *   right: number,
 *   overallInches: number,
 * }} layout
 */
export function drawGrid(ctx, layout) {
  const { groundY, maxAbove, ppi, left, right, overallInches } = layout;
  const fine = overallInches < FINE_GRID_BELOW_INCHES;
  const step = fine ? 1 : 4;
  const topInches = Math.ceil(maxAbove);

  ctx.save();
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.font = "11px sans-serif";

  for (let inches = step; inches <= topInches; inches += step) {
    const y = groundY - inches * ppi;
    const isFoot = inches % 12 === 0;
    const isMajor = fine || isFoot;

    ctx.strokeStyle = isMajor ? "#b0b0b0" : "#d4d4d4";
    ctx.lineWidth = isMajor ? 1.25 : 0.75;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();

    if (fine || isFoot) {
      ctx.fillStyle = "#888";
      const label = fine ? `${inches}"` : `${inches / 12}'`;
      ctx.fillText(label, left - 6, y);
    }
  }

  // Ground / zero line (heavier, like the reference chart)
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left, groundY);
  ctx.lineTo(right, groundY);
  ctx.stroke();
  ctx.fillStyle = "#666";
  ctx.fillText(fine ? '0"' : "0'", left - 6, groundY);
  ctx.restore();
}
