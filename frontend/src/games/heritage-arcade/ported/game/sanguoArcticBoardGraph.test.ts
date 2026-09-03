import { describe, expect, it } from "vitest";
import { ARCTIC_BOARD_GRAPH, arcticBoardNode, validateArcticBoardGraph } from "./sanguoArcticBoardGraph";

describe("Arctic Sanguo Qi board graph", () => {
  it("maps all 135 source intersections to normalized Arctic positions", () => {
    expect(Object.keys(ARCTIC_BOARD_GRAPH.nodes)).toHaveLength(135);
    expect(Object.values(ARCTIC_BOARD_GRAPH.nodes).every((node) => node.x >= 0 && node.x <= 1 && node.y >= 0 && node.y <= 1)).toBe(true);
    expect(arcticBoardNode("red", 4, 4).coordinate).toBe("R-A-4");
  });

  it("has a connected, reciprocal rail graph", () => expect(validateArcticBoardGraph()).toEqual([]));
});
