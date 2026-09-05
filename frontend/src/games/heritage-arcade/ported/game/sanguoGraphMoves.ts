/* Sanguo movement engine.
   Phase 1: Chariots use Xiangqi-style orthogonal rays with the exact cross-kingdom file continuations.
   Phase 2: Cannons use the same straight lines, move like a Chariot when not capturing, and require exactly one screen to capture. */
import { sourceRailNeighbours } from "./sanguoRailGraph";
import { fieldPoint } from "./sanguoTopology";
import { referenceNodeId } from "./sanguoReferenceCoordinates";
import type { SanguoNode, SanguoPiece } from "./sanguoRules";

const CENTER = { x: 640, y: 625 };
const id = (node: SanguoNode) => referenceNodeId(node);
const fromId = (value: string): SanguoNode => { const [sector, rank, file] = value.split("-"); return { sector: sector as SanguoNode["sector"], rank: Number(rank), file: Number(file) }; };
const same = (left: SanguoNode, right: SanguoNode) => id(left) === id(right);
const neighbours = (node: SanguoNode) => sourceRailNeighbours(node.sector, node.rank, node.file).map(fromId);
const occupant = (pieces: SanguoPiece[], node: SanguoNode) => pieces.find((piece) => !piece.captured && same(piece.node, node));
const unique = (nodes: SanguoNode[]) => [...new Map(nodes.map((node) => [id(node), node])).values()];
const landable = (piece: SanguoPiece, node: SanguoNode, pieces: SanguoPiece[]) => occupant(pieces, node)?.controller !== piece.controller;
const point = (node: SanguoNode) => fieldPoint(node.sector, node.rank, node.file);
const vector = (from: SanguoNode, to: SanguoNode) => { const a = point(from); const b = point(to); return { x: b.x - a.x, y: b.y - a.y }; };
const alignment = (a: { x: number; y: number }, b: { x: number; y: number }) => { const size = Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y); return size ? (a.x * b.x + a.y * b.y) / size : -1; };
const distanceFromCenter = (node: SanguoNode) => { const current = point(node); return Math.hypot(current.x - CENTER.x, current.y - CENTER.y); };
const ownPalace = (piece: SanguoPiece, node: SanguoNode) => node.sector === piece.sector && node.rank >= 2 && node.rank <= 4 && node.file >= 3 && node.file <= 5;
const cardinal = (from: SanguoNode, to: SanguoNode) => from.rank === to.rank || from.file === to.file;
const diagonal = (from: SanguoNode, to: SanguoNode) => from.rank !== to.rank && from.file !== to.file;
const logicalNode = (sector: SanguoNode["sector"], rank: number, file: number): SanguoNode => ({ sector, rank, file });

type FileContinuation = { sector: SanguoNode["sector"]; file: number };

/*
  Human line labels are file + 1. The centre-facing end is rank 0 (Lx-5)
  and the outside edge is rank 4 (Lx-1).

  Confirmed continuous files:
    R1-B9, R2-B8, R3-B7, R4-B6,
    R5-B5-G5,
    R6-G4, R7-G3, R8-G2, R9-G1,
    B1-G9, B2-G8, B3-G7, B4-G6.

  These continuations are shared by every straight-line piece rule. They do not
  create diagonal turns; they describe one physical file continuing into another kingdom.
*/
const FILE_CONTINUATIONS: Record<SanguoNode["sector"], readonly (readonly FileContinuation[])[]> = {
  red: [
    [{ sector: "blue", file: 8 }],
    [{ sector: "blue", file: 7 }],
    [{ sector: "blue", file: 6 }],
    [{ sector: "blue", file: 5 }],
    [{ sector: "blue", file: 4 }, { sector: "green", file: 4 }],
    [{ sector: "green", file: 3 }],
    [{ sector: "green", file: 2 }],
    [{ sector: "green", file: 1 }],
    [{ sector: "green", file: 0 }],
  ],
  blue: [
    [{ sector: "green", file: 8 }],
    [{ sector: "green", file: 7 }],
    [{ sector: "green", file: 6 }],
    [{ sector: "green", file: 5 }],
    [{ sector: "red", file: 4 }, { sector: "green", file: 4 }],
    [{ sector: "red", file: 3 }],
    [{ sector: "red", file: 2 }],
    [{ sector: "red", file: 1 }],
    [{ sector: "red", file: 0 }],
  ],
  green: [
    [{ sector: "red", file: 8 }],
    [{ sector: "red", file: 7 }],
    [{ sector: "red", file: 6 }],
    [{ sector: "red", file: 5 }],
    [{ sector: "red", file: 4 }, { sector: "blue", file: 4 }],
    [{ sector: "blue", file: 3 }],
    [{ sector: "blue", file: 2 }],
    [{ sector: "blue", file: 1 }],
    [{ sector: "blue", file: 0 }],
  ],
};

function appendChariotRay(piece: SanguoPiece, pieces: SanguoPiece[], ray: SanguoNode[], output: SanguoNode[]) {
  for (const node of ray) {
    const hit = occupant(pieces, node);
    if (!hit) { output.push(node); continue; }
    if (hit.controller !== piece.controller) output.push(node);
    break;
  }
}

function continuousFileRays(node: SanguoNode): SanguoNode[][] {
  const { sector, rank, file } = node;
  const outward = Array.from({ length: 4 - rank }, (_, offset) => logicalNode(sector, rank + offset + 1, file));
  const homeToCentre = Array.from({ length: rank }, (_, offset) => logicalNode(sector, rank - offset - 1, file));
  const continuations = FILE_CONTINUATIONS[sector][file] ?? [];
  const inward = continuations.length
    ? continuations.map((continuation) => [
        ...homeToCentre,
        ...Array.from({ length: 5 }, (_, destinationRank) => logicalNode(continuation.sector, destinationRank, continuation.file)),
      ])
    : [homeToCentre];
  return [outward, ...inward].filter((ray) => ray.length > 0);
}

function rankRays(node: SanguoNode): SanguoNode[][] {
  const { sector, rank, file } = node;
  return [
    Array.from({ length: file }, (_, offset) => logicalNode(sector, rank, file - offset - 1)),
    Array.from({ length: 8 - file }, (_, offset) => logicalNode(sector, rank, file + offset + 1)),
  ].filter((ray) => ray.length > 0);
}

function logicalChariotTargets(piece: SanguoPiece, pieces: SanguoPiece[]) {
  const output: SanguoNode[] = [];
  for (const ray of [...rankRays(piece.node), ...continuousFileRays(piece.node)]) appendChariotRay(piece, pieces, ray, output);
  return unique(output);
}

function appendCannonRay(piece: SanguoPiece, pieces: SanguoPiece[], ray: SanguoNode[], output: SanguoNode[]) {
  let screened = false;
  for (const node of ray) {
    const hit = occupant(pieces, node);
    if (!screened) {
      if (!hit) {
        // Before the screen, a Cannon moves exactly like a Chariot.
        output.push(node);
        continue;
      }
      // The first occupied node is the screen. It is never a legal destination.
      screened = true;
      continue;
    }

    // After the screen, empty nodes cannot be landed on. The first occupied node
    // is the only possible capture, and only if it belongs to an opponent.
    if (!hit) continue;
    if (hit.controller !== piece.controller) output.push(node);
    break;
  }
}

export function cannonTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  const output: SanguoNode[] = [];
  for (const ray of [...rankRays(piece.node), ...continuousFileRays(piece.node)]) appendCannonRay(piece, pieces, ray, output);
  return unique(output);
}

export function chariotTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  return logicalChariotTargets(piece, pieces);
}

function oneStep(piece: SanguoPiece, pieces: SanguoPiece[], predicate: (node: SanguoNode) => boolean) {
  return neighbours(piece.node).filter(predicate).filter((node) => landable(piece, node, pieces));
}

function horseTargets(piece: SanguoPiece, pieces: SanguoPiece[], steps: number) {
  const output: SanguoNode[] = [];
  for (const leg of neighbours(piece.node).filter((node) => node.sector === piece.sector)) {
    if (occupant(pieces, leg)) continue;
    const first = vector(piece.node, leg);
    for (const second of neighbours(leg).filter((node) => !same(node, piece.node) && node.sector === piece.sector)) {
      if (steps === 3) {
        if (occupant(pieces, second)) continue;
        for (const finish of neighbours(second).filter((node) => !same(node, leg) && node.sector === piece.sector)) {
          const turn = alignment(first, vector(second, finish));
          if (turn > .2 && turn < .92 && landable(piece, finish, pieces)) output.push(finish);
        }
      } else {
        const turn = alignment(first, vector(leg, second));
        if (turn > .2 && turn < .92 && landable(piece, second, pieces)) output.push(second);
      }
    }
  }
  return unique(output);
}

function elephantTargets(piece: SanguoPiece, pieces: SanguoPiece[]) {
  const output: SanguoNode[] = [];
  for (const eye of neighbours(piece.node).filter((node) => node.sector === piece.sector)) {
    if (occupant(pieces, eye)) continue;
    const first = vector(piece.node, eye);
    for (const finish of neighbours(eye).filter((node) => node.sector === piece.sector && !same(node, piece.node))) {
      if (alignment(first, vector(eye, finish)) > .72 && landable(piece, finish, pieces)) output.push(finish);
    }
  }
  return unique(output);
}

function soldierTargets(piece: SanguoPiece, pieces: SanguoPiece[]) {
  const originDistance = distanceFromCenter(piece.node);
  const crossed = piece.node.sector !== piece.sector;
  return oneStep(piece, pieces, (node) => {
    if (!crossed && node.sector !== piece.node.sector) return node.sector !== piece.sector && piece.node.rank === 0 && piece.node.file === 4;
    if (crossed && node.sector !== piece.node.sector) return false;
    const progress = distanceFromCenter(node) - originDistance;
    if (!crossed) return node.sector === piece.sector && progress < -2;
    return progress >= -3;
  });
}

export function graphPseudoTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  if (piece.captured) return [];
  if (piece.role === "icebreaker") return chariotTargets(piece, pieces);
  if (piece.role === "cannon") return cannonTargets(piece, pieces);
  if (piece.role === "king") return oneStep(piece, pieces, (node) => ownPalace(piece, node) && cardinal(piece.node, node));
  if (piece.role === "guard") return oneStep(piece, pieces, (node) => ownPalace(piece, node) && diagonal(piece.node, node));
  if (piece.role === "seer") return elephantTargets(piece, pieces);
  if (piece.role === "rider") return horseTargets(piece, pieces, 2);
  if (piece.role === "runner") return horseTargets(piece, pieces, 3);
  return soldierTargets(piece, pieces);
}
