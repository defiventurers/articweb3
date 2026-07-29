const assert = require("node:assert/strict");
const test = require("node:test");
const {
  RUMA_RULESET,
  applyChoice,
  assertRumaInvariant,
  createFinalDropLesson,
  createRumaState,
  findRumaSolution,
  getRumaHint,
  resolveChoice
} = require("../rumaIcePuzzleRules.js");

test("classic Tchuka Ruma setup contains four pits and eight counters", () => {
  const state = createRumaState();
  assert.equal(state.rulesetVersion, RUMA_RULESET.rulesetVersion);
  assert.deepEqual(state.pits, [2, 2, 2, 2]);
  assert.equal(state.ruma, 0);
  assert.equal(assertRumaInvariant(state), true);
});

test("classic setup is solvable in six pit choices", () => {
  let state = createRumaState();
  const solution = findRumaSolution(state);
  assert.deepEqual(solution, [2, 3, 2, 3, 1, 3]);
  for (const pitIndex of solution) {
    const result = applyChoice(state, pitIndex);
    assert.equal(result.error, null);
    state = result.state;
  }
  assert.equal(state.status, "won");
  assert.equal(state.ruma, 8);
  assert.deepEqual(state.pits, [0, 0, 0, 0]);
  assert.equal(state.moveCount, 6);
});

test("last counter in a previously occupied pit triggers an automatic relay", () => {
  const outcome = resolveChoice([2, 2, 2, 2], 0, 2);
  assert.equal(outcome.status, "playing");
  assert.equal(outcome.ruma, 1);
  assert.equal(outcome.relays, 1);
  assert.deepEqual(outcome.pits, [2, 2, 0, 3]);
});

test("last counter in an empty ordinary pit fails the attempt", () => {
  const outcome = resolveChoice([1, 0, 0, 7], 0, 0);
  assert.equal(outcome.status, "failed");
  assert.deepEqual(outcome.landed, { type: "empty-pit", pitIndex: 1 });
  assert.equal(outcome.ruma, 0);
});

test("landing in Ruma pauses for another ordinary-pit choice", () => {
  const outcome = resolveChoice([0, 0, 0, 2], 6, 3);
  assert.equal(outcome.status, "playing");
  assert.equal(outcome.ruma, 7);
  assert.deepEqual(outcome.pits, [1, 0, 0, 0]);
  assert.deepEqual(outcome.landed, { type: "ruma" });
});

test("final drop lesson has one forced winning choice", () => {
  const state = createFinalDropLesson();
  assert.deepEqual(getRumaHint(state), { pitIndex: 3, remainingChoices: 1 });
  const result = applyChoice(state, 3);
  assert.equal(result.state.status, "won");
  assert.equal(result.state.ruma, 8);
});
