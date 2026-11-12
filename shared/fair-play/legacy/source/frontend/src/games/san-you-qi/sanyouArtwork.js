import positions from './sanyouFinalPositions.json' with { type: 'json' };
import { fitSanyouPieceSizes, SANYOU_MAX_PIECE_SIZE } from './sanyouPieceSizing.js';

export const SANYOU_BOARD_IMAGE = '/assets/heritage-arcade/board/sanyou-ice-white-v2.png';
export const SANYOU_OVERLAY_IMAGE = '/assets/heritage-arcade/board/sanyou-ice-white-v2-grid.svg';
export const SANYOU_TOKEN_ROOT = '/assets/heritage-arcade/tokens/sanyou-gold-v2';
export const SANYOU_PIECE_SIZES = Object.freeze(fitSanyouPieceSizes(Object.entries(positions.points).map(([id, [x, y]]) => ({ id, x, y })), SANYOU_MAX_PIECE_SIZE));
export function sanyouArtworkPoint(node) {
  return positions.points[node]?.map(n => n / 1536) || null;
}
export function sanyouPieceAsset(piece, root = SANYOU_TOKEN_ROOT) {
  const role = piece.role === 'advisor' ? 'guard' : piece.role;
  return `${root}/${piece.faction}_${role}.webp`;
}
export const sanyouPieceWidth = node => `${SANYOU_PIECE_SIZES[node] / 15.36}%`;
