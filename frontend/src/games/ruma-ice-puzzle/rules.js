import { assertConserved, cloneGameState, sowOneLap, sumCounters } from "../sowing/relayEngine.js";

export const RUMA_RULESET = Object.freeze({
  gameId: "ruma-ice-puzzle",
  rulesetVersion: "tchuka-ruma-teaching-1.0.0",
  traditionalName: "Tchuka Ruma",
  evidenceStatus: "documented-modern-puzzle-disputed-provenance",
  ordinaryPits: 4,
  totalCounters: 8
});

export const RUMA_PUZZLES = Object.freeze([
  Object.freeze({
    id: "teaching-current",
    name: "Teaching Current",
    opening: Object.freeze([2, 2, 2, 2]),
    par: 6,
    category: "selected-teaching-setup",
    description: "The balanced eight-counter setup used to teach the relay loop."
  }),
  Object.freeze({
    id: "broken-floe",
    name: "Broken Floe",
    opening: Object.freeze([3, 2, 2, 1]),
    par: 7,
    category: "modern-challenge",
    description: "A declared modern challenge with an uneven opening current."
  }),
  Object.freeze({
    id: "deep-freeze",
    name: "Deep Freeze",
    opening: Object.freeze([4, 2, 2, 0]),
    par: 8,
    category: "modern-challenge",
    description: "A harder declared modern arrangement with one frozen empty pit."
  })
]);

export function getRumaPuzzle(puzzleId = RUMA_PUZZLES[0].id) {
  return RUMA_PUZZLES.find((puzzle) => puzzle.id === puzzleId) || RUMA_PUZZLES[0];
}

export function createRumaState({ puzzleId = RUMA_PUZZLES[0].id } = {}) {
  const puzzle = getRumaPuzzle(puzzleId);
  const state = {
    gameId: RUMA_RULESET.gameId,
    rulesetVersion: RUMA_RULESET.rulesetVersion,
    puzzleId: puzzle.id,
    puzzleName: puzzle.name,
    puzzleCategory: puzzle.category,
    par: puzzle.par,
    opening: [...puzzle.opening],
    pits: [...puzzle.opening],
    ruma: 0,
    status: "playing",
    moveCount: 0,
    turn: 1,
    lastTurn: null,
    history: []
  };
  assertRumaInvariant(state);
  return state;
}

export function getLegalActions(state) {
  if (!state || state.status !== "playing") return [];
  return state.pits.flatMap((count, pitIndex) => Number(count || 0) > 0
    ? [{ type: "sow", pitIndex }]
    : []);
}

export function validateRumaAction(state, action) {
  if (!state) return { valid: false, reason: "Missing puzzle state." };
  if (state.status !== "playing") return { valid: false, reason: "Reset or choose another puzzle first." };
  if (!action || action.type !== "sow" || !Number.isInteger(action.pitIndex)) {
    return { valid: false, reason: "Choose one non-empty ordinary pit." };
  }
  if (action.pitIndex < 0 || action.pitIndex >= state.pits.length || Number(state.pits[action.pitIndex] || 0) <= 0) {
    return { valid: false, reason: "Choose one non-empty ordinary pit." };
  }
  return { valid: true };
}

export function applyRumaAction(state, action) {
  const validation = validateRumaAction(state, action);
  if (!validation.valid) return { state, error: validation.reason };

  const next = cloneGameState(state);
  const summary = resolveRumaSow(next, action.pitIndex);
  next.moveCount = Number(next.moveCount || 0) + 1;
  next.turn = next.moveCount + 1;
  next.lastTurn = summary;
  next.history = Array.isArray(next.history) ? next.history : [];
  next.history.push({
    move: next.moveCount,
    action: { ...action },
    summary: cloneGameState(summary),
    pits: [...next.pits],
    ruma: next.ruma
  });

  if (isRumaSolved(next)) next.status = "won";
  else if (summary.failed) next.status = "failed";

  assertRumaInvariant(next);
  return { state: next, error: null };
}

function resolveRumaSow(state, pitIndex) {
  const route = [0, 1, 2, 3, "ruma"];
  let cursor = pitIndex;
  let hand = Number(state.pits[pitIndex] || 0);
  state.pits[pitIndex] = 0;
  const summary = {
    pitIndex,
    seedsPicked: hand,
    seedsSown: 0,
    relays: 0,
    landedInRuma: false,
    failed: false,
    landing: null,
    events: [{ type: "pickup", pitIndex, count: hand }]
  };

  let relayCycles = 0;
  while (hand > 0) {
    relayCycles += 1;
    if (relayCycles > 20000) throw new Error("Ruma relay exceeded the safety limit.");
    const lap = sowOneLap({
      route,
      startIndex: cursor,
      hand,
      read: (slot) => slot === "ruma" ? state.ruma : state.pits[slot],
      write: (slot, value) => {
        if (slot === "ruma") state.ruma = value;
        else state.pits[slot] = value;
      },
      onDrop: ({ slot, count }) => {
        summary.seedsSown += 1;
        summary.landing = slot;
        summary.events.push({ type: "sow", slot, count });
      }
    });
    cursor = lap.cursor;
    const landing = route[cursor];
    hand = 0;

    if (landing === "ruma") {
      summary.landedInRuma = true;
      summary.events.push({ type: "ruma-stop", count: state.ruma });
      return summary;
    }

    const landedCount = Number(state.pits[landing] || 0);
    if (landedCount > 1) {
      state.pits[landing] = 0;
      hand = landedCount;
      summary.relays += 1;
      summary.events.push({ type: "relay", pitIndex: landing, count: hand });
      continue;
    }

    summary.failed = true;
    summary.events.push({ type: "empty-stop", pitIndex: landing });
  }
  return summary;
}

export function isRumaSolved(state) {
  return Boolean(state) && sumCounters(state.pits) === 0 && Number(state.ruma || 0) === RUMA_RULESET.totalCounters;
}

export function getRumaProgress(state) {
  const stored = Number(state?.ruma || 0);
  return {
    stored,
    remaining: RUMA_RULESET.totalCounters - stored,
    percent: Math.round((stored / RUMA_RULESET.totalCounters) * 100)
  };
}

export function solveRumaState(state, { maxNodes = 5000 } = {}) {
  if (!state) return null;
  if (isRumaSolved(state)) return [];
  if (state.status === "failed") return null;

  const start = solverState(state);
  const queue = [{ state: start, path: [] }];
  const seen = new Set([rumaStateKey(start)]);
  let visited = 0;

  while (queue.length) {
    const current = queue.shift();
    visited += 1;
    if (visited > maxNodes) return null;

    for (const action of getLegalActions(current.state)) {
      const result = applyRumaAction(current.state, action);
      if (result.error || result.state.status === "failed") continue;
      const path = [...current.path, action];
      if (result.state.status === "won") return path;
      const key = rumaStateKey(result.state);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ state: solverState(result.state), path });
    }
  }
  return null;
}

export function getRumaHint(state) {
  const solution = solveRumaState(state);
  if (!solution?.length) return null;
  return {
    action: solution[0],
    remainingMoves: solution.length
  };
}

export function replayRumaActions(initialState, actions) {
  let state = cloneGameState(initialState);
  for (const action of actions || []) {
    const result = applyRumaAction(state, action);
    if (result.error) return result;
    state = result.state;
    if (state.status !== "playing") break;
  }
  return { state, error: null };
}

export function summarizeRumaMove(summary) {
  if (!summary) return "Choose a non-empty pit.";
  const parts = [`Sowed ${summary.seedsSown} fish`];
  if (summary.relays) parts.push(`${summary.relays} relay${summary.relays === 1 ? "" : "s"}`);
  if (summary.landedInRuma) parts.push("landed safely in the Ruma");
  if (summary.failed) parts.push("stopped in an empty pit");
  return `${parts.join(" · ")}.`;
}

export function resultTitle(state) {
  if (state?.status === "won") return "Ruma restored";
  if (state?.status === "failed") return "Current broken";
  return "Guide the current";
}

export function resultDetail(state) {
  if (state?.status === "won") {
    const delta = Number(state.moveCount || 0) - Number(state.par || 0);
    if (delta <= 0) return `All eight fish reached the Ruma in par ${state.par}.`;
    return `All eight fish reached the Ruma in ${state.moveCount} moves, ${delta} over par.`;
  }
  if (state?.status === "failed") return "The final fish stopped in an ordinary pit that was empty before landing. Undo or restart.";
  return "Choose a non-empty ordinary pit and follow the automatic relay.";
}

export function assertRumaInvariant(state) {
  const pitTotal = sumCounters(state?.pits || []);
  return assertConserved(pitTotal + Number(state?.ruma || 0), RUMA_RULESET.totalCounters, "Ruma counter");
}

function solverState(state) {
  return {
    gameId: RUMA_RULESET.gameId,
    rulesetVersion: RUMA_RULESET.rulesetVersion,
    puzzleId: state.puzzleId || "solver",
    puzzleName: state.puzzleName || "Solver",
    puzzleCategory: state.puzzleCategory || "solver",
    par: Number(state.par || 0),
    opening: [...(state.opening || state.pits)],
    pits: [...state.pits],
    ruma: Number(state.ruma || 0),
    status: "playing",
    moveCount: Number(state.moveCount || 0),
    turn: Number(state.turn || 1),
    lastTurn: null,
    history: []
  };
}

function rumaStateKey(state) {
  return `${state.pits.join(",")}|${Number(state.ruma || 0)}`;
}
