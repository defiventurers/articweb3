export const SAT_GOL_VARIANTS = Object.freeze({
  forced: Object.freeze({
    id: "forced",
    label: "Gosalpur Forced Start",
    rulesetVersion: "sat-gol-das-gupta-1924-forced-start-1.0.0"
  }),
  open: Object.freeze({
    id: "open",
    label: "Open Choice",
    rulesetVersion: "sat-gol-bautista-open-choice-1.0.0"
  })
});

export const SEVEN_ICE_RINGS_RULESET = Object.freeze({
  gameId: "seven-ice-rings",
  traditionalName: "Sat-gol",
  source: "H. C. Das Gupta, A Few Types of Sedentary Games Prevalent in the Central Provinces (1924)",
  region: "Gosalpur, Jabalpur district, Madhya Pradesh",
  pits: 7,
  openingStonesPerPit: 4,
  totalStones: 28,
  direction: "anticlockwise"
});

export const SIDES = Object.freeze(["aurora", "ember"]);
export const nextPit = (pit) => (Number(pit) + 1) % 7;
export const otherSide = (side) => side === "aurora" ? "ember" : "aurora";
export const sideName = (side) => side === "ember" ? "Ember Keeper" : "Aurora Keeper";

export function createSevenIceRingsState({ mode = "hotseat", variant = "open", starter = "aurora" } = {}) {
  const selected = SAT_GOL_VARIANTS[variant] || SAT_GOL_VARIANTS.open;
  const state = {
    gameId: SEVEN_ICE_RINGS_RULESET.gameId,
    rulesetVersion: selected.rulesetVersion,
    variant: selected.id,
    mode,
    pits: Array(7).fill(4),
    stores: { aurora: 0, ember: 0 },
    currentPlayer: starter === "ember" ? "ember" : "aurora",
    lastEndpoint: null,
    captureQuietTurns: 0,
    endClaimBy: null,
    turn: 1,
    winner: null,
    draw: false,
    winReason: null,
    lastTurn: null,
    history: []
  };
  assertStateInvariant(state);
  return state;
}

export function createDistantCaptureDrill() {
  const state = createSevenIceRingsState({ mode: "drill", variant: "open", starter: "aurora" });
  state.pits = [1, 0, 0, 4, 0, 0, 0];
  state.stores = { aurora: 10, ember: 13 };
  state.captureQuietTurns = 2;
  state.turn = 17;
  assertStateInvariant(state);
  return state;
}

export function forcedStartPit(state) {
  if (state.variant !== "forced" || state.lastEndpoint == null) return null;
  let cursor = nextPit(state.lastEndpoint);
  for (let count = 0; count < 7; count += 1) {
    if (Number(state.pits[cursor] || 0) > 0) return cursor;
    cursor = nextPit(cursor);
  }
  return null;
}

export function simulateSow(sourcePits, startPit) {
  const pits = sourcePits.map((value) => Number(value || 0));
  if (!Number.isInteger(startPit) || startPit < 0 || startPit >= 7 || pits[startPit] <= 0) {
    return { error: "Choose a non-empty ring." };
  }
  let hand = pits[startPit];
  pits[startPit] = 0;
  let cursor = startPit;
  let relays = 0;
  let stonesSown = 0;
  const events = [{ type: "pickup", pit: startPit, count: hand }];
  const seen = new Set();

  while (true) {
    const signature = `${pits.join(",")}|${cursor}|${hand}`;
    if (seen.has(signature)) return { error: "This relay repeats forever under the recorded rule.", looped: true };
    seen.add(signature);
    if (seen.size > 2000) return { error: "Relay safety limit reached.", looped: true };

    while (hand > 0) {
      cursor = nextPit(cursor);
      pits[cursor] += 1;
      hand -= 1;
      stonesSown += 1;
      events.push({ type: "sow", pit: cursor, count: pits[cursor] });
    }

    const endpoint = cursor;
    const relayPit = nextPit(endpoint);
    if (pits[relayPit] === 0) {
      const capturePit = nextPit(relayPit);
      const captured = pits[capturePit];
      if (captured > 0) pits[capturePit] = 0;
      events.push({ type: "stop", endpoint, emptyPit: relayPit, capturePit, captured });
      return { pits, startPit, endpoint, emptyPit: relayPit, capturePit, captured, relays, stonesSown, events, looped: false };
    }

    hand = pits[relayPit];
    pits[relayPit] = 0;
    cursor = relayPit;
    relays += 1;
    events.push({ type: "relay", pit: relayPit, count: hand });
  }
}

export function getLegalActions(state, player = state.currentPlayer) {
  if (!state || state.winner || state.draw || player !== state.currentPlayer) return [];
  const actions = [];
  if (state.endClaimBy && state.endClaimBy !== player) actions.push({ type: "accept-end" });

  const forced = forcedStartPit(state);
  const candidates = forced == null
    ? state.pits.map((count, pit) => Number(count || 0) > 0 ? pit : null).filter((pit) => pit != null)
    : [forced];
  for (const pit of candidates) {
    const preview = simulateSow(state.pits, pit);
    if (!preview.error) actions.push({ type: "sow", pit, preview: summarizePreview(preview), rejectsClaim: Boolean(state.endClaimBy) });
  }
  if (!state.endClaimBy && state.captureQuietTurns >= 2) actions.push({ type: "claim-end" });
  return actions;
}

export function validateAction(state, action, player = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing Seven Ice Rings state." };
  if (state.winner || state.draw) return { valid: false, reason: "The Sat-gol match has ended." };
  if (player !== state.currentPlayer) return { valid: false, reason: "It is not this keeper's turn." };
  const legal = getLegalActions(state, player).find((candidate) => actionKey(candidate) === actionKey(action));
  return legal ? { valid: true, action: legal } : { valid: false, reason: "That ring is not a legal start under this table's rule." };
}

export function applyAction(state, action, player = state.currentPlayer) {
  const validation = validateAction(state, action, player);
  if (!validation.valid) return { state, error: validation.reason };
  const next = cloneState(state);
  const legal = validation.action;

  if (legal.type === "claim-end") {
    next.endClaimBy = player;
    next.lastTurn = { type: "claim-end", player };
    next.history.push({ turn: next.turn, player, action: { type: "claim-end" } });
    next.currentPlayer = otherSide(player);
    next.turn += 1;
    assertStateInvariant(next);
    return { state: next, error: null };
  }
  if (legal.type === "accept-end") {
    next.lastTurn = { type: "accept-end", player, claimant: next.endClaimBy };
    next.history.push({ turn: next.turn, player, action: { type: "accept-end" } });
    finishByScore(next, "mutual-no-more-captures");
    assertStateInvariant(next);
    return { state: next, error: null };
  }

  const resolved = simulateSow(next.pits, legal.pit);
  if (resolved.error) return { state, error: resolved.error };
  next.endClaimBy = null;
  next.pits = resolved.pits;
  next.stores[player] += resolved.captured;
  next.lastEndpoint = resolved.endpoint;
  next.captureQuietTurns = resolved.captured > 0 ? 0 : next.captureQuietTurns + 1;
  next.lastTurn = {
    type: "sow",
    player,
    startPit: legal.pit,
    endpoint: resolved.endpoint,
    emptyPit: resolved.emptyPit,
    capturePit: resolved.capturePit,
    captured: resolved.captured,
    relays: resolved.relays,
    stonesSown: resolved.stonesSown,
    forcedStart: state.variant === "forced" && state.lastEndpoint != null
  };
  next.history.push({ turn: next.turn, player, action: { type: "sow", pit: legal.pit }, summary: cloneState(next.lastTurn) });
  next.currentPlayer = otherSide(player);
  next.turn += 1;

  if (next.pits.every((count) => count === 0) || getSowActions(next, next.currentPlayer).length === 0) finishByScore(next, "no-legal-relay");
  assertStateInvariant(next);
  return { state: next, error: null };
}

function getSowActions(state, player) {
  const probe = { ...state, endClaimBy: null, captureQuietTurns: 0 };
  return getLegalActions(probe, player).filter((action) => action.type === "sow");
}

function finishByScore(state, reason) {
  state.endClaimBy = null;
  state.winReason = reason;
  if (state.stores.aurora === state.stores.ember) {
    state.winner = null;
    state.draw = true;
  } else {
    state.winner = state.stores.aurora > state.stores.ember ? "aurora" : "ember";
    state.draw = false;
  }
}

export function chooseBestAction(state, player = state.currentPlayer) {
  const legal = getLegalActions(state, player);
  if (!legal.length) return null;
  const accept = legal.find((action) => action.type === "accept-end");
  if (accept) {
    const capturing = legal.filter((action) => action.type === "sow" && action.preview?.captured > 0);
    return capturing[0] || accept;
  }
  const sowing = legal.filter((action) => action.type === "sow");
  const bestCapture = [...sowing].sort((a, b) => (b.preview?.captured || 0) - (a.preview?.captured || 0) || (b.preview?.relays || 0) - (a.preview?.relays || 0))[0];
  if (bestCapture?.preview?.captured > 0) return bestCapture;
  return legal.find((action) => action.type === "claim-end") || bestCapture || legal[0];
}

export function actionSummary(action) {
  if (!action) return "";
  if (action.type === "claim-end") return `${sideName(action.player)} claimed that no useful capture remains.`;
  if (action.type === "accept-end") return `${sideName(action.player)} accepted the end of the stone hunt.`;
  if (action.captured > 0) return `${sideName(action.player)} relayed from Ring ${action.startPit + 1} and captured ${action.captured} stones beyond the empty ring.`;
  return `${sideName(action.player)} relayed from Ring ${action.startPit + 1} through ${action.relays} pickup${action.relays === 1 ? "" : "s"}.`;
}

export function describeTurn(state) {
  if (state.winner || state.draw) return resultTitle(state);
  if (state.endClaimBy) return `${sideName(state.currentPlayer)} may accept the end claim or keep sowing.`;
  const forced = forcedStartPit(state);
  return forced == null
    ? `${sideName(state.currentPlayer)} chooses a non-empty ring.`
    : `${sideName(state.currentPlayer)} must begin at Ring ${forced + 1}.`;
}

export function resultTitle(state) {
  if (state.draw) return "Shared stone count";
  return state.winner === "ember" ? "Ember Keeper wins" : "Aurora Keeper wins";
}

export function resultDetail(state) {
  return `${state.stores.aurora}–${state.stores.ember} captured stones. Stones left in the shared ring are not scored.`;
}

export function getPlayerSummary(state, side) {
  return { captured: Number(state.stores[side] || 0), onBoard: state.pits.reduce((sum, value) => sum + Number(value || 0), 0), turns: state.history.filter((item) => item.player === side && item.action?.type === "sow").length };
}

export function actionKey(action) {
  if (!action) return "";
  return action.type === "sow" ? `sow:${action.pit}` : action.type;
}

function summarizePreview(preview) {
  return { endpoint: preview.endpoint, emptyPit: preview.emptyPit, capturePit: preview.capturePit, captured: preview.captured, relays: preview.relays, stonesSown: preview.stonesSown };
}

export function assertStateInvariant(state) {
  if (!Array.isArray(state.pits) || state.pits.length !== 7) throw new Error("Sat-gol requires seven rings.");
  if (state.pits.some((value) => !Number.isInteger(value) || value < 0)) throw new Error("Ring counts must be non-negative integers.");
  const total = state.pits.reduce((sum, value) => sum + value, 0) + Number(state.stores.aurora || 0) + Number(state.stores.ember || 0);
  if (total !== 28) throw new Error(`Sat-gol stone invariant failed: ${total}.`);
  if (!SAT_GOL_VARIANTS[state.variant]) throw new Error("Unknown Sat-gol starting variant.");
  if (!SIDES.includes(state.currentPlayer)) throw new Error("Unknown Sat-gol player.");
  return true;
}

function cloneState(value) { return JSON.parse(JSON.stringify(value)); }
