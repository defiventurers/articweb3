import { advanceShogiSearch, getLegalActions, isInCheck, otherSide } from "./rules.js";

export const BOT_LEVELS = Object.freeze({
  easy: { label: "Easy", description: "Varied legal moves with a light preference for captures." },
  medium: { label: "Medium", description: "Two-kingdom tactical search with checks, recaptures and promotion threats." },
  hard: { label: "Hard", description: "Deeper alpha-beta strategy with tactical continuations. No deliberate mistakes." },
});
const VALUES = { king: 0, rook: 900, bishop: 800, gold: 600, silver: 500, knight: 350, lance: 300, pawn: 100 };
const MATE = 100000;

function evaluate(state, side) {
  let score = 0;
  for (let i = 0; i < 81; i++) {
    const piece = state.board[i];
    if (!piece) continue;
    const row = Math.floor(i / 9), col = i % 9;
    const advancement = piece.side === "red" ? 8-row : row;
    const value = VALUES[piece.type] + (piece.promoted ? (piece.type === "pawn" ? 400 : 160) : 0)
      + (piece.type === "king" ? 0 : advancement * 3 + (4-Math.abs(4-col)) * 2);
    score += piece.side === side ? value : -value;
  }
  for (const army of [side, otherSide(side)]) {
    for (const [type, count] of Object.entries(state.hands[army])) score += (army === side ? 1 : -1) * count * VALUES[type] * 1.1;
  }
  return score + (isInCheck(state, side) ? -45 : 0) + (isInCheck(state, otherSide(side)) ? 45 : 0);
}

function ordered(state, actions) {
  const priority = action => (state.board[action.to] ? VALUES[state.board[action.to].type] * 10 - (VALUES[state.board[action.from]?.type] || 0) : 0) + (action.promote ? 500 : 0);
  return [...actions].sort((a,b) => priority(b)-priority(a));
}

export function chooseShogiSearchAction(state, difficulty = "medium", options = {}) {
  const actions = getLegalActions(state);
  if (!actions.length) return null;
  if (difficulty === "easy") {
    const random = options.random || Math.random;
    const weights = actions.map(action => state.board[action.to] ? 1.6 : 1);
    let pick = random() * weights.reduce((a,b) => a+b, 0);
    return actions.find((_,i) => (pick -= weights[i]) < 0) || actions.at(-1);
  }
  const hard = difficulty === "hard";
  const deadline = Date.now() + (options.budgetMs ?? (hard ? 1600 : 500));
  const maxNodes = options.maxNodes ?? (hard ? 14000 : 4000);
  let nodes = 0;
  const interrupted = {};
  function search(position, depth, alpha, beta, ply, tactical = 0) {
    if (++nodes > maxNodes || Date.now() >= deadline) throw interrupted;
    if (position.winner) return position.winner === position.turn ? MATE-ply : -MATE+ply;
    if (position.draw) return 0;
    const legal = getLegalActions(position);
    if (!legal.length) return -MATE+ply;
    const checked = isInCheck(position, position.turn);
    let choices = legal;
    if (depth <= 0) {
      const value = evaluate(position, position.turn);
      if (tactical <= 0) return value;
      if (!checked) {
        if (value >= beta) return value;
        alpha = Math.max(alpha, value);
        choices = legal.filter(action => position.board[action.to] || action.promote);
        if (!choices.length) return value;
      }
    }
    for (const action of ordered(position, choices)) {
      const value = -search(advanceShogiSearch(position, action), depth-1, -beta, -alpha, ply+1, depth <= 0 ? tactical-1 : tactical);
      if (value >= beta) return value;
      alpha = Math.max(alpha, value);
    }
    return alpha;
  }
  let best = ordered(state, actions)[0];
  let root = ordered(state, actions);
  for (let depth = 1; depth <= (options.depth ?? (hard ? 4 : 2)); depth++) {
    let candidate = best, bestScore = -Infinity;
    try {
      for (const action of root) {
        const score = -search(advanceShogiSearch(state, action), depth-1, -Infinity, -bestScore, 1, hard ? 2 : 1);
        if (score > bestScore) { bestScore = score; candidate = action; }
      }
      best = candidate;
      root = [best, ...root.filter(action => action !== best)];
      if (bestScore >= MATE-100) break;
    } catch (error) {
      if (error !== interrupted) throw error;
      break;
    }
  }
  return best;
}
