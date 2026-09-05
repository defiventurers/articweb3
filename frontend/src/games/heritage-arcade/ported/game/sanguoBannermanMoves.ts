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

/**
 * Optional Sanguo Bannerman rule on logical coordinates.
 * Two clear orthogonal transit points, then one outward diagonal finish.
 * The only non-Xiangqi geometry is a river-boundary continuation supplied by
 * sanguoLogicalTopology; no pixel/rail tracing participates in the rule.
 */
export function sanguoBannermanTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  if (piece.captured) return [];

  const output: SanguoNode[] = [];

  for (const ray of fileRays(piece.node)) {
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

  for (const ray of rankRays(piece.node)) {
    if (ray.length < 3) continue;
    const first = ray[0];
    const second = ray[1];
    const longEndpoint = ray[2];
    if (occupant(pieces, first) || occupant(pieces, second)) continue;

    for (const perpendicular of fileRays(longEndpoint)) {
      const destination = perpendicular[0];
      if (destination && landable(piece, pieces, destination)) output.push(destination);
    }
  }

  return unique(output);
}
