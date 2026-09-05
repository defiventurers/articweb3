import type { SanguoNode, SanguoPiece } from "./sanguoRules";

const sameNode = (left: SanguoNode, right: SanguoNode) =>
  left.sector === right.sector && left.rank === right.rank && left.file === right.file;

const occupant = (pieces: SanguoPiece[], node: SanguoNode) =>
  pieces.find((piece) => !piece.captured && sameNode(piece.node, node));

const insideField = (rank: number, file: number) =>
  rank >= 0 && rank <= 4 && file >= 0 && file <= 8;

const HORSE_DELTAS = [
  [-2, -1], [-2, 1],
  [-1, -2], [-1, 2],
  [1, -2], [1, 2],
  [2, -1], [2, 1],
] as const;

/**
 * Exact Xiangqi Horse rule on one Sanguo kingdom field.
 *
 * The Horse makes an L move: one orthogonal leg followed by one outward
 * diagonal step. It never jumps: if the orthogonal leg point is occupied,
 * both Horse destinations that depend on that leg are blocked.
 *
 * Horse movement does not use the Chariot/Cannon cross-kingdom file
 * continuations. It remains in its current kingdom field.
 */
export function sanguoHorseTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  if (piece.captured) return [];

  const output: SanguoNode[] = [];
  const { sector, rank, file } = piece.node;

  for (const [rankDelta, fileDelta] of HORSE_DELTAS) {
    const destinationRank = rank + rankDelta;
    const destinationFile = file + fileDelta;
    if (!insideField(destinationRank, destinationFile)) continue;

    // Xiangqi horse-leg rule: the first orthogonal point must be empty.
    const leg: SanguoNode = Math.abs(rankDelta) === 2
      ? { sector, rank: rank + Math.sign(rankDelta), file }
      : { sector, rank, file: file + Math.sign(fileDelta) };

    if (occupant(pieces, leg)) continue;

    const destination: SanguoNode = { sector, rank: destinationRank, file: destinationFile };
    const hit = occupant(pieces, destination);
    if (!hit || hit.controller !== piece.controller) output.push(destination);
  }

  return output;
}
