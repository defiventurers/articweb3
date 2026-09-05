import type { SanguoNode, SanguoPiece } from "./sanguoRules";

const key = (node: SanguoNode) => `${node.sector}-${node.rank}-${node.file}`;

const sameNode = (left: SanguoNode, right: SanguoNode) =>
  left.sector === right.sector && left.rank === right.rank && left.file === right.file;

const occupant = (pieces: SanguoPiece[], node: SanguoNode) =>
  pieces.find((piece) => !piece.captured && sameNode(piece.node, node));

const PALACE_CORNERS = [
  { rank: 2, file: 3 },
  { rank: 2, file: 5 },
  { rank: 4, file: 3 },
  { rank: 4, file: 5 },
] as const;

const PALACE_CENTER = { rank: 3, file: 4 } as const;

/**
 * Exact Xiangqi Advisor rule for one Sanguo kingdom palace.
 *
 * The Advisor moves exactly one diagonal palace step and may never leave its
 * original kingdom's 3x3 palace. The palace has the normal Xiangqi X: the four
 * corners connect only to the centre, and the centre connects to all four
 * corners. Mid-edge palace points are not Advisor destinations because no
 * diagonal palace rail reaches them.
 *
 * Appropriation changes controller, not the piece's original sector, so an
 * appropriated Advisor remains confined to the palace printed in its own
 * sector. It may capture an enemy-controlled coin on a legal destination but
 * may not land on a friendly-controlled coin.
 */
export function sanguoAdvisorTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  if (piece.captured) return [];

  const { sector, rank, file } = piece.node;
  const isCenter = rank === PALACE_CENTER.rank && file === PALACE_CENTER.file;
  const isCorner = PALACE_CORNERS.some((corner) => corner.rank === rank && corner.file === file);

  let candidates: SanguoNode[] = [];
  if (isCenter) {
    candidates = PALACE_CORNERS.map((corner) => ({ sector, rank: corner.rank, file: corner.file }));
  } else if (isCorner) {
    candidates = [{ sector, rank: PALACE_CENTER.rank, file: PALACE_CENTER.file }];
  } else {
    // Defensive fail-closed behaviour: an Advisor can never acquire movement
    // from a non-X palace point or from outside its printed palace.
    return [];
  }

  return [...new Map(candidates.map((node) => [key(node), node])).values()].filter((node) => {
    const hit = occupant(pieces, node);
    return !hit || hit.controller !== piece.controller;
  });
}
