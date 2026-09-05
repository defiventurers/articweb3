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

/**
 * Exact Xiangqi Horse movement on the three joined Sanguo half-boards.
 *
 * A Horse makes one L-shaped move: two orthogonal points in one axis and one
 * point in the perpendicular axis. It does NOT execute two separate moves.
 * The adjacent point in the long direction is the horse-leg; if that point is
 * occupied by any coin, both L destinations using that leg are blocked.
 *
 * Standard Xiangqi Horses are not river-bound. On Sanguo, an L can therefore
 * cross a river arm using the same confirmed file continuations as the board's
 * orthogonal geometry. The centre L5 branch can naturally produce destinations
 * into either opposing kingdom when the L geometry reaches that junction.
 */
export function sanguoHorseTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  if (piece.captured) return [];

  const output: SanguoNode[] = [];

  // Long axis = file direction (toward/away from a river).
  // The first node is the horse-leg. The second node establishes the point
  // two orthogonal steps away; occupancy there does not block a Horse.
  for (const ray of continuousFileRays(piece.node)) {
    if (ray.length < 2) continue;
    const leg = ray[0];
    const second = ray[1];
    if (occupant(pieces, leg)) continue;

    for (const side of [-1, 1] as const) {
      const destinationFile = second.file + side;
      if (!insideFile(destinationFile)) continue;
      const destination = logicalNode(second.sector, second.rank, destinationFile);
      if (landable(piece, pieces, destination)) output.push(destination);
    }
  }

  // Long axis = rank direction (left/right across the current half-board).
  // After the two-point rank component, the one-point perpendicular component
  // is simply the first node of either physical file ray. This also handles a
  // perpendicular river crossing correctly when the second point lies on rank 0.
  for (const ray of rankRays(piece.node)) {
    if (ray.length < 2) continue;
    const leg = ray[0];
    const second = ray[1];
    if (occupant(pieces, leg)) continue;

    for (const perpendicular of continuousFileRays(second)) {
      const destination = perpendicular[0];
      if (destination && landable(piece, pieces, destination)) output.push(destination);
    }
  }

  return unique(output);
}
