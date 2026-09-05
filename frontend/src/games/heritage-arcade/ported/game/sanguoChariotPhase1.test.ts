import { describe, expect, it } from "vitest";
import { chariotTargets } from "./sanguoGraphMoves";
import { nodeId, type SanguoNode, type SanguoPiece } from "./sanguoRules";

const node = (sector: SanguoNode["sector"], rank: number, file: number): SanguoNode => ({ sector, rank, file });
const piece = (
  id: string,
  sector: SanguoNode["sector"],
  rank: number,
  file: number,
  controller: SanguoNode["sector"] = sector,
  role: SanguoPiece["role"] = "icebreaker",
): SanguoPiece => ({ id, sector, controller, role, node: node(sector, rank, file) });
const ids = (active: SanguoPiece, pieces: SanguoPiece[]) => chariotTargets(active, pieces).map(nodeId);

describe("San Guo Qi Phase 1 Chariot movement", () => {
  it("uses logical Xiangqi rank rays and stops at the first blocker", () => {
    const active = piece("red-chariot", "red", 2, 4);
    const friend = piece("red-friend", "red", 2, 6, "red", "scout");
    const enemyBehind = piece("green-enemy", "red", 2, 7, "green", "rider");
    const moves = ids(active, [active, friend, enemyBehind]);

    expect(moves).toContain("red-2-5");
    expect(moves).not.toContain("red-2-6");
    expect(moves).not.toContain("red-2-7");
    expect(moves).toContain("red-1-4");
    expect(moves).toContain("red-3-4");
  });

  it("continues Red L1 directly into Blue L9", () => {
    const active = piece("red-l1-chariot", "red", 2, 0);
    const moves = ids(active, [active]);

    expect(moves).toContain("red-1-0");
    expect(moves).toContain("red-0-0");
    expect(moves).toContain("blue-0-8");
    expect(moves).toContain("blue-4-8");
    expect(moves).not.toContain("green-0-8");
  });

  it("uses the confirmed Red-to-Blue continuation pairs", () => {
    const pairs: Array<[number, number]> = [
      [0, 8], // R1-B9
      [1, 7], // R2-B8
      [2, 6], // R3-B7
      [3, 5], // R4-B6
    ];

    for (const [redFile, blueFile] of pairs) {
      const active = piece(`red-${redFile}`, "red", 0, redFile);
      const moves = ids(active, [active]);
      expect(moves).toContain(`blue-0-${blueFile}`);
      expect(moves).toContain(`blue-4-${blueFile}`);
    }
  });

  it("uses the confirmed Red-to-Green continuation pairs", () => {
    const pairs: Array<[number, number]> = [
      [5, 3], // R6-G4
      [6, 2], // R7-G3
      [7, 1], // R8-G2
      [8, 0], // R9-G1
    ];

    for (const [redFile, greenFile] of pairs) {
      const active = piece(`red-${redFile}`, "red", 0, redFile);
      const moves = ids(active, [active]);
      expect(moves).toContain(`green-0-${greenFile}`);
      expect(moves).toContain(`green-4-${greenFile}`);
    }
  });

  it("uses the confirmed Blue-to-Green continuation pairs", () => {
    const pairs: Array<[number, number]> = [
      [0, 8], // B1-G9
      [1, 7], // B2-G8
      [2, 6], // B3-G7
      [3, 5], // B4-G6
    ];

    for (const [blueFile, greenFile] of pairs) {
      const active = piece(`blue-${blueFile}`, "blue", 0, blueFile);
      const moves = ids(active, [active]);
      expect(moves).toContain(`green-0-${greenFile}`);
      expect(moves).toContain(`green-4-${greenFile}`);
    }
  });

  it("branches Red L5 into both Blue L5 and Green L5", () => {
    const active = piece("red-l5-chariot", "red", 2, 4);
    const moves = ids(active, [active]);

    expect(moves).toContain("red-0-4");
    expect(moves).toContain("green-0-4");
    expect(moves).toContain("green-4-4");
    expect(moves).toContain("blue-0-4");
    expect(moves).toContain("blue-4-4");
  });

  it("does not turn onto unrelated diagonal files after crossing a river", () => {
    const active = piece("red-l4-chariot", "red", 0, 3);
    const moves = ids(active, [active]);

    expect(moves).toContain("blue-0-5");
    expect(moves).toContain("blue-4-5");
    expect(moves).not.toContain("blue-0-4");
    expect(moves).not.toContain("blue-0-6");
    expect(moves.some((target) => target.startsWith("green-"))).toBe(false);
  });

  it("blocks the continuation when the route to the river is occupied", () => {
    const active = piece("red-l1-chariot", "red", 2, 0);
    const blocker = piece("red-blocker", "red", 1, 0, "red", "scout");
    const moves = ids(active, [active, blocker]);

    expect(moves).not.toContain("red-1-0");
    expect(moves).not.toContain("red-0-0");
    expect(moves.some((target) => target.startsWith("blue-"))).toBe(false);
  });

  it("captures the first enemy on a continuation and cannot move beyond it", () => {
    const active = piece("red-l1-chariot", "red", 0, 0);
    const blueVictim = piece("blue-victim", "blue", 2, 8, "blue", "rider");
    const moves = ids(active, [active, blueVictim]);

    expect(moves).toContain("blue-0-8");
    expect(moves).toContain("blue-1-8");
    expect(moves).toContain("blue-2-8");
    expect(moves).not.toContain("blue-3-8");
    expect(moves).not.toContain("blue-4-8");
  });

  it("keeps the L5 branching rule rotationally symmetric", () => {
    for (const sector of ["red", "green", "blue"] as const) {
      const active = piece(`${sector}-chariot`, sector, 2, 4);
      const moves = ids(active, [active]);
      expect(moves).toHaveLength(22);
      expect(moves.filter((target) => !target.startsWith(`${sector}-`))).toHaveLength(10);
    }
  });
});
