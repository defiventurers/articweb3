export const RUMA_RULESET = Object.freeze({
  gameId: "ruma-ice-puzzle",
  rulesetVersion: "tchuka-ruma-campbell-chavey-1995-classic-1.0.0",
  traditionalName: "Tchuka Ruma",
  ordinaryPits: 4,
  openingCountersPerPit: 2,
  totalCounters: 8,
  provenance: "Rules stable; living-tradition and geographic provenance disputed"
});

export function createRumaState({ mode = "classic" } = {}) {
  return {
    gameId: RUMA_RULESET.gameId,
    rulesetVersion: RUMA_RULESET.rulesetVersion,
    mode,
    pits: [2, 2, 2, 2],
    ruma: 0,
    status: "playing",
    moveCount: 0,
    sowCount: 0,
    lastMove: null,
    history: [],
    bestKnown: 5
  };
}

export function getLegalActions(state) {
  if (!state || state.status !== "playing") return [];
  return state.pits.map((count, pitIndex) => ({ type: "sow", pitIndex, count })).filter((action) => action.count > 0);
}

export function applyRumaMove(state, action) {
  if (!state || state.status !== "playing") return { state, error: "Reset the puzzle before making another move." };
  if (!action || action.type !== "sow" || !Number.isInteger(action.pitIndex) || action.pitIndex < 0 || action.pitIndex >= 4 || state.pits[action.pitIndex] <= 0) {
    return { state, error: "Choose one non-empty ordinary pit." };
  }
  const next = clone(state);
  const snapshot = { pits: [...next.pits], ruma: next.ruma, status: next.status, moveCount: next.moveCount, sowCount: next.sowCount, lastMove: next.lastMove };
  const summary = resolveChain(next, action.pitIndex);
  next.moveCount += 1;
  next.lastMove = summary;
  next.history.push(snapshot);
  if (next.ruma === RUMA_RULESET.totalCounters) next.status = "won";
  assertInvariant(next);
  return { state: next, error: null };
}

function resolveChain(state, startPit) {
  let source = startPit;
  let hand = state.pits[source];
  state.pits[source] = 0;
  let cursor = source;
  let chains = 0;
  let deposits = 0;
  const events = [{ type: "pickup", pitIndex: source, count: hand }];
  const seen = new Set();
  while (hand > 0) {
    cursor = (cursor + 1) % 5;
    if (cursor === 4) {
      state.ruma += 1;
      hand -= 1;
      deposits += 1;
      events.push({ type: "ruma", count: state.ruma });
    } else {
      const before = state.pits[cursor];
      state.pits[cursor] += 1;
      hand -= 1;
      deposits += 1;
      events.push({ type: "deposit", pitIndex: cursor, before, after: state.pits[cursor] });
      if (hand === 0) {
        if (before === 0) {
          state.status = "lost";
          return { startPit, chains, deposits, ending: "empty-pit", endingPit: cursor, events };
        }
        const signature = `${cursor}|${state.pits.join(",")}|${state.ruma}`;
        if (seen.has(signature)) {
          state.status = "lost";
          return { startPit, chains, deposits, ending: "loop", endingPit: cursor, events };
        }
        seen.add(signature);
        hand = state.pits[cursor];
        state.pits[cursor] = 0;
        source = cursor;
        chains += 1;
        state.sowCount += 1;
        events.push({ type: "chain", pitIndex: cursor, count: hand });
      }
    }
    if (hand === 0 && cursor === 4) {
      state.sowCount += 1;
      return { startPit, chains, deposits, ending: "ruma", endingPit: 4, events };
    }
  }
  return { startPit, chains, deposits, ending: "ruma", endingPit: 4, events };
}

export function undoRumaMove(state) {
  if (!state?.history?.length) return { state, error: "No move to undo." };
  const next = clone(state);
  const snapshot = next.history.pop();
  next.pits = snapshot.pits;
  next.ruma = snapshot.ruma;
  next.status = snapshot.status;
  next.moveCount = snapshot.moveCount;
  next.sowCount = snapshot.sowCount;
  next.lastMove = snapshot.lastMove;
  assertInvariant(next);
  return { state: next, error: null };
}

export function findWinningPlan(state, maxDepth = 12) {
  if (!state || state.status === "lost") return null;
  const queue = [{ state: clone({ ...state, history: [] }), plan: [] }];
  const seen = new Set();
  while (queue.length) {
    const current = queue.shift();
    const key = `${current.state.pits.join(",")}|${current.state.ruma}|${current.state.status}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (current.state.ruma === RUMA_RULESET.totalCounters) return current.plan;
    if (current.plan.length >= maxDepth || current.state.status !== "playing") continue;
    for (const action of getLegalActions(current.state)) {
      const result = applyRumaMove({ ...clone(current.state), history: [] }, action);
      if (result.error || result.state.status === "lost") continue;
      queue.push({ state: { ...result.state, history: [] }, plan: [...current.plan, action.pitIndex] });
    }
  }
  return null;
}

export function getHint(state) {
  const plan = findWinningPlan(state);
  return plan?.length ? { pitIndex: plan[0], remainingMoves: plan.length } : null;
}

export function resultTitle(state) {
  if (state.status === "won") return "Ruma complete";
  if (state.status === "lost") return state.lastMove?.ending === "loop" ? "The sowing looped" : "The final stone found an empty pit";
  return "Ruma puzzle in progress";
}
export function resultDetail(state) {
  if (state.status === "won") return `All eight stones reached the Ruma in ${state.moveCount} choice${state.moveCount === 1 ? "" : "s"}.`;
  if (state.status === "lost") return "Undo the move or reset. A legal attempt may finish only in the Ruma.";
  return "Choose a non-empty pit and follow every forced relay.";
}
export function moveSummary(summary) {
  if (!summary) return "";
  if (summary.ending === "ruma") return `The chain reached the Ruma after ${summary.chains} relay${summary.chains === 1 ? "" : "s"}.`;
  if (summary.ending === "loop") return "The relay returned to a repeated state.";
  return `The last stone landed in empty pit ${summary.endingPit + 1}.`;
}
export function assertInvariant(state) {
  const total = state.pits.reduce((sum, value) => sum + value, 0) + state.ruma;
  if (total !== RUMA_RULESET.totalCounters) throw new Error(`Ruma counter invariant failed: ${total}.`);
  if (state.pits.length !== 4 || state.pits.some((value) => value < 0)) throw new Error("Ruma pit invariant failed.");
  return true;
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
