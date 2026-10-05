const { parentPort } = require("node:worker_threads");
const { chooseXiangqiAction } = require("./xiangqiEngine.cjs");
parentPort.on("message", ({ id, state, difficulty }) => {
  try { parentPort.postMessage({ id, action: chooseXiangqiAction(state, difficulty) }); }
  catch (error) { parentPort.postMessage({ id, error: error.message }); }
});
