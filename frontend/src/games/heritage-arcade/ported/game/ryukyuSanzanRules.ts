/**
 * Ryūkyū Sanzan is an explicitly labelled Pudgy Penguins Original. Its territory
 * mechanics are deliberately inspired by the documented liberty/capture concepts of Go,
 * rather than presented as a recovered historical rule set.
 */
import { CLANS, type ClanId } from "./millsRules";

export const SANZAN_SIZE = 15;
export type SanzanPhase = "territory" | "finished";
export type SanzanBoard = Array<Array<ClanId | null>>;
export type SanzanPlayer = { clan: ClanId; stones: number; captures: number; cuts: number };
export type SanzanScore = { stones: number; captures: number; territory: number; cuts: number; total: number };
export type SanzanMove = { number: number; actor: ClanId; type: "place" | "pass"; coordinate?: string; captures: number; perimeterCut: boolean };
export type SanzanInspection = { coordinate: string; kind: "group" | "legal" | "restricted" | "closed"; owner: ClanId | null; groupSize: number; liberties: string[]; captures: number; perimeterCut: boolean; message: string };
export type SanzanState = {
  roster: ClanId[];
  board: SanzanBoard;
  players: Record<ClanId, SanzanPlayer>;
  phase: SanzanPhase;
  turnIndex: number;
  passes: number;
  actionCount: number;
  previousBoardHash: string | null;
  winner: ClanId | "shared" | null;
  finalScores: Record<ClanId, SanzanScore> | null;
  moves: SanzanMove[];
  origin: "new" | "demo";
  lastEvent: string;
  eventLog: string[];
};

type Point = { row: number; col: number };

const DIRECTIONS = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
const blankBoard = (): SanzanBoard => Array.from({ length: SANZAN_SIZE }, () => Array<ClanId | null>(SANZAN_SIZE).fill(null));
const copyBoard = (board: SanzanBoard): SanzanBoard => board.map((row) => [...row]);
const inside = (row: number, col: number) => row >= 0 && row < SANZAN_SIZE && col >= 0 && col < SANZAN_SIZE;
const pointKey = ({ row, col }: Point) => `${row}:${col}`;
const boardHash = (board: SanzanBoard) => board.map((row) => row.map((cell) => cell?.[0] ?? ".").join("")).join("/");
const playerRecord = (roster: ClanId[]) => {
  const players = {} as Record<ClanId, SanzanPlayer>;
  (Object.keys(CLANS) as ClanId[]).forEach((clan) => { players[clan] = { clan, stones: roster.includes(clan) ? 50 : 0, captures: 0, cuts: 0 }; });
  return players;
};

export const coordinateFor = (row: number, col: number) => `${String.fromCharCode(65 + row)}${col + 1}`;
const coordinateFromKey = (key: string) => { const [row, col] = key.split(":").map(Number); return coordinateFor(row, col); };
export const ownerAt = (state: SanzanState, row: number, col: number) => state.board[row]?.[col] ?? null;
export const stonesOnBoard = (board: SanzanBoard, clan: ClanId) => board.flat().filter((owner) => owner === clan).length;

function neighbours(row: number, col: number): Point[] {
  return DIRECTIONS.map(([dr, dc]) => ({ row: row + dr, col: col + dc })).filter(({ row: nextRow, col: nextCol }) => inside(nextRow, nextCol));
}

function groupAt(board: SanzanBoard, row: number, col: number) {
  const owner = board[row]?.[col];
  if (!owner) return { owner: null, stones: [] as Point[], liberties: new Set<string>() };
  const queue: Point[] = [{ row, col }]; const seen = new Set<string>(); const stones: Point[] = []; const liberties = new Set<string>();
  while (queue.length) {
    const current = queue.pop()!; const key = pointKey(current);
    if (seen.has(key)) continue;
    seen.add(key); stones.push(current);
    neighbours(current.row, current.col).forEach((next) => {
      const neighborOwner = board[next.row][next.col];
      if (!neighborOwner) liberties.add(pointKey(next));
      else if (neighborOwner === owner) queue.push(next);
    });
  }
  return { owner, stones, liberties };
}

function emptyRegions(board: SanzanBoard) {
  const seen = new Set<string>(); const regions: Array<{ cells: Point[]; borders: Set<ClanId>; touchesEdge: boolean }> = [];
  for (let row = 0; row < SANZAN_SIZE; row += 1) for (let col = 0; col < SANZAN_SIZE; col += 1) {
    if (board[row][col] || seen.has(`${row}:${col}`)) continue;
    const queue: Point[] = [{ row, col }]; const cells: Point[] = []; const borders = new Set<ClanId>(); let touchesEdge = false;
    while (queue.length) {
      const current = queue.pop()!; const key = pointKey(current);
      if (seen.has(key)) continue;
      seen.add(key); cells.push(current);
      if (current.row === 0 || current.col === 0 || current.row === SANZAN_SIZE - 1 || current.col === SANZAN_SIZE - 1) touchesEdge = true;
      neighbours(current.row, current.col).forEach((next) => {
        const owner = board[next.row][next.col];
        if (!owner) queue.push(next); else borders.add(owner);
      });
    }
    regions.push({ cells, borders, touchesEdge });
  }
  return regions;
}

const internalRegionsFor = (board: SanzanBoard, clan: ClanId) => emptyRegions(board).filter((region) => !region.touchesEdge && region.borders.size === 1 && region.borders.has(clan));

export function territoryFor(board: SanzanBoard, clan: ClanId) {
  return emptyRegions(board).reduce((total, region) => total + (region.borders.size === 1 && region.borders.has(clan) ? region.cells.length : 0), 0);
}

export function scoreBreakdown(state: SanzanState) {
  const scores = {} as Record<ClanId, SanzanScore>;
  (Object.keys(CLANS) as ClanId[]).forEach((clan) => {
    const player = state.players[clan]; const stones = stonesOnBoard(state.board, clan); const territory = territoryFor(state.board, clan);
    scores[clan] = { stones, captures: player.captures, territory, cuts: player.cuts, total: stones + player.captures + territory + player.cuts * 2 };
  });
  return scores;
}

export function inspectIntersection(state: SanzanState, row: number, col: number): SanzanInspection {
  const coordinate = coordinateFor(row, col); const owner = ownerAt(state, row, col);
  if (owner) {
    const group = groupAt(state.board, row, col); const liberties = Array.from(group.liberties).map(coordinateFromKey).sort();
    return { coordinate, kind: "group", owner, groupSize: group.stones.length, liberties, captures: 0, perimeterCut: false, message: `${CLANS[owner].name} holds a connected group of ${group.stones.length}. Its ${liberties.length} libert${liberties.length === 1 ? "y is" : "ies are"} ${liberties.join(", ") || "none"}.` };
  }
  if (state.phase === "finished") return { coordinate, kind: "closed", owner: null, groupSize: 0, liberties: [], captures: 0, perimeterCut: false, message: `${coordinate} is open ice. The settlement has already been scored.` };
  const prepared = preparePlacement(state, row, col);
  if (prepared) return { coordinate, kind: "legal", owner: null, groupSize: 0, liberties: [], captures: prepared.captures, perimeterCut: prepared.cut, message: `${coordinate} is legal for ${CLANS[currentClan(state)].name}${prepared.captures ? ` and would capture ${prepared.captures} stone${prepared.captures === 1 ? "" : "s"}` : ""}${prepared.cut ? ", earning a Perimeter Cut" : ""}.` };
  return { coordinate, kind: "restricted", owner: null, groupSize: 0, liberties: [], captures: 0, perimeterCut: false, message: `${coordinate} cannot be settled now: it is either an occupied/invalid point, self-capture, an immediate repeat, or this clan has no reserve stones.` };
}

export function createReplayExport(state: SanzanState) {
  return {
    format: "ppba-ryukyu-sanzan-replay",
    version: 1,
    ruleset: "Ryūkyū Sanzan — Pudgy Penguins Original",
    origin: state.origin,
    note: state.origin === "demo" ? "This export preserves the visible demo snapshot plus any actions taken after it; the preloaded chart has no fabricated move history." : "This export contains the full local move record from the opening chart.",
    roster: state.roster,
    moves: state.moves,
    snapshot: { board: state.board, players: state.players, phase: state.phase, actionCount: state.actionCount, consecutivePasses: state.passes, lastEvent: state.lastEvent },
    scores: state.finalScores ?? scoreBreakdown(state),
    winner: state.winner,
  };
}

const recordEvent = (state: SanzanState, event: string): SanzanState => ({ ...state, lastEvent: event, eventLog: [...state.eventLog, event].slice(-6) });
const allPoolsEmpty = (state: SanzanState) => state.roster.every((clan) => state.players[clan].stones === 0);
const currentClan = (state: SanzanState) => state.roster[state.turnIndex];

function finish(state: SanzanState, ending: string): SanzanState {
  const finalScores = scoreBreakdown(state); const active = state.roster;
  const high = Math.max(...active.map((clan) => finalScores[clan].total)); const leaders = active.filter((clan) => finalScores[clan].total === high);
  const winner = leaders.length === 1 ? leaders[0] : "shared" as const;
  const conclusion = winner === "shared" ? `${ending} The expedition ends in a shared score of ${high}.` : `${ending} ${CLANS[winner].name} leads with ${high} chart points.`;
  return recordEvent({ ...state, phase: "finished", winner, finalScores }, conclusion);
}

function nextTurn(state: SanzanState, event: string) {
  const advanced = recordEvent({ ...state, turnIndex: (state.turnIndex + 1) % state.roster.length }, event);
  return allPoolsEmpty(advanced) ? finish(advanced, "Every clan has deployed its fifty stones.") : advanced;
}

export function createInitialSanzanState(roster: ClanId[] = ["polly", "retsba", "pengu"]): SanzanState {
  const startingClan = roster[0];
  return { roster, board: blankBoard(), players: playerRecord(roster), phase: "territory", turnIndex: 0, passes: 0, actionCount: 0, previousBoardHash: null, winner: null, finalScores: null, moves: [], origin: "new", lastEvent: `${CLANS[startingClan].name} opens the three-hills chart. Place on an empty intersection or pass.`, eventLog: [] };
}

function preparePlacement(state: SanzanState, row: number, col: number) {
  if (state.phase !== "territory" || !inside(row, col) || state.board[row][col]) return null;
  const actor = currentClan(state); if (state.players[actor].stones <= 0) return null;
  const board = copyBoard(state.board); board[row][col] = actor;
  const removedByClan = new Map<ClanId, number>(); const inspected = new Set<string>();
  neighbours(row, col).forEach((next) => {
    const enemy = board[next.row][next.col];
    if (!enemy || enemy === actor || inspected.has(`${next.row}:${next.col}`)) return;
    const group = groupAt(board, next.row, next.col); group.stones.forEach((stone) => inspected.add(pointKey(stone)));
    if (group.liberties.size === 0) {
      group.stones.forEach((stone) => { board[stone.row][stone.col] = null; });
      removedByClan.set(enemy, (removedByClan.get(enemy) ?? 0) + group.stones.length);
    }
  });
  if (groupAt(board, row, col).liberties.size === 0) return null;
  if (boardHash(board) === state.previousBoardHash) return null;
  const captures = Array.from(removedByClan.values()).reduce((sum, value) => sum + value, 0);
  const sealedNewRegion = internalRegionsFor(board, actor).length > internalRegionsFor(state.board, actor).length;
  const cut = removedByClan.size >= 2 || sealedNewRegion;
  return { board, captures, cut, capturedClans: Array.from(removedByClan.keys()) };
}

export function canPlaceStone(state: SanzanState, row: number, col: number) { return !!preparePlacement(state, row, col); }

export function placeStone(state: SanzanState, row: number, col: number): SanzanState | null {
  const prepared = preparePlacement(state, row, col); if (!prepared) return null;
  const actor = currentClan(state); const beforeHash = boardHash(state.board);
  const player = state.players[actor]; const nextPlayers = { ...state.players, [actor]: { ...player, stones: player.stones - 1, captures: player.captures + prepared.captures, cuts: player.cuts + (prepared.cut ? 1 : 0) } };
  const captureText = prepared.captures ? ` captured ${prepared.captures} rival stone${prepared.captures === 1 ? "" : "s"}` : "";
  const cutText = prepared.cut ? " and logged a Perimeter Cut" : "";
  const move: SanzanMove = { number: state.actionCount + 1, actor, type: "place", coordinate: coordinateFor(row, col), captures: prepared.captures, perimeterCut: prepared.cut };
  return nextTurn({ ...state, board: prepared.board, players: nextPlayers, passes: 0, actionCount: state.actionCount + 1, previousBoardHash: beforeHash, moves: [...state.moves, move] }, `${CLANS[actor].name} settled ${coordinateFor(row, col)}${captureText}${cutText}.`);
}

export function passTurn(state: SanzanState): SanzanState | null {
  if (state.phase !== "territory") return null;
  const actor = currentClan(state); const passes = state.passes + 1;
  const move: SanzanMove = { number: state.actionCount + 1, actor, type: "pass", captures: 0, perimeterCut: false };
  const passed = { ...state, passes, actionCount: state.actionCount + 1, previousBoardHash: boardHash(state.board), moves: [...state.moves, move] };
  if (passes >= state.roster.length) return finish(passed, "All three clans passed in succession.");
  return nextTurn(passed, `${CLANS[actor].name} passed. ${state.roster.length - passes} more consecutive pass${state.roster.length - passes === 1 ? "" : "es"} would end the table.`);
}

export function demoSanzanState(roster: ClanId[]): SanzanState {
  const state = createInitialSanzanState(roster); const [a, b, c] = roster; const board = blankBoard();
  [[6, 7, a], [8, 7, a], [7, 6, a], [3, 3, a], [4, 3, a], [10, 10, a], [7, 7, b], [3, 4, b], [4, 4, b], [11, 10, b], [5, 11, c], [6, 11, c], [10, 11, c], [11, 11, c]].forEach(([row, col, owner]) => { board[row as number][col as number] = owner as ClanId; });
  const players = playerRecord(roster); players[a].stones = 45; players[b].stones = 46; players[c].stones = 45; players[a].captures = 2; players[c].cuts = 1;
  return { ...state, board, players, actionCount: 14, origin: "demo", lastEvent: `Demo chart: ${CLANS[a].name} can settle H9 to capture the surrounded ${CLANS[b].name} stone.`, eventLog: ["Demo chart loaded — the three-hills territory engine is live."] };
}

export function settledDemoSanzanState(roster: ClanId[]): SanzanState {
  const firstPass = passTurn(demoSanzanState(roster))!;
  const secondPass = passTurn(firstPass)!;
  return passTurn(secondPass)!;
}
