/* Source-field rule contract: all endpoints are fixed approved nodes; role movement is local Xiangqi semantics, never generic graph walking. */
import { SOURCE_RAIL_EDGES, sourceNodeKey, sourceRailNeighbours } from "./sanguoRailGraph";
import { fieldPoint } from "./sanguoTopology";

export const sanguoFactions = ["red", "green", "blue"] as const;
export type SanguoFaction = (typeof sanguoFactions)[number];
export type SanguoRole = "king" | "guard" | "seer" | "rider" | "runner" | "icebreaker" | "cannon" | "scout";
export type SanguoNode = { sector: SanguoFaction; rank: number; file: number };
export type SanguoPiece = { id: string; sector: SanguoFaction; controller: SanguoFaction; role: SanguoRole; node: SanguoNode; captured?: boolean };
export type PendingResolution = { defeated: SanguoFaction; victor: SanguoFaction; reason: "checkmate" | "stalemate" };
export type SanguoMove = { pieceId: string; from: SanguoNode; to: SanguoNode; controller: SanguoFaction; role: SanguoRole; captured?: SanguoRole };
export type SanguoState = { pieces: SanguoPiece[]; turn: SanguoFaction; defeated: SanguoFaction[]; winner: SanguoFaction | null; pending: PendingResolution | null; note: string; moveNumber: number; lastMove: SanguoMove | null };

export const roleLabels: Record<SanguoRole, string> = { king: "General", guard: "Advisor", seer: "Elephant", rider: "Horse", runner: "Bannerman", icebreaker: "Chariot", cannon: "Cannon", scout: "Soldier" };
export const nodeId = (node: SanguoNode) => sourceNodeKey(node.sector, node.rank, node.file);
export const sameNode = (left: SanguoNode, right: SanguoNode) => nodeId(left) === nodeId(right);
export const sanguoNodeIds = () => sanguoFactions.flatMap((sector) => Array.from({ length: 45 }, (_, index) => sourceNodeKey(sector, Math.floor(index / 9), index % 9)));
export const railNodeIds = new Set(sanguoNodeIds());
export const graphHasOnlyKnownNodes = () => SOURCE_RAIL_EDGES.every(([from, to]) => railNodeIds.has(from) && railNodeIds.has(to));
export const optionalBannermenCount = (enabled: boolean) => enabled ? 54 : 48;

const otherFactions = (faction: SanguoFaction) => sanguoFactions.filter((candidate) => candidate !== faction);
const inLocalField = ({ rank, file }: SanguoNode) => rank >= 0 && rank < 5 && file >= 0 && file < 9;
const inHomePalace = (node: SanguoNode) => node.rank >= 2 && node.rank <= 4 && node.file >= 3 && node.file <= 5;
const isSameField = (piece: SanguoPiece, node: SanguoNode) => node.sector === piece.node.sector;
const isHomeField = (piece: SanguoPiece, node: SanguoNode) => node.sector === piece.sector;
const occupant = (pieces: SanguoPiece[], node: SanguoNode) => pieces.find((piece) => !piece.captured && sameNode(piece.node, node));
const addIfLandable = (piece: SanguoPiece, node: SanguoNode, pieces: SanguoPiece[], output: SanguoNode[]) => {
  if (inLocalField(node) && railNodeIds.has(nodeId(node)) && occupant(pieces, node)?.controller !== piece.controller) output.push(node);
};
const nodeFrom = (piece: SanguoPiece, rank: number, file: number): SanguoNode => ({ sector: piece.node.sector, rank, file });
const intermediateEmpty = (pieces: SanguoPiece[], nodes: SanguoNode[]) => nodes.every((node) => inLocalField(node) && !occupant(pieces, node));

const DELTA_HOPS = new Map<string, SanguoNode>([
  ["blue-1-0", { sector: "green", rank: 1, file: 0 }], ["green-1-0", { sector: "blue", rank: 1, file: 0 }],
  ["blue-1-8", { sector: "red", rank: 1, file: 0 }], ["red-1-0", { sector: "blue", rank: 1, file: 8 }],
  ["green-1-8", { sector: "red", rank: 1, file: 8 }], ["red-1-8", { sector: "green", rank: 1, file: 8 }],
]);

function localLineTargets(piece: SanguoPiece, pieces: SanguoPiece[], cannon: boolean): SanguoNode[] {
  const output: SanguoNode[] = [];
  for (const [dr, df] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    let screened = false;
    for (let distance = 1; distance < 9; distance += 1) {
      const node = nodeFrom(piece, piece.node.rank + dr * distance, piece.node.file + df * distance);
      if (!inLocalField(node)) break;
      const blocked = occupant(pieces, node);
      if (!cannon) { if (blocked) { if (blocked.controller !== piece.controller) output.push(node); break; } output.push(node); continue; }
      if (!screened) { if (blocked) screened = true; else output.push(node); continue; }
      if (!blocked) continue;
      if (blocked.controller !== piece.controller) output.push(node);
      break;
    }
  }
  return output;
}

function deltaTargets(piece: SanguoPiece, pieces: SanguoPiece[], cannon: boolean): SanguoNode[] {
  const destination = DELTA_HOPS.get(nodeId(piece.node));
  if (!destination) return [];
  const hit = occupant(pieces, destination);
  if (hit && hit.controller === piece.controller) return [];
  if (cannon && hit) return [];
  return [destination];
}

export function pseudoSanguoTargets(piece: SanguoPiece, pieces: SanguoPiece[]): SanguoNode[] {
  if (piece.captured) return [];
  const output: SanguoNode[] = [];
  const { rank, file } = piece.node;

  if (piece.role === "icebreaker") return [...localLineTargets(piece, pieces, false), ...deltaTargets(piece, pieces, false)];
  if (piece.role === "cannon") return [...localLineTargets(piece, pieces, true), ...deltaTargets(piece, pieces, true)];

  if (piece.role === "king") {
    for (const [dr, df] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const node = nodeFrom(piece, rank + dr, file + df);
      if (isHomeField(piece, node) && inHomePalace(node)) addIfLandable(piece, node, pieces, output);
    }
    return output;
  }

  if (piece.role === "guard") {
    for (const [dr, df] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const node = nodeFrom(piece, rank + dr, file + df);
      if (isHomeField(piece, node) && inHomePalace(node)) addIfLandable(piece, node, pieces, output);
    }
    return output;
  }

  if (piece.role === "seer") {
    for (const [dr, df] of [[-2, -2], [-2, 2], [2, -2], [2, 2]]) {
      const node = nodeFrom(piece, rank + dr, file + df);
      const eye = nodeFrom(piece, rank + dr / 2, file + df / 2);
      if (isSameField(piece, node) && isHomeField(piece, node) && intermediateEmpty(pieces, [eye])) addIfLandable(piece, node, pieces, output);
    }
    return output;
  }

  if (piece.role === "rider") {
    const routes = [
      { dr: -2, df: -1, leg: [-1, 0] }, { dr: -2, df: 1, leg: [-1, 0] }, { dr: 2, df: -1, leg: [1, 0] }, { dr: 2, df: 1, leg: [1, 0] },
      { dr: -1, df: -2, leg: [0, -1] }, { dr: 1, df: -2, leg: [0, -1] }, { dr: -1, df: 2, leg: [0, 1] }, { dr: 1, df: 2, leg: [0, 1] },
    ];
    routes.forEach(({ dr, df, leg }) => {
      const node = nodeFrom(piece, rank + dr, file + df);
      const legNode = nodeFrom(piece, rank + leg[0], file + leg[1]);
      if (isSameField(piece, node) && intermediateEmpty(pieces, [legNode])) addIfLandable(piece, node, pieces, output);
    });
    return output;
  }

  if (piece.role === "runner") {
    const routes = [
      { dr: -3, df: -1, steps: [[-1, 0], [-2, 0]] }, { dr: -3, df: 1, steps: [[-1, 0], [-2, 0]] },
      { dr: 3, df: -1, steps: [[1, 0], [2, 0]] }, { dr: 3, df: 1, steps: [[1, 0], [2, 0]] },
      { dr: -1, df: -3, steps: [[0, -1], [0, -2]] }, { dr: 1, df: -3, steps: [[0, -1], [0, -2]] },
      { dr: -1, df: 3, steps: [[0, 1], [0, 2]] }, { dr: 1, df: 3, steps: [[0, 1], [0, 2]] },
    ];
    routes.forEach(({ dr, df, steps }) => {
      const node = nodeFrom(piece, rank + dr, file + df);
      const path = steps.map(([stepRank, stepFile]) => nodeFrom(piece, rank + stepRank, file + stepFile));
      if (isSameField(piece, node) && intermediateEmpty(pieces, path)) addIfLandable(piece, node, pieces, output);
    });
    return output;
  }

  const forward = nodeFrom(piece, rank - 1, file);
  addIfLandable(piece, forward, pieces, output);
  if (rank === 0) {
    addIfLandable(piece, nodeFrom(piece, rank, file - 1), pieces, output);
    addIfLandable(piece, nodeFrom(piece, rank, file + 1), pieces, output);
  }
  return output;
}

const nodeFromId = (value: string): SanguoNode => { const [sector, rank, file] = value.split("-"); return { sector: sector as SanguoFaction, rank: Number(rank), file: Number(file) }; };
function openRailSight(from: SanguoPiece, to: SanguoPiece, pieces: SanguoPiece[]) {
  const origin = from.node;
  for (const firstId of sourceRailNeighbours(origin.sector, origin.rank, origin.file)) {
    const visited = new Set<string>([nodeId(origin)]);
    let previous = origin;
    let current = nodeFromId(firstId);
    let previousVector = { x: fieldPoint(current.sector, current.rank, current.file).x - fieldPoint(previous.sector, previous.rank, previous.file).x, y: fieldPoint(current.sector, current.rank, current.file).y - fieldPoint(previous.sector, previous.rank, previous.file).y };
    for (let steps = 0; steps < 18; steps += 1) {
      if (visited.has(nodeId(current))) break;
      visited.add(nodeId(current));
      if (sameNode(current, to.node)) return true;
      if (occupant(pieces, current)) break;
      const currentPoint = fieldPoint(current.sector, current.rank, current.file);
      const options = sourceRailNeighbours(current.sector, current.rank, current.file).map(nodeFromId).filter((candidate) => !sameNode(candidate, previous)).map((candidate) => {
        const candidatePoint = fieldPoint(candidate.sector, candidate.rank, candidate.file);
        const vector = { x: candidatePoint.x - currentPoint.x, y: candidatePoint.y - currentPoint.y };
        const denominator = Math.hypot(vector.x, vector.y) * Math.hypot(previousVector.x, previousVector.y);
        return { candidate, vector, alignment: denominator ? (vector.x * previousVector.x + vector.y * previousVector.y) / denominator : -1 };
      }).filter(({ alignment }) => alignment > 0.92).sort((left, right) => Math.hypot(right.vector.x, right.vector.y) - Math.hypot(left.vector.x, left.vector.y));
      if (!options.length) break;
      previous = current;
      current = options[0].candidate;
      previousVector = options[0].vector;
    }
  }
  return false;
}

export function generalsFacing(pieces: SanguoPiece[]) {
  const generals = pieces.filter((piece) => !piece.captured && piece.role === "king");
  return generals.some((general, index) => generals.slice(index + 1).some((other) => general.controller !== other.controller && openRailSight(general, other, pieces)));
}

export function generalIsAttacked(controller: SanguoFaction, pieces: SanguoPiece[]) {
  const general = pieces.find((piece) => !piece.captured && piece.sector === controller && piece.role === "king");
  if (!general) return false;
  return pieces.some((piece) => !piece.captured && piece.controller !== controller && pseudoSanguoTargets(piece, pieces).some((target) => sameNode(target, general.node)));
}

const relocate = (pieces: SanguoPiece[], piece: SanguoPiece, destination: SanguoNode) => {
  const victim = occupant(pieces, destination);
  return pieces.map((candidate) => candidate.id === piece.id ? { ...candidate, node: destination } : victim && candidate.id === victim.id ? { ...candidate, captured: true } : candidate);
};

export function legalSanguoTargets(piece: SanguoPiece, pieces: SanguoPiece[]) {
  return pseudoSanguoTargets(piece, pieces).filter((target) => {
    const victim = occupant(pieces, target);
    if (victim?.role === "king") return false;
    const next = relocate(pieces, piece, target);
    return !generalsFacing(next) && !generalIsAttacked(piece.controller, next);
  });
}

export const hasSanguoLegalMove = (controller: SanguoFaction, pieces: SanguoPiece[]) => pieces.some((piece) => !piece.captured && piece.controller === controller && legalSanguoTargets(piece, pieces).length > 0);

export function initialSanguoPieces(includeBannermen = false): SanguoPiece[] {
  const pieces: SanguoPiece[] = [];
  sanguoFactions.forEach((sector) => {
    const add = (role: SanguoRole, rank: number, file: number, index: number) => pieces.push({ id: `${sector}-${role}-${index}`, sector, controller: sector, role, node: { sector, rank, file } });
    (["icebreaker", "rider", "seer", "guard", "king", "guard", "seer", "rider", "icebreaker"] as SanguoRole[]).forEach((role, file) => add(role, 4, file, file));
    add("cannon", 2, 1, 0); add("cannon", 2, 7, 1);
    [0, 2, 4, 6, 8].forEach((file, index) => add("scout", 1, file, index));
    if (includeBannermen) { add("runner", 2, 3, 0); add("runner", 2, 5, 1); }
  });
  return pieces;
}

export function initialSanguoState(includeBannermen = false): SanguoState {
  return { pieces: initialSanguoPieces(includeBannermen), turn: "red", defeated: [], winner: null, pending: null, note: "Retsba Legion opens from the southern source field. Select a role coin to reveal exact legal destinations.", moveNumber: 1, lastMove: null };
}

export function nextSanguoTurn(current: SanguoFaction, defeated: SanguoFaction[]) {
  for (let offset = 1; offset <= sanguoFactions.length; offset += 1) {
    const candidate = sanguoFactions[(sanguoFactions.indexOf(current) + offset) % sanguoFactions.length];
    if (!defeated.includes(candidate)) return candidate;
  }
  return current;
}

export function winnerFromDefeats(defeated: SanguoFaction[]) { const survivors = sanguoFactions.filter((faction) => !defeated.includes(faction)); return survivors.length === 1 ? survivors[0] : null; }
export function appropriateArmy(pieces: SanguoPiece[], defeated: SanguoFaction, victor: SanguoFaction) { return pieces.map((piece) => piece.sector === defeated && !piece.captured && piece.role !== "king" ? { ...piece, controller: victor } : piece); }
export function removeGeneralAndAppropriate(pieces: SanguoPiece[], resolution: PendingResolution) { return pieces.map((piece) => piece.sector !== resolution.defeated ? piece : piece.role === "king" ? { ...piece, captured: true } : piece.captured ? piece : { ...piece, controller: resolution.victor }); }

export function applySanguoMove(state: SanguoState, pieceId: string, destination: SanguoNode): SanguoState | null {
  if (state.winner || state.pending) return null;
  const piece = state.pieces.find((candidate) => candidate.id === pieceId);
  if (!piece || piece.captured || piece.controller !== state.turn || !legalSanguoTargets(piece, state.pieces).some((target) => sameNode(target, destination))) return null;
  const victim = occupant(state.pieces, destination);
  const pieces = relocate(state.pieces, piece, destination);
  const nextTurn = nextSanguoTurn(state.turn, state.defeated);
  const lastMove: SanguoMove = { pieceId, from: piece.node, to: destination, controller: state.turn, role: piece.role, captured: victim?.role };
  const action = `${roleLabels[piece.role]} ${victim ? `captures ${roleLabels[victim.role]}` : "advances"}`;
  if (!hasSanguoLegalMove(nextTurn, pieces)) {
    const reason = generalIsAttacked(nextTurn, pieces) ? "checkmate" : "stalemate";
    return { ...state, pieces, pending: { defeated: nextTurn, victor: state.turn, reason }, note: `${action}. ${nextTurn} has no legal reply: resolve ${reason} appropriation.`, moveNumber: state.moveNumber + 1, lastMove };
  }
  return { ...state, pieces, turn: nextTurn, note: `${action}. ${nextTurn} to move.`, moveNumber: state.moveNumber + 1, lastMove };
}

export function resolveSanguoAppropriation(state: SanguoState): SanguoState | null {
  if (!state.pending) return null;
  const defeated = [...state.defeated, state.pending.defeated];
  const pieces = removeGeneralAndAppropriate(state.pieces, state.pending);
  const winner = winnerFromDefeats(defeated);
  if (winner) return { ...state, pieces, defeated, winner, pending: null, note: `${winner} is the last surviving kingdom.`, lastMove: state.lastMove };
  const turn = nextSanguoTurn(state.turn, defeated);
  return { ...state, pieces, defeated, turn, pending: null, note: `${state.pending.victor} appropriates the ${state.pending.defeated} army. ${turn} to move.`, lastMove: state.lastMove };
}

export function sanguoStateFrom(pieces: SanguoPiece[], turn: SanguoFaction = "red", defeated: SanguoFaction[] = []): SanguoState { return { pieces, turn, defeated, winner: null, pending: null, note: "Test state loaded.", moveNumber: 1, lastMove: null }; }

export { otherFactions };
