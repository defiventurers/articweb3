import { chooseShogiSearchAction } from "./bot.js";
self.onmessage = ({ data }) => {
  try { self.postMessage({ action: chooseShogiSearchAction(data.state, data.difficulty) }); }
  catch (error) { self.postMessage({ error: error.message }); }
};
