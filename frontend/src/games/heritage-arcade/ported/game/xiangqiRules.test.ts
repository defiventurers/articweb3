import { describe, expect, it } from "vitest";
import {
  applyXiangqiMove, demoXiangqiState, generalsFacing, hasLegalMove, initialXiangqiState, isInCheck, legalTargets,
  pseudoLegalTargets, squareKey, type XiangqiPiece, xiangqiStateFrom,
} from "./xiangqiRules";

const piece = (id: string, side: "red" | "black", role: XiangqiPiece["role"], row: number, col: number): XiangqiPiece => ({ id, side, role, row, col });
const targets = (pieces: XiangqiPiece[], id: string, legal = false) => {
  const active = pieces.find((candidate) => candidate.id === id)!;
  return (legal ? legalTargets(active, pieces) : pseudoLegalTargets(active, pieces)).map(squareKey);
};

describe("standard Xiangqi setup", () => {
  it("deploys 32 pieces on the documented 9×10 opening intersections with Red to move", () => {
    const state = initialXiangqiState();
    expect(state.pieces).toHaveLength(32);
    expect(state.pieces.filter((candidate) => candidate.side === "red")).toHaveLength(16);
    expect(state.pieces.filter((candidate) => candidate.side === "black")).toHaveLength(16);
    expect(state.turn).toBe("red");
    expect(state.pieces.find((candidate) => candidate.id === "red-general-4")).toMatchObject({ row: 9, col: 4 });
    expect(state.pieces.find((candidate) => candidate.id === "black-general-4")).toMatchObject({ row: 0, col: 4 });
    expect(state.pieces.filter((candidate) => candidate.side === "red" && candidate.role === "soldier").map((candidate) => candidate.col)).toEqual([0, 2, 4, 6, 8]);
  });

  it("offers a deterministic legal demonstration position without changing the standard opening", () => {
    const demo = demoXiangqiState();
    expect(demo.moveNumber).toBe(5);
    expect(demo.turn).toBe("red");
    expect(demo.lastMove).toMatchObject({ side: "black", role: "horse", to: { row: 2, col: 2 } });
    expect(initialXiangqiState().moveNumber).toBe(1);
  });
});

describe("piece constraints", () => {
  it("keeps General and Advisor within their palace movement patterns", () => {
    const pieces = [piece("g", "red", "general", 9, 4), piece("a", "red", "advisor", 9, 3)];
    expect(targets(pieces, "g")).toEqual(expect.arrayContaining(["8:4", "9:5"]));
    expect(targets(pieces, "g")).not.toContain("9:3");
    expect(targets(pieces, "a")).toEqual(["8:4"]);
  });

  it("blocks the Elephant eye and does not allow an Elephant across the river", () => {
    const pieces = [piece("e", "red", "elephant", 6, 2), piece("eye", "red", "soldier", 7, 3)];
    const moves = targets(pieces, "e");
    expect(moves).not.toContain("8:4");
    expect(moves).not.toContain("4:4");
    expect(moves).toContain("8:0");
  });

  it("blocks the Horse leg before the diagonal finish", () => {
    const pieces = [piece("h", "red", "horse", 5, 4), piece("leg", "black", "soldier", 4, 4)];
    const moves = targets(pieces, "h");
    expect(moves).not.toContain("3:3");
    expect(moves).not.toContain("3:5");
    expect(moves).toContain("7:3");
  });

  it("uses unobstructed Chariot rays and exactly one Cannon screen for captures", () => {
    const chariotBoard = [piece("r", "red", "chariot", 5, 4), piece("friend", "red", "soldier", 5, 6), piece("enemy", "black", "horse", 5, 7)];
    expect(targets(chariotBoard, "r")).toContain("5:5");
    expect(targets(chariotBoard, "r")).not.toContain("5:6");
    expect(targets(chariotBoard, "r")).not.toContain("5:7");

    const cannonBoard = [piece("c", "red", "cannon", 5, 4), piece("screen", "red", "soldier", 4, 4), piece("victim", "black", "horse", 3, 4), piece("beyond", "black", "soldier", 2, 4)];
    const moves = targets(cannonBoard, "c");
    expect(moves).toContain("3:4");
    expect(moves).not.toContain("2:4");
  });

  it("gives a Soldier only forward movement until it has crossed the river", () => {
    const before = [piece("s", "red", "soldier", 5, 4)];
    expect(targets(before, "s")).toEqual(["4:4"]);
    const after = [piece("s", "red", "soldier", 4, 4)];
    expect(targets(after, "s")).toEqual(expect.arrayContaining(["3:4", "4:3", "4:5"]));
    expect(targets(after, "s")).not.toContain("5:4");
  });
});

describe("General safety and endings", () => {
  it("rejects moves that expose the two Generals on an open file or leave a General in check", () => {
    const openFile = [piece("rg", "red", "general", 9, 4), piece("bg", "black", "general", 0, 4), piece("blocker", "red", "chariot", 5, 4)];
    expect(generalsFacing(openFile)).toBe(false);
    expect(targets(openFile, "blocker", true)).not.toContain("5:3");

    const selfCheck = [piece("rg", "red", "general", 9, 4), piece("bg", "black", "general", 0, 3), piece("screen", "red", "chariot", 7, 4), piece("attack", "black", "chariot", 5, 4)];
    expect(isInCheck("red", selfCheck)).toBe(false);
    expect(targets(selfCheck, "screen", true)).not.toContain("7:3");
  });

  it("declares checkmate when a checked General has no legal reply", () => {
    const pieces = [
      piece("rg", "red", "general", 9, 3), piece("bg", "black", "general", 0, 4),
      piece("mate", "red", "chariot", 3, 3), piece("left", "red", "chariot", 2, 3), piece("right", "red", "chariot", 2, 5),
    ];
    const next = applyXiangqiMove(xiangqiStateFrom(pieces), "mate", { row: 3, col: 4 });
    expect(next?.winner).toBe("red");
    expect(next?.result).toBe("checkmate");
  });

  it("declares stalemate as a win when the side to move has no legal reply but is not checked", () => {
    const pieces = [
      piece("rg", "red", "general", 9, 4), piece("bg", "black", "general", 0, 4), piece("river-block", "red", "soldier", 5, 4),
      piece("left", "red", "chariot", 1, 3), piece("right", "red", "chariot", 2, 5), piece("horse", "red", "horse", 3, 3), piece("move", "red", "chariot", 4, 0),
    ];
    expect(isInCheck("black", pieces)).toBe(false);
    expect(targets(pieces, "bg", true)).toEqual([]);
    expect(hasLegalMove("black", pieces)).toBe(false);
    const next = applyXiangqiMove(xiangqiStateFrom(pieces), "move", { row: 4, col: 1 });
    expect(next?.winner).toBe("red");
    expect(next?.result).toBe("stalemate");
  });
});
