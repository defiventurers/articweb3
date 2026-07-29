export const KHASI_FISHFLOW_RULESET = Object.freeze({
  gameId: "khasi-fishflow",
  rulesetVersion: "mawkar-katiya-das-gupta-1923-core-1.0.0",
  traditionalName: "Mawkar Katiya",
  region: "Khasi Hills",
  pitsPerRow: 7,
  openingCountersPerPit: 5,
  totalCounters: 70,
  ranked: false,
  sourceBoundary: "Recovered core only; unusual surplus/deficit clauses remain source-gated."
});

export const PLAYERS = Object.freeze(["aurora", "ember"]);

export function otherPlayer(player) {
  return player === "aurora" ? "ember" : "aurora";
}

export function createKhasiFishflowState({ mode = "hotseat", starter = "aurora" } = {}) {
  const roundStarter = starter === "ember" ? "ember" : "aurora";
  const state = {
    gameId: KHASI_FISHFLOW_RULESET.gameId,
    rulesetVersion: KHASI_FISHFLOW_RULESET.rulesetVersion,
    mode,
    rows: {
      aurora: Array(7).fill(5),
      ember: Array(7).fill(5)
    },
    activePits: { aurora: 7, ember: 7 },
    stores: { aurora: 0, ember: 0 },
    currentPlayer: roundStarter,
    roundStarter,
    round: 1,
    turn: 1,
    winner: null,
    winReason: null,
    lastTurn: null,
    history: [],
    roundHistory: []
  };
  assertCounterInvariant(state);
  return state;
}

export function createKhasiCaptureDrill() {
  const state = createKhasiFishflowState({ mode: "drill", starter: "aurora" });
  state.rows = {
    aurora: [1, 1, 0, 0, 0, 0, 0],
    ember: [0, 0, 0, 5, 0, 0, 0]
  };
  state.stores = { aurora: 30, ember: 33 };
  state.lastTurn = null;
  assertCounterInvariant(state);
  return state;
}

export function getLegalActions(state, player = state.currentPlayer) {
  if (!state || state.winner || player !== state.currentPlayer) return [];
  const active = Number(state.activePits[player] || 0);
  return (state.rows[player] || [])
    .slice(0, active)
    .map((count, pitIndex) => ({ count, pitIndex }))
    .filter((item) => Number(item.count || 0) > 0)
    .map((item) => ({ type: "sow", pitIndex: item.pitIndex }));
}

export function validateAction(state, action, player = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing game state." };
  if (state.winner) return { valid: false, reason: "The Khasi Fishflow match has ended." };
  if (player !== state.currentPlayer) return { valid: false, reason: "It is not this current's turn." };
  if (!action || action.type !== "sow" || !Number.isInteger(action.pitIndex)) return { valid: false, reason: "Choose one active pit on your row." };
  if (action.pitIndex < 0 || action.pitIndex >= Number(state.activePits[player] || 0)) return { valid: false, reason: "That pit is inactive for this round." };
  if (Number(state.rows[player]?.[action.pitIndex] || 0) <= 0) return { valid: false, reason: "Choose a non-empty pit." };
  return { valid: true };
}

export function applyAction(state, action, player = state.currentPlayer) {
  const validation = validateAction(state, action, player);
  if (!validation.valid) return { state, error: validation.reason };
  const next = cloneState(state);
  const roundBefore = next.round;
  let summary;
  try {
    summary = resolveSow(next, player, action.pitIndex);
  } catch (error) {
    return { state, error: error.message || "That relay does not terminate safely." };
  }
  const roundEnded = finishRoundIfNeeded(next);
  summary.roundEnded = roundEnded;
  summary.roundBefore = roundBefore;
  summary.roundAfter = next.round;
  next.lastTurn = summary;
  next.history.push({ turn: next.turn, round: roundBefore, player, action: { ...action }, summary: cloneState(summary) });
  if (!next.winner && !roundEnded) next.currentPlayer = otherPlayer(player);
  next.turn += 1;
  assertCounterInvariant(next);
  return { state: next, error: null };
}

function resolveSow(state, player, pitIndex) {
  const route = activeRoute(state);
  const startKey = pitKey(player, pitIndex);
  let cursor = route.findIndex((pit) => pitKey(pit.player, pit.pitIndex) === startKey);
  if (cursor < 0) throw new Error("Starting pit is not active.");

  let hand = getPit(state, route[cursor]);
  setPit(state, route[cursor], 0);
  const summary = {
    pitIndex,
    seedsPicked: hand,
    seedsSown: 0,
    relays: 0,
    captured: 0,
    capturePit: null,
    landingPit: null,
    events: [{ type: "pickup", player, pitIndex, count: hand }]
  };
  const seen = new Set();

  while (hand > 0) {
    const signature = `${cursor}|${hand}|${route.map((pit) => getPit(state, pit)).join(",")}`;
    if (seen.has(signature)) throw new Error("This start enters a repeating relay. Choose another pit.");
    seen.add(signature);
    cursor = (cursor + 1) % route.length;
    const pit = route[cursor];
    const before = getPit(state, pit);
    setPit(state, pit, before + 1);
    hand -= 1;
    summary.seedsSown += 1;
    summary.landingPit = { ...pit };
    summary.events.push({ type: "sow", ...pit, count: getPit(state, pit) });

    if (hand === 0) {
      if (before > 0) {
        hand = getPit(state, pit);
        setPit(state, pit, 0);
        summary.relays += 1;
        summary.events.push({ type: "relay", ...pit, count: hand });
        continue;
      }
      const opponent = otherPlayer(player);
      const oppositeIndex = pit.pitIndex;
      if (oppositeIndex < Number(state.activePits[opponent] || 0)) {
        const captured = Number(state.rows[opponent][oppositeIndex] || 0);
        state.rows[opponent][oppositeIndex] = 0;
        state.stores[player] += captured;
        summary.captured = captured;
        summary.capturePit = { player: opponent, pitIndex: oppositeIndex };
        summary.events.push({ type: "opposite-capture", player: opponent, pitIndex: oppositeIndex, count: captured });
      }
    }
  }
  return summary;
}

function finishRoundIfNeeded(state) {
  const auroraEmpty = sideTotal(state, "aurora") === 0;
  const emberEmpty = sideTotal(state, "ember") === 0;
  if (!auroraEmpty && !emberEmpty) return false;

  const swept = { aurora: sideTotal(state, "aurora"), ember: sideTotal(state, "ember") };
  for (const player of PLAYERS) {
    state.stores[player] += swept[player];
    state.rows[player] = Array(7).fill(0);
  }
  const inventory = { ...state.stores };
  state.roundHistory.push({ round: state.round, starter: state.roundStarter, inventory: { ...inventory }, swept });

  const canRefill = {
    aurora: inventory.aurora >= 5,
    ember: inventory.ember >= 5
  };
  if (!canRefill.aurora || !canRefill.ember) {
    state.winner = canRefill.aurora ? "aurora" : "ember";
    state.winReason = "cannot-refill-pit";
    return true;
  }

  state.round += 1;
  state.roundStarter = otherPlayer(state.roundStarter);
  state.currentPlayer = state.roundStarter;
  for (const player of PLAYERS) {
    const active = Math.min(7, Math.floor(inventory[player] / 5));
    state.activePits[player] = active;
    state.rows[player] = Array(7).fill(0);
    for (let index = 0; index < active; index += 1) state.rows[player][index] = 5;
    state.stores[player] = inventory[player] - active * 5;
  }
  return true;
}

export function activeRoute(state) {
  const route = [];
  for (let pitIndex = 0; pitIndex < Number(state.activePits.aurora || 0); pitIndex += 1) route.push({ player: "aurora", pitIndex });
  for (let pitIndex = Number(state.activePits.ember || 0) - 1; pitIndex >= 0; pitIndex -= 1) route.push({ player: "ember", pitIndex });
  if (route.length < 2) throw new Error("Khasi Fishflow requires at least two active pits.");
  return route;
}

export function sideTotal(state, player) {
  return (state.rows[player] || []).slice(0, Number(state.activePits[player] || 0)).reduce((sum, value) => sum + Number(value || 0), 0);
}

export function getCounts(state) {
  const result = {};
  for (const player of PLAYERS) {
    const onBoard = sideTotal(state, player);
    const store = Number(state.stores[player] || 0);
    result[player] = {
      onBoard,
      store,
      total: onBoard + store,
      activePits: Number(state.activePits[player] || 0),
      inactivePits: 7 - Number(state.activePits[player] || 0)
    };
  }
  return result;
}

export function describeTurn(state) {
  if (state.winner) return resultTitle(state);
  return `${state.currentPlayer === "aurora" ? "Aurora" : "Ember"} Current chooses a non-empty pit.`;
}

export function resultTitle(state) {
  return state.winner === "aurora" ? "Aurora Current wins" : "Ember Current wins";
}

export function resultDetail(state) {
  return state.winReason === "cannot-refill-pit"
    ? "The opposing current owns fewer than five stones and cannot refill one pit for the next round."
    : "The Khasi Fishflow match is complete.";
}

export function scoreAction(state, action, player = state.currentPlayer) {
  const result = applyAction(state, action, player);
  if (result.error) return Number.NEGATIVE_INFINITY;
  const summary = result.state.lastTurn;
  const counts = getCounts(result.state);
  return summary.captured * 100 + summary.relays * 8 + (summary.roundEnded ? 40 : 0) + counts[player].total - counts[otherPlayer(player)].total;
}

export function assertCounterInvariant(state) {
  let total = Number(state.stores.aurora || 0) + Number(state.stores.ember || 0);
  for (const player of PLAYERS) total += (state.rows[player] || []).reduce((sum, value) => sum + Number(value || 0), 0);
  if (total !== 70) throw new Error(`Khasi Fishflow counter invariant failed: ${total}.`);
  for (const player of PLAYERS) {
    const active = Number(state.activePits[player] || 0);
    if (!Number.isInteger(active) || active < 0 || active > 7) throw new Error("Invalid active pit count.");
    for (let index = active; index < 7; index += 1) {
      if (Number(state.rows[player][index] || 0) !== 0) throw new Error("Inactive pits must remain empty.");
    }
  }
  return true;
}

function pitKey(player, pitIndex) { return `${player}:${pitIndex}`; }
function getPit(state, pit) { return Number(state.rows[pit.player][pit.pitIndex] || 0); }
function setPit(state, pit, value) { state.rows[pit.player][pit.pitIndex] = value; }
function cloneState(value) { return JSON.parse(JSON.stringify(value)); }
