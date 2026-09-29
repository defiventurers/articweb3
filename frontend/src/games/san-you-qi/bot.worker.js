import { chooseSanYouBotAction } from "./bot.js";

self.onmessage = ({ data }) => {
  try {
    self.postMessage({
      id: data.id,
      ...chooseSanYouBotAction(data.state, data.difficulty),
    });
  } catch (error) {
    self.postMessage({
      id: data.id,
      error: error instanceof Error ? error.message : "The bot could not choose a move.",
    });
  }
};
