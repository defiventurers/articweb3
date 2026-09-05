import { describe, expect, it } from "vitest";
import {
  CENTRAL_VERTEX_EXITS,
  fileRays,
  isCentralVertexEndpoint,
  rankRays,
  riverExits,
} from "./sanguoLogicalTopology";
import type { SanguoNode } from "./sanguoRules";

const node = (sector: SanguoNode["sector"], rank: number, file: number): SanguoNode => ({ sector, rank, file });
const ids = (nodes: SanguoNode[]) => nodes.map((value) => `${value.sector}-${value.rank}-${value.file}`);

describe("Sanguo logical 5x9 topology", () => {
  it("uses ordinary Xiangqi rank geometry inside every sector", () => {
    for (const sector of ["red", "green", "blue"] as const) {
      const rays = rankRays(node(sector, 2, 4));
      expect(ids(rays[0])).toEqual([
        `${sector}-2-3`, `${sector}-2-2`, `${sector}-2-1`, `${sector}-2-0`,
      ]);
      expect(ids(rays[1])).toEqual([
        `${sector}-2-5`, `${sector}-2-6`, `${sector}-2-7`, `${sector}-2-8`,
      ]);
    }
  });

  it("maps non-central river continuations explicitly, not from pixels", () => {
    expect(ids(riverExits(node("red", 0, 0)))).toEqual(["blue-0-8"]); // R1 -> B9
    expect(ids(riverExits(node("red", 0, 3)))).toEqual(["blue-0-5"]); // R4 -> B6
    expect(ids(riverExits(node("red", 0, 5)))).toEqual(["green-0-3"]); // R6 -> G4
    expect(ids(riverExits(node("blue", 0, 0)))).toEqual(["green-0-8"]); // B1 -> G9
    expect(ids(riverExits(node("blue", 0, 3)))).toEqual(["green-0-5"]); // B4 -> G6
  });

  it("defines L5 as the one explicit three-way vertex", () => {
    expect(CENTRAL_VERTEX_EXITS).toEqual({
      red: ["blue", "green"],
      blue: ["red", "green"],
      green: ["red", "blue"],
    });
    expect(isCentralVertexEndpoint(node("red", 0, 4))).toBe(true);
    expect(ids(riverExits(node("red", 0, 4)))).toEqual(["blue-0-4", "green-0-4"]);
    expect(ids(riverExits(node("blue", 0, 4)))).toEqual(["red-0-4", "green-0-4"]);
    expect(ids(riverExits(node("green", 0, 4)))).toEqual(["red-0-4", "blue-0-4"]);
  });

  it("builds a Chariot/Cannon file as local Xiangqi steps plus one boundary continuation", () => {
    const rays = fileRays(node("red", 4, 0));
    expect(rays).toHaveLength(1);
    expect(ids(rays[0])).toEqual([
      "red-3-0", "red-2-0", "red-1-0", "red-0-0",
      "blue-0-8", "blue-1-8", "blue-2-8", "blue-3-8", "blue-4-8",
    ]);
  });

  it("branches the central file into two separate straight rays without creating a turn", () => {
    const inward = fileRays(node("red", 4, 4)).filter((ray) => ray.some((target) => target.sector !== "red"));
    expect(inward).toHaveLength(2);
    expect(ids(inward[0])).toEqual([
      "red-3-4", "red-2-4", "red-1-4", "red-0-4",
      "blue-0-4", "blue-1-4", "blue-2-4", "blue-3-4", "blue-4-4",
    ]);
    expect(ids(inward[1])).toEqual([
      "red-3-4", "red-2-4", "red-1-4", "red-0-4",
      "green-0-4", "green-1-4", "green-2-4", "green-3-4", "green-4-4",
    ]);
  });
});
