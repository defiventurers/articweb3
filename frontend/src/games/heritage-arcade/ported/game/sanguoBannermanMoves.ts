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
 * Historical optional Bannerman rule used by Sanguo Qi.
 *
 * The piece moves two points orthogonally and then one diagonal point outward.
 * This produces a (3,1) or (1,3) displacement on a regular half-board. Unlike
 * a normal Horse it does not jump: both orthogonal transit points must be empty.
 * The final diagonal lands directly on its destination, which may be empty or
 * occupied by an enemy. The joined-board topology is respected when the move
 * reaches a river continuation.
 */
export function sanguoBannermanTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  if (piece.captured) return [];

  const output: SanguoNode[] = [];

  // Two steps along a physical file, then one diagonal outward.
  for (const ray of continuousFileRays(piece.node)) {
    if (ray.length < 3) continue;
    const first = ray[0];
    const second = ray[1];
    const longEndpoint = ray[2];
    if (occupant(pieces, first) || occupant(pieces, second)) continue;

    for (const side of [-1, 1] as const) {
      const destinationFile = longEndpoint.file + side;
      if (!insideFile(destinationFile)) continue;
      const destination = logicalNode(longEndpoint.sector, longEndpoint.rank, destinationFile);
      if (landable(piece, pieces, destination)) output.push(destination);
    }
  }

  // Two steps across a rank, then one diagonal outward in either file direction.
  for (const ray of rankRays(piece.node)) {
    if (ray.length < 3) continue;
    const first = ray[0];
    const second = ray[1];
    const longEndpoint = ray[2];
    if (occupant(pieces, first) || occupant(pieces, second)) continue;

    for (const perpendicular of continuousFileRays(longEndpoint)) {
      const destination = perpendicular[0];
      if (destination && landable(piece, pieces, destination)) output.push(destination);
    }
  }

  return unique(output);
}
