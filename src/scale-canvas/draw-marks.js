/**
 * Dashed line at the measure joint, about one sprite wide.
 * Label may contain newlines; lines stack above the mark (last line closest).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *   slotLeft: number,
 *   widthPx: number,
 *   markY: number,
 *   label: string,
 * }} mark
 */
export function drawHeightMark(ctx, mark) {
  const { slotLeft, widthPx, markY, label } = mark;
  const x0 = slotLeft;
  const x1 = slotLeft + widthPx;

  ctx.save();
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 1.25;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x0, markY);
  ctx.lineTo(x1, markY);
  ctx.stroke();
  ctx.setLineDash([]);

  const lines = String(label)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  ctx.fillStyle = "#7a8490";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";

  const lineHeight = 14;
  let y = markY - 4;
  // Draw from bottom up so the last label line sits just above the mark
  for (let i = lines.length - 1; i >= 0; i--) {
    ctx.fillText(lines[i], x1, y);
    y -= lineHeight;
  }
  ctx.restore();
}
