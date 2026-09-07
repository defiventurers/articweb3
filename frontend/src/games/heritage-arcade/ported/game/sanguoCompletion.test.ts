import { expect, it } from "vitest";
import { applySanguoMove, initialSanguoState, legalSanguoTargets, resignSanguoFaction, sanguoFactions, sanguoPositionKey, sanguoStateFrom, type SanguoPiece } from "./sanguoRules";
import { chooseSanguoBotAction } from "./sanguoBot";
const generals = (): SanguoPiece[] => sanguoFactions.map(sector => ({ id: `${sector}-king`, role: "king", sector, controller: sector, node: { sector, rank: 4, file: 3 } }));

it("three identical positions draw, counting the opening position", () => {
  let state = sanguoStateFrom(generals());
  for (let ply = 0; ply < 12; ply++) {
    const piece = state.pieces.find(p => p.controller === state.turn)!;
    const next = applySanguoMove(state, piece.id, { ...piece.node, rank: piece.node.rank === 4 ? 3 : 4 });
    expect(next).not.toBeNull(); state = next!;
    if (ply < 11) expect(state.draw).toBeUndefined();
  }
  expect(state.draw).toBe("repetition");
  expect(applySanguoMove(state, state.pieces[0].id, { sector: "red", rank: 3, file: 3 })).toBeNull();
});

it("120 quiet plies draw; a Soldier move resets the count", () => {
  let state = { ...initialSanguoState(), quietMoves: 119 };
  const horse = state.pieces.find(p => p.role === "rider" && p.controller === "red")!;
  expect(applySanguoMove(state, horse.id, legalSanguoTargets(horse, state.pieces)[0])?.draw).toBe("no-progress");
  const soldier = state.pieces.find(p => p.role === "scout" && p.controller === "red")!;
  const moved = applySanguoMove(state, soldier.id, legalSanguoTargets(soldier, state.pieces)[0]);
  expect(moved?.quietMoves).toBe(0); expect(moved?.draw).toBeUndefined();
});

it("repetition depends on piece roles and positions, not interchangeable piece IDs", () => {
  const state = initialSanguoState();
  const swapped = { ...state, pieces: state.pieces.map(p => p.id === "red-icebreaker-0" ? { ...p, node: { ...p.node, file: 8 } } : p.id === "red-icebreaker-8" ? { ...p, node: { ...p.node, file: 0 } } : p) };
  expect(sanguoPositionKey(swapped)).toBe(sanguoPositionKey(state));
});

it("resignation skips the departing player and removes all armies they control", () => {
  const state = initialSanguoState();
  state.pieces.find(p => p.id === "blue-rider-1")!.controller = "red";
  const next = resignSanguoFaction(state, "red")!;
  expect(next.turn).toBe("green"); expect(next.defeated).toContain("red");
  expect(next.pieces.filter(p => p.controller === "red").every(p => p.captured)).toBe(true);
  expect(next.pieces.find(p => p.id === "blue-king-4")?.captured).not.toBe(true);
});

it("Hard searches a full three-player cycle on a bounded position", () => {
  const state = sanguoStateFrom(generals());
  const medium = chooseSanguoBotAction(state, "medium");
  const hard = chooseSanguoBotAction(state, "hard");
  expect(medium.stats.completedDepth).toBe(1);
  expect(hard.stats.completedDepth).toBe(3);
  expect(hard.stats.nodes).toBeGreaterThan(medium.stats.nodes);
});
