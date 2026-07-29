export const KHASI_FISHFLOW_RULESET = Object.freeze({
  gameId: "khasi-fishflow",
  rulesetVersion: "mawkar-katiya-das-gupta-1923-1.0.0",
  traditionalName: "Mawkar Katiya",
  region: "Khasi Hills, Meghalaya",
  pitsPerRow: 7,
  openingCountersPerPit: 5,
  totalCounters: 70
});

export const PLAYERS = Object.freeze(["aurora", "ember"]);
export const otherPlayer = (player) => player === "aurora" ? "ember" : "aurora";

export function createKhasiFishflowState({ mode = "hotseat", starter = "aurora" } = {}) {
  return {
    gameId: KHASI_FISHFLOW_RULESET.gameId,
    rulesetVersion: KHASI_FISHFLOW_RULESET.rulesetVersion,
    mode,
    rows: { aurora: Array(7).fill(5), ember: Array(7).fill(5) },
    activePits: { aurora: 7, ember: 7 },
    stores: { aurora: 0, ember: 0 },
    handicap: { aurora: null, ember: null },
    currentPlayer: starter === "ember" ? "ember" : "aurora",
    roundStarter: starter === "ember" ? "ember" : "aurora",
    round: 1,
    turn: 1,
    winner: null,
    winReason: null,
    lastTurn: null,
    history: []
  };
}

export function getLegalActions(state, player = state.currentPlayer) {
  if (!state || state.winner || player !== state.currentPlayer) return [];
  const actions = [];
  for (let pitIndex = 0; pitIndex < state.activePits[player]; pitIndex += 1) {
    if (state.handicap[player]?.blockedPit === pitIndex) continue;
    if (state.rows[player][pitIndex] > 0) actions.push({ type: "sow", pitIndex });
  }
  return actions;
}

export function applyAction(state, action, player = state.currentPlayer) {
  const legal = getLegalActions(state, player).find((candidate) => candidate.type === action?.type && candidate.pitIndex === action?.pitIndex);
  if (!legal) return { state, error: "Choose a non-empty active pit on your side." };
  const next = clone(state);
  const summary = resolveMove(next, player, action.pitIndex);
  collectHandicapTriggers(next, player, summary);
  summary.roundEnded = finishRoundIfNeeded(next);
  next.lastTurn = summary;
  next.history.push({ turn: next.turn, round: next.round, player, action: { ...action }, summary: clone(summary) });
  if (!next.winner && !summary.roundEnded) next.currentPlayer = otherPlayer(player);
  next.turn += 1;
  assertInvariant(next);
  return { state: next, error: null };
}

function resolveMove(state, player, pitIndex) {
  const route = activeRoute(state);
  let cursor = route.findIndex((pit) => pit.player === player && pit.pitIndex === pitIndex);
  let hand = getPit(state, route[cursor]);
  setPit(state, route[cursor], 0);
  const summary = { pitIndex, stonesSown: 0, relays: 0, captured: 0, capturePit: null, endpoint: null, events: [] };
  let guard = 0;
  while (hand > 0) {
    if (++guard > 20000) throw new Error("Mawkar Katiya relay exceeded the safety limit.");
    cursor = (cursor + 1) % route.length;
    const pit = route[cursor];
    setPit(state, pit, getPit(state, pit) + 1);
    hand -= 1;
    summary.stonesSown += 1;
    summary.endpoint = { ...pit };
    if (hand === 0) {
      const nextPit = route[(cursor + 1) % route.length];
      const nextCount = getPit(state, nextPit);
      if (nextCount > 0) {
        setPit(state, nextPit, 0);
        hand = nextCount;
        cursor = (cursor + 1) % route.length;
        summary.relays += 1;
        summary.events.push({ type: "relay", pit: { ...nextPit }, count: nextCount });
      } else {
        const capturePit = oppositePit(nextPit);
        const captured = capturePit && isActive(state, capturePit) ? getPit(state, capturePit) : 0;
        if (capturePit && captured > 0) {
          setPit(state, capturePit, 0);
          state.stores[player] += captured;
          summary.captured = captured;
          summary.capturePit = { ...capturePit };
          summary.events.push({ type: "capture", pit: { ...capturePit }, count: captured });
        }
      }
    }
  }
  return summary;
}

function collectHandicapTriggers(state, player, summary) {
  const opponent = otherPlayer(player);
  const opponentHandicap = state.handicap[opponent];
  const ownHandicap = state.handicap[player];
  for (const event of summary.events) {
    if (event.type !== "relay") continue;
    if (opponentHandicap?.targetCount > 0 && event.count === opponentHandicap.targetCount) {
      const amount = getPit(state, event.pit);
      setPit(state, event.pit, 0);
      state.stores[opponent] += amount;
    }
  }
  if (ownHandicap?.taxPit != null) {
    const pit = { player: opponent, pitIndex: ownHandicap.taxPit };
    if (isActive(state, pit) && getPit(state, pit) > 0) {
      setPit(state, pit, getPit(state, pit) - 1);
      state.stores[player] += 1;
    }
  }
}

function finishRoundIfNeeded(state) {
  if (activeRoute(state).some((pit) => getPit(state, pit) > 0)) return false;
  const inventory = { aurora: state.stores.aurora, ember: state.stores.ember };
  if (inventory.aurora === 0 || inventory.ember === 0) {
    state.winner = inventory.aurora > inventory.ember ? "aurora" : "ember";
    state.winReason = "all-counters-captured";
    return true;
  }
  state.round += 1;
  state.roundStarter = otherPlayer(state.roundStarter);
  state.currentPlayer = state.roundStarter;
  for (const player of PLAYERS) {
    const total = inventory[player];
    const full = Math.min(7, Math.floor(total / 5));
    const remainder = total - full * 5;
    state.rows[player] = Array(7).fill(0);
    for (let index = 0; index < full; index += 1) state.rows[player][index] = 5;
    if (full < 7 && remainder > 0) state.rows[player][full] = remainder;
    state.activePits[player] = full + (remainder > 0 ? 1 : 0);
    state.stores[player] = 0;
    state.handicap[player] = remainder > 0
      ? { targetCount: remainder, blockedPit: full, taxPit: full }
      : { targetCount: total - full * 5, blockedPit: null, taxPit: null };
  }
  if (!state.activePits.aurora || !state.activePits.ember) {
    state.winner = state.activePits.aurora ? "aurora" : "ember";
    state.winReason = "opponent-cannot-refill";
  }
  return true;
}

export function activeRoute(state) {
  const route = [];
  for (let index = 0; index < state.activePits.aurora; index += 1) route.push({ player: "aurora", pitIndex: index });
  for (let index = state.activePits.ember - 1; index >= 0; index -= 1) route.push({ player: "ember", pitIndex: index });
  return route;
}

function oppositePit(pit) { return pit ? { player: otherPlayer(pit.player), pitIndex: pit.pitIndex } : null; }
function isActive(state, pit) { return pit.pitIndex >= 0 && pit.pitIndex < state.activePits[pit.player]; }
function getPit(state, pit) { return Number(state.rows[pit.player][pit.pitIndex] || 0); }
function setPit(state, pit, value) { state.rows[pit.player][pit.pitIndex] = value; }
export function getCounts(state) { return Object.fromEntries(PLAYERS.map((player) => [player, { board: state.rows[player].reduce((a,b)=>a+b,0), store: state.stores[player], active: state.activePits[player] }])); }
export function resultTitle(state) { return state.winner === "aurora" ? "Aurora Current wins" : "Ember Current wins"; }
export function resultDetail(state) { return state.winReason === "opponent-cannot-refill" ? "The rival cannot refill an active pit for the next round." : "One current captured the full field."; }
export function actionSummary(state) { const s = state.lastTurn; return s ? `${s.relays} relays · ${s.captured} captured${s.roundEnded ? " · round complete" : ""}` : ""; }
export function assertInvariant(state) { const total = PLAYERS.reduce((sum,p)=>sum+state.rows[p].reduce((a,b)=>a+b,0)+state.stores[p],0); if (total !== 70) throw new Error(`Mawkar Katiya counter invariant failed: ${total}`); return true; }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
