import { describe, expect, it } from "vitest";
import { sanguoElephantTargets } from "./sanguoElephantMoves";
import type { SanguoNode, SanguoPiece } from "./sanguoRules";

const node = (sector: SanguoNode["sector"], rank: number, file: number): SanguoNode => ({ sector, rank, file });
const piece = (
  id: string,
  sector: SanguoNode["sector"],
  rank: number,
  file: number,
  controller: SanguoNode["sector"] = sector,
  role: SanguoPiece["role"] = "seer",
): SanguoPiece => ({ id, sector, controller, role, node: node(sector, rank, file) });
const ids = (active: SanguoPiece, pieces: SanguoPiece[]) =>
  sanguoElephantTargets(active, pieces).map((target) => `${target.sector}-${target.rank}-${target.file}`);

describe("San Guo Qi Phase 4 Elephant movement", () => {
  it("moves exactly two points diagonally", () => {
    const elephant = piece("red-elephant", "red", 2, 4);
    expect(new Set(ids(elephant, [elephant]))).toEqual(new Set([
      "red-0-2",
      "red-0-6",
      "red-4-2",
      "red-4-6",
    ]));
  });

  it("is blocked when the elephant eye is occupied", () => {
    const elephant = piece("red-elephant", "red", 2, 4);
    const blocker = piece("red-eye-blocker", "red", 1, 3, "red", "scout");
    const moves = ids(elephant, [elephant, blocker]);

    expect(moves).not.toContain("red-0-2");
    expect(moves).toContain("red-0-6");
    expect(moves).toContain("red-4-2");
    expect(moves).toContain("red-4-6");
  });

  it("cannot land on a friendly coin but can capture an enemy", () => {
    const elephant = piece("red-elephant", "red", 2, 4);
    const friend = piece("red-friend", "red", 0, 2, "red", "scout");
    const enemy = piece("blue-enemy", "red", 0, 6, "blue", "scout");
    const moves = ids(elephant, [elephant, friend, enemy]);

    expect(moves).not.toContain("red-0-2");
    expect(moves).toContain("red-0-6");
  });

  it("never crosses a river into another kingdom", () => {
    const elephant = piece("red-elephant", "red", 0, 4);
    const moves = sanguoElephantTargets(elephant, [elephant]);

    expect(new Set(moves.map((target) => `${target.rank}-${target.file}`))).toEqual(new Set(["2-2", "2-6"]));
    expect(moves.every((target) => target.sector === "red")).toBe(true);
  });

  it("has the correct two moves from a standard starting Elephant", () => {
    const elephant = piece("red-elephant", "red", 4, 2);
    expect(new Set(ids(elephant, [elephant]))).toEqual(new Set([
      "red-2-0",
      "red-2-4",
    ]));
  });

  it("is rotationally symmetric for red, green, and blue", () => {
    for (const sector of ["red", "green", "blue"] as const) {
      const elephant = piece(`${sector}-elephant`, sector, 2, 4);
      const moves = sanguoElephantTargets(elephant, [elephant]);
      expect(moves).toHaveLength(4);
      expect(moves.every((target) => target.sector === sector)).toBe(true);
    }
  });
});
