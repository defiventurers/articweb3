import { chooseBestAction } from "./rules.js";

export function chooseSevenIceRingsBotAction(state, side = state.currentPlayer) {
  return chooseBestAction(state, side);
}
