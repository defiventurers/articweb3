const assert = require("node:assert/strict");
const test = require("node:test");
const {
  ROUTES,
  applyAction,
  createCowrieKingdomsState,
  getLegalActions,
  getPieceSpaceId
} = require("../cowrieKingdomsRules.js");

function movementUnit(value = 1) {
  return { id: `move-${value}`, kind: "move", value, label: `Move ${value}`, enterAllowed: false, moveAllowed: true };
}

function prepareAllocation(state, value = 1) {
  state.awaiting = "allocate";
  state.throwPool = [movementUnit(value)];
  state.currentPlayer = "aurora";
  return state;
}

test("Ashta-Kashte routes use the source left-corner turn and cover every cell exactly once", () => {
  assert.equal(ROUTES.aurora.length, 49);
  assert.equal(new Set(ROUTES.aurora).size, 49);
  assert.equal(ROUTES.aurora[0], "c03");
  assert.equal(ROUTES.aurora[23], "c04");
  assert.equal(ROUTES.aurora[24], "c15");
  assert.equal(ROUTES.aurora[40], "c24");
  assert.equal(ROUTES.aurora.at(-1), "c33");
  assert.equal(ROUTES.ember[0], "c63");
  assert.equal(ROUTES.ember.at(-1), "c33");
});

test("a runner may land on a friendly runner and form a pair", () => {
  const state = prepareAllocation(createCowrieKingdomsState());
  state.pieces.aurora[0].status = "track";
  state.pieces.aurora[0].progress = 1;
  state.pieces.aurora[1].status = "track";
  state.pieces.aurora[1].progress = 2;

  const action = getLegalActions(state, "aurora", "move-1")
    .find((candidate) => candidate.pieceId === "aurora-1" && candidate.groupSize === 1 && candidate.targetProgress === 2);
  assert.ok(action);
  const result = applyAction(state, action, "aurora");
  assert.equal(result.error, null);
  assert.equal(getPieceSpaceId(result.state.pieces.aurora[0]), getPieceSpaceId(result.state.pieces.aurora[1]));
});

test("a single cannot capture a pair, while a moving pair removes both defenders", () => {
  const state = prepareAllocation(createCowrieKingdomsState());
  state.pieces.aurora[0].status = "track";
  state.pieces.aurora[0].progress = 6;
  const targetCell = ROUTES.aurora[7];
  const emberProgress = ROUTES.ember.indexOf(targetCell);
  assert.ok(emberProgress >= 0);
  state.pieces.ember[0].status = "track";
  state.pieces.ember[0].progress = emberProgress;
  state.pieces.ember[1].status = "track";
  state.pieces.ember[1].progress = emberProgress;

  assert.equal(
    getLegalActions(state, "aurora", "move-1").some((action) => action.pieceId === "aurora-1" && action.targetSpace === targetCell),
    false
  );

  state.pieces.aurora[1].status = "track";
  state.pieces.aurora[1].progress = 6;
  const pairCapture = getLegalActions(state, "aurora", "move-1")
    .find((action) => action.groupSize === 2 && action.targetSpace === targetCell);
  assert.ok(pairCapture);
  assert.deepEqual(pairCapture.capturedPieceIds, ["ember-1", "ember-2"]);

  const result = applyAction(state, pairCapture, "aurora");
  assert.equal(result.error, null);
  assert.equal(result.state.pieces.ember[0].status, "home");
  assert.equal(result.state.pieces.ember[1].status, "home");
  assert.equal(result.state.captures.aurora, 2);
  assert.equal(result.state.bonusRolls, 0);
  assert.equal(result.state.currentPlayer, "aurora");
  assert.equal(result.state.awaiting, "roll");
  assert.equal(result.state.pieces.aurora[0].progress, 7);
  assert.equal(result.state.pieces.aurora[1].progress, 7);
});

test("a formed pair may move together or split into individual moves", () => {
  const state = prepareAllocation(createCowrieKingdomsState(), 2);
  state.pieces.aurora[0].status = "track";
  state.pieces.aurora[0].progress = 8;
  state.pieces.aurora[1].status = "track";
  state.pieces.aurora[1].progress = 8;

  const actions = getLegalActions(state, "aurora", "move-2").filter((action) => action.type === "move");
  assert.equal(actions.filter((action) => action.groupSize === 1).length, 2);
  assert.equal(actions.filter((action) => action.groupSize === 2).length, 1);
});
