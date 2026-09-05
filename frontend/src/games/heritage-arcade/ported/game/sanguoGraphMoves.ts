/* Sanguo movement engine. Phase 1 replaces Chariot geometry heuristics with logical Xiangqi rays plus an explicit three-way centre router. Other roles remain on the legacy rail implementation until their migration phases. */
import { sourceNodeKey, sourceRailNeighbours } from "./sanguoRailGraph";
import { fieldPoint } from "./sanguoTopology";
import { referenceNodeId } from "./sanguoReferenceCoordinates";
import type { SanguoNode, SanguoPiece } from "./sanguoRules";

const CENTER = { x: 640, y: 625 };
const CENTER_FILE = 4;
const SECTORS: readonly SanguoNode["sector"][] = ["red", "green", "blue"];
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

/** Add a Xiangqi-style ray. Empty nodes are legal; the first occupied node is capturable only when enemy-controlled and ends the ray. */
function appendChariotRay(piece: SanguoPiece, pieces: SanguoPiece[], ray: SanguoNode[], output: SanguoNode[]) {
  for (const node of ray) {
    const hit = occupant(pieces, node);
    if (!hit) { output.push(node); continue; }
    if (hit.controller !== piece.controller) output.push(node);
    break;
  }
}

/**
 * Phase 1 Chariot contract:
 * - each 45-node sector is a logical 5x9 Xiangqi half-board;
 * - Chariots move any unobstructed distance along rank or file;
 * - only file 4 can reach the centre;
 * - if the path to the mover's sector portal (rank 0, file 4) is clear, the Chariot may choose either other kingdom,
 *   enter at that kingdom's rank-0/file-4 portal, and continue outward on that same centre file;
 * - a move may cross the centre at most once: no second turn into the third kingdom.
 * Visual pixel angles never participate in this calculation.
 */
export function chariotTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  const output: SanguoNode[] = [];
  const { sector, rank, file } = piece.node;

  appendChariotRay(piece, pieces, Array.from({ length: file }, (_, offset) => logicalNode(sector, rank, file - offset - 1)), output);
  appendChariotRay(piece, pieces, Array.from({ length: 8 - file }, (_, offset) => logicalNode(sector, rank, file + offset + 1)), output);
  appendChariotRay(piece, pieces, Array.from({ length: rank }, (_, offset) => logicalNode(sector, rank - offset - 1, file)), output);
  appendChariotRay(piece, pieces, Array.from({ length: 4 - rank }, (_, offset) => logicalNode(sector, rank + offset + 1, file)), output);

  if (file !== CENTER_FILE) return unique(output);

  // Crossing is permitted only when every node between the current Chariot and its own centre portal is empty.
  let centreOpen = true;
  for (let currentRank = rank - 1; currentRank >= 0; currentRank -= 1) {
    if (occupant(pieces, logicalNode(sector, currentRank, CENTER_FILE))) { centreOpen = false; break; }
  }
  if (!centreOpen) return unique(output);

  for (const destinationSector of SECTORS) {
    if (destinationSector === sector) continue;
    const branch = Array.from({ length: 5 }, (_, destinationRank) => logicalNode(destinationSector, destinationRank, CENTER_FILE));
    appendChariotRay(piece, pieces, branch, output);
  }

  return unique(output);
}

/** Legacy line walker retained for Cannon only until Phase 2. */
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
