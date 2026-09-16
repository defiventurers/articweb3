import { getLegalActions } from "./rules.js";

const VALUE = { king: 1000, rook: 9, bishop: 8, gold: 6, silver: 5, knight: 4, lance: 4, pawn: 1 };

export function chooseSanninBotAction(state, difficulty = "medium") {
  const actions = getLegalActions(state);
  if (!actions.length) return null;
  const ranked = [...actions].sort((a, b) => score(state, b, difficulty) - score(state, a, difficulty) || key(a).localeCompare(key(b)));
  return ranked[0];
}

function score(state, action, difficulty) {
  const victim = action.to && state.pieces.find((piece) => piece.status === "board" && piece.cell === action.to);
  let value = victim && victim.owner !== state.turn ? (VALUE[victim.type] || 0) * 100 : 0;
  if (action.promote) value += difficulty === "easy" ? 8 : 28;
  if (action.type === "illuminate") value += (action.targets?.length || 0) * 90;
  if (action.to === "0,0") value += 45;
  if (difficulty === "easy") value += action.type === "move" ? 3 : 0;
  return value;
}

function key(action) { return JSON.stringify(action); }
