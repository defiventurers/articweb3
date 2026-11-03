// A token must fit even when every other legal intersection is occupied.
// Use the local spacing, rather than shrinking every army to the narrowest tip.
export const SANYOU_MAX_PIECE_SIZE = 100;
export const SANYOU_PIECE_GAP = 4;

export function fitSanyouPieceSizes(cells, maximum = SANYOU_MAX_PIECE_SIZE) {
  const sizes = {};
  for (const cell of cells) {
    let nearest = Infinity;
    for (const other of cells) {
      if (cell.id !== other.id) nearest = Math.min(nearest, Math.hypot(cell.x - other.x, cell.y - other.y));
    }
    sizes[cell.id] = Math.max(0, Math.floor(Math.min(maximum, nearest - SANYOU_PIECE_GAP) * 100) / 100);
  }
  return sizes;
}
