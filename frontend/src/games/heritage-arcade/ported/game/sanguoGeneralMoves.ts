import type { SanguoNode, SanguoPiece } from "./sanguoRules";

const sameNode = (left: SanguoNode, right: SanguoNode) =>
  left.sector === right.sector && left.rank === right.rank && left.file === right.file;

const occupant = (pieces: SanguoPiece[], node: SanguoNode) =>
  pieces.find((piece) => !piece.captured && sameNode(piece.node, node));

const insidePalace = (piece: SanguoPiece, node: SanguoNode) =>
  node.sector === piece.sector &&
  node.rank >= 2 && node.rank <= 4 &&
  node.file >= 3 && node.file <= 5;

const ORTHOGONAL_STEPS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

/**
 * Exact Xiangqi General rule for a Sanguo kingdom palace.
 *
 * The General moves exactly one point orthogonally and may never leave its
 * original 3x3 palace. It never moves diagonally and never uses any of the
 * cross-kingdom continuation lines.
 *
 * Friendly pieces block the destination. Enemy pieces may be captured there.
 * Check, flying-General exposure, and moving into attack are enforced by the
 * higher-level legal-move filter in sanguoRules.ts, so this function returns
 * only the General's geometric pseudo-legal destinations.
 */
export function sanguoGeneralTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  if (piece.captured) return [];
  if (!insidePalace(piece, piece.node)) return [];

  const candidates = ORTHOGONAL_STEPS.map(([rankDelta, fileDelta]) => ({
    sector: piece.sector,
    rank: piece.node.rank + rankDelta,
    file: piece.node.file + fileDelta,
  })).filter((node) => insidePalace(piece, node));

  return candidates.filter((node) => {
    const hit = occupant(pieces, node);
    return !hit || hit.controller !== piece.controller;
  });
}
