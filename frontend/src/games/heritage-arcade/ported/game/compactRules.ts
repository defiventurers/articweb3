/** Icebound Strategy Atlas: reusable deterministic state transitions for the 23 compact game modes. */
import { ClanId, CLANS } from "./millsRules";
import { CompactMode } from "./compactModes";

export type CompactCell = { id: string; row: number; col: number; label: string };
export type CompactToken = { id: string; owner: ClanId; cell: string; strength: number };
export type CompactState = { mode: CompactMode; roster: ClanId[]; turn: ClanId; tokens: CompactToken[]; scores: Record<ClanId, number>; selected: string | null; actionCount: number; winner: ClanId | "shared" | null; lastEvent: string };

const blankScores = (): Record<ClanId, number> => ({ polly: 0, retsba: 0, pengu: 0, abster: 0 });
export const cellId = (row: number, col: number) => `${row}:${col}`;

export function getCells(mode: CompactMode): CompactCell[] {
  const cells: CompactCell[] = [];
  if (mode.shape === "ring") return Array.from({ length: mode.cols }, (_, col) => ({ id: cellId(0, col), row: 0, col, label: `sector ${col + 1}` }));
  if (mode.shape === "liubo") return [[0,2],[1,1],[1,2],[1,3],[2,0],[2,1],[2,2],[2,3],[2,4],[3,1],[3,2],[3,3],[4,2]].map(([row,col]) => ({ id: cellId(row,col), row, col, label: row === 2 && col === 2 ? "Owl pond" : `road ${row + 1}.${col + 1}` }));
  if (mode.shape === "hex91") return Array.from({ length: 11 }, (_, row) => { const offset = Math.abs(row - 5); const length = 11 - offset; return Array.from({ length }, (_, index) => { const col = offset + index; return { id: cellId(row, col), row, col, label: `hex ${row + 1}.${index + 1}` }; }); }).flat();
  if (mode.shape === "hex61") return Array.from({ length: 9 }, (_, row) => { const offset = Math.abs(row - 4); const length = 9 - offset; return Array.from({ length }, (_, index) => { const col = offset + index; return { id: cellId(row,col), row, col, label: `hex ${row + 1}.${index + 1}` }; }); }).flat();
  if (mode.shape === "triad") return Array.from({ length: 11 }, (_, row) => { const edge = Math.floor((10 - row) / 2); return Array.from({ length: 11 - edge * 2 }, (_, index) => { const col = edge + index; return { id: cellId(row,col), row, col, label: `lattice ${row + 1}.${index + 1}` }; }); }).flat();
  if (mode.shape === "fourfront") return Array.from({ length: 17 }, (_, row) => Array.from({ length: 17 }, (_, col) => ({ row, col }))).flat().filter(({row,col}) => (row >= 4 && row <= 12) || (col >= 4 && col <= 12)).map(({row,col}) => ({ id: cellId(row,col), row, col, label: `front ${row + 1}.${col + 1}` }));
  if (mode.shape === "india") return [[0,4],[1,3],[1,4],[1,5],[2,2],[2,3],[2,4],[2,5],[2,6],[3,1],[3,2],[3,3],[3,4],[3,5],[3,6],[4,2],[4,3],[4,4],[4,5],[5,2],[5,3],[5,4],[5,5],[6,3],[6,4],[7,3],[7,4],[8,3]].map(([row,col]) => ({id:cellId(row,col),row,col,label:`region ${row+1}.${col+1}`}));
  if (mode.shape === "italy") return [[0,2],[0,3],[1,2],[1,3],[2,1],[2,2],[2,3],[3,1],[3,2],[3,3],[4,2],[4,3],[4,4],[5,3],[5,4],[5,5],[6,4],[6,5],[7,5],[7,6],[8,6]].map(([row,col]) => ({id:cellId(row,col),row,col,label:`city ${row+1}.${col+1}`}));
  for (let row = 0; row < mode.rows; row += 1) for (let col = 0; col < mode.cols; col += 1) {
    const valid = mode.shape !== "cross" || (row >= 2 && row <= 4) || (col >= 2 && col <= 4);
    if (valid) cells.push({ id: cellId(row, col), row, col, label: `${String.fromCharCode(65 + row)}${col + 1}` });
  }
  return cells;
}
const cellsById = (mode: CompactMode) => new Map(getCells(mode).map((cell) => [cell.id, cell]));
export const occupied = (state: CompactState, cell: string) => state.tokens.find((token) => token.cell === cell);
const activeClans = (state: CompactState) => state.roster.filter((clan) => state.tokens.some((token) => token.owner === clan) || state.mode.interaction !== "march");

export function neighbors(mode: CompactMode, cell: string): string[] {
  const current = cellsById(mode).get(cell); if (!current) return [];
  const lookup = cellsById(mode);
  if (mode.shape === "ring") return [cellId(0, (current.col - 1 + mode.cols) % mode.cols), cellId(0, (current.col + 1) % mode.cols)].filter((id) => lookup.has(id));
  const offsets = mode.shape === "hex" || mode.shape === "hex61" || mode.shape === "hex91" ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0]] : [[-1, 0], [0, -1], [0, 1], [1, 0]];
  return offsets.map(([dr, dc]) => cellId(current.row + dr, current.col + dc)).filter((id) => lookup.has(id));
}

function homeCells(mode: CompactMode, roster: ClanId[]): string[][] {
  const all = getCells(mode); const center = Math.floor(mode.cols / 2);
  if (mode.shape === "ring") return roster.map((_, index) => {
    const origin = cellId(0, Math.floor((mode.cols / roster.length) * index));
    return [origin, ...neighbors(mode, origin).slice(0, 2)];
  });
  const preferred = mode.shape === "fourfront" ? [cellId(0,center),cellId(center,mode.cols-1),cellId(mode.rows-1,center),cellId(center,0)] : mode.shape === "triad" ? [cellId(0,center),cellId(mode.rows-1,0),cellId(mode.rows-1,mode.cols-1)] : mode.shape === "cross" ? [cellId(0, center), cellId(center, mode.cols - 1), cellId(mode.rows - 1, center), cellId(center, 0)] : [cellId(0, 0), cellId(0, mode.cols - 1), cellId(mode.rows - 1, 0), cellId(mode.rows - 1, mode.cols - 1)];
  return roster.map((_, index) => {
    const origin = all.find((cell) => cell.id === preferred[index]) ?? all[Math.floor((all.length / roster.length) * index)];
    const nearby = neighbors(mode, origin.id).filter((id) => all.some((cell) => cell.id === id)).slice(0, 2);
    return [origin.id, ...nearby];
  });
}

export function createCompactState(mode: CompactMode, roster: ClanId[]): CompactState {
  const scores = blankScores(); const tokens: CompactToken[] = [];
  if (mode.id === 14 && roster.length === 2) {
    const roads = getCells(mode).filter((cell) => cell.id !== cellId(2,2));
    roads.slice(0,6).forEach((cell,index) => tokens.push({ id: `${roster[0]}-bird-${index}`, owner: roster[0], cell: cell.id, strength: 1 }));
    roads.slice(6).forEach((cell,index) => tokens.push({ id: `${roster[1]}-bird-${index}`, owner: roster[1], cell: cell.id, strength: 1 }));
    return { mode, roster, turn: roster[0], tokens, scores, selected: null, actionCount: 0, winner: null, lastEvent: `${CLANS[roster[0]].name} opens with six birds on the reconstructed Liubo roads.` };
  }
  if (mode.id === 21 && roster.length === 2) {
    [0,1,2,3].forEach((row) => [0,1,2,3].forEach((col) => tokens.push({ id: `${roster[1]}-odd-${row}-${col}`, owner: roster[1], cell: cellId(row,col + 2), strength: row < 2 ? 2 : 1 })));
    [12,13,14,15].forEach((row) => [0,1,2,3].forEach((col) => tokens.push({ id: `${roster[0]}-even-${row}-${col}`, owner: roster[0], cell: cellId(row,col + 2), strength: row > 13 ? 2 : 1 })));
    return { mode, roster, turn: roster[1], tokens, scores, selected: null, actionCount: 0, winner: null, lastEvent: `${CLANS[roster[1]].name} opens as Team Odds on the 8×16 numerical field.` };
  }
  if (mode.id === 3 && roster.length === 2) {
    const addFormation = (owner: ClanId, fromTop: boolean) => {
      [0,1,2,3,4,5,6].forEach((rank) => {
        const row = fromTop ? rank : mode.rows - 1 - rank;
        const margin = rank === 4 ? 4 : rank === 5 ? 2 : 0;
        for (let col = margin; col < mode.cols - margin; col += 1) tokens.push({ id: `${owner}-${row}-${col}`, owner, cell: cellId(row,col), strength: rank < 2 ? 2 : 1 });
      });
    };
    addFormation(roster[1], true); addFormation(roster[0], false);
    return { mode, roster, turn: roster[0], tokens, scores, selected: null, actionCount: 0, winner: null, lastEvent: `${CLANS[roster[0]].name} faces a reference-scale Taikyoku Shogi formation.` };
  }
  if (mode.interaction === "march") homeCells(mode, roster).forEach((homes, index) => homes.forEach((cell, tokenIndex) => tokens.push({ id: `${roster[index]}-${tokenIndex}`, owner: roster[index], cell, strength: tokenIndex === 0 ? 2 : 1 })));
  return { mode, roster, turn: roster[0], tokens, scores, selected: null, actionCount: 0, winner: null, lastEvent: `${CLANS[roster[0]].name} opens ${mode.boardLabel}.` };
}

export function legalTargets(state: CompactState): string[] {
  if (!state.selected || state.mode.interaction !== "march") return [];
  const token = state.tokens.find((item) => item.id === state.selected); if (!token || token.owner !== state.turn) return [];
  return neighbors(state.mode, token.cell).filter((target) => occupied(state, target)?.owner !== state.turn);
}
function nextClan(state: CompactState): ClanId { const index = state.roster.indexOf(state.turn); return state.roster[(index + 1) % state.roster.length]; }
function chooseWinner(state: CompactState): ClanId | "shared" {
  const entries = state.roster.map((clan) => ({ clan, score: state.scores[clan] + state.tokens.filter((token) => token.owner === clan).reduce((sum, token) => sum + token.strength, 0) }));
  entries.sort((a, b) => b.score - a.score); return entries.length > 1 && entries[0].score === entries[1].score ? "shared" : entries[0].clan;
}
function resolveEnd(state: CompactState, event: string): CompactState {
  const actionCount = state.actionCount + 1;
  const survivors = activeClans(state);
  if (state.mode.interaction === "march" && survivors.length === 1) return { ...state, actionCount, selected: null, winner: survivors[0], lastEvent: `${event} ${CLANS[survivors[0]].name} controls the last active front.` };
  if (actionCount >= state.mode.actionLimit) return { ...state, actionCount, selected: null, winner: chooseWinner({ ...state, actionCount }), lastEvent: `The action limit ends the contest. ${event}` };
  const turn = nextClan(state); return { ...state, actionCount, selected: null, turn, lastEvent: `${event} ${CLANS[turn].name} now holds the compass.` };
}

export function actOnCell(state: CompactState, cell: string): CompactState | null {
  if (state.winner) return null;
  const target = getCells(state.mode).find((item) => item.id === cell); if (!target) return null;
  const token = occupied(state, cell);
  if (state.mode.interaction === "march") {
    if (token?.owner === state.turn) return { ...state, selected: state.selected === token.id ? null : token.id, lastEvent: `${CLANS[state.turn].name} selected ${target.label}.` };
    const selected = state.tokens.find((item) => item.id === state.selected); if (!selected || !legalTargets(state).includes(cell)) return null;
    const capture = occupied(state, cell); const scores = { ...state.scores, [state.turn]: state.scores[state.turn] + (capture ? capture.strength + 1 : 0) + (target.row === Math.floor(state.mode.rows / 2) ? 1 : 0) };
    const tokens = state.tokens.filter((item) => item.id !== capture?.id).map((item) => item.id === selected.id ? { ...item, cell } : item);
    return resolveEnd({ ...state, tokens, scores }, capture ? `${CLANS[state.turn].name} captured on ${target.label}.` : `${CLANS[state.turn].name} advanced to ${target.label}.`);
  }
  if (!token) {
    const tokens = [...state.tokens, { id: `${state.turn}-${state.actionCount + 1}`, owner: state.turn, cell, strength: 1 }];
    const scores = { ...state.scores, [state.turn]: state.scores[state.turn] + 1 + (target.row === Math.floor(state.mode.rows / 2) ? 1 : 0) };
    return resolveEnd({ ...state, tokens, scores }, `${CLANS[state.turn].name} claimed ${target.label}.`);
  }
  if (token.owner === state.turn) {
    const scores = { ...state.scores, [state.turn]: state.scores[state.turn] + 1 };
    const tokens = state.tokens.map((item) => item.id === token.id ? { ...item, strength: Math.min(4, item.strength + 1) } : item);
    return resolveEnd({ ...state, tokens, scores }, `${CLANS[state.turn].name} reinforced ${target.label}.`);
  }
  const tokens = state.tokens.map((item) => item.id === token.id ? { ...item, owner: state.turn, strength: state.mode.interaction === "stack" ? Math.min(4, item.strength + 1) : 1 } : item);
  const scores = { ...state.scores, [state.turn]: state.scores[state.turn] + (state.mode.interaction === "stack" ? 3 : 2) };
  return resolveEnd({ ...state, tokens, scores }, `${CLANS[state.turn].name} seized ${target.label}.`);
}

export function demoCompactState(mode: CompactMode, roster: ClanId[]): CompactState {
  let state = createCompactState(mode, roster);
  const cells = getCells(mode);
  if (mode.interaction === "march") {
    const first = state.tokens.find((token) => token.owner === state.turn && neighbors(mode, token.cell).some((cell) => !occupied(state, cell))); const target = first ? neighbors(mode, first.cell).find((cell) => !occupied(state, cell)) : undefined;
    if (first && target) state = actOnCell(state, first.cell) ?? state;
    if (target) state = actOnCell(state, target) ?? state;
  } else {
    const picks = [cells[0], cells[Math.floor(cells.length / 2)], cells.at(-1)!].filter(Boolean);
    picks.forEach((cell) => { state = actOnCell(state, cell.id) ?? state; });
  }
  return { ...state, lastEvent: `Demo position loaded. ${state.lastEvent}` };
}
