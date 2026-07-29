import { assertConserved, cloneGameState, sowOneLap, sumCounters } from "../sowing/relayEngine.js";

export const RUMA_RULESET = Object.freeze({
  gameId: "ruma-ice-puzzle",
  rulesetVersion: "tchuka-ruma-puzzle-0.1.0",
  traditionalName: "Tchuka Ruma",
  evidenceStatus: "documented-modern-puzzle-disputed-provenance",
  ordinaryPits: 4,
  totalCounters: 8,
  opening: [2, 2, 2, 2]
});

export function createRumaState() {
  return {
    gameId: RUMA_RULESET.gameId,
    rulesetVersion: RUMA_RULESET.rulesetVersion,
    pits: [...RUMA_RULESET.opening],
    ruma: 0,
    status: "playing",
    turn: 1,
    lastTurn: null,
    history: []
  };
}

export function getLegalActions(state) {
  if (!state || state.status !== "playing") return [];
  return state.pits.flatMap((count, pitIndex) => Number(count || 0) > 0 ? [{ type: "sow", pitIndex }] : []);
}

export function applyRumaAction(state, action) {
  if (!state || state.status !== "playing") return { state, error: "Start or reset the puzzle first." };
  if (!action || action.type !== "sow" || !Number.isInteger(action.pitIndex)) return { state, error: "Choose one non-empty ordinary pit." };
  if (action.pitIndex < 0 || action.pitIndex >= state.pits.length || Number(state.pits[action.pitIndex] || 0) <= 0) {
    return { state, error: "Choose one non-empty ordinary pit." };
  }

  const next = cloneGameState(state);
  const summary = resolveRumaSow(next, action.pitIndex);
  next.lastTurn = summary;
  next.history.push({ turn: next.turn, action: { ...action }, summary: cloneGameState(summary) });
  next.turn += 1;
  if (sumCounters(next.pits) === 0 && next.ruma === RUMA_RULESET.totalCounters) next.status = "won";
  else if (summary.failed) next.status = "failed";
  assertRumaInvariant(next);
  return { state: next, error: null };
}

function resolveRumaSow(state, pitIndex) {
  const route = [0, 1, 2, 3, "ruma"];
  let cursor = pitIndex;
  let hand = state.pits[pitIndex];
  state.pits[pitIndex] = 0;
  const summary = { pitIndex, seedsPicked: hand, seedsSown: 0, relays: 0, landedInRuma: false, failed: false, landing: null, events: [] };

  let relayCount = 0;
  while (hand > 0) {
    relayCount += 1;
    if (relayCount > 20000) throw new Error("Ruma relay exceeded the safety limit.");
    const lap = sowOneLap({
      route,
      startIndex: cursor,
      hand,
      read: (slot) => slot === "ruma" ? state.ruma : state.pits[slot],
      write: (slot, value) => { if (slot === "ruma") state.ruma = value; else state.pits[slot] = value; },
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
      return summary;
    }

    const landedCount = state.pits[landing];
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

export function assertRumaInvariant(state) {
  return assertConserved(sumCounters(state.pits) + Number(state.ruma || 0), RUMA_RULESET.totalCounters, "Ruma counter");
}
