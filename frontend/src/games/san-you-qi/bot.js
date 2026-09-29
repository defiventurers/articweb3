import {
  FACTIONS,
  ROLE_LABELS,
  applyAction,
  getLegalActions,
  isInCheck,
} from "./rules.js";

export const BOT_LEVELS = Object.freeze({
  easy: Object.freeze({
    label: "Easy",
    description: "Varied legal moves with a light preference for captures.",
    beam: 5,
    depth: 1,
    budgetMs: 120,
  }),
  medium: Object.freeze({
    label: "Medium",
    description: "Balances material, promotion, development and check pressure.",
    beam: 10,
    depth: 2,
    budgetMs: 450,
  }),
  hard: Object.freeze({
    label: "Hard",
    description: "Selective three-player MaxN search with tactical look-ahead.",
    beam: 14,
    depth: 3,
    budgetMs: 1300,
  }),
});

const PIECE_VALUE = Object.freeze({
  general: 20000,
  chariot: 950,
  cannon: 520,
  horse: 430,
  elephant: 260,
  advisor: 250,
  flag: 360,
  fire: 330,
  soldier: 130,
});

const actionKey = (action) =>
  `${action?.pieceId || ""}|${action?.from || ""}|${action?.to || ""}`;

function pieceValue(piece) {
  const base = PIECE_VALUE[piece.role] || 0;
  return base + (piece.role === "soldier" && piece.promoted ? 90 : 0);
}

function boardMaterial(state, faction) {
  return state.pieces
    .filter((piece) => piece.status === "board" && piece.owner === faction)
    .reduce((sum, piece) => sum + pieceValue(piece), 0);
}

function outcomeScore(state, faction) {
  if (!state.outcome) return 0;
  if (state.outcome.winner === faction) return 1_000_000;
  if (!state.activeFactions.includes(faction)) return -1_000_000;
  return 0;
}

export function evaluateSanYouState(state, faction) {
  let score = outcomeScore(state, faction);
  const own = boardMaterial(state, faction);
  const rivals = FACTIONS.filter((candidate) => candidate !== faction)
    .reduce((sum, candidate) => sum + boardMaterial(state, candidate), 0);

  score += own - rivals * 0.28;

  const owned = state.pieces.filter(
    (piece) => piece.status === "board" && piece.owner === faction,
  );
  score += owned.filter((piece) => piece.role === "soldier" && piece.promoted).length * 70;
  score += owned.filter((piece) => piece.leftHome).length * 6;

  if (state.activeFactions.includes(faction) && isInCheck(state, faction)) score -= 360;

  if (state.turn === faction && !state.outcome) {
    score += Math.min(80, getLegalActions(state).length) * 1.4;
  }

  return score;
}

function actionTacticalScore(state, action, faction) {
  const moving = state.pieces.find((piece) => piece.id === action.pieceId);
  const victim = action.captured
    ? state.pieces.find((piece) => piece.id === action.captured)
    : null;

  const result = applyAction(state, action);
  if (result.error) return -Infinity;

  const moved = result.state.pieces.find((piece) => piece.id === action.pieceId);
  let score = evaluateSanYouState(result.state, faction);

  if (victim) score += pieceValue(victim) * 0.8;
  if (moving?.role === "soldier" && !moving.promoted && moved?.promoted) score += 160;

  for (const rival of FACTIONS) {
    if (rival !== faction && result.state.activeFactions.includes(rival) && isInCheck(result.state, rival)) {
      score += 120;
    }
  }

  return score;
}

function rankedActions(state, faction, beam) {
  return getLegalActions(state)
    .map((action) => ({ action, score: actionTacticalScore(state, action, faction) }))
    .sort((a, b) => b.score - a.score || actionKey(a.action).localeCompare(actionKey(b.action)))
    .slice(0, beam);
}

function evaluateVector(state) {
  return Object.fromEntries(FACTIONS.map((faction) => [faction, evaluateSanYouState(state, faction)]));
}

function maxNSearch(state, depth, beam, deadline) {
  if (depth <= 0 || state.outcome || Date.now() >= deadline) {
    return { scores: evaluateVector(state), action: null };
  }

  const actor = state.turn;
  const candidates = rankedActions(state, actor, beam);
  if (!candidates.length) return { scores: evaluateVector(state), action: null };

  let best = null;

  for (const candidate of candidates) {
    if (Date.now() >= deadline) break;
    const result = applyAction(state, candidate.action);
    if (result.error) continue;

    const child = maxNSearch(result.state, depth - 1, beam, deadline);
    const record = {
      action: candidate.action,
      scores: child.scores,
      tie: candidate.score,
    };

    if (
      !best ||
      record.scores[actor] > best.scores[actor] ||
      (
        record.scores[actor] === best.scores[actor] &&
        (record.tie > best.tie ||
          (record.tie === best.tie && actionKey(record.action).localeCompare(actionKey(best.action)) < 0))
      )
    ) {
      best = record;
    }
  }

  return best || { scores: evaluateVector(state), action: candidates[0]?.action || null };
}

export function chooseSanYouBotAction(
  state,
  difficulty = "medium",
  options = {},
) {
  const level = BOT_LEVELS[difficulty] || BOT_LEVELS.medium;
  const actions = getLegalActions(state);
  if (!actions.length) return { action: null, score: null };

  const random = options.random || Math.random;

  if (difficulty === "easy") {
    const captures = actions.filter((action) => action.captured);
    const pool = captures.length && random() < 0.7 ? captures : actions;
    const action = pool[Math.floor(random() * pool.length)] || pool[0];
    return { action, score: actionTacticalScore(state, action, state.turn) };
  }

  if (difficulty === "medium") {
    const ranked = rankedActions(state, state.turn, level.beam);
    const top = ranked.slice(0, Math.min(3, ranked.length));
    const pick = top.length > 1 && random() < 0.18
      ? top[Math.floor(random() * top.length)]
      : top[0];
    return { action: pick.action, score: pick.score };
  }

  const deadline = Date.now() + (options.budgetMs ?? level.budgetMs);
  const searched = maxNSearch(state, level.depth, level.beam, deadline);
  const fallback = searched.action || rankedActions(state, state.turn, level.beam)[0]?.action || actions[0];

  return {
    action: fallback,
    score: searched.scores?.[state.turn] ?? actionTacticalScore(state, fallback, state.turn),
  };
}

export function botLabel(difficulty) {
  return BOT_LEVELS[difficulty]?.label || BOT_LEVELS.medium.label;
}

export function describeBotMove(state, action) {
  if (!action) return "No legal move.";
  const piece = state.pieces.find((candidate) => candidate.id === action.pieceId);
  return `${ROLE_LABELS[piece?.role] || "Piece"}: ${action.from} → ${action.to}`;
}
