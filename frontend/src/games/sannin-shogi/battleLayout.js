// Reserve the actual desktop footer height. Fit the board without letterbox columns.
export const BATTLE_FOOTER_HEIGHT = 53;
export function battleLayout(width, height, aspect) {
  const boardWidth = Math.max(0, Math.min(width, Math.max(0, height - BATTLE_FOOTER_HEIGHT) * aspect));
  const spare = width - boardWidth;
  const mode = width <= 900 || spare < 260 ? 'compact' : spare >= 440 ? 'wide' : 'single';
  return { mode, boardWidth };
}
