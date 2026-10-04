// The toolbar occupies 64px; this receives the remaining match area.
export function shogiBattleLayout(width, height, focused = false) {
  const fullSize = Math.max(0, Math.min(width, height - 52));
  const spare = width - fullSize;
  const mode = width <= 900 || spare < 240 ? 'compact' : spare >= 480 ? 'wide' : 'single';
  return { mode, boardSize: focused || mode === 'compact' ? fullSize : Math.min(fullSize, width - (mode === 'wide' ? 480 : 240)) };
}
