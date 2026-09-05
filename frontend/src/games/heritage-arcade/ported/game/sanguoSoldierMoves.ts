import { FILE_CONTINUATIONS, logicalNode } from "./sanguoOrthogonalTopology";
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
 * Exact Xiangqi Soldier rule adapted to the three joined Sanguo half-boards.
 *
 * Before crossing a river, a Soldier moves/captures exactly one point forward.
 * In its home sector, forward means toward the river: rank decreases by one.
 * From the river-edge rank (rank 0), forward crosses into the paired foreign
 * file at foreign rank 0. On the central L5 file, the board permits choosing
 * either connected enemy kingdom.
 *
 * Once the Soldier is in a foreign sector, it has crossed the river. It may
 * then move/capture exactly one point either:
 *   - forward, deeper into that enemy camp (rank + 1), or
 *   - sideways, one file left or right on the same rank.
 *
 * It never moves backward, never moves diagonally, never jumps, and never
 * promotes. Appropriation changes controller only; the piece's original sector
 * still records which side of the rivers is its home side.
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
      // rank 0 is the home river edge. The next forward point lies at rank 0
      // of the physically continuous foreign file. L5 can branch to either
      // opponent exactly as the historical Sanguo central-column convention allows.
      for (const continuation of FILE_CONTINUATIONS[currentSector][file] ?? []) {
        candidates.push(logicalNode(continuation.sector, 0, continuation.file));
      }
    }
  } else {
    // After crossing: forward plus sideways, but never backward toward the river.
    if (rank < 4) candidates.push(logicalNode(currentSector, rank + 1, file));
    if (insideFile(file - 1)) candidates.push(logicalNode(currentSector, rank, file - 1));
    if (insideFile(file + 1)) candidates.push(logicalNode(currentSector, rank, file + 1));
  }

  return candidates.filter((node) => landable(piece, pieces, node));
}
