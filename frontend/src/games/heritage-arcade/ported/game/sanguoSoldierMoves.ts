import { logicalNode, riverExits } from "./sanguoLogicalTopology";
import type { SanguoNode, SanguoPiece } from "./sanguoRules";

const sameNode = (left: SanguoNode, right: SanguoNode) =>
  left.sector === right.sector && left.rank === right.rank && left.file === right.file;

const occupant = (pieces: SanguoPiece[], node: SanguoNode) =>
  pieces.find((piece) => !piece.captured && sameNode(piece.node, node));

const insideFile = (file: number) => file >= 0 && file <= 8;

const landable = (piece: SanguoPiece, pieces: SanguoPiece[], node: SanguoNode) => {
  const hit = occupant(pieces, node);
  return !hit || hit.controller !== piece.controller;
};

/**
 * Standard Xiangqi Soldier rule on a logical Sanguo sector.
 *
 * Home sector:
 *   - exactly one point forward (rank - 1)
 *   - at rank 0, forward means cross through the explicit river exit
 *
 * Foreign sector (river already crossed):
 *   - one point forward deeper into that sector (rank + 1)
 *   - or one point sideways (file ± 1)
 *   - never backward
 *
 * The only Sanguo-specific case is rank-0 crossing. On L5, riverExits()
 * explicitly returns both branches of the central three-way junction.
 */
export function sanguoSoldierTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  if (piece.captured) return [];

  const { sector: currentSector, rank, file } = piece.node;
  const crossedRiver = currentSector !== piece.sector;
  const candidates: SanguoNode[] = [];

  if (!crossedRiver) {
    if (rank > 0) {
      candidates.push(logicalNode(currentSector, rank - 1, file));
    } else {
      candidates.push(...riverExits(piece.node));
    }
  } else {
    if (rank < 4) candidates.push(logicalNode(currentSector, rank + 1, file));
    if (insideFile(file - 1)) candidates.push(logicalNode(currentSector, rank, file - 1));
    if (insideFile(file + 1)) candidates.push(logicalNode(currentSector, rank, file + 1));
  }

  return candidates.filter((node) => landable(piece, pieces, node));
}
