import { describe, expect, it } from "vitest";
import { arcticBoardNode } from "./sanguoArcticBoardGraph";
import { applySanguoMove, initialSanguoState, legalSanguoTargets, resolveSanguoAppropriation, type SanguoState } from "./sanguoRules";
import { BOARD_WIDTH, BOARD_HEIGHT, FIT_CAMERA, clampCamera, zoomCamera, snapLegalTarget, updateMatchJournal } from "./sanguoPresentation";

const moveOnce = (state: SanguoState) => {
  const piece = state.pieces.find(p => p.controller === state.turn && p.role === "scout")!;
  return applySanguoMove(state, piece.id, legalSanguoTargets(piece, state.pieces)[0])!;
};
describe("presentation camera and drop safety", () => {
  it("keeps a zoom anchor stationary and clamps panning to the original board", () => {
    const anchor = { x: 400, y: 350 };
    const camera = zoomCamera(FIT_CAMERA, 2, anchor);
    expect((anchor.x - camera.x) * camera.zoom).toBe(anchor.x);
    expect((anchor.y - camera.y) * camera.zoom).toBe(anchor.y);
    const edge = clampCamera({ zoom: 2, x: 9999, y: -9999 });
    expect(edge).toEqual({ zoom: 2, x: BOARD_WIDTH / 2, y: 0 });
    expect(zoomCamera(edge, 0)).toEqual(FIT_CAMERA);
    expect(clampCamera({ zoom: 100, x: 9999, y: 9999 })).toEqual({ zoom: 2.5, x: BOARD_WIDTH - BOARD_WIDTH / 2.5, y: BOARD_HEIGHT - BOARD_HEIGHT / 2.5 });
  });
  it("snaps only near an engine-approved target, never to a distant legal move", () => {
    const state = initialSanguoState();
    const soldier = state.pieces.find(p => p.id === "red-scout-0")!;
    const targets = legalSanguoTargets(soldier, state.pieces);
    const node = arcticBoardNode(targets[0].sector, targets[0].rank, targets[0].file);
    const point = { x: node.x * BOARD_WIDTH, y: node.y * BOARD_HEIGHT };
    expect(snapLegalTarget(point, targets)).toEqual(targets[0]);
    expect(snapLegalTarget({ x: 0, y: 0 }, targets)).toBeUndefined();
    expect(snapLegalTarget(point, [])).toBeUndefined();
  });
});
describe("accepted-position journal", () => {
  it("retains all three players' moves and removes intervening bot moves on Undo", () => {
    const initial = initialSanguoState(), red = moveOnce(initial), green = moveOnce(red), blue = moveOnce(green);
    let journal = updateMatchJournal(null, initial, "local:1");
    for (const state of [red, green, blue]) journal = updateMatchJournal(journal, state, "local:1");
    expect(journal.events.map(e => e.faction)).toEqual(["red", "green", "blue"]);
    expect(updateMatchJournal(journal, structuredClone(blue), "local:1")).toBe(journal);
    journal = updateMatchJournal(journal, initial, "local:1");
    expect(journal.events).toHaveLength(0);
  });
  it("records army transfers without a duplicate move and supports same-turn rollback", () => {
    const initial = initialSanguoState();
    const pending: SanguoState = { ...initial, pending: { defeated: "green", victor: "red", reason: "stalemate" } };
    const resolved = resolveSanguoAppropriation(pending)!;
    let journal = updateMatchJournal(null, pending, "local:1");
    journal = updateMatchJournal(journal, resolved, "local:1");
    expect(journal.events).toHaveLength(1);
    expect(journal.events[0]).toMatchObject({ kind: "transfer", faction: "red" });
    expect(journal.events[0].pieceIds).toHaveLength(15);
    expect(journal.events[0].text).toContain("Red now controls Green");
    expect(updateMatchJournal(journal, pending, "local:1").events).toHaveLength(0);
  });
  it("marks rejoined history partial and resets for a new match", () => {
    const initial = initialSanguoState(), advanced = moveOnce(moveOnce(initial));
    const journal = updateMatchJournal(null, advanced, "room:one");
    expect(journal.partial).toBe(true);
    expect(journal.events).toHaveLength(1);
    const reset = updateMatchJournal(journal, initial, "room:two");
    expect(reset.partial).toBe(false);
    expect(reset.events).toHaveLength(0);
  });
});
