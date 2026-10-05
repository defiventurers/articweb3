// The toolbar sits outside this area. Keep two compact rails on desktop;
// the battlefield consumes every remaining pixel in both directions.
export function shogiBattleLayout(width, height, focused = false) {
  const availableWidth = Math.max(0, width);
  const mode = width < 960 || height < 420 ? 'compact' : width < 1180 ? 'single' : 'wide';
  const panelWidth = Math.round(Math.min(260, Math.max(212, availableWidth * 0.14)));
  const rails = focused || mode === 'compact' ? 0 : mode === 'wide' ? 2 : 1;
  return { mode, boardSize: Math.max(0, availableWidth - rails * panelWidth), boardHeight: Math.max(0, height - 44), panelWidth };
}
