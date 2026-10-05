import { initialXiangqiState, applyXiangqiMove, legalTargets, pieceAt, isInCheck, type XiangqiState, type XiangqiSide, type XiangqiSquare } from '../heritage-arcade/ported/game/xiangqiRules';
export const RULESET_VERSION = 'standard-xiangqi-v1';
export const SIDES: XiangqiSide[] = ['red', 'black'];
export const BOT_LEVELS = {
  easy: { label: 'Easy', description: 'Varied legal moves with a light preference for captures.' },
  medium: { label: 'Medium', description: 'Two-kingdom tactical search with checks, recaptures and river-crossing threats.' },
  hard: { label: 'Hard', description: 'Deeper alpha-beta strategy with tactical continuations. No deliberate mistakes.' },
};
export type Action = { pieceId: string; to: XiangqiSquare };
export const createInitialState = initialXiangqiState;
export function getLegalActions(state: XiangqiState): Action[] {
  if (state.winner) return [];
  return state.pieces.filter(p => p.side === state.turn).flatMap(p => legalTargets(p, state.pieces).map(to => ({ pieceId: p.id, to })));
}
export function applyAction(state: XiangqiState, action: Action) {
  const next = applyXiangqiMove(state, action.pieceId, action.to);
  return next ? { state: next } : { error: 'That move is not legal.' };
}
const VALUES = { general: 0, chariot: 900, cannon: 450, horse: 400, elephant: 200, advisor: 200, soldier: 100 };
const other = (side: XiangqiSide) => side === 'red' ? 'black' : 'red';
function evaluate(state: XiangqiState) {
  let score = 0;
  for (const p of state.pieces) {
    const advance = p.side === 'red' ? 9-p.row : p.row;
    const value = VALUES[p.role] + (p.role === 'soldier' ? advance*8 + (advance >= 5 ? 65 : 0) : p.role === 'general' ? 0 : advance*2) + (p.role === 'horse' || p.role === 'chariot' ? (4-Math.abs(4-p.col))*3 : 0);
    score += p.side === state.turn ? value : -value;
  }
  return score + (isInCheck(state.turn, state.pieces) ? -45 : 0) + (isInCheck(other(state.turn), state.pieces) ? 45 : 0);
}
function advance(state: XiangqiState, action: Action): XiangqiState {
  const pieces = state.pieces.filter(p => !(p.row === action.to.row && p.col === action.to.col)).map(p => p.id === action.pieceId ? { ...p, ...action.to } : p);
  return { ...state, pieces, turn: other(state.turn), moveNumber: state.moveNumber+1 };
}
function ordered(state: XiangqiState, actions: Action[]) {
  const priority = (a: Action) => { const capture = pieceAt(state.pieces, a.to); return capture ? VALUES[capture.role]*10 - VALUES[state.pieces.find(p => p.id === a.pieceId)!.role] : 0; };
  return [...actions].sort((a,b) => priority(b)-priority(a));
}
export function chooseXiangqiAction(state: XiangqiState, difficulty = 'medium', options: { random?: () => number; budgetMs?: number; maxNodes?: number; depth?: number } = {}): Action | null {
  const actions = getLegalActions(state);
  if (!actions.length) return null;
  if (difficulty === 'easy') {
    const weights = actions.map(a => pieceAt(state.pieces,a.to) ? 1.6 : 1);
    let pick = (options.random || Math.random)()*weights.reduce((a,b) => a+b,0);
    return actions.find((_,i) => (pick -= weights[i]) < 0) || actions.at(-1)!;
  }
  const hard = difficulty === 'hard', deadline = Date.now() + (options.budgetMs ?? (hard ? 1800 : 500));
  let nodes = 0;
  const stop = {}, maxNodes = options.maxNodes ?? (hard ? 18000 : 4000);
  function search(position: XiangqiState, depth: number, alpha: number, beta: number, ply: number, tactical: number): number {
    if (++nodes > maxNodes || Date.now() >= deadline) throw stop;
    let legal = getLegalActions(position);
    if (!legal.length) return -100000+ply; // Xiangqi stalemate also loses.
    if (depth <= 0) {
      const value = evaluate(position);
      if (tactical <= 0) return value;
      if (!isInCheck(position.turn,position.pieces)) {
        if (value >= beta) return value;
        alpha = Math.max(alpha,value);
        legal = legal.filter(a => pieceAt(position.pieces,a.to));
        if (!legal.length) return value;
      }
    }
    for (const action of ordered(position,legal)) {
      const value = -search(advance(position,action),depth-1,-beta,-alpha,ply+1,depth <= 0 ? tactical-1 : tactical);
      if (value >= beta) return value;
      alpha = Math.max(alpha,value);
    }
    return alpha;
  }
  let root = ordered(state,actions), best = root[0];
  for (let depth = 1; depth <= (options.depth ?? (hard ? 4 : 2)); depth++) {
    let candidate = best, score = -Infinity;
    try {
      for (const action of root) {
        const value = -search(advance(state,action),depth-1,-Infinity,-score,1,hard ? 2 : 1);
        if (value > score) { score = value; candidate = action; }
      }
      best = candidate; root = [best,...root.filter(a => a !== best)];
      if (score > 99900) break;
    } catch (error) { if (error !== stop) throw error; break; }
  }
  return best;
}
