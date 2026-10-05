// Keep the battlefield taller than it is wide, even on ultrawide displays.
// Its height drives its width; side panels share the remaining desktop space.
export const SHOGI_MAX_BOARD_ASPECT = 0.85;

export function shogiBattleLayout(width, height, focused = false) {
  const availableWidth = Math.max(0, width);
  const mode = width < 960 || height < 420 ? 'compact' : width < 1180 ? 'single' : 'wide';
  const rails = focused || mode === 'compact' ? 0 : mode === 'wide' ? 2 : 1;
  const boardHeight = Math.max(0, height - 44);
  const boardSize = Math.min(Math.max(0, availableWidth - rails * 212), boardHeight * SHOGI_MAX_BOARD_ASPECT);
  const panelWidth = rails ? (availableWidth - boardSize) / rails : 0;
  return { mode, boardSize, boardHeight, panelWidth };
}
