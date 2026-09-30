import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  SANGUO_EVAL_WEIGHTS,
  applySanguoAction,
  chooseSanguoBotAction,
  initialSanguoState,
  resolveSanguoAppropriation,
  sanguoFactions,
} = require("../../server/sanguoEngine.cjs");

const GENERATIONS = Number(process.env.SANGUO_TUNE_GENERATIONS || 4);
const CANDIDATES = Number(process.env.SANGUO_TUNE_CANDIDATES || 5);
const GAMES_PER_SEAT = Number(process.env.SANGUO_TUNE_GAMES || 2);
const MOVE_BUDGET_MS = Number(process.env.SANGUO_TUNE_BUDGET_MS || 35);
const MAX_MOVES = Number(process.env.SANGUO_TUNE_MAX_MOVES || 180);
const INCLUDE_BANNERMEN = process.env.SANGUO_TUNE_BANNERMEN !== "0";

const TUNABLE = [
  "strongestRival",
  "secondRival",
  "mobility",
  "attackedPiece",
  "doubleAttackedPiece",
  "check",
  "sideToMoveInCheck",
  "checkPressure",
  "soldierProgress",
  "crossedSoldier",
  "majorPieceProgress",
  "centralFile",
  "riverControl",
  "enemySector",
  "eliminatedOpponent",
];

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function mutate(base, random, scale = 0.18) {
  const next = { ...base };
  for (const key of TUNABLE) {
    const factor = 1 + (random() * 2 - 1) * scale;
    next[key] = Math.max(0.001, base[key] * factor);
  }
  return next;
}

function material(state, faction) {
  const values = {
    king: 30000,
    icebreaker: 1000,
    cannon: 460,
    rider: 440,
    runner: 430,
    guard: 210,
    seer: 210,
    scout: 125,
  };

  return state.pieces
    .filter(piece => !piece.captured && piece.controller === faction)
    .reduce((sum, piece) => sum + (values[piece.role] || 0), 0);
}

function partialScore(state, faction) {
  if (state.winner === faction) return 1;
  if (state.defeated.includes(faction)) return 0;
  if (state.draw) return 0.45;

  const rivals = sanguoFactions
    .filter(candidate => candidate !== faction)
    .map(candidate => material(state, candidate));
  const own = material(state, faction);
  const strongest = Math.max(...rivals, 1);
  const defeatedOpponents = state.defeated.filter(candidate => candidate !== faction).length;

  return Math.max(
    0.05,
    Math.min(
      0.75,
      0.28 +
        defeatedOpponents * 0.16 +
        Math.max(-0.12, Math.min(0.22, (own - strongest) / 13000)),
    ),
  );
}

function settle(state) {
  let current = state;
  let guard = 0;
  while (current.pending && !current.winner && !current.draw && guard < 3) {
    current = resolveSanguoAppropriation(current);
    if (!current) break;
    guard += 1;
  }
  return current;
}

function playGame(candidateFaction, candidateWeights, baselineWeights, seed) {
  let state = initialSanguoState(INCLUDE_BANNERMEN);
  let moves = 0;

  while (state && !state.winner && !state.draw && moves < MAX_MOVES) {
    state = settle(state);
    if (!state || state.winner || state.draw) break;

    const weights = state.turn === candidateFaction ? candidateWeights : baselineWeights;
    const { action } = chooseSanguoBotAction(state, "hard", {
      budgetMs: MOVE_BUDGET_MS,
      maxDepth: 4,
      width: 18,
      qDepth: 2,
      qWidth: 10,
      evalWeights: weights,
      random: seededRandom(seed + moves),
    });

    if (!action) break;

    const next = applySanguoAction(state, action);
    if (!next) throw new Error("Self-play produced an illegal action.");
    state = next;
    moves += 1;
  }

  state = settle(state) || state;

  return {
    score: partialScore(state, candidateFaction),
    winner: state.winner || null,
    draw: state.draw || null,
    moves,
  };
}

function compare(candidate, baseline, seedBase) {
  let total = 0;
  let games = 0;
  const records = [];

  for (let seat = 0; seat < sanguoFactions.length; seat += 1) {
    const faction = sanguoFactions[seat];

    for (let game = 0; game < GAMES_PER_SEAT; game += 1) {
      const result = playGame(
        faction,
        candidate,
        baseline,
        seedBase + seat * 1000 + game * 31,
      );

      total += result.score;
      games += 1;
      records.push({ faction, ...result });
    }
  }

  return { score: total / games, records };
}

let champion = { ...SANGUO_EVAL_WEIGHTS };
let championScore = 0.5;

console.log("Sanguo Qi self-play evaluator tuning");
console.log({
  generations: GENERATIONS,
  candidates: CANDIDATES,
  gamesPerSeat: GAMES_PER_SEAT,
  moveBudgetMs: MOVE_BUDGET_MS,
  maxMoves: MAX_MOVES,
  includeBannermen: INCLUDE_BANNERMEN,
});

for (let generation = 1; generation <= GENERATIONS; generation += 1) {
  const random = seededRandom(3319 + generation * 991);
  let best = champion;
  let bestScore = championScore;

  for (let index = 0; index < CANDIDATES; index += 1) {
    const candidate = mutate(
      champion,
      random,
      Math.max(0.06, 0.20 - generation * 0.025),
    );

    const match = compare(
      candidate,
      champion,
      generation * 100000 + index * 10000,
    );

    console.log(
      `generation=${generation} candidate=${index + 1} score=${match.score.toFixed(3)}`,
      match.records,
    );

    if (match.score > bestScore) {
      best = candidate;
      bestScore = match.score;
    }
  }

  champion = best;
  championScore = bestScore;

  console.log(`generation=${generation} champion=${championScore.toFixed(3)}`);
  console.log(JSON.stringify(champion, null, 2));
}

console.log("\nSuggested SANGUO_EVAL_WEIGHTS after self-play:");
console.log(JSON.stringify(champion, null, 2));
