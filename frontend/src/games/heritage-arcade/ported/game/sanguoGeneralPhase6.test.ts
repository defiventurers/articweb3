import { describe, expect, it } from "vitest";
import { sanguoGeneralTargets } from "./sanguoGeneralMoves";
import type { SanguoNode, SanguoPiece } from "./sanguoRules";

const node = (sector: SanguoNode["sector"], rank: number, file: number): SanguoNode => ({ sector, rank, file });
const piece = (
  id: string,
  sector: SanguoNode["sector"],
  rank: number,
  file: number,
  controller: SanguoNode["sector"] = sector,
  role: SanguoPiece["role"] = "king",
): SanguoPiece => ({ id, sector, controller, role, node: node(sector, rank, file) });
const ids = (active: SanguoPiece, pieces: SanguoPiece[]) =>
  sanguoGeneralTargets(active, pieces).map((target) => `${target.sector}-${target.rank}-${target.file}`);

describe("San Guo Qi Phase 6 General movement", () => {
  it("moves exactly one point orthogonally from the palace centre", () => {
    const general = piece("red-general", "red", 3, 4);
    expect(new Set(ids(general, [general]))).toEqual(new Set([
      "red-2-4",
      "red-4-4",
      "red-3-3",
      "red-3-5",
    ]));
  });

  it("never moves diagonally", () => {
    const general = piece("red-general", "red", 3, 4);
    const moves = ids(general, [general]);
    expect(moves).not.toContain("red-2-3");
    expect(moves).not.toContain("red-2-5");
    expect(moves).not.toContain("red-4-3");
    expect(moves).not.toContain("red-4-5");
  });

  it("never leaves its 3x3 palace", () => {
    const general = piece("red-general", "red", 2, 3);
    expect(new Set(ids(general, [general]))).toEqual(new Set([
      "red-3-3",
      "red-2-4",
    ]));
  });

  it("cannot land on a friendly coin but may capture an enemy", () => {
    const general = piece("red-general", "red", 3, 4);
    const friend = piece("red-friend", "red", 2, 4, "red", "guard");
    const enemy = piece("blue-enemy", "red", 3, 5, "blue", "guard");
    const moves = ids(general, [general, friend, enemy]);

    expect(moves).not.toContain("red-2-4");
    expect(moves).toContain("red-3-5");
  });

  it("has only the forward palace move available in the standard home setup", () => {
    const general = piece("red-general", "red", 4, 4);
    const leftAdvisor = piece("red-advisor-left", "red", 4, 3, "red", "guard");
    const rightAdvisor = piece("red-advisor-right", "red", 4, 5, "red", "guard");

    expect(ids(general, [general, leftAdvisor, rightAdvisor])).toEqual(["red-3-4"]);
  });

  it("fails closed if a General is somehow outside its printed palace", () => {
    const general = piece("red-general", "red", 1, 4);
    expect(ids(general, [general])).toEqual([]);
  });

  it("is rotationally symmetric for all three kingdoms", () => {
    for (const sector of ["red", "green", "blue"] as const) {
      const general = piece(`${sector}-general`, sector, 3, 4);
      const moves = sanguoGeneralTargets(general, [general]);
      expect(moves).toHaveLength(4);
      expect(moves.every((target) => target.sector === sector)).toBe(true);
    }
  });
});
