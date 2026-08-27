import { describe, expect, it } from "vitest";
import { sourceNodeKey } from "./sanguoRailGraph";
import { initialSanguoState, nodeId, pseudoSanguoTargets, type SanguoPiece } from "./sanguoRules";
import { isVisibleRailMove, sourceRailTargets, type RailPiece } from "./sanguoRailMoves";

const railPiece = (piece: SanguoPiece): RailPiece => ({ sector: piece.node.sector, controller: piece.controller, role: piece.role, rank: piece.node.rank, file: piece.node.file, captured: piece.captured });

describe("exact source-rail movement adapter", () => {
  it("delegates the source-rail helper to the exact role engine", () => {
    const state = initialSanguoState(true);
    const active = state.pieces.find((piece) => piece.id === "red-scout-0")!;
    const board = state.pieces.map(railPiece);
    expect(sourceRailTargets(railPiece(active), board).map(nodeId)).toEqual(pseudoSanguoTargets(active, state.pieces).map(nodeId));
  });

  it("returns only approved source nodes and confirms target membership", () => {
    const state = initialSanguoState();
    const active = state.pieces.find((piece) => piece.id === "red-scout-0")!;
    const board = state.pieces.map(railPiece);
    const targets = sourceRailTargets(railPiece(active), board);
    expect(targets.length).toBeGreaterThan(0);
    targets.forEach((target) => {
      expect(sourceNodeKey(target.sector, target.rank, target.file)).toMatch(/^(red|green|blue)-[0-4]-[0-8]$/);
      expect(isVisibleRailMove(railPiece(active), target, board)).toBe(true);
    });
  });

  it("keeps a Chariot delta hop explicit and does not treat a Bannerman as an arbitrary graph walk", () => {
    const chariot: RailPiece = { sector: "blue", controller: "blue", role: "icebreaker", rank: 1, file: 0 };
    expect(sourceRailTargets(chariot, [chariot])).toContainEqual({ sector: "green", rank: 1, file: 0 });
    const banner: RailPiece = { sector: "red", controller: "red", role: "runner", rank: 3, file: 4 };
    const targets = sourceRailTargets(banner, [banner]);
    expect(targets).toEqual(expect.arrayContaining([{ sector: "red", rank: 0, file: 3 }, { sector: "red", rank: 0, file: 5 }]));
    expect(targets).not.toContainEqual({ sector: "red", rank: 2, file: 4 });
  });
});
