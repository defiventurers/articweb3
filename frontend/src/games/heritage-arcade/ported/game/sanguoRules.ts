/* Source-field rule contract: every endpoint and every movement segment comes from the approved visible rail graph. */
import { SOURCE_RAIL_EDGES, sourceNodeKey, sourceRailNeighbours } from "./sanguoRailGraph";
import { fieldPoint } from "./sanguoTopology";
import { graphPseudoTargets } from "./sanguoGraphMoves";

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
export const otherFactions = (faction: SanguoFaction) => sanguoFactions.filter((candidate) => candidate !== faction);

const occupant = (pieces: SanguoPiece[], node: SanguoNode) => pieces.find((piece) => !piece.captured && sameNode(piece.node, node));
const nodeFromId = (value: string): SanguoNode => { const [sector, rank, file] = value.split("-"); return { sector: sector as SanguoFaction, rank: Number(rank), file: Number(file) }; };

/** The only public pseudo-target resolver: no coordinate offsets or inferred square-grid moves remain. */
export const pseudoSanguoTargets = (piece: SanguoPiece, pieces: SanguoPiece[]) => graphPseudoTargets(piece, pieces);

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
      }).filter(({ alignment }) => alignment > .92).sort((left, right) => Math.hypot(right.vector.x, right.vector.y) - Math.hypot(left.vector.x, left.vector.y));
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
  return Boolean(general && pieces.some((piece) => !piece.captured && piece.controller !== controller && pseudoSanguoTargets(piece, pieces).some((target) => sameNode(target, general.node))));
}

const relocate = (pieces: SanguoPiece[], piece: SanguoPiece, destination: SanguoNode) => {
  const victim = occupant(pieces, destination);
  return pieces.map((candidate) => candidate.id === piece.id ? { ...candidate, node: destination } : victim && candidate.id === victim.id ? { ...candidate, captured: true } : candidate);
};

export const legalSanguoTargets = (piece: SanguoPiece, pieces: SanguoPiece[]) => pseudoSanguoTargets(piece, pieces).filter((target) => {
  const victim = occupant(pieces, target);
  if (victim?.role === "king") return false;
  const next = relocate(pieces, piece, target);
  return !generalsFacing(next) && !generalIsAttacked(piece.controller, next);
});
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

export const initialSanguoState = (includeBannermen = false): SanguoState => ({ pieces: initialSanguoPieces(includeBannermen), turn: "red", defeated: [], winner: null, pending: null, note: "Retsba Legion opens from the southern source field. Select a role coin to reveal exact legal destinations.", moveNumber: 1, lastMove: null });
export function nextSanguoTurn(current: SanguoFaction, defeated: SanguoFaction[]) { for (let offset = 1; offset <= sanguoFactions.length; offset += 1) { const candidate = sanguoFactions[(sanguoFactions.indexOf(current) + offset) % sanguoFactions.length]; if (!defeated.includes(candidate)) return candidate; } return current; }
export const winnerFromDefeats = (defeated: SanguoFaction[]) => { const survivors = sanguoFactions.filter((faction) => !defeated.includes(faction)); return survivors.length === 1 ? survivors[0] : null; };
export const appropriateArmy = (pieces: SanguoPiece[], defeated: SanguoFaction, victor: SanguoFaction) => pieces.map((piece) => piece.sector === defeated && !piece.captured && piece.role !== "king" ? { ...piece, controller: victor } : piece);
export const removeGeneralAndAppropriate = (pieces: SanguoPiece[], resolution: PendingResolution) => pieces.map((piece) => piece.sector !== resolution.defeated ? piece : piece.role === "king" ? { ...piece, captured: true } : piece.captured ? piece : { ...piece, controller: resolution.victor });

export function applySanguoMove(state: SanguoState, pieceId: string, destination: SanguoNode): SanguoState | null {
  if (state.winner || state.pending) return null;
  const piece = state.pieces.find((candidate) => candidate.id === pieceId);
  if (!piece || piece.captured || piece.controller !== state.turn || !legalSanguoTargets(piece, state.pieces).some((target) => sameNode(target, destination))) return null;
  const victim = occupant(state.pieces, destination);
  const pieces = relocate(state.pieces, piece, destination);
  const nextTurn = nextSanguoTurn(state.turn, state.defeated);
  const lastMove: SanguoMove = { pieceId, from: piece.node, to: destination, controller: state.turn, role: piece.role, captured: victim?.role };
  const action = `${roleLabels[piece.role]} ${victim ? `captures ${roleLabels[victim.role]}` : "advances"}`;
  if (!hasSanguoLegalMove(nextTurn, pieces)) { const reason = generalIsAttacked(nextTurn, pieces) ? "checkmate" : "stalemate"; return { ...state, pieces, pending: { defeated: nextTurn, victor: state.turn, reason }, note: `${action}. ${nextTurn} has no legal reply: resolve ${reason} appropriation.`, moveNumber: state.moveNumber + 1, lastMove }; }
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

export const sanguoStateFrom = (pieces: SanguoPiece[], turn: SanguoFaction = "red", defeated: SanguoFaction[] = []): SanguoState => ({ pieces, turn, defeated, winner: null, pending: null, note: "Test state loaded.", moveNumber: 1, lastMove: null });
