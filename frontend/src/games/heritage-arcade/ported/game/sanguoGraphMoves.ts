/*
 * Sanguo logical movement engine.
 *
 * Standard piece geometry is Xiangqi on a local 5x9 sector. No movement rule
 * consults pixels or the traced visual rail graph. The only Sanguo-specific
 * geometry is the river continuation layer in sanguoLogicalTopology.ts,
 * including the explicit three-way L5 junction.
 */
import { fileRays, rankRays } from "./sanguoLogicalTopology";
import { sanguoHorseTargets } from "./sanguoHorseMoves";
import { sanguoElephantTargets } from "./sanguoElephantMoves";
import { sanguoAdvisorTargets } from "./sanguoAdvisorMoves";
import { sanguoGeneralTargets } from "./sanguoGeneralMoves";
import { sanguoSoldierTargets } from "./sanguoSoldierMoves";
import { sanguoBannermanTargets } from "./sanguoBannermanMoves";
import type { SanguoNode, SanguoPiece } from "./sanguoRules";

const key = (node: SanguoNode) => `${node.sector}-${node.rank}-${node.file}`;
const same = (left: SanguoNode, right: SanguoNode) => key(left) === key(right);
const occupant = (pieces: SanguoPiece[], node: SanguoNode) =>
  pieces.find((piece) => !piece.captured && same(piece.node, node));
const unique = (nodes: SanguoNode[]) =>
  [...new Map(nodes.map((node) => [key(node), node])).values()];

function appendChariotRay(piece: SanguoPiece, pieces: SanguoPiece[], ray: SanguoNode[], output: SanguoNode[]) {
  for (const node of ray) {
    const hit = occupant(pieces, node);
    if (!hit) {
      output.push(node);
      continue;
    }
    if (hit.controller !== piece.controller) output.push(node);
    break;
  }
}

/** Xiangqi Chariot rays on logical coordinates, extended only at a Sanguo river boundary. */
export function chariotTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  const output: SanguoNode[] = [];
  for (const ray of [...rankRays(piece.node), ...fileRays(piece.node)]) {
    appendChariotRay(piece, pieces, ray, output);
  }
  return unique(output);
}

function appendCannonRay(piece: SanguoPiece, pieces: SanguoPiece[], ray: SanguoNode[], output: SanguoNode[]) {
  let screened = false;

  for (const node of ray) {
    const hit = occupant(pieces, node);

    if (!screened) {
      if (!hit) {
        output.push(node);
        continue;
      }
      screened = true;
      continue;
    }

    if (!hit) continue;
    if (hit.controller !== piece.controller) output.push(node);
    break;
  }
}

/** Xiangqi Cannon rule on the same logical straight rays as the Chariot. */
export function cannonTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  const output: SanguoNode[] = [];
  for (const ray of [...rankRays(piece.node), ...fileRays(piece.node)]) {
    appendCannonRay(piece, pieces, ray, output);
  }
  return unique(output);
}

/** Authoritative pseudo-legal resolver. */
export function logicalPseudoTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  if (piece.captured) return [];
  if (piece.role === "icebreaker") return chariotTargets(piece, pieces);
  if (piece.role === "cannon") return cannonTargets(piece, pieces);
  if (piece.role === "king") return sanguoGeneralTargets(piece, pieces);
  if (piece.role === "guard") return sanguoAdvisorTargets(piece, pieces);
  if (piece.role === "seer") return sanguoElephantTargets(piece, pieces);
  if (piece.role === "rider") return sanguoHorseTargets(piece, pieces);
  if (piece.role === "runner") return sanguoBannermanTargets(piece, pieces);
  return sanguoSoldierTargets(piece, pieces);
}

/** Compatibility alias for older callers; it no longer means graph-derived movement. */
export const graphPseudoTargets = logicalPseudoTargets;
