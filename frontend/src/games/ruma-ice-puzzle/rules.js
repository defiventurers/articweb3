export const RUMA_RULESET = Object.freeze({
  gameId: "ruma-ice-puzzle",
  rulesetVersion: "tchuka-ruma-modern-solitaire-1.0.0",
  traditionalName: "Tchuka Ruma",
  ordinaryPits: 4,
  totalCounters: 8,
  provenance: "Documented modern solitaire; Indian cultural provenance remains disputed."
});

export const CLASSIC_SETUP = Object.freeze([2, 2, 2, 2]);
export const DAILY_SETUPS = Object.freeze([
  [2, 2, 2, 2],
  [2, 0, 0, 6],
  [2, 0, 1, 5],
  [2, 2, 1, 3],
  [0, 1, 2, 5],
  [3, 2, 2, 1],
  [3, 3, 1, 1],
  [3, 3, 2, 0],
  [4, 0, 0, 4],
  [4, 2, 2, 0],
  [4, 3, 1, 0]
]);

export function createRumaState({ setup = CLASSIC_SETUP, ruma = 0, mode = "classic", setupId = "classic" } = {}) {
  const pits = normalizeSetup(setup);
  const store = Number(ruma || 0);
  if (pits.reduce((sum, value) => sum + value, 0) + store !== RUMA_RULESET.totalCounters) {
    throw new Error("A Ruma puzzle must contain exactly eight counters.");
  }
  const state = {
    gameId: RUMA_RULESET.gameId,
    rulesetVersion: RUMA_RULESET.rulesetVersion,
    mode,
    setupId,
    pits,
    ruma: store,
    status: store === RUMA_RULESET.totalCounters ? "won" : "playing",
    moveCount: 0,
    relayCount: 0,
    lastTurn: null,
    history: []
  };
  assertRumaInvariant(state);
  return state;
}

export function createFinalDropLesson() {
  return createRumaState({ setup: [0, 0, 0, 1], ruma: 7, mode: "lesson", setupId: "final-drop" });
}

export function createDailyRumaState(dateKey = new Date().toISOString().slice(0, 10)) {
  const index = hashString(dateKey) % DAILY_SETUPS.length;
  return createRumaState({ setup: DAILY_SETUPS[index], mode: "daily", setupId: `daily-${dateKey}-${index}` });
}

export function getLegalActions(state) {
  if (!state || state.status !== "playing") return [];
  return state.pits.map((count, pitIndex) => ({ count, pitIndex })).filter((item) => item.count > 0).map((item) => ({ type: "choose-pit", pitIndex: item.pitIndex }));
}

export function validateChoice(state, pitIndex) {
  if (!state) return { valid: false, reason: "Missing puzzle state." };
  if (state.status !== "playing") return { valid: false, reason: state.status === "won" ? "Every counter is already in the Ruma." : "Restart or undo the failed attempt." };
  if (!Number.isInteger(pitIndex) || pitIndex < 0 || pitIndex >= 4) return { valid: false, reason: "Choose one of the four ordinary pits." };
  if (Number(state.pits[pitIndex] || 0) <= 0) return { valid: false, reason: "Choose a non-empty ordinary pit." };
  return { valid: true };
}

export function applyChoice(state, pitIndex) {
  const validation = validateChoice(state, pitIndex);
  if (!validation.valid) return { state, error: validation.reason };
  const next = cloneState(state);
  const turn = resolveChoice(next.pits, next.ruma, pitIndex);
  next.pits = turn.pits;
  next.ruma = turn.ruma;
  next.moveCount += 1;
  next.relayCount += turn.relays;
  next.status = turn.status;
  next.lastTurn = {
    pitIndex,
    stonesPicked: turn.stonesPicked,
    stonesSown: turn.stonesSown,
    relays: turn.relays,
    landed: turn.landed,
    status: turn.status
  };
  next.history.push({ move: next.moveCount, ...cloneState(next.lastTurn), pits: [...next.pits], ruma: next.ruma });
  assertRumaInvariant(next);
  return { state: next, error: null };
}

export function resolveChoice(pitsInput, rumaInput, startPit) {
  const pits = normalizeSetup(pitsInput);
  let ruma = Number(rumaInput || 0);
  let hand = pits[startPit];
  pits[startPit] = 0;
  let cursor = startPit;
  let relays = 0;
  let stonesSown = 0;
  const stonesPicked = hand;
  const seen = new Set();

  while (hand > 0) {
    const signature = `${pits.join(",")}|${ruma}|${cursor}|${hand}`;
    if (seen.has(signature)) return { pits, ruma, status: "failed", relays, stonesPicked, stonesSown, landed: { type: "cycle" } };
    seen.add(signature);
    cursor = (cursor + 1) % 5;
    if (cursor === 4) {
      ruma += 1;
      hand -= 1;
      stonesSown += 1;
      if (hand === 0) {
        return {
          pits,
          ruma,
          status: ruma === RUMA_RULESET.totalCounters ? "won" : "playing",
          relays,
          stonesPicked,
          stonesSown,
          landed: { type: "ruma" }
        };
      }
      continue;
    }

    const before = pits[cursor];
    pits[cursor] += 1;
    hand -= 1;
    stonesSown += 1;
    if (hand === 0) {
      if (before === 0) {
        return { pits, ruma, status: "failed", relays, stonesPicked, stonesSown, landed: { type: "empty-pit", pitIndex: cursor } };
      }
      hand = pits[cursor];
      pits[cursor] = 0;
      relays += 1;
    }
  }

  return { pits, ruma, status: "failed", relays, stonesPicked, stonesSown, landed: { type: "unknown" } };
}

export function findRumaSolution(state, { maxStates = 50000 } = {}) {
  if (!state || state.status === "failed") return null;
  if (state.ruma === 8) return [];
  const startKey = stateKey(state.pits, state.ruma);
  const queue = [{ pits: [...state.pits], ruma: state.ruma, path: [] }];
  const visited = new Set([startKey]);
  let cursor = 0;

  while (cursor < queue.length && visited.size <= maxStates) {
    const node = queue[cursor++];
    for (let pitIndex = 0; pitIndex < 4; pitIndex += 1) {
      if (!node.pits[pitIndex]) continue;
      const outcome = resolveChoice(node.pits, node.ruma, pitIndex);
      const path = [...node.path, pitIndex];
      if (outcome.status === "won") return path;
      if (outcome.status !== "playing") continue;
      const key = stateKey(outcome.pits, outcome.ruma);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ pits: outcome.pits, ruma: outcome.ruma, path });
    }
  }
  return null;
}

export function getRumaHint(state) {
  const solution = findRumaSolution(state);
  return solution?.length ? { pitIndex: solution[0], remainingChoices: solution.length } : null;
}

export function describeRumaTurn(state) {
  if (state.status === "won") return "Ruma complete";
  if (state.status === "failed") return "The final counter stopped in an empty pit";
  if (state.lastTurn?.landed?.type === "ruma") return "Choose another non-empty pit and continue";
  return "Choose a non-empty ordinary pit";
}

export function rumaMessage(turn) {
  if (!turn) return "";
  if (turn.status === "won") return `All eight counters reached the Ruma in ${turn.stonesSown} final sowing step${turn.stonesSown === 1 ? "" : "s"}.`;
  if (turn.status === "failed") {
    if (turn.landed?.type === "empty-pit") return `The final counter stopped in empty pit ${turn.landed.pitIndex + 1}. Undo or restart.`;
    return "The relay repeated without a safe finish. Undo or restart.";
  }
  return `Pit ${turn.pitIndex + 1} sowed ${turn.stonesSown} counters${turn.relays ? ` through ${turn.relays} relay${turn.relays === 1 ? "" : "s"}` : ""} and reached the Ruma.`;
}

export function assertRumaInvariant(state) {
  if (!Array.isArray(state.pits) || state.pits.length !== 4) throw new Error("Ruma requires four ordinary pits.");
  if (state.pits.some((value) => !Number.isInteger(value) || value < 0)) throw new Error("Ruma pit counts must be non-negative integers.");
  if (!Number.isInteger(state.ruma) || state.ruma < 0) throw new Error("Ruma store count is invalid.");
  const total = state.pits.reduce((sum, value) => sum + value, 0) + state.ruma;
  if (total !== 8) throw new Error(`Ruma counter invariant failed: ${total}.`);
  return true;
}

function normalizeSetup(setup) {
  if (!Array.isArray(setup) || setup.length !== 4) throw new Error("Ruma setup requires four pit counts.");
  return setup.map((value) => Number(value || 0));
}
function stateKey(pits, ruma) { return `${pits.join(",")}|${ruma}`; }
function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function cloneState(value) { return JSON.parse(JSON.stringify(value)); }
