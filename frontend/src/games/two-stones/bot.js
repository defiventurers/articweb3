import { chooseSolvedAction } from "./rules.js";

export function chooseTwoStonesBotAction(state, side = state.currentPlayer) {
  return chooseSolvedAction(state, side);
}
