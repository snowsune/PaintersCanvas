/**
 * Dashed height marks + labels that try not to sit on the sprites.
 *
 * Prefer floating the label *above* that character (clear of ears/antlers).
 * Only spill left/right if we run out of vertical room — and never park a
 * label over the neighbor's slot if we can help it.
 */

const FONT = "12px sans-serif";
const LINE_HEIGHT = 14;
const MARK_GAP = 6;

/**
 * @param {string} label
 * @returns {string[]}
 */
function labelLines(label) {
  return String(label)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string[]} lines
 */
function measureLabel(ctx, lines) {
  ctx.save();
  ctx.font = FONT;
  let width = 0;
  for (const line of lines) {
    width = Math.max(width, ctx.measureText(line).width);
  }
  ctx.restore();
  return {
    width,
    height: Math.max(LINE_HEIGHT, lines.length * LINE_HEIGHT),
  };
}

/**
 * @param {number} left
 * @param {number} right
 * @param {number} top
 * @param {number} bottom
 * @param {{ left: number, right: number, top: number, bottom: number }} box
 */
function overlaps(left, right, top, bottom, box) {
  return left < box.right && right > box.left && top < box.bottom && bottom > box.top;
}

/**
 * @param {CanvasTextAlign} align
 * @param {number} textX
 * @param {number} width
 */
function textBoundsX(align, textX, width) {
  if (align === "left") return { left: textX, right: textX + width };
  if (align === "center") return { left: textX - width / 2, right: textX + width / 2 };
  return { left: textX - width, right: textX };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *   slotLeft: number,
 *   widthPx: number,
 *   markY: number,
 *   spriteTopY?: number,
 *   label: string,
 * }[]} marks
 * @param {{ canvasWidth: number, groundY: number }} bounds
 */
export function layoutHeightMarks(ctx, marks, bounds) {
  const { canvasWidth, groundY } = bounds;

  // Full sprite AABB (not just origin→measure), so ears above the mark count
  const bodies = marks.map((mark) => ({
    left: mark.slotLeft,
    right: mark.slotLeft + mark.widthPx,
    top: mark.spriteTopY ?? mark.markY,
    bottom: groundY,
  }));

  /** @type {{
   *   slotLeft: number,
   *   widthPx: number,
   *   markY: number,
   *   label: string,
   *   lines: string[],
   *   textX: number,
   *   textY: number,
   *   align: CanvasTextAlign,
   *   _w: number,
   *   _h: number,
   * }[]} */
  const laid = marks.map((mark, index) => {
    const lines = labelLines(mark.label);
    const size = measureLabel(ctx, lines);
    const x0 = mark.slotLeft;
    const x1 = mark.slotLeft + mark.widthPx;
    const mid = (x0 + x1) / 2;
    const spriteTop = mark.spriteTopY ?? mark.markY;
    const ownBody = bodies[index];

    /** @type {{ align: CanvasTextAlign, textX: number }[]} */
    const candidates = [
      // stay with this character: above their head, anchored to the mark
      { align: "right", textX: x1 },
      { align: "center", textX: mid },
      { align: "left", textX: x0 },
      // side pockets between characters (last resort)
      { align: "right", textX: x0 - MARK_GAP },
      { align: "left", textX: x1 + MARK_GAP },
    ];

    const fits = (align, textX, y, allowOwnAbove) => {
      const { left, right } = textBoundsX(align, textX, size.width);
      const top = y - size.height;
      const bottom = y;
      if (left < 4 || right > canvasWidth - 4 || top < 2) return false;

      for (let bi = 0; bi < bodies.length; bi++) {
        const body = bodies[bi];
        if (bi === index && allowOwnAbove && bottom <= body.top + 1) {
          // sitting fully above our own sprite is fine
          continue;
        }
        if (overlaps(left, right, top, bottom, body)) return false;
      }
      return true;
    };

    let chosen = candidates[0];
    let textY = spriteTop - 4;
    let placed = false;

    for (const cand of candidates) {
      const isAbove =
        cand.textX === x1 || cand.textX === mid || cand.textX === x0;
      for (let lift = 0; lift < 10; lift++) {
        const y = (isAbove ? spriteTop : mark.markY) - 4 - lift * (LINE_HEIGHT + 2);
        if (fits(cand.align, cand.textX, y, isAbove)) {
          chosen = cand;
          textY = y;
          placed = true;
          break;
        }
      }
      if (placed) break;
    }

    if (!placed) {
      // keep it with this character even if tight
      chosen = { align: "right", textX: x1 };
      textY = Math.max(size.height + 2, spriteTop - 4);
    }

    return {
      slotLeft: mark.slotLeft,
      widthPx: mark.widthPx,
      markY: mark.markY,
      label: mark.label,
      lines,
      textX: chosen.textX,
      textY,
      align: chosen.align,
      _w: size.width,
      _h: size.height,
      _own: ownBody,
    };
  });

  // Separate labels that still overlap each other (keep X, nudge up)
  const order = [...laid.keys()].sort((a, b) => laid[a].textY - laid[b].textY);
  for (let oi = 0; oi < order.length; oi++) {
    const a = laid[order[oi]];
    const aBox = textBoundsX(a.align, a.textX, a._w);

    for (let oj = 0; oj < oi; oj++) {
      const b = laid[order[oj]];
      const bBox = textBoundsX(b.align, b.textX, b._w);
      const bTop = b.textY - b._h;

      const overlapX = aBox.left < bBox.right + 4 && aBox.right > bBox.left - 4;
      const overlapY = a.textY - a._h < b.textY + 2 && a.textY > bTop - 2;
      if (overlapX && overlapY) {
        a.textY = bTop - 4;
      }
    }
  }

  return laid.map(({ _w, _h, _own, ...rest }) => rest);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *   slotLeft: number,
 *   widthPx: number,
 *   markY: number,
 *   label: string,
 *   lines?: string[],
 *   textX?: number,
 *   textY?: number,
 *   align?: CanvasTextAlign,
 * }} mark
 */
export function drawHeightMark(ctx, mark) {
  const { slotLeft, widthPx, markY } = mark;
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

  const lines = mark.lines ?? labelLines(mark.label);
  const textX = mark.textX ?? x1;
  const textY = mark.textY ?? markY - 4;
  const align = mark.align ?? "right";

  ctx.fillStyle = "#7a8490";
  ctx.font = FONT;
  ctx.textAlign = align;
  ctx.textBaseline = "bottom";

  let y = textY;
  for (let i = lines.length - 1; i >= 0; i--) {
    ctx.fillText(lines[i], textX, y);
    y -= LINE_HEIGHT;
  }
  ctx.restore();
}
