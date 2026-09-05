/* Sanguo movement engine.
   Phase 1: Chariots use Xiangqi-style orthogonal rays with the exact cross-kingdom file continuations.
   Phase 2: Cannons use the same straight lines, move like a Chariot when not capturing, and require exactly one screen to capture.
   Phase 3: Horses use exact Xiangqi L movement with a blocking horse-leg and the confirmed joined-board topology.
   Phase 4: Elephants move exactly two points diagonally, require a clear elephant-eye midpoint, and never cross a river.
   Phase 5: Advisors move exactly one diagonal step on the five-node palace X and never leave their original palace.
   Phase 6: Generals move exactly one orthogonal point and never leave their original 3x3 palace.
   Phase 7: Soldiers move one point forward; after crossing a river they also gain one-point sideways movement and never retreat.
   Phase 8: Optional Bannermen use the historical extended-Horse route: two clear orthogonal transit points, then one diagonal outward. */
import { continuousFileRays, rankRays } from "./sanguoOrthogonalTopology";
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

export function chariotTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  const output: SanguoNode[] = [];
  for (const ray of [...rankRays(piece.node), ...continuousFileRays(piece.node)]) {
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

export function cannonTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  const output: SanguoNode[] = [];
  for (const ray of [...rankRays(piece.node), ...continuousFileRays(piece.node)]) {
    appendCannonRay(piece, pieces, ray, output);
  }
  return unique(output);
}

export function graphPseudoTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
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
