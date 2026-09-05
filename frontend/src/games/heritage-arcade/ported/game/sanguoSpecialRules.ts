import { fileRays } from "./sanguoLogicalTopology";
import type { SanguoNode, SanguoPiece } from "./sanguoRules";

const sameNode = (left: SanguoNode, right: SanguoNode) =>
  left.sector === right.sector && left.rank === right.rank && left.file === right.file;

const occupant = (pieces: SanguoPiece[], node: SanguoNode) =>
  pieces.find((piece) => !piece.captured && sameNode(piece.node, node));

/**
 * Xiangqi flying-General prohibition on logical straight files.
 *
 * Within a sector this is the ordinary Xiangqi file test. If the sightline
 * reaches rank 0, the Sanguo river layer may continue it into one foreign file.
 * At L5 there are exactly two separately-tested branches from the explicit
 * central three-way junction. Any intervening coin blocks that branch.
 */
export function generalsFacingOnLogicalFiles(pieces: SanguoPiece[]) {
  const generals = pieces.filter((piece) => !piece.captured && piece.role === "king");

  for (const general of generals) {
    for (const ray of fileRays(general.node)) {
      for (const node of ray) {
        const hit = occupant(pieces, node);
        if (!hit) continue;
        if (hit.role === "king" && hit.id !== general.id) return true;
        break;
      }
    }
  }

  return false;
}

/** Compatibility name retained for older callers/tests. */
export const generalsFacingOnConfirmedFiles = generalsFacingOnLogicalFiles;
