import { describe, expect, it } from "vitest";
import { graphPseudoTargets } from "./sanguoGraphMoves";
import { sanguoSoldierTargets } from "./sanguoSoldierMoves";
import type { SanguoNode, SanguoPiece } from "./sanguoRules";

const node = (sector: SanguoNode["sector"], rank: number, file: number): SanguoNode => ({ sector, rank, file });
const piece = (
  id: string,
  sector: SanguoNode["sector"],
  rank: number,
  file: number,
  controller: SanguoNode["sector"] = sector,
  nodeSector: SanguoNode["sector"] = sector,
  role: SanguoPiece["role"] = "scout",
): SanguoPiece => ({ id, sector, controller, role, node: node(nodeSector, rank, file) });
const ids = (active: SanguoPiece, pieces: SanguoPiece[]) =>
  sanguoSoldierTargets(active, pieces).map((target) => `${target.sector}-${target.rank}-${target.file}`);

describe("San Guo Qi Phase 7 Soldier movement", () => {
  it("moves exactly one point forward before crossing and has no sideways or backward move", () => {
    const soldier = piece("red-soldier", "red", 1, 2);
    expect(ids(soldier, [soldier])).toEqual(["red-0-2"]);
  });

  it("crosses a normal river arm on the confirmed continuous file", () => {
    const soldier = piece("red-soldier", "red", 0, 0);
    expect(ids(soldier, [soldier])).toEqual(["blue-0-8"]); // Red L1 -> Blue L9
  });

  it("may choose either enemy kingdom when crossing on the central L5 file", () => {
    const soldier = piece("red-soldier", "red", 0, 4);
    expect(new Set(ids(soldier, [soldier]))).toEqual(new Set(["blue-0-4", "green-0-4"]));
  });

  it("gains forward and sideways movement after crossing but can never retreat", () => {
    const soldier = piece("red-soldier", "red", 2, 4, "red", "blue");
    const moves = ids(soldier, [soldier]);
    expect(new Set(moves)).toEqual(new Set(["blue-3-4", "blue-2-3", "blue-2-5"]));
    expect(moves).not.toContain("blue-1-4");
  });

  it("at the enemy home edge can still move sideways but has no forward move", () => {
    const soldier = piece("red-soldier", "red", 4, 4, "red", "blue");
    expect(new Set(ids(soldier, [soldier]))).toEqual(new Set(["blue-4-3", "blue-4-5"]));
  });

  it("captures exactly as it moves, blocks friendly destinations, and never jumps", () => {
    const soldier = piece("red-soldier", "red", 2, 4, "red", "blue");
    const friend = piece("friend", "green", 3, 4, "red", "blue", "rider");
    const enemy = piece("enemy", "green", 2, 3, "green", "blue", "rider");
    const moves = ids(soldier, [soldier, friend, enemy]);
    expect(moves).not.toContain("blue-3-4");
    expect(moves).toContain("blue-2-3");
    expect(moves).toContain("blue-2-5");
  });

  it("uses rotationally symmetric river mappings", () => {
    const blue = piece("blue-soldier", "blue", 0, 0);
    const green = piece("green-soldier", "green", 0, 0);
    expect(ids(blue, [blue])).toEqual(["green-0-8"]); // Blue L1 -> Green L9
    expect(ids(green, [green])).toEqual(["red-0-8"]); // Green L1 -> Red L9
  });

  it("keeps its original forward orientation after army appropriation", () => {
    const appropriated = piece("red-soldier", "red", 1, 6, "green", "blue");
    expect(new Set(ids(appropriated, [appropriated]))).toEqual(new Set(["blue-2-6", "blue-1-5", "blue-1-7"]));
  });

  it("is wired into the live pseudo-target resolver", () => {
    const soldier = piece("red-soldier", "red", 1, 0);
    const moves = graphPseudoTargets(soldier, [soldier]).map((target) => `${target.sector}-${target.rank}-${target.file}`);
    expect(moves).toEqual(["red-0-0"]);
  });
});
