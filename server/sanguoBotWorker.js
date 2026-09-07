const { parentPort } = require("node:worker_threads");
const { chooseSanguoBotAction } = require("./sanguoEngine.cjs");
parentPort.on("message", ({ id, state, difficulty }) => {
  try { parentPort.postMessage({ id, ...chooseSanguoBotAction(state, difficulty) }); }
  catch (error) { parentPort.postMessage({ id, error: error.message }); }
});
