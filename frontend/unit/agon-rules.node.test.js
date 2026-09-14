import test from "node:test";
import assert from "node:assert/strict";
import {
  CELLS,
  OUTER_RING,
  THRONE_NEIGHBORS,
  applyAction,
  cellKey,
  createAgonState,
  getActingSide,
  getLegalActions,
  ringDistance
} from "../src/games/agon-cold-throne/rules.js";

test("Agon board has one throne and five rings totaling 91 hexes", () => {
  assert.equal(CELLS.length, 91);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((ring) => CELLS.filter((cell) => cell.ring === ring).length), [1, 6, 12, 18, 24, 30]);
  assert.equal(OUTER_RING.length, 30);
  assert.equal(new Set(OUTER_RING).size, 30);
});

test("documented fixed setup uses opposite Queens and six Guards per side", () => {
  const state = createAgonState();
  assert.equal(state.pieces.length, 14);
  assert.equal(state.pieces.filter((piece) => piece.side === "blue" && piece.kind === "guard").length, 6);
  assert.equal(state.pieces.find((piece) => piece.id === "blue-queen").cell, OUTER_RING[0]);
  assert.equal(state.pieces.find((piece) => piece.id === "coral-queen").cell, OUTER_RING[15]);
  assert.ok(state.pieces.every((piece) => ringDistance(...piece.cell.split(",").map(Number)) === 5));
});

test("normal actions move one adjacent step inward or laterally and keep Guards off the throne", () => {
  const state = createAgonState();
  for (const action of getLegalActions(state)) {
    const [fq, fr] = action.from.split(",").map(Number);
    const [tq, tr] = action.to.split(",").map(Number);
    assert.equal(ringDistance(tq - fq, tr - fr), 1);
    assert.ok(ringDistance(tq, tr) <= ringDistance(fq, fr));
    if (action.pieceId.includes("guard")) assert.notEqual(action.to, cellKey(0, 0));
  }
});

test("a voluntary move into a straight enemy sandwich is illegal", () => {
  const state = emptyPosition();
  place(state, "blue-guard-1", "0,2");
  place(state, "coral-guard-1", "1,1");
  place(state, "coral-guard-2", "-1,1");
  const forbidden = getLegalActions(state).find((action) => action.pieceId === "blue-guard-1" && action.to === "0,1");
  assert.equal(forbidden, undefined);
});

test("sandwich capture displaces a Guard and forces an outer-ring return on its owner's next turn", () => {
  const state = emptyPosition();
  place(state, "blue-guard-1", "-1,1");
  place(state, "blue-guard-2", "2,1");
  place(state, "coral-guard-1", "1,1");
  const move = getLegalActions(state).find((action) => action.pieceId === "blue-guard-1" && action.to === "0,1");
  const afterCapture = applyAction(state, move).state;
  assert.equal(afterCapture.pieces.find((piece) => piece.id === "coral-guard-1").cell, null);
  assert.deepEqual(afterCapture.pendingRelocations, ["coral-guard-1"]);
  assert.equal(afterCapture.currentPlayer, "coral");
  const returns = getLegalActions(afterCapture);
  assert.ok(returns.length > 0);
  assert.ok(returns.every((action) => action.type === "relocate" && action.pieceId === "coral-guard-1" && ringDistance(...action.to.split(",").map(Number)) === 5));
});

test("a captured Queen returns before Guards and rival-decree changes the acting side", () => {
  const state = emptyPosition("rival-decree");
  place(state, "blue-guard-1", "-1,1");
  place(state, "blue-guard-2", "2,1");
  place(state, "coral-queen", "1,1");
  state.pendingRelocations.push("coral-guard-1");
  const queuedGuard = state.pieces.find((piece) => piece.id === "coral-guard-1");
  queuedGuard.status = "relocating";
  const move = getLegalActions(state).find((action) => action.pieceId === "blue-guard-1" && action.to === "0,1");
  const afterCapture = applyAction(state, move).state;
  assert.equal(afterCapture.currentPlayer, "coral");
  assert.equal(getActingSide(afterCapture), "blue");
  assert.ok(getLegalActions(afterCapture, "blue").every((action) => action.pieceId === "coral-queen"));
});

test("Queen plus six Guards on the crown ring wins immediately", () => {
  const state = emptyPosition();
  place(state, "blue-queen", cellKey(0, 0));
  const missing = cellKey(1, 0);
  THRONE_NEIGHBORS.filter((cell) => cell !== missing).forEach((cell, index) => place(state, `blue-guard-${index + 1}`, cell));
  place(state, "blue-guard-6", cellKey(2, 0));
  const move = getLegalActions(state).find((action) => action.pieceId === "blue-guard-6" && action.to === missing);
  const finished = applyAction(state, move).state;
  assert.equal(finished.winner, "blue");
  assert.equal(finished.winReason, "queen-and-six-guards");
});

function emptyPosition(variant = "owner-choice") {
  const state = createAgonState({ variant });
  state.pieces.forEach((piece) => { piece.cell = null; piece.status = "relocating"; });
  state.pendingRelocations = [];
  state.currentPlayer = "blue";
  state.repetitions = {};
  return state;
}

function place(state, pieceId, cell) {
  const piece = state.pieces.find((candidate) => candidate.id === pieceId);
  piece.cell = cell;
  piece.status = "board";
}
