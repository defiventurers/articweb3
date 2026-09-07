const { Worker } = require("node:worker_threads");
const path = require("node:path");

/** A bounded single-worker queue keeps search off the lobby event loop. */
function createSanguoBotPool() {
  let worker = null, active = null, serial = 0, closed = false;
  const queue = [];
  function pump() {
    if (closed || active || !queue.length) return;
    if (!worker) {
      worker = new Worker(path.join(__dirname, "sanguoBotWorker.js"));
      worker.unref();
      worker.on("message", message => {
        if (!active || message.id !== active.id) return;
        const task = active; active = null; clearTimeout(task.timer);
        message.error ? task.reject(new Error(message.error)) : task.resolve(message);
        pump();
      });
      worker.on("error", error => {
        worker = null;
        if (active) { clearTimeout(active.timer); active.reject(error); active = null; }
        pump();
      });
    }
    active = queue.shift();
    active.timer = setTimeout(() => {
      const task = active; active = null;
      worker?.terminate(); worker = null;
      task.reject(new Error("Bot search timed out.")); pump();
    }, 15000);
    active.timer.unref?.();
    worker.postMessage({ id: active.id, state: active.state, difficulty: active.difficulty });
  }
  return {
    choose(state, difficulty) {
      if (closed || queue.length >= 64) return Promise.reject(new Error("Bot queue is busy."));
      return new Promise((resolve, reject) => { queue.push({ id: ++serial, state, difficulty, resolve, reject }); pump(); });
    },
    close() {
      closed = true;
      for (const task of [...queue, ...(active ? [active] : [])]) { clearTimeout(task.timer); task.reject(new Error("Bot service stopped.")); }
      queue.length = 0; active = null; worker?.terminate(); worker = null;
    },
  };
}
module.exports = { createSanguoBotPool };
