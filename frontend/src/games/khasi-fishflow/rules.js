export const KHASI_FISHFLOW_RULESET = Object.freeze({
  gameId: "khasi-fishflow",
  rulesetVersion: "mawkar-katiya-das-gupta-1923-1.0.0",
  traditionalName: "Mawkar Katiya",
  community: "Khasi",
  place: "Cherrapunji, Meghalaya",
  pitsPerRow: 7,
  openingCountersPerPit: 5,
  totalCounters: 70,
  direction: "clockwise"
});

export const PLAYERS = Object.freeze(["blue", "coral"]);
export const otherPlayer = (player) => player === "blue" ? "coral" : "blue";
export const pitKey = (player, pitIndex) => `${player}:${pitIndex}`;

export function createKhasiFishflowState({ mode = "hotseat", starter = "blue" } = {}) {
  const state = {
    gameId: KHASI_FISHFLOW_RULESET.gameId,
    rulesetVersion: KHASI_FISHFLOW_RULESET.rulesetVersion,
    mode,
    rows: { blue: Array(7).fill(5), coral: Array(7).fill(5) },
    active: { blue: Array(7).fill(true), coral: Array(7).fill(true) },
    stores: { blue: 0, coral: 0 },
    roundReserve: { blue: 0, coral: 0 },
    handicapTarget: { blue: 0, coral: 0 },
    partialPit: { blue: null, coral: null },
    currentPlayer: starter === "coral" ? "coral" : "blue",
    roundStarter: starter === "coral" ? "coral" : "blue",
    round: 1,
    turn: 1,
    winner: null,
    winReason: null,
    lastTurn: null,
    history: [],
    roundHistory: []
  };
  assertInvariant(state);
  return state;
}

export function createKhasiHandicapDrill() {
  const state = createKhasiFishflowState({ mode: "drill" });
  state.rows.blue = [1, 0, 0, 0, 0, 0, 0];
  state.rows.coral = [0, 3, 0, 0, 0, 0, 0];
  state.active.blue = [true, false, false, false, false, false, false];
  state.active.coral = [true, true, false, false, false, false, false];
  state.stores = { blue: 34, coral: 32 };
  state.roundReserve = { blue: 4, coral: 2 };
  state.handicapTarget = { blue: 4, coral: 3 };
  state.partialPit = { blue: null, coral: 1 };
  state.currentPlayer = "blue";
  state.roundStarter = "blue";
  assertInvariant(state);
  return state;
}

export function clockwiseRoute() {
  return [
    ...Array.from({ length: 7 }, (_, index) => ({ player: "blue", pitIndex: index })),
    ...Array.from({ length: 7 }, (_, index) => ({ player: "coral", pitIndex: 6 - index }))
  ];
}

export function getLegalActions(state, player = state.currentPlayer) {
  if (!state || state.winner || player !== state.currentPlayer) return [];
  const actions = [];
  for (let pitIndex = 0; pitIndex < 7; pitIndex += 1) {
    if (!state.active[player][pitIndex]) continue;
    if (state.partialPit[player] === pitIndex && state.roundReserve[otherPlayer(player)] > 0) continue;
    if (Number(state.rows[player][pitIndex] || 0) > 0) actions.push({ type: "sow", pitIndex });
  }
  return actions;
}

export function validateAction(state, action, player = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing game state." };
  if (state.winner) return { valid: false, reason: "The Khasi Fishflow match is complete." };
  if (player !== state.currentPlayer) return { valid: false, reason: "It is not this current's turn." };
  if (!action || action.type !== "sow" || !Number.isInteger(action.pitIndex)) return { valid: false, reason: "Choose one active pit from your row." };
  return getLegalActions(state, player).some((candidate) => candidate.pitIndex === action.pitIndex)
    ? { valid: true }
    : { valid: false, reason: "That pit is empty, inactive, or reserved by the round handicap." };
}

export function applyAction(state, action, player = state.currentPlayer) {
  const validation = validateAction(state, action, player);
  if (!validation.valid) return { state, error: validation.reason };
  const next = clone(state);
  const summary = resolveRelay(next, player, action.pitIndex);
  next.lastTurn = summary;
  next.history.push({ turn: next.turn, round: next.round, player, action: { ...action }, summary: clone(summary) });
  const roundEnded = finishRoundIfNeeded(next);
  summary.roundEnded = roundEnded;
  if (!next.winner && !roundEnded) next.currentPlayer = otherPlayer(player);
  next.turn += 1;
  assertInvariant(next);
  return { state: next, error: null };
}

function resolveRelay(state, player, pitIndex) {
  const route = clockwiseRoute();
  let cursor = route.findIndex((pit) => pit.player === player && pit.pitIndex === pitIndex);
  let hand = getPit(state, route[cursor]);
  setPit(state, route[cursor], 0);
  const summary = { pitIndex, picked: hand, sown: 0, relays: 0, captured: 0, handicapCaptured: { blue: 0, coral: 0 }, endpoint: null, stopGap: null, capturePit: null, events: [] };
  const seen = new Set();
  let guard = 0;
  while (hand > 0) {
    guard += 1;
    if (guard > 20000) throw new Error("Mawkar Katiya relay exceeded the safety limit.");
    cursor = nextActiveIndex(state, route, cursor);
    const pit = route[cursor];
    setPit(state, pit, getPit(state, pit) + 1);
    hand -= 1;
    summary.sown += 1;
    applyPartialPitToll(state, player, pit, summary);
    applyOpponentTurnTargets(state, player, summary);
    if (hand > 0) continue;
    summary.endpoint = { ...pit };
    const nextIndex = nextActiveIndex(state, route, cursor);
    const nextPit = route[nextIndex];
    if (getPit(state, nextPit) > 0) {
      const signature = `${nextIndex}|${state.rows.blue.join(",")}|${state.rows.coral.join(",")}`;
      if (seen.has(signature)) throw new Error("This relay repeats forever under the current inactive-pit layout.");
      seen.add(signature);
      hand = getPit(state, nextPit);
      setPit(state, nextPit, 0);
      cursor = nextIndex;
      summary.relays += 1;
      summary.events.push({ type: "relay", pit: { ...nextPit }, count: hand });
      continue;
    }
    summary.stopGap = { ...nextPit };
    const opposite = { player: otherPlayer(nextPit.player), pitIndex: nextPit.pitIndex };
    const captured = getPit(state, opposite);
    if (captured > 0) {
      setPit(state, opposite, 0);
      state.stores[player] += captured;
      summary.captured += captured;
      summary.capturePit = opposite;
    }
    break;
  }
  return summary;
}

function nextActiveIndex(state, route, cursor) {
  for (let step = 1; step <= route.length; step += 1) {
    const index = (cursor + step) % route.length;
    const pit = route[index];
    if (state.active[pit.player][pit.pitIndex]) return index;
  }
  throw new Error("No active Mawkar Katiya pit remains.");
}

function applyOpponentTurnTargets(state, activePlayer, summary) {
  const observer = otherPlayer(activePlayer);
  const target = Number(state.handicapTarget[observer] || 0);
  if (!target) return;
  for (const owner of PLAYERS) for (let pitIndex = 0; pitIndex < 7; pitIndex += 1) {
    if (!state.active[owner][pitIndex] || Number(state.rows[owner][pitIndex] || 0) !== target) continue;
    if (state.partialPit[observer] === pitIndex && owner === observer) continue;
    state.rows[owner][pitIndex] = 0;
    state.stores[observer] += target;
    summary.handicapCaptured[observer] += target;
  }
}

function applyPartialPitToll(state, activePlayer, pit, summary) {
  const opponent = otherPlayer(activePlayer);
  if (state.roundReserve[activePlayer] <= 0) return;
  if (pit.player !== opponent || state.partialPit[opponent] !== pit.pitIndex) return;
  if (getPit(state, pit) <= 0) return;
  setPit(state, pit, getPit(state, pit) - 1);
  state.stores[activePlayer] += 1;
  summary.handicapCaptured[activePlayer] += 1;
}

function finishRoundIfNeeded(state) {
  const boardTotal = totalOnBoard(state);
  if (boardTotal > 0 && getLegalActions(state, state.currentPlayer).length > 0 && getLegalActions(state, otherPlayer(state.currentPlayer)).length > 0) return false;
  for (const player of PLAYERS) {
    const opponent = otherPlayer(player);
    if (state.roundReserve[player] > 0 && state.partialPit[opponent] != null) {
      const count = state.rows[opponent][state.partialPit[opponent]];
      state.stores[player] += count;
      state.rows[opponent][state.partialPit[opponent]] = 0;
    }
  }
  for (const player of PLAYERS) {
    state.stores[player] += state.rows[player].reduce((sum, value) => sum + value, 0);
    state.rows[player] = Array(7).fill(0);
  }
  state.roundHistory.push({ round: state.round, stores: { ...state.stores }, handicapTarget: { ...state.handicapTarget }, partialPit: { ...state.partialPit } });
  if (state.stores.blue < 1 || state.stores.coral < 1) {
    state.winner = state.stores.blue > state.stores.coral ? "blue" : "coral";
    state.winReason = "all-counters-captured";
    return true;
  }
  setupNextRound(state);
  return true;
}

function setupNextRound(state) {
  state.round += 1;
  state.roundStarter = otherPlayer(state.roundStarter);
  state.currentPlayer = state.roundStarter;
  state.active = { blue: Array(7).fill(false), coral: Array(7).fill(false) };
  state.roundReserve = { blue: 0, coral: 0 };
  state.handicapTarget = { blue: 0, coral: 0 };
  state.partialPit = { blue: null, coral: null };
  for (const player of PLAYERS) {
    let inventory = state.stores[player];
    state.stores[player] = 0;
    for (let pitIndex = 0; pitIndex < 7; pitIndex += 1) {
      if (inventory >= 5) {
        state.rows[player][pitIndex] = 5;
        state.active[player][pitIndex] = true;
        inventory -= 5;
      } else if (inventory > 0) {
        state.rows[player][pitIndex] = inventory;
        state.active[player][pitIndex] = true;
        state.partialPit[player] = pitIndex;
        state.handicapTarget[player] = inventory;
        inventory = 0;
      }
    }
    state.roundReserve[player] = inventory;
    if (inventory > 0) state.handicapTarget[player] = inventory;
  }
  if (!state.active.blue.some(Boolean) || !state.active.coral.some(Boolean)) {
    state.winner = state.active.blue.some(Boolean) ? "blue" : "coral";
    state.winReason = "opponent-cannot-refill";
  }
}

export function getCounts(state) {
  return Object.fromEntries(PLAYERS.map((player) => [player, {
    board: state.rows[player].reduce((sum, value) => sum + value, 0),
    store: state.stores[player],
    reserve: state.roundReserve[player],
    activePits: state.active[player].filter(Boolean).length,
    handicapTarget: state.handicapTarget[player]
  }]));
}
export function describeTurn(state) { return state.winner ? resultTitle(state) : `${state.currentPlayer === "blue" ? "Blue" : "Coral"} Khasi current chooses an active pit.`; }
export function resultTitle(state) { return state.winner === "blue" ? "Blue Khasi Current wins" : "Coral Khasi Current wins"; }
export function resultDetail(state) { return state.winReason === "opponent-cannot-refill" ? "The opposing current cannot refill a playable pit." : "One current secured the seventy-stone field."; }
export function actionSummary(summary, player) { return `${player === "blue" ? "Blue" : "Coral"} relayed ${summary.relays} time${summary.relays === 1 ? "" : "s"}, captured ${summary.captured} opposite stones and ${summary.handicapCaptured[player] || 0} handicap stones.`; }
export function scoreAction(state, action, player = state.currentPlayer) { const result = applyAction(state, action, player); return result.error ? -Infinity : result.state.lastTurn.captured * 100 + result.state.lastTurn.handicapCaptured[player] * 80 + result.state.lastTurn.relays * 3; }

function getPit(state, pit) { return Number(state.rows[pit.player][pit.pitIndex] || 0); }
function setPit(state, pit, value) { state.rows[pit.player][pit.pitIndex] = Number(value); }
function totalOnBoard(state) { return PLAYERS.reduce((sum, player) => sum + state.rows[player].reduce((a, b) => a + b, 0), 0); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
export function assertInvariant(state) {
  const total = totalOnBoard(state) + state.stores.blue + state.stores.coral + state.roundReserve.blue + state.roundReserve.coral;
  if (total !== 70) throw new Error(`Khasi Fishflow counter invariant failed: ${total}.`);
  for (const player of PLAYERS) if (state.rows[player].length !== 7 || state.active[player].length !== 7) throw new Error("Khasi Fishflow row invariant failed.");
  return true;
}
