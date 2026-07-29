export const RUMA_RULESET = Object.freeze({
  gameId: "ruma-ice-puzzle",
  rulesetVersion: "tchuka-ruma-campbell-chavey-1995-2x4-1.0.0",
  traditionalName: "Tchuka Ruma",
  regularPits: 4,
  openingPerPit: 2,
  totalCounters: 8
});

export function createRumaState({ pits = [2,2,2,2], ruma = 0 } = {}) {
  return { gameId: RUMA_RULESET.gameId, rulesetVersion: RUMA_RULESET.rulesetVersion, pits: [...pits], ruma, status: "playing", move: 1, lastMove: null, history: [] };
}

export function getLegalActions(state) {
  if (!state || state.status !== "playing") return [];
  return state.pits.map((count, pitIndex) => ({ count, pitIndex })).filter((item) => item.count > 0).map(({ pitIndex }) => ({ type: "sow", pitIndex }));
}

export function applyRumaAction(state, action) {
  const legal = getLegalActions(state).some((candidate) => candidate.pitIndex === action?.pitIndex);
  if (!legal) return { state, error: "Choose a non-empty ice pit." };
  const next = clone(state);
  const summary = resolveMove(next, action.pitIndex);
  next.lastMove = summary;
  next.history.push({ move: next.move, action: { ...action }, summary: clone(summary) });
  next.move += 1;
  if (next.pits.every((count) => count === 0) && next.ruma === RUMA_RULESET.totalCounters) next.status = "won";
  else if (summary.endedInEmpty) next.status = "lost";
  assertInvariant(next);
  return { state: next, error: null };
}

function resolveMove(state, startPit) {
  let pit = startPit;
  let hand = state.pits[pit];
  state.pits[pit] = 0;
  const summary = { startPit, sowings: 0, wrapped: 0, endedInRuma: false, endedInEmpty: false, path: [] };
  let cursor = pit;
  let guard = 0;
  while (true) {
    summary.sowings += 1;
    while (hand > 0) {
      if (++guard > 2000) throw new Error("Ruma relay exceeded the safety limit.");
      cursor += 1;
      if (cursor === RUMA_RULESET.regularPits) {
        state.ruma += 1;
        hand -= 1;
        summary.path.push("ruma");
        if (hand > 0) { cursor = -1; summary.wrapped += 1; }
      } else {
        state.pits[cursor] += 1;
        hand -= 1;
        summary.path.push(cursor);
      }
    }
    if (summary.path.at(-1) === "ruma") {
      summary.endedInRuma = true;
      return summary;
    }
    const landing = Number(summary.path.at(-1));
    const count = state.pits[landing];
    if (count === 1) {
      summary.endedInEmpty = true;
      return summary;
    }
    hand = count;
    state.pits[landing] = 0;
    cursor = landing;
  }
}

export function solveRuma(state, maxNodes = 50000) {
  const seen = new Map();
  let nodes = 0;
  function search(position) {
    if (++nodes > maxNodes) return null;
    const key = `${position.pits.join(",")}|${position.ruma}`;
    if (seen.has(key)) return seen.get(key);
    if (position.status === "won") return [];
    if (position.status === "lost") return null;
    seen.set(key, null);
    for (const action of getLegalActions(position)) {
      const result = applyRumaAction(position, action);
      if (result.error || result.state.status === "lost") continue;
      const tail = search(result.state);
      if (tail) { const solution = [action, ...tail]; seen.set(key, solution); return solution; }
    }
    return null;
  }
  return search(clone(state));
}

export function recommendedPit(state) { return solveRuma(state)?.[0]?.pitIndex ?? null; }
export function resultTitle(state) { return state.status === "won" ? "Ruma complete" : state.status === "lost" ? "The relay froze" : "Ruma puzzle in progress"; }
export function resultDetail(state) { return state.status === "won" ? "All eight stones reached the Ruma." : state.status === "lost" ? "The final stone landed in an empty ordinary pit." : "Choose a pit and keep every relay alive."; }
export function assertInvariant(state) { const total = state.pits.reduce((a,b)=>a+b,0)+state.ruma; if (total !== 8) throw new Error(`Ruma counter invariant failed: ${total}`); return true; }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
