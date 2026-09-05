/* Sanguo rule contract: standard Xiangqi legality plus the documented Three-Kingdoms turn, river, elimination, and appropriation conventions. */
import { SOURCE_RAIL_EDGES, sourceNodeKey } from "./sanguoRailGraph";
import { graphPseudoTargets } from "./sanguoGraphMoves";
import { generalsFacingOnConfirmedFiles } from "./sanguoSpecialRules";

export const sanguoFactions = ["red", "green", "blue"] as const;
export type SanguoFaction = (typeof sanguoFactions)[number];
export type SanguoRole = "king" | "guard" | "seer" | "rider" | "runner" | "icebreaker" | "cannon" | "scout";
export type SanguoNode = { sector: SanguoFaction; rank: number; file: number };
export type SanguoPiece = { id: string; sector: SanguoFaction; controller: SanguoFaction; role: SanguoRole; node: SanguoNode; captured?: boolean };
export type PendingResolution = { defeated: SanguoFaction; victor: SanguoFaction; reason: "checkmate" | "stalemate"; matingPieceId?: string };
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

/** Public pseudo-target resolver used by attack and legality checks. */
export const pseudoSanguoTargets = (piece: SanguoPiece, pieces: SanguoPiece[]) => graphPseudoTargets(piece, pieces);

/** Xiangqi flying-General rule, evaluated on the confirmed Sanguo file continuations. */
export function generalsFacing(pieces: SanguoPiece[]) {
  return generalsFacingOnConfirmedFiles(pieces);
}

export function generalIsAttacked(controller: SanguoFaction, pieces: SanguoPiece[]) {
  const general = pieces.find((piece) => !piece.captured && piece.sector === controller && piece.role === "king");
  return Boolean(general && pieces.some((piece) =>
    !piece.captured &&
    piece.controller !== controller &&
    pseudoSanguoTargets(piece, pieces).some((target) => sameNode(target, general.node)),
  ));
}

const checkingPiecesAgainst = (defeated: SanguoFaction, victor: SanguoFaction, pieces: SanguoPiece[]) => {
  const general = pieces.find((piece) => !piece.captured && piece.sector === defeated && piece.role === "king");
  if (!general) return [];
  return pieces.filter((piece) =>
    !piece.captured &&
    piece.controller === victor &&
    pseudoSanguoTargets(piece, pieces).some((target) => sameNode(target, general.node)),
  );
};

const relocate = (pieces: SanguoPiece[], piece: SanguoPiece, destination: SanguoNode) => {
  const victim = occupant(pieces, destination);
  return pieces.map((candidate) => candidate.id === piece.id ? { ...candidate, node: destination } : victim && candidate.id === victim.id ? { ...candidate, captured: true } : candidate);
};

/**
 * A legal move may not capture a General directly. Instead it must leave the
 * opposing General with no legal reply; Sanguo then resolves that army in the
 * documented separate appropriation turn.
 */
export const legalSanguoTargets = (piece: SanguoPiece, pieces: SanguoPiece[]) => pseudoSanguoTargets(piece, pieces).filter((target) => {
  const victim = occupant(pieces, target);
  if (victim?.role === "king") return false;
  const next = relocate(pieces, piece, target);
  return !generalsFacing(next) && !generalIsAttacked(piece.controller, next);
});

export const hasSanguoLegalMove = (controller: SanguoFaction, pieces: SanguoPiece[]) => pieces.some((piece) =>
  !piece.captured && piece.controller === controller && legalSanguoTargets(piece, pieces).length > 0,
);

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

export const initialSanguoState = (includeBannermen = false): SanguoState => ({
  pieces: initialSanguoPieces(includeBannermen),
  turn: "red",
  defeated: [],
  winner: null,
  pending: null,
  note: "Shu / Red opens. Turns then proceed counterclockwise: Red → Green → Blue.",
  moveNumber: 1,
  lastMove: null,
});

/** Shu/Red first, then counterclockwise Red → Green → Blue, skipping eliminated kingdoms. */
export function nextSanguoTurn(current: SanguoFaction, defeated: SanguoFaction[]) {
  for (let offset = 1; offset <= sanguoFactions.length; offset += 1) {
    const candidate = sanguoFactions[(sanguoFactions.indexOf(current) + offset) % sanguoFactions.length];
    if (!defeated.includes(candidate)) return candidate;
  }
  return current;
}

export const winnerFromDefeats = (defeated: SanguoFaction[]) => {
  const survivors = sanguoFactions.filter((faction) => !defeated.includes(faction));
  return survivors.length === 1 ? survivors[0] : null;
};

export const appropriateArmy = (pieces: SanguoPiece[], defeated: SanguoFaction, victor: SanguoFaction) => pieces.map((piece) =>
  piece.sector === defeated && !piece.captured && piece.role !== "king" ? { ...piece, controller: victor } : piece,
);

export const removeGeneralAndAppropriate = (pieces: SanguoPiece[], resolution: PendingResolution) => pieces.map((piece) =>
  piece.sector !== resolution.defeated
    ? piece
    : piece.role === "king"
      ? { ...piece, captured: true }
      : piece.captured
        ? piece
        : { ...piece, controller: resolution.victor },
);

export function applySanguoMove(state: SanguoState, pieceId: string, destination: SanguoNode): SanguoState | null {
  if (state.winner || state.pending) return null;
  const piece = state.pieces.find((candidate) => candidate.id === pieceId);
  if (!piece || piece.captured || piece.controller !== state.turn || !legalSanguoTargets(piece, state.pieces).some((target) => sameNode(target, destination))) return null;

  const victim = occupant(state.pieces, destination);
  const pieces = relocate(state.pieces, piece, destination);
  const nextTurn = nextSanguoTurn(state.turn, state.defeated);
  const lastMove: SanguoMove = { pieceId, from: piece.node, to: destination, controller: state.turn, role: piece.role, captured: victim?.role };
  const action = `${roleLabels[piece.role]} ${victim ? `captures ${roleLabels[victim.role]}` : "advances"}`;
  const nextInCheck = generalIsAttacked(nextTurn, pieces);

  // Xiangqi stalemate is a loss. Sanguo applies the same army appropriation to
  // either checkmate or stalemate, with the player completing the condition as victor.
  if (!hasSanguoLegalMove(nextTurn, pieces)) {
    const reason: PendingResolution["reason"] = nextInCheck ? "checkmate" : "stalemate";
    const checkers = reason === "checkmate" ? checkingPiecesAgainst(nextTurn, state.turn, pieces) : [];
    const matingPieceId = checkers.some((checker) => checker.id === piece.id) ? piece.id : checkers[0]?.id;
    return {
      ...state,
      pieces,
      pending: { defeated: nextTurn, victor: state.turn, reason, matingPieceId },
      note: `${action}. ${nextTurn} has no legal reply: resolve ${reason} appropriation.`,
      moveNumber: state.moveNumber + 1,
      lastMove,
    };
  }

  return {
    ...state,
    pieces,
    turn: nextTurn,
    note: nextInCheck ? `${action}. ${nextTurn} is in check and must answer it.` : `${action}. ${nextTurn} to move.`,
    moveNumber: state.moveNumber + 1,
    lastMove,
  };
}

const placeMatingPieceOnGeneral = (pieces: SanguoPiece[], resolution: PendingResolution) => {
  if (resolution.reason !== "checkmate" || !resolution.matingPieceId) return pieces;
  const general = pieces.find((piece) => !piece.captured && piece.sector === resolution.defeated && piece.role === "king");
  const matingPiece = pieces.find((piece) => !piece.captured && piece.id === resolution.matingPieceId && piece.controller === resolution.victor);
  if (!general || !matingPiece) return pieces;
  return pieces.map((piece) => piece.id === matingPiece.id ? { ...piece, node: general.node } : piece);
};

export function resolveSanguoAppropriation(state: SanguoState): SanguoState | null {
  if (!state.pending) return null;

  const defeated = [...state.defeated, state.pending.defeated];
  // Historical Sanguo convention: on checkmate, the mating piece occupies the
  // defeated General's point during the separate resolution turn.
  const resolvedPosition = placeMatingPieceOnGeneral(state.pieces, state.pending);
  const pieces = removeGeneralAndAppropriate(resolvedPosition, state.pending);
  const winner = winnerFromDefeats(defeated);

  if (winner) {
    return { ...state, pieces, defeated, winner, pending: null, note: `${winner} is the last surviving kingdom.`, lastMove: state.lastMove };
  }

  const turn = nextSanguoTurn(state.turn, defeated);
  return {
    ...state,
    pieces,
    defeated,
    turn,
    pending: null,
    note: `${state.pending.victor} appropriates the ${state.pending.defeated} army. ${turn} to move.`,
    lastMove: state.lastMove,
  };
}

export const sanguoStateFrom = (pieces: SanguoPiece[], turn: SanguoFaction = "red", defeated: SanguoFaction[] = []): SanguoState => ({
  pieces,
  turn,
  defeated,
  winner: null,
  pending: null,
  note: "Test state loaded.",
  moveNumber: 1,
  lastMove: null,
});
