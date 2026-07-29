import { assertConserved, cloneGameState, sowOneLap, sumCounters } from "../sowing/relayEngine.js";

export const KHASI_FISHFLOW_RULESET = Object.freeze({
  gameId: "khasi-fishflow",
  rulesetVersion: "mawkar-katiya-research-0.1.0",
  traditionalName: "Mawkar Katiya",
  region: "Khasi Hills, Meghalaya, India",
  evidenceStatus: "research-playable",
  rankedEligible: false,
  pitsPerRow: 7,
  openingCountersPerPit: 5,
  totalCounters: 70,
  sowDirection: "clockwise",
  capturePolicy: "opposite-only",
  handicapPolicy: "modern-unranked-pit-transfer"
});

export const PLAYERS = Object.freeze(["blue", "coral"]);

export function otherPlayer(player) {
  return player === "blue" ? "coral" : "blue";
}

export function createKhasiFishflowState({ mode = "hotseat", starter = "blue", handicap = "none" } = {}) {
  const roundStarter = starter === "coral" ? "coral" : "blue";
  const state = {
    gameId: KHASI_FISHFLOW_RULESET.gameId,
    rulesetVersion: KHASI_FISHFLOW_RULESET.rulesetVersion,
    evidenceStatus: KHASI_FISHFLOW_RULESET.evidenceStatus,
    rankedEligible: handicap === "none" && KHASI_FISHFLOW_RULESET.rankedEligible,
    mode,
    rows: {
      blue: Array(KHASI_FISHFLOW_RULESET.pitsPerRow).fill(KHASI_FISHFLOW_RULESET.openingCountersPerPit),
      coral: Array(KHASI_FISHFLOW_RULESET.pitsPerRow).fill(KHASI_FISHFLOW_RULESET.openingCountersPerPit)
    },
    activePits: { blue: 7, coral: 7 },
    stores: { blue: 0, coral: 0 },
    handicap: normalizeHandicap(handicap),
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
  applyOpeningHandicap(state);
  assertCounterInvariant(state);
  return state;
}

export function getLegalActions(state, player = state?.currentPlayer) {
  if (!state || state.winner || player !== state.currentPlayer) return [];
  const actions = [];
  for (let pitIndex = 0; pitIndex < Number(state.activePits[player] || 0); pitIndex += 1) {
    if (Number(state.rows[player]?.[pitIndex] || 0) > 0) actions.push({ type: "sow", pitIndex });
  }
  return actions;
}

export function validateAction(state, action, player = state?.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing Khasi Fishflow state." };
  if (state.winner) return { valid: false, reason: "The Khasi Fishflow match has already ended." };
  if (player !== state.currentPlayer) return { valid: false, reason: "It is not this current's turn." };
  if (!action || action.type !== "sow" || !Number.isInteger(action.pitIndex)) {
    return { valid: false, reason: "Choose one active pit on your side." };
  }
  if (action.pitIndex < 0 || action.pitIndex >= Number(state.activePits[player] || 0)) {
    return { valid: false, reason: "That pit is inactive for this round." };
  }
  if (Number(state.rows[player]?.[action.pitIndex] || 0) <= 0) {
    return { valid: false, reason: "Choose a non-empty pit on your side." };
  }
  return { valid: true };
}

export function applyAction(state, action, player = state?.currentPlayer) {
  const validation = validateAction(state, action, player);
  if (!validation.valid) return { state, error: validation.reason };
  const next = cloneGameState(state);
  const roundBefore = next.round;
  const summary = resolveSow(next, player, action.pitIndex);
  const roundEnded = finishRoundIfNeeded(next);
  summary.roundEnded = roundEnded;
  summary.roundBefore = roundBefore;
  summary.roundAfter = next.round;
  next.lastTurn = summary;
  next.history.push({ turn: next.turn, round: roundBefore, player, action: { ...action }, summary: cloneGameState(summary) });
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

  let relayCount = 0;
  while (hand > 0) {
    relayCount += 1;
    if (relayCount > 20000) throw new Error("Khasi Fishflow relay exceeded the safety limit.");
    const lap = sowOneLap({
      route,
      startIndex: cursor,
      hand,
      read: (pit) => getPit(state, pit),
      write: (pit, value) => setPit(state, pit, value),
      onDrop: ({ slot, count }) => {
        summary.seedsSown += 1;
        summary.landingPit = { ...slot };
        summary.events.push({ type: "sow", ...slot, count });
      }
    });
    cursor = lap.cursor;
    const landingPit = route[cursor];
    const landedCount = getPit(state, landingPit);
    hand = 0;

    if (landedCount > 1) {
      setPit(state, landingPit, 0);
      hand = landedCount;
      summary.relays += 1;
      summary.events.push({ type: "relay", ...landingPit, count: hand });
      continue;
    }

    const opposite = { player: otherPlayer(landingPit.player), pitIndex: landingPit.pitIndex };
    if (opposite.pitIndex < Number(state.activePits[opposite.player] || 0)) {
      const captured = getPit(state, opposite);
      if (captured > 0) {
        setPit(state, opposite, 0);
        state.stores[player] += captured;
        summary.captured += captured;
        summary.capturePit = { ...opposite };
        summary.events.push({ type: "opposite-capture", ...opposite, count: captured });
      }
    }
  }

  return summary;
}

function finishRoundIfNeeded(state) {
  const blueEmpty = sideTotal(state, "blue") === 0;
  const coralEmpty = sideTotal(state, "coral") === 0;
  if (!blueEmpty && !coralEmpty) return false;

  const swept = { blue: sideTotal(state, "blue"), coral: sideTotal(state, "coral") };
  for (const player of PLAYERS) {
    state.stores[player] += swept[player];
    state.rows[player] = Array(KHASI_FISHFLOW_RULESET.pitsPerRow).fill(0);
  }

  const inventory = { ...state.stores };
  state.roundHistory.push({
    round: state.round,
    starter: state.roundStarter,
    inventory: { ...inventory },
    swept,
    endedBecause: blueEmpty && coralEmpty ? "both-sides-empty" : blueEmpty ? "blue-side-empty" : "coral-side-empty"
  });

  if (inventory.blue < KHASI_FISHFLOW_RULESET.openingCountersPerPit || inventory.coral < KHASI_FISHFLOW_RULESET.openingCountersPerPit) {
    state.winner = inventory.blue >= KHASI_FISHFLOW_RULESET.openingCountersPerPit ? "blue" : "coral";
    state.winReason = "cannot-refill-pit";
    return true;
  }

  state.round += 1;
  state.roundStarter = otherPlayer(state.roundStarter);
  state.currentPlayer = state.roundStarter;
  state.rows = { blue: Array(7).fill(0), coral: Array(7).fill(0) };

  for (const player of PLAYERS) {
    const active = Math.min(7, Math.floor(inventory[player] / KHASI_FISHFLOW_RULESET.openingCountersPerPit));
    state.activePits[player] = active;
    for (let index = 0; index < active; index += 1) state.rows[player][index] = KHASI_FISHFLOW_RULESET.openingCountersPerPit;
    state.stores[player] = inventory[player] - active * KHASI_FISHFLOW_RULESET.openingCountersPerPit;
  }
  return true;
}

export function activeRoute(state) {
  const route = [];
  for (const player of PLAYERS) {
    for (let pitIndex = Number(state.activePits[player] || 0) - 1; pitIndex >= 0; pitIndex -= 1) {
      route.push({ player, pitIndex });
    }
  }
  if (route.length < 2) throw new Error("Khasi Fishflow requires at least two active pits.");
  return route;
}

export function sideTotal(state, player) {
  return sumCounters((state.rows[player] || []).slice(0, Number(state.activePits[player] || 0)));
}

export function ownedTotal(state, player) {
  return sideTotal(state, player) + Number(state.stores[player] || 0);
}

export function getCounts(state) {
  return Object.fromEntries(PLAYERS.map((player) => [player, {
    onBoard: sideTotal(state, player),
    store: Number(state.stores[player] || 0),
    total: ownedTotal(state, player),
    activePits: Number(state.activePits[player] || 0)
  }]));
}

export function describeTurn(state) {
  if (state.winner) return resultTitle(state);
  return `${state.currentPlayer === "blue" ? "Blue" : "Coral"} Current chooses a non-empty pit.`;
}

export function resultTitle(state) {
  return state.winner === "blue" ? "Blue Current wins" : "Coral Current wins";
}

export function resultDetail(state) {
  return state.winReason === "cannot-refill-pit"
    ? "The opposing current owns fewer than five fish and cannot refill a playable pit."
    : "The Khasi Fishflow match is complete.";
}

export function scoreTurn(state, action, player = state.currentPlayer) {
  const result = applyAction(state, action, player);
  if (result.error) return Number.NEGATIVE_INFINITY;
  const summary = result.state.lastTurn;
  const counts = getCounts(result.state);
  return summary.captured * 100 + summary.relays * 5 + (summary.roundEnded ? 35 : 0) + counts[player].total - counts[otherPlayer(player)].total;
}

export function assertCounterInvariant(state) {
  const total = PLAYERS.reduce((sum, player) => sum + sideTotal(state, player) + Number(state.stores[player] || 0), 0);
  return assertConserved(total, KHASI_FISHFLOW_RULESET.totalCounters, "Khasi Fishflow counter");
}

function normalizeHandicap(value) {
  if (value === "blue-pit") return { type: "pit-transfer", beneficiary: "blue", donor: "coral", pits: 1, counters: 5, heritage: false };
  if (value === "coral-pit") return { type: "pit-transfer", beneficiary: "coral", donor: "blue", pits: 1, counters: 5, heritage: false };
  return { type: "none", beneficiary: null, donor: null, pits: 0, counters: 0, heritage: true };
}

function applyOpeningHandicap(state) {
  const handicap = state.handicap;
  if (handicap.type !== "pit-transfer") return;
  const donor = handicap.donor;
  const removedIndex = state.activePits[donor] - 1;
  state.rows[donor][removedIndex] = 0;
  state.activePits[donor] -= 1;
  state.stores[handicap.beneficiary] += handicap.counters;
  state.rankedEligible = false;
}

function pitKey(player, pitIndex) {
  return `${player}:${pitIndex}`;
}

function getPit(state, pit) {
  return Number(state.rows[pit.player][pit.pitIndex] || 0);
}

function setPit(state, pit, value) {
  state.rows[pit.player][pit.pitIndex] = value;
}
