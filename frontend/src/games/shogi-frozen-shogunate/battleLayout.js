// The 56px toolbar is outside this area. Stretch the calibrated board and
// hit grid together; the footer needs 44px and the tall pieces retain their
// original proportions inside the resulting rectangular cells.
export const SHOGI_BOARD_ASPECT = 0.8;
export function shogiBattleLayout(width, height, focused = false) {
  const boardHeight = Math.max(0, Math.min(width / SHOGI_BOARD_ASPECT, height - 44));
  const fullSize = boardHeight * SHOGI_BOARD_ASPECT;
  const spare = width - fullSize;
  const mode = width <= 900 || spare < 240 ? 'compact' : spare >= 480 ? 'wide' : 'single';
  const boardSize = focused || mode === 'compact' ? fullSize : Math.min(fullSize, width - (mode === 'wide' ? 480 : 240));
  return { mode, boardSize, boardHeight: boardSize / SHOGI_BOARD_ASPECT };
}
