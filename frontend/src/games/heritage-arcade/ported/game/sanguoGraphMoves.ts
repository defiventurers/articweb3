/* Sanguo movement engine. Phase 1: Chariots use Xiangqi-style orthogonal rays, but a file does not stop at a river. The numbered San Guo Qi files continue into the paired kingdom exactly as drawn on the three-player board. */
import { sourceNodeKey, sourceRailNeighbours } from "./sanguoRailGraph";
import { fieldPoint } from "./sanguoTopology";
import { referenceNodeId } from "./sanguoReferenceCoordinates";
import type { SanguoNode, SanguoPiece } from "./sanguoRules";

const CENTER = { x: 640, y: 625 };
const sourceId = (node: SanguoNode) => sourceNodeKey(node.sector, node.rank, node.file);
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
const crossField = (from: SanguoNode, to: SanguoNode) => from.sector !== to.sector;
const logicalNode = (sector: SanguoNode["sector"], rank: number, file: number): SanguoNode => ({ sector, rank, file });

type ChariotContinuation = { sector: SanguoNode["sector"]; file: number };

/*
  Human line labels are file + 1. The centre-facing end is rank 0 (Lx-5)
  and the outside edge is rank 4 (Lx-1).

  Confirmed continuous files:
    R1-B9, R2-B8, R3-B7, R4-B6,
    R5-B5-G5,
    R6-G4, R7-G3, R8-G2, R9-G1,
    B1-G9, B2-G8, B3-G7, B4-G6.

  The reverse relationships are included explicitly so movement is symmetric
  regardless of which kingdom the Chariot currently occupies.
*/
const CHARIOT_CONTINUATIONS: Record<SanguoNode["sector"], readonly (readonly ChariotContinuation[])[]> = {
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

function logicalChariotTargets(piece: SanguoPiece, pieces: SanguoPiece[]) {
  const output: SanguoNode[] = [];
  const { sector, rank, file } = piece.node;

  // Across the current kingdom: ordinary Xiangqi rank movement. This never
  // crosses a river and therefore cannot create a diagonal turn.
  appendChariotRay(piece, pieces, Array.from({ length: file }, (_, offset) => logicalNode(sector, rank, file - offset - 1)), output);
  appendChariotRay(piece, pieces, Array.from({ length: 8 - file }, (_, offset) => logicalNode(sector, rank, file + offset + 1)), output);

  // Away from the centre on the current file.
  appendChariotRay(piece, pieces, Array.from({ length: 4 - rank }, (_, offset) => logicalNode(sector, rank + offset + 1, file)), output);

  // Toward the centre, then continue along the exact paired file in the next
  // kingdom. Example: R1-1..R1-5 continues B9-5..B9-1. The centre line L5 is
  // the only branching file and may continue into either of the other L5s.
  const homeToCentre = Array.from({ length: rank }, (_, offset) => logicalNode(sector, rank - offset - 1, file));
  const continuations = CHARIOT_CONTINUATIONS[sector][file] ?? [];
  if (!continuations.length) {
    appendChariotRay(piece, pieces, homeToCentre, output);
  } else {
    for (const continuation of continuations) {
      const acrossRiver = Array.from({ length: 5 }, (_, destinationRank) => logicalNode(continuation.sector, destinationRank, continuation.file));
      appendChariotRay(piece, pieces, [...homeToCentre, ...acrossRiver], output);
    }
  }

  return unique(output);
}

function railLineTargets(piece: SanguoPiece, pieces: SanguoPiece[], cannon: boolean) {
  const found: SanguoNode[] = [];
  const queue = neighbours(piece.node).map((current) => ({ previous: piece.node, current, screened: false, crossedRiver: false, permitFieldContinuation: false, visited: new Set([sourceId(piece.node)]) }));
  while (queue.length) {
    const route = queue.shift()!;
    const currentSourceKey = sourceId(route.current);
    if (route.visited.has(currentSourceKey)) continue;
    route.visited.add(currentSourceKey);
    const hit = occupant(pieces, route.current);
    if (!cannon) {
      if (hit) { if (hit.controller !== piece.controller) found.push(route.current); continue; }
      found.push(route.current);
    } else if (!route.screened) {
      if (hit) route.screened = true; else found.push(route.current);
    } else {
      if (hit) { if (hit.controller !== piece.controller) found.push(route.current); continue; }
    }
    const direction = vector(route.previous, route.current);
    neighbours(route.current)
      .filter((candidate) => !same(candidate, route.previous))
      .filter((candidate) => alignment(direction, vector(route.current, candidate)) >= .9 || (!route.crossedRiver && crossField(route.current, candidate)) || (route.permitFieldContinuation && candidate.sector === route.current.sector && candidate.file === route.current.file))
      .forEach((candidate) => queue.push({ previous: route.current, current: candidate, screened: route.screened, crossedRiver: route.crossedRiver || crossField(route.current, candidate), permitFieldContinuation: crossField(route.current, candidate), visited: new Set(route.visited) }));
  }
  return unique(found);
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
  if (piece.role === "cannon") return railLineTargets(piece, pieces, true);
  if (piece.role === "king") return oneStep(piece, pieces, (node) => ownPalace(piece, node) && cardinal(piece.node, node));
  if (piece.role === "guard") return oneStep(piece, pieces, (node) => ownPalace(piece, node) && diagonal(piece.node, node));
  if (piece.role === "seer") return elephantTargets(piece, pieces);
  if (piece.role === "rider") return horseTargets(piece, pieces, 2);
  if (piece.role === "runner") return horseTargets(piece, pieces, 3);
  return soldierTargets(piece, pieces);
}
