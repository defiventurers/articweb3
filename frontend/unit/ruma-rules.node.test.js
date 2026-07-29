import assert from "node:assert/strict";
import test from "node:test";
import {
  RUMA_PUZZLES,
  RUMA_RULESET,
  applyRumaAction,
  assertRumaInvariant,
  createRumaState,
  getLegalActions,
  getRumaHint,
  replayRumaActions,
  solveRumaState
} from "../src/games/ruma-ice-puzzle/rules.js";

test("teaching setup opens with four pits and conserves eight counters", () => {
  const state = createRumaState();
  assert.deepEqual(state.pits, [2, 2, 2, 2]);
  assert.equal(state.ruma, 0);
  assert.equal(getLegalActions(state).length, 4);
  assert.equal(assertRumaInvariant(state), true);
});

test("landing in the Ruma wins when the final counter enters the store", () => {
  const state = createRumaState();
  state.pits = [0, 0, 0, 1];
  state.ruma = 7;
  const result = applyRumaAction(state, { type: "sow", pitIndex: 3 });
  assert.equal(result.error, null);
  assert.equal(result.state.status, "won");
  assert.equal(result.state.ruma, RUMA_RULESET.totalCounters);
  assert.equal(result.state.lastTurn.landedInRuma, true);
});

test("occupied ordinary landing relays and empty ordinary landing fails", () => {
  const state = createRumaState();
  state.pits = [1, 1, 0, 0];
  state.ruma = 6;
  const result = applyRumaAction(state, { type: "sow", pitIndex: 0 });
  assert.equal(result.error, null);
  assert.equal(result.state.lastTurn.relays, 1);
  assert.equal(result.state.lastTurn.failed, true);
  assert.equal(result.state.status, "failed");
  assert.equal(assertRumaInvariant(result.state), true);
});

test("the Ruma is never offered as a source pit", () => {
  const state = createRumaState();
  state.pits = [0, 2, 0, 1];
  state.ruma = 5;
  assert.deepEqual(getLegalActions(state), [
    { type: "sow", pitIndex: 1 },
    { type: "sow", pitIndex: 3 }
  ]);
});

test("every published puzzle has a verified shortest solution matching par", () => {
  for (const puzzle of RUMA_PUZZLES) {
    const state = createRumaState({ puzzleId: puzzle.id });
    const solution = solveRumaState(state);
    assert.ok(solution, `${puzzle.name} should be solvable`);
    assert.equal(solution.length, puzzle.par, `${puzzle.name} par should match shortest path`);
    const replay = replayRumaActions(state, solution);
    assert.equal(replay.error, null);
    assert.equal(replay.state.status, "won");
    assert.equal(replay.state.ruma, RUMA_RULESET.totalCounters);
  }
});

test("hint returns a legal action on the shortest remaining path", () => {
  const state = createRumaState();
  const hint = getRumaHint(state);
  assert.ok(hint);
  assert.equal(hint.remainingMoves, 6);
  assert.ok(getLegalActions(state).some((action) => action.pitIndex === hint.action.pitIndex));
});
