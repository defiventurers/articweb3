import { describe, expect, it } from "vitest";
import { sanguoHorseTargets } from "./sanguoHorseMoves";
import type { SanguoNode, SanguoPiece } from "./sanguoRules";

const node = (sector: SanguoNode["sector"], rank: number, file: number): SanguoNode => ({ sector, rank, file });
const piece = (
  id: string,
  sector: SanguoNode["sector"],
  rank: number,
  file: number,
  controller: SanguoNode["sector"] = sector,
  role: SanguoPiece["role"] = "rider",
): SanguoPiece => ({ id, sector, controller, role, node: node(sector, rank, file) });
const ids = (active: SanguoPiece, pieces: SanguoPiece[]) =>
  sanguoHorseTargets(active, pieces).map((target) => `${target.sector}-${target.rank}-${target.file}`);

describe("San Guo Qi Phase 3 Horse movement", () => {
  it("has the eight standard Xiangqi Horse destinations from an open central point", () => {
    const horse = piece("red-horse", "red", 2, 4);
    expect(new Set(ids(horse, [horse]))).toEqual(new Set([
      "red-0-3", "red-0-5",
      "red-1-2", "red-1-6",
      "red-3-2", "red-3-6",
      "red-4-3", "red-4-5",
    ]));
  });

  it("blocks both L destinations that use an occupied horse-leg", () => {
    const horse = piece("red-horse", "red", 2, 4);
    const blocker = piece("red-leg-blocker", "red", 1, 4, "red", "scout");
    const moves = ids(horse, [horse, blocker]);

    expect(moves).not.toContain("red-0-3");
    expect(moves).not.toContain("red-0-5");
    expect(moves).toContain("red-1-2");
    expect(moves).toContain("red-1-6");
  });

  it("cannot land on a friendly coin but may capture an enemy at the destination", () => {
    const horse = piece("red-horse", "red", 2, 4);
    const friend = piece("red-friend", "red", 0, 3, "red", "scout");
    const enemy = piece("blue-enemy", "red", 0, 5, "blue", "scout");
    const moves = ids(horse, [horse, friend, enemy]);

    expect(moves).not.toContain("red-0-3");
    expect(moves).toContain("red-0-5");
  });

  it("crosses a river arm like a normal Xiangqi Horse", () => {
    // R2 continues into B8. From R2-4 (rank 1/file 1), an inward long-leg
    // Horse move uses R2-5 as the leg, crosses the river to B8-5 as the
    // two-step point, then lands one file sideways on B7-5 or B9-5.
    const horse = piece("red-horse", "red", 1, 1);
    const moves = ids(horse, [horse]);

    expect(moves).toContain("blue-0-6");
    expect(moves).toContain("blue-0-8");
  });

  it("cannot cross that river when the cross-river horse-leg is blocked", () => {
    const horse = piece("red-horse", "red", 1, 1);
    const blocker = piece("red-river-leg", "red", 0, 1, "red", "scout");
    const moves = ids(horse, [horse, blocker]);

    expect(moves).not.toContain("blue-0-6");
    expect(moves).not.toContain("blue-0-8");
  });

  it("can use the river as the one-point perpendicular part of the L", () => {
    // From R2-5 (rank 0/file 1), moving two files toward R4 and one point
    // across the river lands on B6-5 while the mirror L remains on Red.
    const horse = piece("red-horse", "red", 0, 1);
    const moves = ids(horse, [horse]);

    expect(moves).toContain("red-1-3");
    expect(moves).toContain("blue-0-5");
  });

  it("respects the actual home-rank blocker in the standard setup", () => {
    const horse = piece("red-horse", "red", 4, 1);
    const elephant = piece("red-elephant", "red", 4, 2, "red", "seer");
    const moves = ids(horse, [horse, elephant]);

    expect(moves).toContain("red-2-0");
    expect(moves).toContain("red-2-2");
    expect(moves).not.toContain("red-3-3");
  });

  it("is rotationally symmetric across red, green, and blue away from the rivers", () => {
    for (const sector of ["red", "green", "blue"] as const) {
      const horse = piece(`${sector}-horse`, sector, 2, 4);
      const moves = sanguoHorseTargets(horse, [horse]);
      expect(moves).toHaveLength(8);
      expect(moves.every((target) => target.sector === sector)).toBe(true);
    }
  });
});
