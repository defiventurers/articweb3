import { chooseSanguoBotAction } from "./sanguoBot";
self.onmessage = ({ data }) => {
  try { self.postMessage({ id: data.id, ...chooseSanguoBotAction(data.state, data.difficulty) }); }
  catch { self.postMessage({ id: data.id, error: "The bot could not choose a move. Please retry." }); }
};
