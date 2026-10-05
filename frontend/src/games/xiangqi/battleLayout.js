// Keep the intersection field undistorted. Working panels use the spare width.
export const XIANGQI_BOARD_ASPECT = 832 / 870;
export function xiangqiBattleLayout(width, height, focused = false) {
  const availableWidth = Math.max(0, width), availableHeight = Math.max(0, height - 44);
  const fitWidth = Math.min(availableWidth, availableHeight * XIANGQI_BOARD_ASPECT);
  const spare = availableWidth - fitWidth;
  const mode = spare >= 440 ? 'wide' : spare >= 250 && width > 600 ? 'single' : 'compact';
  const boardHeight = Math.min(Math.max(0, availableHeight - (mode === 'compact' && !focused ? 48 : 0)), availableWidth / XIANGQI_BOARD_ASPECT);
  return { mode, boardWidth: boardHeight * XIANGQI_BOARD_ASPECT, boardHeight, briefingHeight: Math.max(0, availableHeight - 48 - boardHeight) };
}
