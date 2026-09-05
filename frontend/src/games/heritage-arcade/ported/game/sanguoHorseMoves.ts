import { fileRays, logicalNode, rankRays } from "./sanguoLogicalTopology";
import type { SanguoNode, SanguoPiece } from "./sanguoRules";

const sameNode = (left: SanguoNode, right: SanguoNode) =>
  left.sector === right.sector && left.rank === right.rank && left.file === right.file;

const occupant = (pieces: SanguoPiece[], node: SanguoNode) =>
  pieces.find((piece) => !piece.captured && sameNode(piece.node, node));

const unique = (nodes: SanguoNode[]) =>
  [...new Map(nodes.map((node) => [`${node.sector}-${node.rank}-${node.file}`, node])).values()];

const landable = (piece: SanguoPiece, pieces: SanguoPiece[], node: SanguoNode) => {
  const hit = occupant(pieces, node);
  return !hit || hit.controller !== piece.controller;
};

const insideFile = (file: number) => file >= 0 && file <= 8;
const insideRank = (rank: number) => rank >= 0 && rank <= 4;

const HORSE_DELTAS = [
  [-2, -1], [-2, 1],
  [-1, -2], [-1, 2],
  [1, -2], [1, 2],
  [2, -1], [2, 1],
] as const;

/** Standard same-sector Xiangqi Horse geometry on the logical 5x9 grid. */
function appendLocalHorseTargets(piece: SanguoPiece, pieces: SanguoPiece[], output: SanguoNode[]) {
  const { sector, rank, file } = piece.node;

  for (const [rankDelta, fileDelta] of HORSE_DELTAS) {
    const destinationRank = rank + rankDelta;
    const destinationFile = file + fileDelta;
    if (!insideRank(destinationRank) || !insideFile(destinationFile)) continue;

    // Xiangqi horse-leg: the adjacent point in the long direction must be empty.
    const leg: SanguoNode = Math.abs(rankDelta) === 2
      ? { sector, rank: rank + Math.sign(rankDelta), file }
      : { sector, rank, file: file + Math.sign(fileDelta) };

    if (occupant(pieces, leg)) continue;

    const destination = logicalNode(sector, destinationRank, destinationFile);
    if (landable(piece, pieces, destination)) output.push(destination);
  }
}

/**
 * Xiangqi Horse movement with only the river boundary adapted for Sanguo.
 * Local moves are the ordinary eight (±2,±1)/(±1,±2) possibilities. If an L
 * reaches across rank 0, the final geometry uses the explicit river exit of the
 * logical board; L5 may therefore choose either branch of the central junction.
 */
export function sanguoHorseTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  if (piece.captured) return [];

  const output: SanguoNode[] = [];
  appendLocalHorseTargets(piece, pieces, output);

  // Long component runs along a file and crosses the river.
  for (const ray of fileRays(piece.node)) {
    if (ray.length < 2) continue;
    const leg = ray[0];
    const second = ray[1];
    if (occupant(pieces, leg)) continue;
    if (second.sector === piece.node.sector) continue;

    for (const side of [-1, 1] as const) {
      const destinationFile = second.file + side;
      if (!insideFile(destinationFile)) continue;
      const destination = logicalNode(second.sector, second.rank, destinationFile);
      if (landable(piece, pieces, destination)) output.push(destination);
    }
  }

  // Long component runs across a rank; the one-point perpendicular finish may
  // cross rank 0 through one of the explicit Sanguo river exits.
  for (const ray of rankRays(piece.node)) {
    if (ray.length < 2) continue;
    const leg = ray[0];
    const second = ray[1];
    if (occupant(pieces, leg)) continue;

    for (const perpendicular of fileRays(second)) {
      const destination = perpendicular[0];
      if (!destination || destination.sector === piece.node.sector) continue;
      if (landable(piece, pieces, destination)) output.push(destination);
    }
  }

  return unique(output);
}
