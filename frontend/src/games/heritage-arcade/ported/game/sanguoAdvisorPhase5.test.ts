import { describe, expect, it } from "vitest";
import { sanguoAdvisorTargets } from "./sanguoAdvisorMoves";
import type { SanguoNode, SanguoPiece } from "./sanguoRules";

const node = (sector: SanguoNode["sector"], rank: number, file: number): SanguoNode => ({ sector, rank, file });
const piece = (
  id: string,
  sector: SanguoNode["sector"],
  rank: number,
  file: number,
  controller: SanguoNode["sector"] = sector,
  role: SanguoPiece["role"] = "guard",
): SanguoPiece => ({ id, sector, controller, role, node: node(sector, rank, file) });
const ids = (active: SanguoPiece, pieces: SanguoPiece[]) =>
  sanguoAdvisorTargets(active, pieces).map((target) => `${target.sector}-${target.rank}-${target.file}`);

describe("San Guo Qi Phase 5 Advisor movement", () => {
  it("moves from a palace corner only to the palace centre", () => {
    const advisor = piece("red-advisor", "red", 4, 3);
    expect(ids(advisor, [advisor])).toEqual(["red-3-4"]);
  });

  it("moves from the palace centre to all four X corners", () => {
    const advisor = piece("red-advisor", "red", 3, 4);
    expect(new Set(ids(advisor, [advisor]))).toEqual(new Set([
      "red-2-3",
      "red-2-5",
      "red-4-3",
      "red-4-5",
    ]));
  });

  it("never moves to palace edge-midpoints or outside the palace", () => {
    const advisor = piece("red-advisor", "red", 3, 4);
    const moves = ids(advisor, [advisor]);

    expect(moves).not.toContain("red-2-4");
    expect(moves).not.toContain("red-3-3");
    expect(moves).not.toContain("red-3-5");
    expect(moves).not.toContain("red-4-4");
    expect(moves.every((target) => target.startsWith("red-"))).toBe(true);
  });

  it("cannot land on a friendly coin but may capture an enemy on the centre", () => {
    const advisor = piece("red-advisor", "red", 4, 3);
    const friend = piece("red-friend", "red", 3, 4, "red", "scout");
    expect(ids(advisor, [advisor, friend])).toEqual([]);

    const enemy = piece("blue-enemy", "red", 3, 4, "blue", "scout");
    expect(ids(advisor, [advisor, enemy])).toEqual(["red-3-4"]);
  });

  it("keeps an appropriated Advisor inside its original printed palace", () => {
    const advisor = piece("captured-red-advisor", "red", 3, 4, "blue");
    const moves = sanguoAdvisorTargets(advisor, [advisor]);

    expect(moves).toHaveLength(4);
    expect(moves.every((target) => target.sector === "red")).toBe(true);
  });

  it("fails closed if an Advisor is somehow placed on a non-X palace point", () => {
    const advisor = piece("invalid-red-advisor", "red", 3, 3);
    expect(ids(advisor, [advisor])).toEqual([]);
  });

  it("matches the standard initial Advisor positions", () => {
    const left = piece("red-advisor-left", "red", 4, 3);
    const right = piece("red-advisor-right", "red", 4, 5);

    expect(ids(left, [left])).toEqual(["red-3-4"]);
    expect(ids(right, [right])).toEqual(["red-3-4"]);
  });

  it("is rotationally symmetric for red, green, and blue palaces", () => {
    for (const sector of ["red", "green", "blue"] as const) {
      const advisor = piece(`${sector}-advisor`, sector, 3, 4);
      const moves = sanguoAdvisorTargets(advisor, [advisor]);
      expect(moves).toHaveLength(4);
      expect(moves.every((target) => target.sector === sector)).toBe(true);
    }
  });
});
