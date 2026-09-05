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

  it("does not jump an occupied orthogonal horse-leg", () => {
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

  it("stays inside its current kingdom and never uses Chariot continuation files", () => {
    const horse = piece("red-horse", "red", 1, 0);
    const moves = ids(horse, [horse]);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((target) => target.startsWith("red-"))).toBe(true);
  });

  it("respects the actual home-rank blocker in the standard setup", () => {
    const horse = piece("red-horse", "red", 4, 1);
    const elephant = piece("red-elephant", "red", 4, 2, "red", "seer");
    const moves = ids(horse, [horse, elephant]);

    expect(moves).toContain("red-2-0");
    expect(moves).toContain("red-2-2");
    expect(moves).not.toContain("red-3-3");
  });

  it("is rotationally symmetric across red, green, and blue fields", () => {
    for (const sector of ["red", "green", "blue"] as const) {
      const horse = piece(`${sector}-horse`, sector, 2, 4);
      const moves = sanguoHorseTargets(horse, [horse]);
      expect(moves).toHaveLength(8);
      expect(moves.every((target) => target.sector === sector)).toBe(true);
    }
  });
});
