const assert = require("node:assert/strict");
const test = require("node:test");

async function rules() {
  return import("../../frontend/src/games/ruma-ice-puzzle/rules.js");
}

test("classic Tchuka Ruma starts with eight counters and has a six-move solution", async () => {
  const { createRumaState, solveRuma, assertInvariant } = await rules();
  const state = createRumaState();
  assert.deepEqual(state.pits, [2,2,2,2]);
  assert.equal(state.ruma, 0);
  assert.equal(assertInvariant(state), true);
  const solution = solveRuma(state);
  assert.deepEqual(solution.map((action) => action.pitIndex), [2,3,2,3,1,3]);
});

test("the solved route places all eight counters in the Ruma", async () => {
  const { applyRumaAction, createRumaState, solveRuma } = await rules();
  let state = createRumaState();
  for (const action of solveRuma(state)) state = applyRumaAction(state, action).state;
  assert.equal(state.status, "won");
  assert.deepEqual(state.pits, [0,0,0,0]);
  assert.equal(state.ruma, 8);
});

test("ending in an empty ordinary pit loses immediately", async () => {
  const { applyRumaAction, createRumaState } = await rules();
  const state = createRumaState({ pits: [1,0,0,7], ruma: 0 });
  const result = applyRumaAction(state, { type: "sow", pitIndex: 0 });
  assert.equal(result.error, null);
  assert.equal(result.state.status, "lost");
  assert.equal(result.state.lastMove.endedInEmpty, true);
});
