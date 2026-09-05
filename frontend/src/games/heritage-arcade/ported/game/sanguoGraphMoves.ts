/* Sanguo movement engine.
   Phase 1: Chariots use Xiangqi-style orthogonal rays with the exact cross-kingdom file continuations.
   Phase 2: Cannons use the same straight lines, move like a Chariot when not capturing, and require exactly one screen to capture.
   Phase 3: Horses use exact Xiangqi L movement with a blocking horse-leg and the confirmed joined-board topology.
   Phase 4: Elephants move exactly two points diagonally, require a clear elephant-eye midpoint, and never cross a river.
   Phase 5: Advisors move exactly one diagonal step on the five-node palace X and never leave their original palace.
   Phase 6: Generals move exactly one orthogonal point and never leave their original 3x3 palace.
   Phase 7: Soldiers move one point forward; after crossing a river they also gain one-point sideways movement and never retreat. */
import { sourceRailNeighbours } from "./sanguoRailGraph";
import { fieldPoint } from "./sanguoTopology";
import { referenceNodeId } from "./sanguoReferenceCoordinates";
import { continuousFileRays, rankRays } from "./sanguoOrthogonalTopology";
import { sanguoHorseTargets } from "./sanguoHorseMoves";
import { sanguoElephantTargets } from "./sanguoElephantMoves";
import { sanguoAdvisorTargets } from "./sanguoAdvisorMoves";
import { sanguoGeneralTargets } from "./sanguoGeneralMoves";
import { sanguoSoldierTargets } from "./sanguoSoldierMoves";
import type { SanguoNode, SanguoPiece } from "./sanguoRules";

const id = (node: SanguoNode) => referenceNodeId(node);
const fromId = (value: string): SanguoNode => {
  const [sector, rank, file] = value.split("-");
  return { sector: sector as SanguoNode["sector"], rank: Number(rank), file: Number(file) };
};
const same = (left: SanguoNode, right: SanguoNode) => id(left) === id(right);
const neighbours = (node: SanguoNode) => sourceRailNeighbours(node.sector, node.rank, node.file).map(fromId);
const occupant = (pieces: SanguoPiece[], node: SanguoNode) =>
  pieces.find((piece) => !piece.captured && same(piece.node, node));
const unique = (nodes: SanguoNode[]) =>
  [...new Map(nodes.map((node) => [id(node), node])).values()];
const landable = (piece: SanguoPiece, node: SanguoNode, pieces: SanguoPiece[]) =>
  occupant(pieces, node)?.controller !== piece.controller;
const point = (node: SanguoNode) => fieldPoint(node.sector, node.rank, node.file);
const vector = (from: SanguoNode, to: SanguoNode) => {
  const a = point(from);
  const b = point(to);
  return { x: b.x - a.x, y: b.y - a.y };
};
const alignment = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const size = Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y);
  return size ? (a.x * b.x + a.y * b.y) / size : -1;
};

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

// Legacy three-step graph walker retained only for the optional Bannerman until
// its own movement phase is rebuilt. Standard Horses no longer use this approximation.
function bannermanTargets(piece: SanguoPiece, pieces: SanguoPiece[]) {
  const output: SanguoNode[] = [];

  for (const leg of neighbours(piece.node).filter((node) => node.sector === piece.sector)) {
    if (occupant(pieces, leg)) continue;
    const first = vector(piece.node, leg);

    for (const second of neighbours(leg).filter((node) => !same(node, piece.node) && node.sector === piece.sector)) {
      if (occupant(pieces, second)) continue;

      for (const finish of neighbours(second).filter((node) => !same(node, leg) && node.sector === piece.sector)) {
        const turn = alignment(first, vector(second, finish));
        if (turn > .2 && turn < .92 && landable(piece, finish, pieces)) output.push(finish);
      }
    }
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
  if (piece.role === "runner") return bannermanTargets(piece, pieces);
  return sanguoSoldierTargets(piece, pieces);
}
