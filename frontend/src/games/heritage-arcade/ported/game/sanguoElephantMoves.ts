import type { SanguoNode, SanguoPiece } from "./sanguoRules";

const sameNode = (left: SanguoNode, right: SanguoNode) =>
  left.sector === right.sector && left.rank === right.rank && left.file === right.file;

const occupant = (pieces: SanguoPiece[], node: SanguoNode) =>
  pieces.find((piece) => !piece.captured && sameNode(piece.node, node));

const insideHalfBoard = (rank: number, file: number) =>
  rank >= 0 && rank <= 4 && file >= 0 && file <= 8;

const ELEPHANT_DELTAS = [
  [-2, -2],
  [-2, 2],
  [2, -2],
  [2, 2],
] as const;

/**
 * Exact Xiangqi Elephant movement on a Sanguo kingdom half-board.
 *
 * The Elephant moves exactly two points diagonally in one move. It cannot jump:
 * the diagonal midpoint (the elephant eye) must be empty. As in Xiangqi, an
 * Elephant may not cross the river, so every destination remains in the
 * Elephant's current Sanguo sector. A friendly destination is forbidden; an
 * enemy destination may be captured.
 */
export function sanguoElephantTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  if (piece.captured) return [];

  const output: SanguoNode[] = [];
  const { sector, rank, file } = piece.node;

  for (const [rankDelta, fileDelta] of ELEPHANT_DELTAS) {
    const destinationRank = rank + rankDelta;
    const destinationFile = file + fileDelta;
    if (!insideHalfBoard(destinationRank, destinationFile)) continue;

    const eye: SanguoNode = {
      sector,
      rank: rank + rankDelta / 2,
      file: file + fileDelta / 2,
    };
    if (occupant(pieces, eye)) continue;

    const destination: SanguoNode = {
      sector,
      rank: destinationRank,
      file: destinationFile,
    };
    const hit = occupant(pieces, destination);
    if (!hit || hit.controller !== piece.controller) output.push(destination);
  }

  return output;
}
