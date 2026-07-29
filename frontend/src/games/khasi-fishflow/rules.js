export const KHASI_FISHFLOW_RULESET = Object.freeze({
  gameId: "khasi-fishflow",
  rulesetVersion: "mawkar-katiya-das-gupta-1924-digital-1.0.0",
  traditionalName: "Mawkar Katiya",
  source: "H. C. Das Gupta, Journal and Proceedings of the Asiatic Society of Bengal 19 (1924), 71–74",
  region: "Khasi Hills, Meghalaya",
  players: 2,
  pitsPerSide: 7,
  openingSeedsPerPit: 5,
  totalSeeds: 70,
  direction: "clockwise"
});

export const SIDES = Object.freeze(["aurora", "ember"]);
export const PIT_IDS = Object.freeze([
  "a0", "a1", "a2", "a3", "a4", "a5", "a6",
  "e6", "e5", "e4", "e3", "e2", "e1", "e0"
]);
export const SIDE_PITS = Object.freeze({
  aurora: Object.freeze(["a0", "a1", "a2", "a3", "a4", "a5", "a6"]),
  ember: Object.freeze(["e6", "e5", "e4", "e3", "e2", "e1", "e0"])
});
export const OPPOSITE = Object.freeze(Object.fromEntries(Array.from({ length: 7 }, (_, index) => [[`a${index}`, `e${index}`], [`e${index}`, `a${index}`]]).flat()));

export function otherSide(side) { return side === "aurora" ? "ember" : "aurora"; }
export function sideName(side) { return side === "ember" ? "Ember Current" : "Aurora Current"; }

export function createKhasiFishflowState({ mode = "hotseat", starter = "aurora" } = {}) {
  const pits = Object.fromEntries(PIT_IDS.map((id) => [id, KHASI_FISHFLOW_RULESET.openingSeedsPerPit]));
  const active = Object.fromEntries(PIT_IDS.map((id) => [id, true]));
  const state = {
    gameId: KHASI_FISHFLOW_RULESET.gameId,
    rulesetVersion: KHASI_FISHFLOW_RULESET.rulesetVersion,
    mode,
    currentPlayer: starter === "ember" ? "ember" : "aurora",
    round: 1,
    turn: 1,
    pits,
    active,
    stores: { aurora: 0, ember: 0 },
    reserves: { aurora: 0, ember: 0 },
    handicapValue: { aurora: 0, ember: 0 },
    partialPit: { aurora: null, ember: null },
    fullSide: null,
    phase: "play",
    winner: null,
    winReason: null,
    lastMove: null,
    history: []
  };
  assertStateInvariant(state);
  return state;
}

export function createKhasiCaptureDrill() {
  const state = createKhasiFishflowState({ mode: "drill", starter: "aurora" });
  for (const id of PIT_IDS) state.pits[id] = 0;
  state.pits.a0 = 1;
  state.pits.e2 = 4;
  state.reserves.ember = 65;
  state.lastMove = { type: "setup", summary: "Sow Aurora pit 1. The relay stops beside an empty pit and captures the opposite four stones." };
  assertStateInvariant(state);
  return state;
}

export function getLegalActions(state, side = state.currentPlayer) {
  if (!state || state.phase !== "play" || state.winner || side !== state.currentPlayer) return [];
  const blocked = state.partialPit[side];
  return SIDE_PITS[side]
    .filter((pitId) => state.active[pitId] && state.pits[pitId] > 0 && pitId !== blocked)
    .map((pitId) => ({ type: "sow", pitId }));
}

export function previewAction(state, action, side = state.currentPlayer) {
  const result = applyAction(state, action, side);
  if (result.error) return null;
  return result.state.lastMove;
}

export function validateAction(state, action, side = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing Mawkar Katiya state." };
  if (state.winner || state.phase !== "play") return { valid: false, reason: "This Mawkar Katiya match is not accepting moves." };
  if (side !== state.currentPlayer) return { valid: false, reason: "It is not this current's turn." };
  if (!action || action.type !== "sow" || typeof action.pitId !== "string") return { valid: false, reason: "Choose one legal pit on your row." };
  const legal = getLegalActions(state, side).some((candidate) => candidate.pitId === action.pitId);
  return legal ? { valid: true } : { valid: false, reason: explainIllegal(state, action.pitId, side) };
}

export function applyAction(state, action, side = state.currentPlayer) {
  const validation = validateAction(state, action, side);
  if (!validation.valid) return { state, error: validation.reason };
  const next = clone(state);
  const beforeStore = next.stores[side];
  const beforeOpponent = next.stores[otherSide(side)];
  const relay = resolveRelay(next, action.pitId, side);
  if (relay.error) return { state, error: relay.error };

  next.lastMove = {
    type: "sow",
    side,
    pitId: action.pitId,
    sowCount: relay.sowCount,
    relays: relay.relays,
    stopPit: relay.stopPit,
    gapPit: relay.gapPit,
    capturePit: relay.capturePit,
    captured: next.stores[side] - beforeStore,
    opponentHandicapCapture: next.stores[otherSide(side)] - beforeOpponent,
    taxCaptured: relay.taxCaptured,
    reactiveCaptured: relay.reactiveCaptured,
    roundEnded: false
  };
  next.history.push({ type: "move", round: next.round, turn: next.turn, move: clone(next.lastMove) });

  const nextSide = otherSide(side);
  next.currentPlayer = nextSide;
  next.turn += 1;
  settleUnplayablePartial(next);
  if (boardSeedCount(next) === 0) finishRound(next);
  else if (!getLegalActions(next, next.currentPlayer).length) {
    const fallback = otherSide(next.currentPlayer);
    if (getLegalActions(next, fallback).length) next.currentPlayer = fallback;
    else {
      settleUnplayablePartial(next, true);
      if (boardSeedCount(next) === 0) finishRound(next);
    }
  }
  assertStateInvariant(next);
  return { state: next, error: null };
}

function resolveRelay(state, startPit, side) {
  let hand = state.pits[startPit];
  state.pits[startPit] = 0;
  let cursor = PIT_IDS.indexOf(startPit);
  let sowCount = 0;
  let relays = 0;
  let taxCaptured = 0;
  let reactiveCaptured = 0;
  const seen = new Set();

  while (hand > 0 || relays === 0) {
    const signature = `${cursor}|${hand}|${PIT_IDS.map((id) => state.pits[id]).join(",")}|${state.stores.aurora}|${state.stores.ember}`;
    if (seen.has(signature)) return { error: "That relay enters a repeated sowing cycle." };
    seen.add(signature);

    while (hand > 0) {
      cursor = nextActiveIndex(state, cursor);
      if (cursor < 0) return { error: "No active pit remains for sowing." };
      const pitId = PIT_IDS[cursor];
      state.pits[pitId] += 1;
      hand -= 1;
      sowCount += 1;

      const taxed = applyPartialPitTax(state, side, pitId);
      taxCaptured += taxed;
      const reacted = applyReactiveHandicap(state, side, pitId);
      reactiveCaptured += reacted;
    }

    const nextIndex = nextActiveIndex(state, cursor);
    if (nextIndex < 0) return { error: "No active pit remains after the relay." };
    const nextPit = PIT_IDS[nextIndex];
    if (state.pits[nextPit] > 0) {
      hand = state.pits[nextPit];
      state.pits[nextPit] = 0;
      cursor = nextIndex;
      relays += 1;
      continue;
    }

    const capturePit = OPPOSITE[nextPit];
    if (capturePit && state.active[capturePit] && state.pits[capturePit] > 0) {
      state.stores[side] += state.pits[capturePit];
      state.pits[capturePit] = 0;
    }
    return { sowCount, relays, stopPit: PIT_IDS[cursor], gapPit: nextPit, capturePit, taxCaptured, reactiveCaptured };
  }
  return { sowCount, relays, stopPit: PIT_IDS[cursor], gapPit: null, capturePit: null, taxCaptured, reactiveCaptured };
}

function nextActiveIndex(state, cursor) {
  for (let offset = 1; offset <= PIT_IDS.length; offset += 1) {
    const index = (cursor + offset) % PIT_IDS.length;
    if (state.active[PIT_IDS[index]]) return index;
  }
  return -1;
}

function applyReactiveHandicap(state, activeSide, pitId) {
  const defender = otherSide(activeSide);
  const target = Number(state.handicapValue[defender] || 0);
  if (!target || !state.active[pitId] || state.pits[pitId] !== target) return 0;
  const captured = state.pits[pitId];
  state.pits[pitId] = 0;
  state.stores[defender] += captured;
  return captured;
}

function applyPartialPitTax(state, activeSide, pitId) {
  if (state.fullSide !== activeSide) return 0;
  const loser = otherSide(activeSide);
  if (state.partialPit[loser] !== pitId || state.pits[pitId] <= 0) return 0;
  state.pits[pitId] -= 1;
  state.stores[activeSide] += 1;
  return 1;
}

function settleUnplayablePartial(state, force = false) {
  const winner = state.fullSide;
  if (!winner) return;
  const loser = otherSide(winner);
  const pitId = state.partialPit[loser];
  if (!pitId || state.pits[pitId] <= 0) return;
  const legalWithoutPartial = SIDE_PITS[loser].some((id) => state.active[id] && state.pits[id] > 0 && id !== pitId);
  const winnerCanMove = SIDE_PITS[winner].some((id) => state.active[id] && state.pits[id] > 0);
  if (!force && (legalWithoutPartial || winnerCanMove)) return;
  state.stores[winner] += state.pits[pitId];
  state.pits[pitId] = 0;
}

function finishRound(state) {
  state.lastMove.roundEnded = true;
  const totals = {
    aurora: state.stores.aurora + state.reserves.aurora,
    ember: state.stores.ember + state.reserves.ember
  };
  if (totals.aurora + totals.ember !== KHASI_FISHFLOW_RULESET.totalSeeds) throw new Error("Mawkar Katiya ownership total changed at round end.");
  if (totals.aurora === KHASI_FISHFLOW_RULESET.totalSeeds || totals.ember === KHASI_FISHFLOW_RULESET.totalSeeds) {
    state.winner = totals.aurora > totals.ember ? "aurora" : "ember";
    state.winReason = "all-seeds-owned";
    state.phase = "finished";
    return;
  }

  state.round += 1;
  state.currentPlayer = totals.aurora >= totals.ember ? "aurora" : "ember";
  state.stores = { aurora: 0, ember: 0 };
  state.reserves = { aurora: 0, ember: 0 };
  state.handicapValue = { aurora: 0, ember: 0 };
  state.partialPit = { aurora: null, ember: null };
  state.fullSide = null;
  for (const id of PIT_IDS) { state.pits[id] = 0; state.active[id] = false; }

  for (const side of SIDES) distributeRound(state, side, totals[side]);
  if (totals.aurora >= 35 && totals.ember < 35) state.fullSide = "aurora";
  if (totals.ember >= 35 && totals.aurora < 35) state.fullSide = "ember";
  state.phase = "play";
  state.history.push({ type: "round-start", round: state.round, totals, fullSide: state.fullSide, partialPit: clone(state.partialPit), handicapValue: clone(state.handicapValue) });
}

function distributeRound(state, side, total) {
  let remaining = total;
  const order = SIDE_PITS[side];
  for (const pitId of order) {
    if (remaining >= 5) {
      state.pits[pitId] = 5;
      state.active[pitId] = true;
      remaining -= 5;
    } else if (remaining > 0) {
      state.pits[pitId] = remaining;
      state.active[pitId] = true;
      state.partialPit[side] = pitId;
      state.handicapValue[side] = remaining;
      remaining = 0;
    }
  }
  if (remaining > 0) {
    state.reserves[side] = remaining;
    state.handicapValue[side] = remaining;
  }
}

export function boardSeedCount(state) { return PIT_IDS.reduce((sum, id) => sum + Number(state.pits[id] || 0), 0); }
export function totalOwned(state, side) { return state.stores[side] + state.reserves[side] + SIDE_PITS[side].reduce((sum, id) => sum + state.pits[id], 0); }
export function getPlayerSummary(state, side) {
  return {
    captured: state.stores[side],
    reserve: state.reserves[side],
    activePits: SIDE_PITS[side].filter((id) => state.active[id]).length,
    handicapValue: state.handicapValue[side],
    partialPit: state.partialPit[side]
  };
}
export function describeTurn(state) {
  if (state.winner) return resultTitle(state);
  return `${sideName(state.currentPlayer)}: choose an active pit and resolve the clockwise relay.`;
}
export function resultTitle(state) {
  if (!state.winner) return "Khasi relay in progress";
  return `${sideName(state.winner)} owns all seventy stones`;
}
export function resultDetail(state) {
  return state.winReason === "all-seeds-owned" ? "The final handicap round transferred every stone to one player." : "The Mawkar Katiya match is complete.";
}
export function actionSummary(move) {
  if (!move) return "";
  const capture = move.captured ? ` captured ${move.captured}` : " made no direct capture";
  const handicap = move.opponentHandicapCapture ? `; the rival handicap claimed ${move.opponentHandicapCapture}` : "";
  return `${sideName(move.side)} sowed ${move.sowCount} stones through ${move.relays} relay${move.relays === 1 ? "" : "s"} and${capture}${handicap}.`;
}

function explainIllegal(state, pitId, side) {
  if (!SIDE_PITS[side].includes(pitId)) return "Choose a pit on your own row.";
  if (!state.active[pitId]) return "That pit is inactive for this handicap round.";
  if (state.partialPit[side] === pitId) return "The partial handicap pit cannot be selected by its owner.";
  if (!state.pits[pitId]) return "That pit is empty.";
  return "That pit cannot begin the current relay.";
}

export function assertStateInvariant(state) {
  const board = boardSeedCount(state);
  const total = board + state.stores.aurora + state.stores.ember + state.reserves.aurora + state.reserves.ember;
  if (total !== KHASI_FISHFLOW_RULESET.totalSeeds) throw new Error(`Mawkar Katiya seed invariant failed: ${total}.`);
  for (const id of PIT_IDS) {
    if (!Number.isInteger(state.pits[id]) || state.pits[id] < 0) throw new Error(`Invalid pit count at ${id}.`);
    if (!state.active[id] && state.pits[id] !== 0) throw new Error(`Inactive pit ${id} contains stones.`);
  }
  for (const side of SIDES) {
    if (!Number.isInteger(state.stores[side]) || state.stores[side] < 0) throw new Error("Invalid captured store.");
    if (!Number.isInteger(state.reserves[side]) || state.reserves[side] < 0) throw new Error("Invalid round reserve.");
  }
  return true;
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
