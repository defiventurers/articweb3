import {
  SAN_YOU_EVAL_WEIGHTS,
  chooseSanYouBotAction,
} from "../src/games/san-you-qi/bot.js";
import {
  FACTIONS,
  applyAction,
  createInitialState,
} from "../src/games/san-you-qi/rules.js";

const GENERATIONS = Number(process.env.SANYOU_TUNE_GENERATIONS || 4);
const CANDIDATES = Number(process.env.SANYOU_TUNE_CANDIDATES || 5);
const GAMES_PER_SEAT = Number(process.env.SANYOU_TUNE_GAMES || 2);
const MOVE_BUDGET_MS = Number(process.env.SANYOU_TUNE_BUDGET_MS || 35);
const MAX_PLIES = Number(process.env.SANYOU_TUNE_MAX_PLIES || 180);

const TUNABLE = [
  "strongestRival",
  "secondRival",
  "promotedSoldier",
  "crossedFlag",
  "enemyTerritory",
  "sharedGateOccupancy",
  "innerSeaOccupancy",
  "centralOccupancy",
  "currentMobility",
  "check",
  "checkToMove",
  "checkingMove",
  "activeOpponentEliminated",
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

function materialTiebreak(state, faction) {
  const values = {
    general: 30000, chariot: 1000, cannon: 560, horse: 500,
    flag: 500, fire: 340, elephant: 250, advisor: 245, soldier: 160,
  };
  return state.pieces
    .filter((piece) => piece.status === "board" && piece.owner === faction)
    .reduce((sum, piece) => sum + (values[piece.role] || 0), 0);
}

function scoreCandidate(state, candidateFaction) {
  if (state.outcome?.winner === candidateFaction) return 1;
  if (!state.activeFactions.includes(candidateFaction)) return 0;

  const alive = state.activeFactions.length;
  const own = materialTiebreak(state, candidateFaction);
  const rivals = FACTIONS
    .filter((faction) => faction !== candidateFaction)
    .map((faction) => materialTiebreak(state, faction));
  const strongest = Math.max(...rivals, 1);

  // Partial credit only for unfinished training games.
  return Math.min(0.65, 0.25 + (3 - alive) * 0.12 + Math.max(-0.1, Math.min(0.2, (own - strongest) / 12000)));
}

function playGame(candidateFaction, candidateWeights, baselineWeights, seed) {
  let state = createInitialState();
  let plies = 0;

  while (!state.outcome && plies < MAX_PLIES) {
    const weights = state.turn === candidateFaction ? candidateWeights : baselineWeights;
    const { action } = chooseSanYouBotAction(state, "hard", {
      budgetMs: MOVE_BUDGET_MS,
      maxDepth: 4,
      beam: 14,
      qDepth: 2,
      qBeam: 10,
      evalWeights: weights,
      random: seededRandom(seed + plies),
    });

    if (!action) break;
    const result = applyAction(state, action);
    if (result.error) throw new Error(result.error.message);
    state = result.state;
    plies += 1;
  }

  return {
    score: scoreCandidate(state, candidateFaction),
    winner: state.outcome?.winner || null,
    plies,
  };
}

function compare(candidate, baseline, seedBase) {
  let total = 0;
  let games = 0;
  const records = [];

  for (let seat = 0; seat < FACTIONS.length; seat += 1) {
    const faction = FACTIONS[seat];
    for (let game = 0; game < GAMES_PER_SEAT; game += 1) {
      const result = playGame(
        faction,
        candidate,
        baseline,
        seedBase + seat * 1000 + game * 17,
      );
      total += result.score;
      games += 1;
      records.push({ faction, ...result });
    }
  }

  return {
    score: total / games,
    records,
  };
}

let champion = { ...SAN_YOU_EVAL_WEIGHTS };
let championScore = 0.5;

console.log("San You Qi self-play evaluator tuning");
console.log({
  generations: GENERATIONS,
  candidates: CANDIDATES,
  gamesPerSeat: GAMES_PER_SEAT,
  moveBudgetMs: MOVE_BUDGET_MS,
  maxPlies: MAX_PLIES,
});

for (let generation = 1; generation <= GENERATIONS; generation += 1) {
  const random = seededRandom(6700 + generation * 997);
  let best = champion;
  let bestScore = championScore;

  for (let index = 0; index < CANDIDATES; index += 1) {
    const candidate = mutate(champion, random, Math.max(0.06, 0.20 - generation * 0.025));
    const match = compare(candidate, champion, generation * 100000 + index * 10000);
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

console.log("\nSuggested SAN_YOU_EVAL_WEIGHTS after self-play:");
console.log(JSON.stringify(champion, null, 2));
