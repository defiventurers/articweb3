import { chooseYanYiBotMove } from "./sanguoYanYiRules";
self.onmessage = ({ data }) => {
  try { self.postMessage({ id: data.id, action: chooseYanYiBotMove(data.state, data.difficulty) }); }
  catch (error) { self.postMessage({ id: data.id, error: error instanceof Error ? error.message : "Bot could not calculate a move." }); }
};
