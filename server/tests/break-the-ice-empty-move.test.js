const assert = require("node:assert/strict");
const test = require("node:test");
const {
  applyAction,
  applyRoll,
  createBreakTheIceState,
  getLegalActions
} = require("../breakTheIceRules.js");

test("a runner can move to an empty route space without a capture", () => {
  const initial = createBreakTheIceState({ starter: "blue" });
  const entryRoll = applyRoll(initial, [1, 0, 0, 0, 0, 0, 0], "blue");
  const entry = getLegalActions(entryRoll.state, "blue").find((action) => action.pieceId === "blue-1");
  const entered = applyAction(entryRoll.state, entry, "blue");

  const movementRoll = applyRoll(entered.state, [1, 1, 0, 0, 0, 0, 0], "blue");
  const move = getLegalActions(movementRoll.state, "blue").find((action) => action.pieceId === "blue-1");

  assert.equal(move.targetSpace, "B2");
  assert.equal(move.captures, null);

  const moved = applyAction(movementRoll.state, move, "blue");
  assert.equal(moved.error, null);
  assert.equal(moved.state.pieces.blue[0].progress, 2);
});
