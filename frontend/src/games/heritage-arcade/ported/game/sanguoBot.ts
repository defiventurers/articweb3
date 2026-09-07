import {
  applySanguoMove, generalIsAttacked, legalSanguoTargets, nodeId, pseudoSanguoTargets,
  resolveSanguoAppropriation, sanguoFactions,
  type SanguoFaction, type SanguoNode, type SanguoRole, type SanguoState,
} from "./sanguoRules";

export type BotDifficulty = "easy" | "medium" | "hard";
export type SanguoAction = { type: "move"; pieceId: string; to: SanguoNode } | { type: "resolve" };
export const BOT_LEVELS = {
  easy: { label: "Easy", description: "Plays legal moves with a little capture preference.", depth: 1, width: 6, budget: 150 },
  medium: { label: "Medium", description: "Weighs captures, development and threatened pieces.", depth: 1, width: 60, budget: 600 },
  hard: { label: "Hard", description: "Searches both rivals’ replies and protects its army.", depth: 3, width: 3, budget: 1800 },
} as const;
const VALUE: Record<SanguoRole, number> = { king: 20000, icebreaker: 900, cannon: 450, rider: 400, runner: 450, guard: 180, seer: 180, scout: 100 };

export function sanguoActions(state: SanguoState): SanguoAction[] {
  if (state.winner || state.draw) return [];
  if (state.pending) return [{ type: "resolve" }];
  return state.pieces.filter(p => !p.captured && p.controller === state.turn)
    .flatMap(p => legalSanguoTargets(p, state.pieces).map(to => ({ type: "move" as const, pieceId: p.id, to })));
}

export function applySanguoAction(state: SanguoState, action: SanguoAction) {
  return action.type === "resolve" ? resolveSanguoAppropriation(state) : applySanguoMove(state, action.pieceId, action.to);
}

/** One utility per kingdom: each opponent optimizes its own position (MaxN). */
export function evaluateSanguo(state: SanguoState): Record<SanguoFaction, number> {
  const scores = { red: 0, green: 0, blue: 0 };
  if (state.draw) return scores;
  if (state.winner) return Object.fromEntries(sanguoFactions.map(f => [f, f === state.winner ? 1000000 : -1000000])) as typeof scores;
  const threats = { red: new Set<string>(), green: new Set<string>(), blue: new Set<string>() };
  for (const p of state.pieces) if (!p.captured) {
    for (const target of pseudoSanguoTargets(p, state.pieces)) threats[p.controller].add(nodeId(target));
  }
  for (const p of state.pieces) if (!p.captured) {
    let worth = VALUE[p.role];
    const progress = p.node.sector === p.sector ? 4 - p.node.rank : 5 + p.node.rank;
    if (p.role === "scout") worth += progress * 12;
    if (["rider", "cannon", "icebreaker"].includes(p.role)) worth += progress * 4;
    const attacked = sanguoFactions.some(f => f !== p.controller && threats[f].has(nodeId(p.node)));
    if (attacked && p.role !== "king") worth -= VALUE[p.role] * (threats[p.controller].has(nodeId(p.node)) ? 0.22 : 0.7);
    scores[p.controller] += worth;
  }
  for (const f of sanguoFactions) {
    if (state.defeated.includes(f)) scores[f] = -1000000;
    else if (generalIsAttacked(f, state.pieces)) scores[f] -= 120;
  }
  const own = { ...scores };
  for (const f of sanguoFactions) if (!state.defeated.includes(f)) {
    scores[f] -= sanguoFactions.filter(g => g !== f && !state.defeated.includes(g)).reduce((sum, g) => sum + own[g] * 0.4, 0);
  }
  return scores;
}

export function chooseSanguoBotAction(state: SanguoState, difficulty: BotDifficulty = "medium", options: { random?: () => number; budgetMs?: number } = {}) {
  const level = BOT_LEVELS[difficulty] || BOT_LEVELS.medium;
  const started = performance.now();
  const deadline = started + (options.budgetMs ?? level.budget);
  const random = options.random ?? Math.random;
  const actions = sanguoActions(state);
  let nodes = 0, completedDepth = 0;
  const result = (action: SanguoAction | null) => ({ action, stats: { nodes, completedDepth, elapsedMs: Math.round(performance.now() - started) } });
  if (!actions.length) return result(null);
  if (state.pending) return result(actions[0]);
  const captureValue = (action: SanguoAction, position: SanguoState) => action.type === "move"
    ? VALUE[position.pieces.find(p => !p.captured && nodeId(p.node) === nodeId(action.to))?.role as SanguoRole] || 0 : 50000;
  if (difficulty === "easy") {
    const captures = actions.filter(a => captureValue(a, state) > 0);
    const pool = captures.length && random() < 0.4 ? captures : actions;
    nodes = 1; completedDepth = 1;
    return result(pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]);
  }
  const ordered = [...actions].sort((a, b) => captureValue(b, state) - captureValue(a, state));
  const positions: { action: SanguoAction; state: SanguoState; score: number }[] = [];
  for (const action of ordered) {
    const next = applySanguoAction(state, action);
    if (!next) continue;
    const resolved = next.pending ? resolveSanguoAppropriation(next)! : next;
    nodes++;
    positions.push({ action, state: resolved, score: evaluateSanguo(resolved)[state.turn] });
  }
  positions.sort((a, b) => b.score - a.score);
  if (!positions.length) return result(actions[0]);
  let best = positions[0].action;
  completedDepth = 1;
  if (difficulty === "medium") return result(best);
  const TIMEOUT = Symbol("search deadline");
  const search = (position: SanguoState, depth: number): ReturnType<typeof evaluateSanguo> => {
    if (performance.now() > deadline) throw TIMEOUT;
    nodes++;
    if (!depth || position.winner || position.draw) return evaluateSanguo(position);
    const danger = new Set(position.pieces.filter(p => !p.captured && p.controller !== position.turn).flatMap(p => pseudoSanguoTargets(p, position.pieces).map(nodeId)));
    const priority = (action: SanguoAction) => {
      if (action.type === "resolve") return 100000;
      const piece = position.pieces.find(p => p.id === action.pieceId)!;
      return captureValue(action, position) * 2 - (danger.has(nodeId(action.to)) ? VALUE[piece.role] : 0) + (action.to.sector === piece.sector ? 4 - action.to.rank : 5 + action.to.rank);
    };
    const moves = sanguoActions(position).sort((a, b) => priority(b) - priority(a)).slice(0, level.width);
    const candidates = moves.map(action => {
      if (performance.now() > deadline) throw TIMEOUT;
      const next = applySanguoAction(position, action)!;
      const child = next.pending ? resolveSanguoAppropriation(next)! : next;
      return { child, score: evaluateSanguo(child)[position.turn] };
    }).sort((a, b) => b.score - a.score).slice(0, level.width);
    let utility: ReturnType<typeof evaluateSanguo> | null = null;
    for (const { child } of candidates) {
      const score = search(child, depth - 1);
      if (!utility || score[position.turn] > utility[position.turn]) utility = score;
    }
    return utility ?? evaluateSanguo(position);
  };
  // An iteration is adopted only when every candidate was searched equally.
  for (let depth = 2; depth <= level.depth; depth++) {
    try {
      let iterationBest = best, bestScore = -Infinity;
      for (const candidate of positions.slice(0, level.width)) {
        const score = search(candidate.state, depth - 1)[state.turn];
        if (score > bestScore) { bestScore = score; iterationBest = candidate.action; }
      }
      best = iterationBest; completedDepth = depth;
    } catch (error) { if (error !== TIMEOUT) throw error; break; }
  }
  return result(best);
}
