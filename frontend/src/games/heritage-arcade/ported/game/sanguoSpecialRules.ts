import { continuousFileRays } from "./sanguoOrthogonalTopology";
import type { SanguoNode, SanguoPiece } from "./sanguoRules";

const sameNode = (left: SanguoNode, right: SanguoNode) =>
  left.sector === right.sector && left.rank === right.rank && left.file === right.file;

const occupant = (pieces: SanguoPiece[], node: SanguoNode) =>
  pieces.find((piece) => !piece.captured && sameNode(piece.node, node));

/**
 * Xiangqi flying-General prohibition on the confirmed Sanguo straight files.
 *
 * A legal position may never leave two surviving Generals facing one another
 * on one uninterrupted physical file with no coin between them. On Sanguo L5,
 * the central file branches into the other two kingdoms, so each branch is
 * checked independently. Any intervening coin blocks the line of sight.
 */
export function generalsFacingOnConfirmedFiles(pieces: SanguoPiece[]) {
  const generals = pieces.filter((piece) => !piece.captured && piece.role === "king");

  for (const general of generals) {
    for (const ray of continuousFileRays(general.node)) {
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
