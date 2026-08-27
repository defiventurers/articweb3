/** Icebound Strategy Atlas: behavior checks for the featured Mills rules engine. */
import { describe, expect, it } from "vitest";
import { createInitialMillsState, demoMillsState, legalMoves, movePiece, placePiece } from "./millsRules";

describe("Penguin Mills rules", () => {
  it("opens with seven reserves and rotates a legal placement", () => {
    const start = createInitialMillsState(["polly", "retsba", "pengu"]);
    expect(start.reserves.polly).toBe(7);
    const next = placePiece(start, "o-nw");
    expect(next?.reserves.polly).toBe(6);
    expect(next?.turn).toBe("retsba");
    expect(next?.pieces[0].node).toBe("o-nw");
  });

  it("exposes a legal move in the deterministic demo and advances after it", () => {
    const demo = demoMillsState(["polly", "retsba", "pengu"]);
    expect(legalMoves(demo, "i-e")).toContain("i-se");
    const moved = movePiece(demo, "i-e", "i-se");
    expect(moved?.actionCount).toBe(25);
    expect(moved?.pieces.find((piece) => piece.id === "polly-d")?.node).toBe("i-se");
  });
});
