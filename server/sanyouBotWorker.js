const { parentPort } = require("node:worker_threads");
const { chooseSanYouBotAction } = require("./sanyouEngine.cjs");

parentPort.on("message", ({ id, state, difficulty }) => {
  try {
    parentPort.postMessage({ id, ...chooseSanYouBotAction(state, difficulty) });
  } catch (error) {
    parentPort.postMessage({ id, error: error.message });
  }
});
