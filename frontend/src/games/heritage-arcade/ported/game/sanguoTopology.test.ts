import { describe, expect, it } from "vitest";
import { SOURCE_JUNCTION, SOURCE_NODES, SOURCE_RIVERS, SOURCE_SECTORS, fieldPoint } from "./sanguoTopology";

describe("Sanguo Qi fixed source topology", () => {
  it("keeps three 45-node source fields with explicit non-interpolated anchors", () => {
    expect(Object.values(SOURCE_NODES).flat(2)).toHaveLength(135);
    expect(fieldPoint("red", 4, 4)).toEqual({ x: 640, y: 1047 });
    expect(fieldPoint("red", 0, 4)).toEqual({ x: 640, y: 680 });
    expect(fieldPoint("blue", 4, 4).x).toBeLessThan(640);
    expect(fieldPoint("green", 4, 4).x).toBeGreaterThan(640);
  });

  it("exposes three filled river wedges and three straight-sided source sectors", () => {
    expect(SOURCE_RIVERS).toHaveLength(3);
    expect(SOURCE_SECTORS.red).toContain("M640 625");
    expect(SOURCE_SECTORS.blue).toContain("M350 70");
    expect(SOURCE_SECTORS.green).toContain("L1210 560");
    expect(SOURCE_JUNCTION).toContain("L640 625");
  });
});
