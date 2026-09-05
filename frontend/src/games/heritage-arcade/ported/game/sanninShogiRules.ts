export type SanninPlayer = "first" | "middle" | "last";
export type SanninRole = "king" | "rook" | "bishop" | "gold" | "silver" | "knight" | "lance" | "pawn";
export type SanninHandRole = Exclude<SanninRole, "king">;
export type Hex = { q: number; r: number };
export type SanninPiece = { id: string; owner: SanninPlayer; role: SanninRole; hex: Hex; promoted: boolean };
export type SanninHands = Record<SanninPlayer, Record<SanninHandRole, number>>;
export type SanninState = {
  pieces: SanninPiece[];
  hands: SanninHands;
  turn: SanninPlayer;
  eliminated: SanninPlayer[];
  winner: SanninPlayer | null;
  moveNumber: number;
  kingMoved: Record<SanninPlayer, boolean>;
  kingEverChecked: Record<SanninPlayer, boolean>;
  note: string;
  lastMove: null | { player: SanninPlayer; role: SanninRole; from?: Hex; to: Hex; drop?: boolean; promoted?: boolean; castle?: boolean };
};

export const PLAYERS: SanninPlayer[] = ["first", "middle", "last"];
export const PLAYER_LABELS: Record<SanninPlayer, string> = { first: "First", middle: "Middle", last: "Last" };
export const ROLE_LABELS: Record<SanninRole, string> = { king: "King", rook: "Rook", bishop: "Bishop", gold: "Gold", silver: "Silver", knight: "Knight", lance: "Lance", pawn: "Pawn" };
export const HAND_ROLES: SanninHandRole[] = ["rook", "bishop", "gold", "silver", "knight", "lance", "pawn"];
export const ALL_HEXES: Hex[] = [];
for (let q = -6; q <= 6; q += 1) for (let r = -6; r <= 6; r += 1) if (Math.abs(q + r) <= 6) ALL_HEXES.push({ q, r });

export const hexKey = ({ q, r }: Hex) => `${q}:${r}`;
export const sameHex = (a: Hex, b: Hex) => a.q === b.q && a.r === b.r;
export const insideHex = ({ q, r }: Hex) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= 6;
export const pieceAt = (pieces: SanninPiece[], hex: Hex) => pieces.find((piece) => sameHex(piece.hex, hex));
export const notation = ({ q, r }: Hex) => `${7 - q}${String.fromCharCode(97 + r + 6)}`;
const fromNotation = (file: number, rank: string): Hex => ({ q: 7 - file, r: rank.charCodeAt(0) - 97 - 6 });

const rotate = ({ q, r }: Hex): Hex => ({ q: r, r: -q - r });
const rotateTimes = (hex: Hex, times: number) => { let result = hex; for (let i = 0; i < times; i += 1) result = rotate(result); return result; };
const rotations: Record<SanninPlayer, number> = { middle: 0, first: 1, last: 2 };
const orient = (player: SanninPlayer, vector: Hex) => rotateTimes(vector, rotations[player]);

const CLOCK: Record<number, Hex> = {
  1: { q: 1, r: -1 }, 2: { q: 2, r: -1 }, 3: { q: 1, r: 0 }, 4: { q: 1, r: 1 },
  5: { q: 0, r: 1 }, 6: { q: -1, r: 2 }, 7: { q: -1, r: 1 }, 8: { q: -2, r: 1 },
  9: { q: -1, r: 0 }, 10: { q: -1, r: -1 }, 11: { q: 0, r: -1 }, 12: { q: 1, r: -2 },
};
const oddHours = [1, 3, 5, 7, 9, 11];
const evenHours = [2, 4, 6, 8, 10, 12];
const add = (a: Hex, b: Hex) => ({ q: a.q + b.q, r: a.r + b.r });

export function territoryOwner(hex: Hex): SanninPlayer | null {
  if (hex.r >= 4) return "middle";
  if (hex.q >= 4) return "first";
  if (-hex.q - hex.r >= 4) return "last";
  return null;
}
export const isPleasureGarden = (hex: Hex) => hex.q === 0 && hex.r === 0;
const promotionZone = (player: SanninPlayer, hex: Hex) => {
  const owner = territoryOwner(hex);
  return isPleasureGarden(hex) || (owner !== null && owner !== player);
};
const farEdge = (player: SanninPlayer, hex: Hex) => player === "middle" ? hex.r === -6 : player === "first" ? hex.q === -6 : hex.q + hex.r === 6;

const emptyHand = (): Record<SanninHandRole, number> => ({ rook: 0, bishop: 0, gold: 0, silver: 0, knight: 0, lance: 0, pawn: 0 });
function makeInitialPieces(): SanninPiece[] {
  const middle: { role: SanninRole; hex: Hex }[] = [];
  const addMiddle = (role: SanninRole, file: number, rank: string) => middle.push({ role, hex: fromNotation(file, rank) });
  [[13,"lance"],[12,"silver"],[11,"gold"],[10,"king"],[9,"gold"],[8,"silver"],[7,"lance"]].forEach(([file, role]) => addMiddle(role as SanninRole, file as number, "m"));
  addMiddle("bishop", 12, "l"); addMiddle("rook", 7, "l");
  [13,12,11,10,8,7,6,5].forEach((file) => addMiddle("pawn", file, "k")); addMiddle("knight", 9, "k");
  const pieces: SanninPiece[] = [];
  for (const player of PLAYERS) middle.forEach((item, index) => pieces.push({ id: `${player}-${item.role}-${index}`, owner: player, role: item.role, hex: rotateTimes(item.hex, rotations[player]), promoted: false }));
  return pieces;
}

export function initialSanninState(): SanninState {
  return {
    pieces: makeInitialPieces(), hands: { first: emptyHand(), middle: emptyHand(), last: emptyHand() }, turn: "first", eliminated: [], winner: null, moveNumber: 1,
    kingMoved: { first: false, middle: false, last: false }, kingEverChecked: { first: false, middle: false, last: false },
    note: "First opens. This table starts in the documented free-for-all mode with no pre-game alliance.", lastMove: null,
  };
}

function hoursFor(piece: SanninPiece) {
  if (piece.promoted && piece.role === "king") return { steps: [] as number[], slides: [...oddHours, ...evenHours] };
  if (piece.role === "king") return { steps: oddHours, slides: [] as number[] };
  if (piece.role === "rook") return piece.promoted ? { steps: [], slides: oddHours } : { steps: [], slides: [1, 3, 6, 9, 11] };
  if (piece.role === "bishop") return piece.promoted ? { steps: oddHours, slides: evenHours } : { steps: [], slides: evenHours };
  if (piece.role === "gold" || (piece.role === "pawn" && piece.promoted)) return { steps: [1, 3, 6, 9, 11, 12], slides: [] };
  if (piece.role === "knight") return { steps: [2, 3, 4, 8, 9, 10], slides: [] };
  if (piece.role === "silver") return piece.promoted ? { steps: [1, 2, 5, 7, 10, 11], slides: [6, 12] } : { steps: [1, 2, 5, 7, 10, 11], slides: [] };
  if (piece.role === "lance") return { steps: [], slides: piece.promoted ? [1, 5, 7, 11] : [1, 11] };
  return { steps: [1, 11], slides: [] };
}

function rawTargets(piece: SanninPiece, pieces: SanninPiece[]) {
  const { steps, slides } = hoursFor(piece); const targets: Hex[] = [];
  for (const hour of steps) { const target = add(piece.hex, orient(piece.owner, CLOCK[hour])); if (insideHex(target)) targets.push(target); }
  for (const hour of slides) {
    const vector = orient(piece.owner, CLOCK[hour]); let target = add(piece.hex, vector);
    while (insideHex(target)) { targets.push(target); if (pieceAt(pieces, target)) break; target = add(target, vector); }
  }
  return targets;
}

function kingHex(pieces: SanninPiece[], player: SanninPlayer) { return pieces.find((piece) => piece.owner === player && piece.role === "king")?.hex; }
export function isInCheck(pieces: SanninPiece[], player: SanninPlayer) {
  const king = kingHex(pieces, player); if (!king) return true;
  return pieces.some((piece) => piece.owner !== player && rawTargets(piece, pieces).some((target) => sameHex(target, king)));
}
function simulateMove(pieces: SanninPiece[], id: string, to: Hex, promote: boolean) {
  return pieces.filter((piece) => piece.id === id || !sameHex(piece.hex, to)).map((piece) => piece.id === id ? { ...piece, hex: to, promoted: piece.promoted || promote } : piece);
}

export function canPromote(piece: SanninPiece, to: Hex) {
  return !piece.promoted && !["gold", "knight"].includes(piece.role) && (promotionZone(piece.owner, piece.hex) || promotionZone(piece.owner, to));
}
function castleTargets(piece: SanninPiece, state: SanninState) {
  if (piece.role !== "king" || piece.promoted || state.kingMoved[piece.owner] || state.kingEverChecked[piece.owner]) return [];
  return ALL_HEXES.filter((hex) => territoryOwner(hex) === piece.owner && pieceAt(state.pieces, hex)?.owner !== piece.owner);
}
export function legalTargets(piece: SanninPiece, state: SanninState) {
  const normal = rawTargets(piece, state.pieces);
  const candidates = [...normal, ...castleTargets(piece, state)].filter((target, index, list) => list.findIndex((other) => sameHex(other, target)) === index);
  return candidates
    .filter((target) => { const occupant = pieceAt(state.pieces, target); return occupant?.owner !== piece.owner && occupant?.role !== "king"; })
    .filter((target) => !isInCheck(simulateMove(state.pieces, piece.id, target, canPromote(piece, target)), piece.owner));
}

function cloneHands(hands: SanninHands): SanninHands { return { first: { ...hands.first }, middle: { ...hands.middle }, last: { ...hands.last } }; }
function simulateDrop(state: SanninState, player: SanninPlayer, role: SanninHandRole, to: Hex) {
  const hands = cloneHands(state.hands); hands[player][role] -= 1;
  const pieces = [...state.pieces, { id: `drop-${player}-${role}-${state.moveNumber}-${to.q}-${to.r}`, owner: player, role, hex: to, promoted: false } as SanninPiece];
  return { ...state, pieces, hands };
}
export function legalDropHexes(state: SanninState, player: SanninPlayer, role: SanninHandRole) {
  if (state.hands[player][role] <= 0) return [];
  return ALL_HEXES.filter((hex) => !pieceAt(state.pieces, hex))
    .filter((hex) => !((role === "pawn" || role === "lance") && farEdge(player, hex)))
    .filter((hex) => !isInCheck(simulateDrop(state, player, role, hex).pieces, player));
}
function hasAction(state: SanninState, player: SanninPlayer) {
  return state.pieces.some((piece) => piece.owner === player && legalTargets(piece, state).length > 0) || HAND_ROLES.some((role) => state.hands[player][role] > 0 && legalDropHexes(state, player, role).length > 0);
}
function nextActive(state: SanninState, after: SanninPlayer) {
  let index = PLAYERS.indexOf(after);
  for (let step = 1; step <= 3; step += 1) { const candidate = PLAYERS[(index + step) % 3]; if (!state.eliminated.includes(candidate)) return candidate; }
  return after;
}
function updateCheckMemory(state: SanninState) {
  const memory = { ...state.kingEverChecked };
  for (const player of PLAYERS) if (!state.eliminated.includes(player) && isInCheck(state.pieces, player)) memory[player] = true;
  return { ...state, kingEverChecked: memory };
}
function adjudicate(state: SanninState, mover: SanninPlayer) {
  let next = updateCheckMemory(state);
  const mated = PLAYERS.filter((player) => player !== mover && !next.eliminated.includes(player) && isInCheck(next.pieces, player) && !hasAction(next, player));
  if (mated.length) {
    const eliminated = [...next.eliminated, ...mated];
    const pieces = next.pieces.filter((piece) => !mated.includes(piece.owner));
    const hands = cloneHands(next.hands); mated.forEach((player) => { hands[player] = emptyHand(); });
    const survivors = PLAYERS.filter((player) => !eliminated.includes(player));
    if (survivors.length === 1) return { ...next, pieces, hands, eliminated, winner: survivors[0], turn: survivors[0], note: `${PLAYER_LABELS[survivors[0]]} is the last country standing.` };
    return { ...next, pieces, hands, eliminated, turn: mover, note: `${mated.map((player) => PLAYER_LABELS[player]).join(" and ")} is checkmated and removed. ${PLAYER_LABELS[mover]} moves again.` };
  }
  const turn = nextActive(next, mover);
  const checked = isInCheck(next.pieces, turn);
  return { ...next, turn, note: checked ? `${PLAYER_LABELS[turn]} is in check and must answer it.` : `${PLAYER_LABELS[turn]} to move.` };
}

export function applySanninMove(state: SanninState, pieceId: string, to: Hex, promote = false): SanninState | null {
  if (state.winner) return null;
  const piece = state.pieces.find((item) => item.id === pieceId);
  if (!piece || piece.owner !== state.turn || !legalTargets(piece, state).some((target) => sameHex(target, to))) return null;
  const captured = pieceAt(state.pieces, to); const hands = cloneHands(state.hands);
  if (captured && captured.role !== "king") hands[piece.owner][captured.role as SanninHandRole] += 1;
  const promoted = promote && canPromote(piece, to);
  const castle = piece.role === "king" && !rawTargets(piece, state.pieces).some((target) => sameHex(target, to));
  const pieces = simulateMove(state.pieces, piece.id, to, promoted);
  const kingMoved = { ...state.kingMoved, [piece.owner]: state.kingMoved[piece.owner] || piece.role === "king" };
  let next: SanninState = { ...state, pieces, hands, kingMoved, moveNumber: state.moveNumber + 1, lastMove: { player: piece.owner, role: piece.role, from: piece.hex, to, promoted, castle } };
  if (piece.role === "king" && isPleasureGarden(to)) return { ...updateCheckMemory(next), winner: piece.owner, turn: piece.owner, note: `${PLAYER_LABELS[piece.owner]} reaches the Pleasure Garden and wins.` };
  next = adjudicate(next, piece.owner);
  return next;
}

export function applySanninDrop(state: SanninState, role: SanninHandRole, to: Hex): SanninState | null {
  if (state.winner || !legalDropHexes(state, state.turn, role).some((hex) => sameHex(hex, to))) return null;
  const mover = state.turn; let next = simulateDrop(state, mover, role, to);
  next = { ...next, moveNumber: state.moveNumber + 1, lastMove: { player: mover, role, to, drop: true } };
  return adjudicate(next, mover);
}
