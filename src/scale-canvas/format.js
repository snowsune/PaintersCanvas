/** Chart uses fine 1in grid when overall height is below this. */
export const FINE_GRID_BELOW_INCHES = 30;

/**
 * @param {number} inches
 * @returns {string}
 */
export function formatHeightInches(inches) {
  const total = Math.round(inches);
  const feet = Math.floor(total / 12);
  const rem = total - feet * 12;
  if (feet <= 0) return `${rem}"`;
  if (rem === 0) return `${feet}'`;
  return `${feet}'${rem}"`;
}
