import { ADJACENCY, POINTS, applyAction, getLegalActions, occupantAt } from "./rules.js";

export function chooseAuroraVultureBotAction(state, side = state.currentPlayer) {
  const actions = getLegalActions(state, side);
  if (!actions.length) return null;
  const ranked = actions.map((action) => ({ action, score: scoreAction(state, action, side) }));
  ranked.sort((a, b) => b.score - a.score || actionKey(a.action).localeCompare(actionKey(b.action)));
  return ranked[0].action;
}

function scoreAction(state, action, side) {
  const result = applyAction(state, action, side);
  if (result.error) return -100000;
  const next = result.state;
  if (next.winner === side) return 100000;
  if (next.winner && next.winner !== side) return -100000;

  if (side === "vulture") {
    let score = action.type === "capture-crow" ? 5000 : 0;
    score += next.capturedCrows * 900;
    score += mobility(next, "vulture") * 80;
    score += pointWeight(action.to) * 10;
    score -= immediateCrowLocks(next) * 2500;
    return score;
  }

  let score = 0;
  score -= mobility(next, "vulture") * 180;
  score -= immediateVultureCaptures(next) * 900;
  score += crowPressure(next) * 45;
  score += pointWeight(action.to) * 7;
  if (action.type === "place-crow") score += safePlacementBonus(next, action.to);
  return score;
}

function mobility(state, side) {
  const copy = JSON.parse(JSON.stringify(state));
  copy.currentPlayer = side;
  copy.winner = null;
  copy.isDraw = false;
  return getLegalActions(copy, side).length;
}

function immediateVultureCaptures(state) {
  const copy = JSON.parse(JSON.stringify(state));
  copy.currentPlayer = "vulture";
  copy.winner = null;
  copy.isDraw = false;
  return getLegalActions(copy, "vulture").filter((action) => action.type === "capture-crow").length;
}

function immediateCrowLocks(state) {
  return mobility(state, "vulture") === 0 ? 1 : 0;
}

function crowPressure(state) {
  if (!state.vulture.point) return 0;
  return (ADJACENCY[state.vulture.point] || []).filter((point) => occupantAt(state, point)?.side === "crows").length;
}

function safePlacementBonus(state, pointId) {
  if (!state.vulture.point) return pointWeight(pointId) * 3;
  const copy = JSON.parse(JSON.stringify(state));
  copy.currentPlayer = "vulture";
  copy.winner = null;
  copy.isDraw = false;
  const exposed = getLegalActions(copy, "vulture").some((action) => action.type === "capture-crow" && action.capturedPieceId === state.lastAction?.pieceId);
  return exposed ? -1500 : 300;
}

function pointWeight(pointId) {
  return POINTS.find((point) => point.id === pointId)?.kind === "crossing" ? 5 : 2;
}

function actionKey(action) {
  return `${action.type}:${action.pieceId}:${action.from || ""}:${action.over || ""}:${action.to}`;
}
