const FISHFLOW_RULESET = Object.freeze({
  gameId: "fishflow",
  rulesetVersion: "pallanguzhi-durai-1928-1.0.0",
  traditionalName: "Pallanguzhi",
  region: "Tamil Nadu, India",
  pitsPerRow: 7,
  openingCountersPerPit: 6,
  totalCounters: 84
});

const PLAYERS = ["blue", "coral"];

function otherPlayer(player) {
  return player === "blue" ? "coral" : "blue";
}

function createFishflowState({ mode = "hotseat", starter = "blue" } = {}) {
  const roundStarter = starter === "coral" ? "coral" : "blue";
  return {
    gameId: FISHFLOW_RULESET.gameId,
    rulesetVersion: FISHFLOW_RULESET.rulesetVersion,
    mode,
    rows: {
      blue: Array(FISHFLOW_RULESET.pitsPerRow).fill(FISHFLOW_RULESET.openingCountersPerPit),
      coral: Array(FISHFLOW_RULESET.pitsPerRow).fill(FISHFLOW_RULESET.openingCountersPerPit)
    },
    activePits: { blue: 7, coral: 7 },
    stores: { blue: 0, coral: 0 },
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
}

function getLegalActions(state, player = state.currentPlayer) {
  if (!state || state.winner || player !== state.currentPlayer) return [];
  const active = Number(state.activePits[player] || 0);
  const row = state.rows[player] || [];
  const actions = [];
  for (let pitIndex = 0; pitIndex < active; pitIndex += 1) {
    if (Number(row[pitIndex] || 0) > 0) actions.push({ type: "sow", pitIndex });
  }
  return actions;
}

function validateAction(state, action, player = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing game state." };
  if (state.winner) return { valid: false, reason: "The Fishflow match has already ended." };
  if (player !== state.currentPlayer) return { valid: false, reason: "It is not this current's turn." };
  if (!action || action.type !== "sow" || !Number.isInteger(action.pitIndex)) {
    return { valid: false, reason: "Choose one active pit on your side." };
  }
  if (action.pitIndex < 0 || action.pitIndex >= Number(state.activePits[player] || 0)) {
    return { valid: false, reason: "That pit is frozen for this round." };
  }
  if (Number(state.rows[player]?.[action.pitIndex] || 0) <= 0) {
    return { valid: false, reason: "Choose a non-empty pit on your side." };
  }
  return { valid: true };
}

function applyAction(state, action, player = state.currentPlayer) {
  const validation = validateAction(state, action, player);
  if (!validation.valid) return { state, error: validation.reason };

  const next = cloneState(state);
  const roundBefore = next.round;
  const summary = resolveSow(next, player, action.pitIndex);
  const roundEnded = finishRoundIfNeeded(next);
  summary.roundEnded = roundEnded;
  summary.roundBefore = roundBefore;
  summary.roundAfter = next.round;
  next.lastTurn = summary;
  next.history.push({
    turn: next.turn,
    round: roundBefore,
    player,
    action: { ...action },
    summary: cloneState(summary)
  });

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
    exactFourPickups: 0,
    relays: 0,
    captured: 0,
    capturePit: null,
    landingPit: null,
    events: [{ type: "pickup", player, pitIndex, count: hand }]
  };

  let steps = 0;
  while (hand > 0) {
    steps += 1;
    if (steps > 20000) throw new Error("Fishflow relay exceeded the safety limit.");
    cursor = (cursor + 1) % route.length;
    const pit = route[cursor];
    setPit(state, pit, getPit(state, pit) + 1);
    hand -= 1;
    summary.seedsSown += 1;
    summary.landingPit = { ...pit };
    summary.events.push({ type: "sow", ...pit, count: getPit(state, pit) });

    if (getPit(state, pit) === 4) {
      setPit(state, pit, 0);
      state.stores[player] += 4;
      summary.exactFourPickups += 1;
      summary.captured += 4;
      summary.events.push({ type: "exact-four", ...pit, count: 4 });
      continue;
    }

    if (hand === 0) {
      const landedCount = getPit(state, pit);
      if (landedCount > 1) {
        setPit(state, pit, 0);
        hand = landedCount;
        summary.relays += 1;
        summary.events.push({ type: "relay", ...pit, count: hand });
        continue;
      }

      const capturePit = route[(cursor + 1) % route.length];
      const captured = getPit(state, capturePit);
      setPit(state, capturePit, 0);
      state.stores[player] += captured;
      summary.captured += captured;
      summary.capturePit = { ...capturePit };
      summary.events.push({ type: "capture", ...capturePit, count: captured });
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
    state.rows[player] = Array(FISHFLOW_RULESET.pitsPerRow).fill(0);
  }

  const inventory = { ...state.stores };
  state.roundHistory.push({
    round: state.round,
    starter: state.roundStarter,
    inventory: { ...inventory },
    swept,
    endedBecause: blueEmpty && coralEmpty
      ? "both-sides-empty"
      : blueEmpty
        ? "blue-side-empty"
        : "coral-side-empty"
  });

  if (inventory.blue < FISHFLOW_RULESET.openingCountersPerPit || inventory.coral < FISHFLOW_RULESET.openingCountersPerPit) {
    state.winner = inventory.blue >= FISHFLOW_RULESET.openingCountersPerPit ? "blue" : "coral";
    state.winReason = "cannot-refill-pit";
    return true;
  }

  state.round += 1;
  state.roundStarter = otherPlayer(state.roundStarter);
  state.currentPlayer = state.roundStarter;
  state.rows = {
    blue: Array(FISHFLOW_RULESET.pitsPerRow).fill(0),
    coral: Array(FISHFLOW_RULESET.pitsPerRow).fill(0)
  };

  for (const player of PLAYERS) {
    const active = Math.min(
      FISHFLOW_RULESET.pitsPerRow,
      Math.floor(inventory[player] / FISHFLOW_RULESET.openingCountersPerPit)
    );
    state.activePits[player] = active;
    for (let index = 0; index < active; index += 1) {
      state.rows[player][index] = FISHFLOW_RULESET.openingCountersPerPit;
    }
    state.stores[player] = inventory[player] - active * FISHFLOW_RULESET.openingCountersPerPit;
  }

  return true;
}

function activeRoute(state) {
  const route = [];
  for (const player of PLAYERS) {
    for (let pitIndex = 0; pitIndex < Number(state.activePits[player] || 0); pitIndex += 1) {
      route.push({ player, pitIndex });
    }
  }
  if (route.length < 2) throw new Error("Fishflow requires at least two active pits.");
  return route;
}

function sideTotal(state, player) {
  return (state.rows[player] || [])
    .slice(0, Number(state.activePits[player] || 0))
    .reduce((sum, value) => sum + Number(value || 0), 0);
}

function ownedTotal(state, player) {
  return sideTotal(state, player) + Number(state.stores[player] || 0);
}

function getCounts(state) {
  return {
    blue: {
      onBoard: sideTotal(state, "blue"),
      store: Number(state.stores.blue || 0),
      total: ownedTotal(state, "blue"),
      activePits: Number(state.activePits.blue || 0)
    },
    coral: {
      onBoard: sideTotal(state, "coral"),
      store: Number(state.stores.coral || 0),
      total: ownedTotal(state, "coral"),
      activePits: Number(state.activePits.coral || 0)
    }
  };
}

function describeTurn(state) {
  if (state.winner) return resultTitle(state);
  return `${state.currentPlayer === "blue" ? "Blue" : "Coral"} Current chooses a non-empty pit.`;
}

function resultTitle(state) {
  return state.winner === "blue" ? "Blue Current wins" : "Coral Current wins";
}

function resultDetail(state) {
  return state.winReason === "cannot-refill-pit"
    ? "The opposing current owns fewer than six fish and cannot refill a pit for the next round."
    : "The Fishflow match is complete.";
}

function actionKey(action) {
  return action?.type === "sow" ? `sow:${action.pitIndex}` : "";
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

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertCounterInvariant(state) {
  const total = PLAYERS.reduce(
    (sum, player) => sum + sideTotal(state, player) + Number(state.stores[player] || 0),
    0
  );
  if (total !== FISHFLOW_RULESET.totalCounters) {
    throw new Error(`Fishflow counter invariant failed: expected ${FISHFLOW_RULESET.totalCounters}, received ${total}.`);
  }
  return true;
}

module.exports = {
  FISHFLOW_RULESET,
  PLAYERS,
  actionKey,
  activeRoute,
  applyAction,
  assertCounterInvariant,
  createFishflowState,
  describeTurn,
  getCounts,
  getLegalActions,
  otherPlayer,
  ownedTotal,
  resultDetail,
  resultTitle,
  sideTotal,
  validateAction
};
