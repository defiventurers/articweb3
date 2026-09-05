import { describe, expect, it } from "vitest";
import { cannonTargets } from "./sanguoGraphMoves";
import { nodeId, type SanguoNode, type SanguoPiece } from "./sanguoRules";

const node = (sector: SanguoNode["sector"], rank: number, file: number): SanguoNode => ({ sector, rank, file });
const piece = (
  id: string,
  sector: SanguoNode["sector"],
  rank: number,
  file: number,
  controller: SanguoNode["sector"] = sector,
  role: SanguoPiece["role"] = "cannon",
): SanguoPiece => ({ id, sector, controller, role, node: node(sector, rank, file) });
const ids = (active: SanguoPiece, pieces: SanguoPiece[]) => cannonTargets(active, pieces).map(nodeId);

describe("San Guo Qi Phase 2 Cannon movement", () => {
  it("moves like a Chariot on empty squares without jumping", () => {
    const active = piece("red-cannon", "red", 2, 0);
    const moves = ids(active, [active]);

    expect(moves).toContain("red-2-1");
    expect(moves).toContain("red-2-8");
    expect(moves).toContain("red-1-0");
    expect(moves).toContain("red-0-0");
    expect(moves).toContain("blue-0-8");
    expect(moves).toContain("blue-4-8");
  });

  it("uses exactly one screen to capture across a kingdom continuation", () => {
    const active = piece("red-cannon", "red", 2, 0);
    const screen = piece("screen", "red", 0, 0, "red", "scout");
    const target = piece("target", "blue", 2, 8, "blue", "rider");
    const behind = piece("behind", "blue", 3, 8, "green", "rider");
    const moves = ids(active, [active, screen, target, behind]);

    expect(moves).toContain("red-1-0");
    expect(moves).not.toContain("red-0-0");
    expect(moves).not.toContain("blue-0-8");
    expect(moves).not.toContain("blue-1-8");
    expect(moves).toContain("blue-2-8");
    expect(moves).not.toContain("blue-3-8");
  });

  it("cannot capture without a screen", () => {
    const active = piece("red-cannon", "red", 2, 0);
    const target = piece("target", "blue", 1, 8, "blue", "rider");
    const moves = ids(active, [active, target]);

    expect(moves).toContain("red-1-0");
    expect(moves).toContain("red-0-0");
    expect(moves).toContain("blue-0-8");
    expect(moves).not.toContain("blue-1-8");
  });

  it("cannot land on empty squares after the screen", () => {
    const active = piece("red-cannon", "red", 2, 0);
    const screen = piece("screen", "red", 0, 0, "red", "scout");
    const moves = ids(active, [active, screen]);

    expect(moves).toContain("red-1-0");
    expect(moves).not.toContain("blue-0-8");
    expect(moves).not.toContain("blue-4-8");
  });

  it("does not turn diagonally when crossing kingdoms", () => {
    const active = piece("red-cannon", "red", 2, 3);
    const moves = ids(active, [active]);

    expect(moves).toContain("blue-0-5");
    expect(moves).toContain("blue-4-5");
    expect(moves).not.toContain("blue-0-4");
    expect(moves).not.toContain("green-0-3");
  });

  it("branches only on the shared L5 centre line", () => {
    const active = piece("red-cannon", "red", 2, 4);
    const moves = ids(active, [active]);

    expect(moves).toContain("blue-0-4");
    expect(moves).toContain("blue-4-4");
    expect(moves).toContain("green-0-4");
    expect(moves).toContain("green-4-4");
  });
});
