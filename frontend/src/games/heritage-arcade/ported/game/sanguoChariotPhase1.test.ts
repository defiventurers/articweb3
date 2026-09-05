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
  it("uses logical Xiangqi rank/file rays and stops at the first blocker", () => {
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

  it("branches through a clear centre file into either enemy kingdom and continues outward", () => {
    const active = piece("red-chariot", "red", 2, 4);
    const moves = ids(active, [active]);

    expect(moves).toContain("red-0-4");
    expect(moves).toContain("green-0-4");
    expect(moves).toContain("green-4-4");
    expect(moves).toContain("blue-0-4");
    expect(moves).toContain("blue-4-4");
  });

  it("does not allow an off-centre Chariot to jump kingdoms", () => {
    const active = piece("red-chariot", "red", 2, 3);
    const moves = ids(active, [active]);

    expect(moves.some((target) => target.startsWith("green-") || target.startsWith("blue-"))).toBe(false);
  });

  it("blocks all centre branches when the route to the home portal is occupied", () => {
    const active = piece("red-chariot", "red", 2, 4);
    const blocker = piece("red-blocker", "red", 1, 4, "red", "scout");
    const moves = ids(active, [active, blocker]);

    expect(moves).not.toContain("red-1-4");
    expect(moves).not.toContain("red-0-4");
    expect(moves.some((target) => target.startsWith("green-") || target.startsWith("blue-"))).toBe(false);
  });

  it("stops one enemy branch at its first occupied node without affecting the other branch", () => {
    const active = piece("red-chariot", "red", 0, 4);
    const greenVictim = piece("green-victim", "green", 1, 4, "green", "rider");
    const moves = ids(active, [active, greenVictim]);

    expect(moves).toContain("green-0-4");
    expect(moves).toContain("green-1-4");
    expect(moves).not.toContain("green-2-4");
    expect(moves).toContain("blue-4-4");
  });

  it("is rotationally symmetric for red, green, and blue centre-file Chariots", () => {
    for (const sector of ["red", "green", "blue"] as const) {
      const active = piece(`${sector}-chariot`, sector, 2, 4);
      const moves = ids(active, [active]);
      expect(moves).toHaveLength(22);
      expect(moves.filter((target) => !target.startsWith(`${sector}-`))).toHaveLength(10);
    }
  });
});
