/** Icebound Strategy Atlas: deterministic Mills rules are independent of the React board renderer. */
export type ClanId = "polly" | "retsba" | "pengu" | "abster";
export type NodeId = string;
export type MillsPhase = "placing" | "moving" | "capture" | "finished";

export type Clan = { id: ClanId; name: string; short: string; color: string; accent: string; portrait: string };
export const CLANS: Record<ClanId, Clan> = {
  polly: { id: "polly", name: "Polly Clan", short: "POL", color: "#F26B8A", accent: "#FFD3DE", portrait: "/assets/heritage-arcade/board/ppba-polly-token.png" },
  retsba: { id: "retsba", name: "Retsba Legion", short: "RET", color: "#E84A3F", accent: "#FFD4CE", portrait: "/assets/heritage-arcade/board/ppba-retsba-token.png" },
  pengu: { id: "pengu", name: "Pengu Order", short: "PEN", color: "#2387E8", accent: "#CFE8FF", portrait: "/assets/heritage-arcade/board/ppba-pengu-token.png" },
  abster: { id: "abster", name: "Abster Tribe", short: "ABS", color: "#169A55", accent: "#CEF6DA", portrait: "/assets/heritage-arcade/board/ppba-abster-token.png" },
};
export const ALL_CLANS = Object.keys(CLANS) as ClanId[];

type NodeDefinition = { id: NodeId; x: number; y: number; ring: "outer" | "middle" | "inner" };
export const BOARD_NODES: NodeDefinition[] = [
  ["o-nw", 112, 112, "outer"], ["o-n", 380, 112, "outer"], ["o-ne", 648, 112, "outer"], ["o-e", 648, 380, "outer"], ["o-se", 648, 648, "outer"], ["o-s", 380, 648, "outer"], ["o-sw", 112, 648, "outer"], ["o-w", 112, 380, "outer"],
  ["m-nw", 198, 198, "middle"], ["m-n", 380, 198, "middle"], ["m-ne", 562, 198, "middle"], ["m-e", 562, 380, "middle"], ["m-se", 562, 562, "middle"], ["m-s", 380, 562, "middle"], ["m-sw", 198, 562, "middle"], ["m-w", 198, 380, "middle"],
  ["i-nw", 284, 284, "inner"], ["i-n", 380, 284, "inner"], ["i-ne", 476, 284, "inner"], ["i-e", 476, 380, "inner"], ["i-se", 476, 476, "inner"], ["i-s", 380, 476, "inner"], ["i-sw", 284, 476, "inner"], ["i-w", 284, 380, "inner"],
].map(([id, x, y, ring]) => ({ id: id as NodeId, x: x as number, y: y as number, ring: ring as NodeDefinition["ring"] }));
const ringEdges = (prefix: string) => [["nw", "n"], ["n", "ne"], ["ne", "e"], ["e", "se"], ["se", "s"], ["s", "sw"], ["sw", "w"], ["w", "nw"]].map(([a, b]) => [`${prefix}-${a}`, `${prefix}-${b}`] as [NodeId, NodeId]);
export const BOARD_EDGES: [NodeId, NodeId][] = [...ringEdges("o"), ...ringEdges("m"), ...ringEdges("i"), ["o-n", "m-n"], ["m-n", "i-n"], ["o-e", "m-e"], ["m-e", "i-e"], ["o-s", "m-s"], ["m-s", "i-s"], ["o-w", "m-w"], ["m-w", "i-w"]];
export const MILL_LINES: NodeId[][] = [
  ["o-nw", "o-n", "o-ne"], ["o-ne", "o-e", "o-se"], ["o-se", "o-s", "o-sw"], ["o-sw", "o-w", "o-nw"],
  ["m-nw", "m-n", "m-ne"], ["m-ne", "m-e", "m-se"], ["m-se", "m-s", "m-sw"], ["m-sw", "m-w", "m-nw"],
  ["i-nw", "i-n", "i-ne"], ["i-ne", "i-e", "i-se"], ["i-se", "i-s", "i-sw"], ["i-sw", "i-w", "i-nw"],
  ["o-n", "m-n", "i-n"], ["o-e", "m-e", "i-e"], ["o-s", "m-s", "i-s"], ["o-w", "m-w", "i-w"],
];

export type MillsPiece = { id: string; owner: ClanId; node: NodeId };
export type MillsPlayer = { clan: ClanId; eliminated: boolean; mills: number; captures: number };
export type MillsState = { roster: ClanId[]; phase: MillsPhase; turn: ClanId; pieces: MillsPiece[]; reserves: Record<ClanId, number>; players: Record<ClanId, MillsPlayer>; pendingCaptureTargets: string[]; actionCount: number; winner: ClanId | "shared" | null; lastEvent: string };
const emptyReserves = (): Record<ClanId, number> => ({ polly: 0, retsba: 0, pengu: 0, abster: 0 });
const emptyPlayers = (): Record<ClanId, MillsPlayer> => ({ polly: { clan: "polly", eliminated: true, mills: 0, captures: 0 }, retsba: { clan: "retsba", eliminated: true, mills: 0, captures: 0 }, pengu: { clan: "pengu", eliminated: true, mills: 0, captures: 0 }, abster: { clan: "abster", eliminated: true, mills: 0, captures: 0 } });

export function createInitialMillsState(roster: ClanId[] = ["polly", "retsba", "pengu"]): MillsState {
  const reserves = emptyReserves(); const players = emptyPlayers();
  roster.forEach((clan) => { reserves[clan] = 7; players[clan] = { clan, eliminated: false, mills: 0, captures: 0 }; });
  return { roster, phase: "placing", turn: roster[0], pieces: [], reserves, players, pendingCaptureTargets: [], actionCount: 0, winner: null, lastEvent: `${CLANS[roster[0]].name} opens the expedition.` };
}
export const occupancy = (state: MillsState, node: NodeId) => state.pieces.find((piece) => piece.node === node);
export const piecesFor = (state: MillsState, clan: ClanId) => state.pieces.filter((piece) => piece.owner === clan);
const activeClans = (state: MillsState) => state.roster.filter((clan) => !state.players[clan].eliminated);
const nodeNeighbors = (node: NodeId) => BOARD_EDGES.flatMap(([a, b]) => (a === node ? [b] : b === node ? [a] : []));
const allPlaced = (state: MillsState) => state.roster.every((clan) => state.reserves[clan] === 0);
function activeMills(state: MillsState, clan: ClanId) { return MILL_LINES.filter((line) => line.every((node) => occupancy(state, node)?.owner === clan)); }
function formedMills(before: MillsState, after: MillsState, clan: ClanId) { const beforeKeys = new Set(activeMills(before, clan).map((line) => line.join("/"))); return activeMills(after, clan).filter((line) => !beforeKeys.has(line.join("/"))); }

export function legalMoves(state: MillsState, from: NodeId) {
  const piece = occupancy(state, from); if (!piece || piece.owner !== state.turn || state.phase !== "moving") return [] as NodeId[];
  const open = BOARD_NODES.filter((node) => !occupancy(state, node.id)).map((node) => node.id);
  return piecesFor(state, piece.owner).length === 3 ? open : nodeNeighbors(from).filter((node) => !occupancy(state, node));
}
function captureTargets(state: MillsState, clan: ClanId) {
  const enemies = state.pieces.filter((piece) => piece.owner !== clan && !state.players[piece.owner].eliminated);
  const protectedIds = new Set(enemies.filter((piece) => activeMills(state, piece.owner).some((line) => line.includes(piece.node))).map((piece) => piece.id));
  const unprotected = enemies.filter((piece) => !protectedIds.has(piece.id)); return (unprotected.length ? unprotected : enemies).map((piece) => piece.id);
}
function calculateWinner(state: MillsState) {
  const active = activeClans(state); if (active.length === 1) return active[0];
  const ranked = [...active].sort((a, b) => piecesFor(state, b).length - piecesFor(state, a).length || state.players[b].mills - state.players[a].mills);
  if (ranked.length && piecesFor(state, ranked[0]).length !== piecesFor(state, ranked[1]).length) return ranked[0];
  if (ranked.length && state.players[ranked[0]].mills !== state.players[ranked[1]].mills) return ranked[0]; return "shared" as const;
}
function nextTurn(state: MillsState, event: string): MillsState {
  let next = { ...state, phase: allPlaced(state) ? "moving" as const : "placing" as const, pendingCaptureTargets: [], lastEvent: event };
  if (next.actionCount >= 300) return { ...next, phase: "finished" as const, winner: calculateWinner(next), lastEvent: `The 300-action expedition limit was reached. ${event}` };
  let attempts = 0; let cursor = next.roster.indexOf(next.turn);
  while (attempts < next.roster.length) {
    cursor = (cursor + 1) % next.roster.length; const candidate = next.roster[cursor];
    if (next.players[candidate].eliminated) { attempts += 1; continue; }
    if (next.phase === "moving" && piecesFor(next, candidate).length > 3) {
      const hasMove = piecesFor(next, candidate).some((piece) => legalMoves({ ...next, turn: candidate }, piece.node).length > 0);
      if (!hasMove) { next = { ...next, players: { ...next.players, [candidate]: { ...next.players[candidate], eliminated: true } }, lastEvent: `${CLANS[candidate].name} has no legal route and is eliminated.` }; if (activeClans(next).length <= 1) return { ...next, phase: "finished", winner: calculateWinner(next) }; attempts += 1; continue; }
    }
    return { ...next, turn: candidate, lastEvent: `${event} ${CLANS[candidate].name} now holds the compass.` };
  }
  return { ...next, phase: "finished", winner: calculateWinner(next) };
}
function resolveAction(before: MillsState, draft: MillsState, actor: ClanId, message: string): MillsState {
  const mills = formedMills(before, draft, actor); const withMills = mills.length ? { ...draft, players: { ...draft.players, [actor]: { ...draft.players[actor], mills: draft.players[actor].mills + mills.length } } } : draft;
  if (mills.length) { const targets = captureTargets(withMills, actor); if (targets.length) return { ...withMills, phase: "capture", pendingCaptureTargets: targets, lastEvent: `${CLANS[actor].name} formed ${mills.length > 1 ? `${mills.length} new mills` : "a new mill"}; remove one rival penguin.` }; }
  return nextTurn(withMills, message);
}
export function placePiece(state: MillsState, node: NodeId): MillsState | null {
  if (state.phase !== "placing" || state.reserves[state.turn] <= 0 || occupancy(state, node)) return null;
  const owner = state.turn; const piece: MillsPiece = { id: `${owner}-${state.actionCount + 1}`, owner, node };
  return resolveAction(state, { ...state, pieces: [...state.pieces, piece], reserves: { ...state.reserves, [owner]: state.reserves[owner] - 1 }, actionCount: state.actionCount + 1 }, owner, `${CLANS[owner].name} placed on ${node.toUpperCase()}.`);
}
export function movePiece(state: MillsState, from: NodeId, to: NodeId): MillsState | null {
  if (!legalMoves(state, from).includes(to)) return null; const owner = state.turn;
  return resolveAction(state, { ...state, pieces: state.pieces.map((piece) => piece.node === from ? { ...piece, node: to } : piece), actionCount: state.actionCount + 1 }, owner, `${CLANS[owner].name} charted ${from.toUpperCase()} → ${to.toUpperCase()}.`);
}
export function capturePiece(state: MillsState, targetId: string): MillsState | null {
  if (state.phase !== "capture" || !state.pendingCaptureTargets.includes(targetId)) return null; const target = state.pieces.find((piece) => piece.id === targetId); if (!target) return null;
  let draft: MillsState = { ...state, pieces: state.pieces.filter((piece) => piece.id !== targetId), actionCount: state.actionCount + 1, players: { ...state.players, [state.turn]: { ...state.players[state.turn], captures: state.players[state.turn].captures + 1 } } };
  if (allPlaced(draft) && piecesFor(draft, target.owner).length <= 2) draft = { ...draft, players: { ...draft.players, [target.owner]: { ...draft.players[target.owner], eliminated: true } } };
  if (activeClans(draft).length <= 1) return { ...draft, phase: "finished", pendingCaptureTargets: [], winner: calculateWinner(draft), lastEvent: `${CLANS[state.turn].name} captured a ${CLANS[target.owner].name} penguin and ended the expedition.` };
  return nextTurn(draft, `${CLANS[state.turn].name} captured a ${CLANS[target.owner].name} penguin.`);
}
export function demoMillsState(roster: ClanId[]): MillsState {
  const state = createInitialMillsState(roster); const [a, b, c] = roster; const reserves = emptyReserves(); const players = emptyPlayers(); roster.forEach((clan) => { players[clan] = { clan, eliminated: false, mills: clan === a ? 1 : 0, captures: 0 }; });
  return { ...state, phase: "moving", turn: a, reserves, players, actionCount: 24, pieces: [
    { id: `${a}-a`, owner: a, node: "o-nw" }, { id: `${a}-b`, owner: a, node: "o-n" }, { id: `${a}-c`, owner: a, node: "m-w" }, { id: `${a}-d`, owner: a, node: "i-e" },
    { id: `${b}-a`, owner: b, node: "o-ne" }, { id: `${b}-b`, owner: b, node: "m-ne" }, { id: `${b}-c`, owner: b, node: "i-ne" }, { id: `${b}-d`, owner: b, node: "m-s" },
    { id: `${c}-a`, owner: c, node: "o-sw" }, { id: `${c}-b`, owner: c, node: "m-sw" }, { id: `${c}-c`, owner: c, node: "i-sw" }, { id: `${c}-d`, owner: c, node: "i-nw" },
  ], lastEvent: `Demo position: move ${CLANS[a].name}'s inner-east penguin to explore a mill route; 24 explicit nodes and mills are live.` };
}
