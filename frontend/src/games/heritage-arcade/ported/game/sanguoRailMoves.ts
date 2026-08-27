/* Compatibility adapter: source rail targets now delegate to the exact Sanguo Qi role engine, never generic graph walks. */
import { nodeId, pseudoSanguoTargets, type SanguoFaction, type SanguoNode, type SanguoPiece, type SanguoRole } from "./sanguoRules";

export type RailRole = SanguoRole;
export type RailTarget = SanguoNode;
export type RailPiece = { sector: SanguoFaction; controller: SanguoFaction; role: RailRole; rank: number; file: number; captured?: boolean };

const asPiece = (piece: RailPiece, index: number): SanguoPiece => ({ id: `compat-${index}`, sector: piece.sector, controller: piece.controller, role: piece.role, node: { sector: piece.sector, rank: piece.rank, file: piece.file }, captured: piece.captured });

export function sourceRailTargets(piece: RailPiece, pieces: RailPiece[]): RailTarget[] {
  const board = pieces.map(asPiece);
  const active = asPiece(piece, -1);
  return pseudoSanguoTargets(active, [...board, active]);
}

export const isVisibleRailMove = (piece: RailPiece, target: RailTarget, pieces: RailPiece[]) => sourceRailTargets(piece, pieces).some((candidate) => nodeId(candidate) === nodeId(target));
