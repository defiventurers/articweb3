export const RUMA_RULESET = Object.freeze({
  gameId: "ruma-ice-puzzle",
  rulesetVersion: "tchuka-ruma-degrazia-1948-campbell-chavey-1995-1.0.0",
  traditionalName: "Tchuka Ruma",
  ordinaryPits: 4,
  openingSeedsPerPit: 2,
  totalSeeds: 8,
  direction: "toward-ruma-with-wrap"
});

export function createRumaState({ mode = "classic" } = {}) {
  return {
    gameId: RUMA_RULESET.gameId,
    rulesetVersion: RUMA_RULESET.rulesetVersion,
    mode,
    pits: [2, 2, 2, 2],
    ruma: 0,
    status: "playing",
    moves: 0,
    lastMove: null,
    history: []
  };
}

export function createLastPebbleDrill() {
  return {
    ...createRumaState({ mode: "drill" }),
    pits: [0, 0, 0, 1],
    ruma: 7,
    lastMove: { type: "setup", summary: "The last pebble is one pit away from the Ruma." }
  };
}

export function getLegalStarts(state) {
  if (!state || state.status !== "playing") return [];
  return state.pits.map((count, index) => count > 0 ? index : -1).filter((index) => index >= 0);
}

export function applyRumaMove(state, startPit) {
  if (!state || state.status !== "playing") return { state, error: "This Ruma puzzle is already complete." };
  if (!Number.isInteger(startPit) || startPit < 0 || startPit >= RUMA_RULESET.ordinaryPits || state.pits[startPit] <= 0) return { state, error: "Choose one non-empty ordinary pit." };
  const next = clone(state);
  const resolved = resolveRumaMove(next, startPit);
  next.moves += 1;
  next.lastMove = { type: "sow", startPit, ...resolved };
  next.history.push(clone(next.lastMove));
  if (resolved.lost) next.status = "lost";
  else if (next.ruma === RUMA_RULESET.totalSeeds && next.pits.every((count) => count === 0)) next.status = "won";
  return { state: next, error: null };
}

function resolveRumaMove(state, startPit) {
  let hand = state.pits[startPit];
  state.pits[startPit] = 0;
  let cursor = startPit;
  let sowings = 0;
  let drops = 0;
  const chain = [startPit];
  const seen = new Set();

  while (true) {
    const signature = `${cursor}|${hand}|${state.pits.join(",")}|${state.ruma}`;
    if (seen.has(signature)) return { lost: true, reason: "cycle", sowings, drops, chain, landing: cursor };
    seen.add(signature);
    sowings += 1;
    let landing = null;

    while (hand > 0) {
      cursor = (cursor + 1) % (RUMA_RULESET.ordinaryPits + 1);
      if (cursor === RUMA_RULESET.ordinaryPits) state.ruma += 1;
      else state.pits[cursor] += 1;
      hand -= 1;
      drops += 1;
      landing = cursor;
    }

    if (landing === RUMA_RULESET.ordinaryPits) return { lost: false, reason: "ruma", sowings, drops, chain, landing: "ruma" };
    if (state.pits[landing] === 1) return { lost: true, reason: "empty-pit", sowings, drops, chain, landing };

    hand = state.pits[landing];
    state.pits[landing] = 0;
    cursor = landing;
    chain.push(landing);
  }
}

export function getWinningStarts(state) {
  if (!state || state.status !== "playing") return [];
  const memo = new Map();
  const visiting = new Set();
  return getLegalStarts(state).filter((pit) => {
    const result = applyRumaMove(state, pit).state;
    return canForceWin(result, memo, visiting);
  });
}

function canForceWin(state, memo, visiting) {
  if (state.status === "won") return true;
  if (state.status === "lost") return false;
  const key = `${state.pits.join(",")}|${state.ruma}`;
  if (memo.has(key)) return memo.get(key);
  if (visiting.has(key)) return false;
  visiting.add(key);
  let win = false;
  for (const pit of getLegalStarts(state)) {
    const next = applyRumaMove(state, pit).state;
    if (canForceWin(next, memo, visiting)) { win = true; break; }
  }
  visiting.delete(key);
  memo.set(key, win);
  return win;
}

export function getHint(state) {
  const winning = getWinningStarts(state);
  if (winning.length) return { pit: winning[0], winning: true, message: `Sow pit ${winning[0] + 1}; at least one complete route to the Ruma remains.` };
  const legal = getLegalStarts(state);
  return legal.length ? { pit: legal[0], winning: false, message: "No forced win remains from this position. Reset and protect the empty pits earlier." } : { pit: null, winning: false, message: "No ordinary pit can be sown." };
}

export function resultTitle(state) {
  if (state.status === "won") return "The Ruma holds all eight pebbles";
  if (state.status === "lost") return "The chain ended in an empty pit";
  return "Ruma route in progress";
}
export function resultDetail(state) {
  if (state.status === "won") return `Solved in ${state.moves} move${state.moves === 1 ? "" : "s"}.`;
  if (state.status === "lost") return "A final pebble landed in an empty ordinary pit, so this attempt is over.";
  return `${state.ruma}/8 pebbles stored.`;
}
export function moveSummary(move) {
  if (!move || move.type === "setup") return move?.summary || "";
  if (move.lost) return `Pit ${move.startPit + 1} chained through ${move.sowings} sowings and ended in an empty pit.`;
  return `Pit ${move.startPit + 1} chained through ${move.sowings} sowings and ended in the Ruma.`;
}

export function assertRumaInvariant(state) {
  const total = state.ruma + state.pits.reduce((sum, count) => sum + count, 0);
  if (total !== RUMA_RULESET.totalSeeds) throw new Error(`Tchuka Ruma seed invariant failed: ${total}.`);
  if (state.pits.some((count) => !Number.isInteger(count) || count < 0) || !Number.isInteger(state.ruma) || state.ruma < 0) throw new Error("Invalid Tchuka Ruma pit count.");
  return true;
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
