import { continuousFileRays, logicalNode, rankRays } from "./sanguoOrthogonalTopology";
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

/**
 * Add every ordinary same-kingdom Xiangqi Horse destination directly from the
 * local 5x9 logical grid. This deliberately does not depend on the irregular
 * source-rail trace or on pixel geometry, so Red, Green, and Blue always receive
 * identical L-shape behaviour at equivalent local positions.
 */
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
 * Exact Xiangqi Horse movement on the three joined Sanguo half-boards.
 *
 * A Horse makes one L-shaped move: two points along one orthogonal axis and one
 * point along the perpendicular axis. It does NOT execute two separate moves.
 * The adjacent point in the long direction is the horse-leg; if that point is
 * occupied by any coin, both L destinations using that leg are blocked.
 *
 * Same-kingdom L moves are generated from the local logical grid so all three
 * kingdoms are guaranteed to be rotationally equivalent. River-crossing L moves
 * are then added using the confirmed Red/Blue/Green continuation topology.
 */
export function sanguoHorseTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  if (piece.captured) return [];

  const output: SanguoNode[] = [];

  // Canonical local Xiangqi L-shapes. This is the authoritative same-sector rule.
  appendLocalHorseTargets(piece, pieces, output);

  // River-crossing cases: long axis follows a physical file toward/through a
  // river. The first point is still the horse-leg and must be empty.
  for (const ray of continuousFileRays(piece.node)) {
    if (ray.length < 2) continue;
    const leg = ray[0];
    const second = ray[1];
    if (occupant(pieces, leg)) continue;

    // Same-sector destinations were already generated above. Here we only add
    // cases where the two-step component has crossed into another kingdom.
    if (second.sector === piece.node.sector) continue;

    for (const side of [-1, 1] as const) {
      const destinationFile = second.file + side;
      if (!insideFile(destinationFile)) continue;
      const destination = logicalNode(second.sector, second.rank, destinationFile);
      if (landable(piece, pieces, destination)) output.push(destination);
    }
  }

  // River as the one-point perpendicular part of the L. First move two points
  // sideways inside the current kingdom; if the final one-point file step crosses
  // the river, add that foreign destination. Ordinary same-sector counterparts
  // are already covered by appendLocalHorseTargets.
  for (const ray of rankRays(piece.node)) {
    if (ray.length < 2) continue;
    const leg = ray[0];
    const second = ray[1];
    if (occupant(pieces, leg)) continue;

    for (const perpendicular of continuousFileRays(second)) {
      const destination = perpendicular[0];
      if (!destination || destination.sector === piece.node.sector) continue;
      if (landable(piece, pieces, destination)) output.push(destination);
    }
  }

  return unique(output);
}
