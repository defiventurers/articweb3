const { parentPort } = require("node:worker_threads");
const { chooseShogiSearchAction } = require("./shogiEngine.cjs");
parentPort.on("message", ({ id, state, difficulty }) => {
  try { parentPort.postMessage({ id, action: chooseShogiSearchAction(state, difficulty) }); }
  catch (error) { parentPort.postMessage({ id, error: error.message }); }
});
