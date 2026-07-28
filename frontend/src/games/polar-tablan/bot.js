import { getLegalActions, getPiece, routeFor } from "./rules.js";

export function choosePolarTablanBotAction(state, side = state.currentPlayer) {
  const actions = getLegalActions(state, side);
  if (!actions.length) return null;
  return [...actions].sort((a, b) => score(b, state, side) - score(a, state, side) || key(a).localeCompare(key(b)))[0];
}

function score(action, state, side) {
  if (action.type === "forfeit-roll") return -100000;
  let total = action.split ? 20 : 0;
  for (const resolved of action.resolved || []) {
    total += resolved.targetProgress * 3;
    if (resolved.capturedPieceId) total += 800;
    if (resolved.locked) total += 1200;
    const piece = getPiece(state, side, resolved.pieceId);
    if (piece && !piece.started) total += 120;
    const cell = routeFor(side)[resolved.targetProgress];
    if (cell) total += Number(cell.split("-")[2] || 0);
  }
  return total;
}

function key(action) {
  return action.type === "forfeit-roll" ? "z" : (action.legs || []).map((leg) => `${leg.pieceId}:${leg.amount}`).join("|");
}
