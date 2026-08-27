import { describe, expect, it } from "vitest";
import { graphHasOnlyKnownNodes, nextSanguoTurn, optionalBannermenCount, removeGeneralAndAppropriate, sanguoNodeIds, winnerFromDefeats } from "./sanguoRules";

describe("Sanguo Qi source-node rules contract", () => {
  it("enumerates exactly 135 stable source-node IDs and every rail edge resolves to one", () => {
    const ids = sanguoNodeIds();
    expect(ids).toHaveLength(135);
    expect(new Set(ids).size).toBe(135);
    expect(ids).toContain("red-0-0");
    expect(ids).toContain("green-4-8");
    expect(graphHasOnlyKnownNodes()).toBe(true);
  });
  it("keeps the approved 48-coin opening by default and adds exactly six optional bannermen", () => {
    expect(optionalBannermenCount(false)).toBe(48);
    expect(optionalBannermenCount(true)).toBe(54);
  });
  it("uses Shu-first counterclockwise turns and skips defeated kingdoms", () => {
    expect(nextSanguoTurn("red", [])).toBe("green");
    expect(nextSanguoTurn("green", [])).toBe("blue");
    expect(nextSanguoTurn("blue", ["red"])).toBe("green");
    expect(winnerFromDefeats(["blue", "green"])).toBe("red");
  });
  it("removes only the defeated General and transfers surviving army control while preserving sector and node", () => {
    const result = removeGeneralAndAppropriate([
      { id: "blue-king", sector: "blue", controller: "blue", role: "king", node: { sector: "blue", rank: 4, file: 4 } },
      { id: "blue-horse", sector: "blue", controller: "blue", role: "rider", node: { sector: "blue", rank: 4, file: 1 } },
      { id: "red-horse", sector: "red", controller: "red", role: "rider", node: { sector: "red", rank: 4, file: 1 } },
    ], { defeated: "blue", victor: "red", reason: "checkmate" });
    expect(result[0]).toMatchObject({ captured: true, sector: "blue", controller: "blue" });
    expect(result[1]).toMatchObject({ sector: "blue", controller: "red", node: { sector: "blue", rank: 4, file: 1 } });
    expect(result[2].controller).toBe("red");
  });
});
