import { describe, expect, it } from "vitest";
import {
  applySanguoMove, generalIsAttacked, initialSanguoState, legalSanguoTargets, nodeId,
  optionalBannermenCount, pseudoSanguoTargets, railNodeIds, removeGeneralAndAppropriate,
  resolveSanguoAppropriation, sameNode, type SanguoNode, type SanguoPiece, sanguoStateFrom,
} from "./sanguoRules";

const node = (rank: number, file: number, sector: "red" | "green" | "blue" = "red"): SanguoNode => ({ sector, rank, file });
const piece = (id: string, role: SanguoPiece["role"], rank: number, file: number, controller: "red" | "green" | "blue" = "red", sector = controller): SanguoPiece => ({ id, role, sector, controller, node: node(rank, file, sector) });
const targets = (pieces: SanguoPiece[], id: string, legal = false) => {
  const active = pieces.find((candidate) => candidate.id === id)!;
  return (legal ? legalSanguoTargets(active, pieces) : pseudoSanguoTargets(active, pieces)).map(nodeId);
};

describe("Sanguo Qi source setup", () => {
  it("preserves the user-approved 48-coin default, optional 54-coin bannered set, and Red → Green → Blue opening", () => {
    const standard = initialSanguoState();
    const bannered = initialSanguoState(true);
    expect(standard.pieces).toHaveLength(48);
    expect(bannered.pieces).toHaveLength(54);
    expect(optionalBannermenCount(false)).toBe(48);
    expect(optionalBannermenCount(true)).toBe(54);
    expect(standard.turn).toBe("red");
    expect(standard.pieces.filter((candidate) => candidate.role === "runner")).toHaveLength(0);
    expect(bannered.pieces.filter((candidate) => candidate.role === "runner")).toHaveLength(6);
  });

  it("keeps every generated endpoint on one approved source node", () => {
    const state = initialSanguoState(true);
    state.pieces.forEach((active) => legalSanguoTargets(active, state.pieces).forEach((target) => expect(railNodeIds.has(nodeId(target))).toBe(true)));
  });
});

describe("exact Xiangqi-derived source routes", () => {
  it("confines Generals and Advisors to their local 3×3 palaces", () => {
    const pieces = [piece("king", "king", 4, 4), piece("advisor", "guard", 4, 3)];
    const kingTargets = targets(pieces, "king");
    expect(kingTargets).toEqual(expect.arrayContaining(["red-3-4", "red-4-5"]));
    expect(kingTargets).not.toContain("red-4-3");
    expect(targets(pieces, "advisor")).toEqual(["red-3-4"]);
  });

  it("requires a clear Elephant eye and prevents cross-sector river movement", () => {
    const pieces = [piece("elephant", "seer", 2, 2), piece("eye", "scout", 1, 3)];
    const moves = targets(pieces, "elephant");
    expect(moves).not.toContain("red-0-4");
    expect(moves).toContain("red-4-4");
    expect(moves.every((target) => target.startsWith("red-"))).toBe(true);
  });

  it("requires a clear Horse leg before its 45-degree finish", () => {
    const pieces = [piece("horse", "rider", 2, 4), piece("leg", "scout", 1, 4)];
    const moves = targets(pieces, "horse");
    expect(moves).not.toContain("red-0-3");
    expect(moves).not.toContain("red-0-5");
    expect(moves).toContain("red-4-3");
  });

  it("requires two clear orthogonal Bannerman steps before its 45-degree finish", () => {
    const clear = [piece("flag", "runner", 3, 4)];
    expect(targets(clear, "flag")).toEqual(expect.arrayContaining(["red-0-3", "red-0-5"]));
    const blocked = [...clear, piece("path", "scout", 2, 4)];
    expect(targets(blocked, "flag")).not.toContain("red-0-3");
    expect(targets(blocked, "flag")).not.toContain("red-0-5");
  });

  it("uses unobstructed Chariot rays and one-screen-only Cannon captures", () => {
    const chariotBoard = [piece("chariot", "icebreaker", 2, 4), piece("friend", "scout", 2, 6), piece("enemy", "rider", 2, 7, "green")];
    expect(targets(chariotBoard, "chariot")).toContain("red-2-5");
    expect(targets(chariotBoard, "chariot")).not.toContain("red-2-6");
    expect(targets(chariotBoard, "chariot")).not.toContain("red-2-7");

    const cannonBoard = [piece("cannon", "cannon", 2, 4), piece("screen", "scout", 1, 4), piece("victim", "rider", 0, 4, "green", "red")];
    expect(targets(cannonBoard, "cannon")).toContain("red-0-4");

    const deltaCannon = [piece("delta-cannon", "cannon", 1, 0, "blue", "blue"), piece("delta-victim", "rider", 1, 0, "green", "green")];
    expect(targets(deltaCannon, "delta-cannon")).not.toContain("green-1-0");
  });

  it("gives Soldiers only one forward node until they reach the far river boundary, then unlocks sideways nodes", () => {
    expect(targets([piece("soldier", "scout", 1, 4)], "soldier")).toEqual(["red-0-4"]);
    const crossed = targets([piece("soldier", "scout", 0, 4)], "soldier");
    expect(crossed).toEqual(expect.arrayContaining(["red-0-3", "red-0-5"]));
    expect(crossed).not.toContain("red-1-4");
  });
});

describe("General safety, turns, and appropriation", () => {
  it("filters a non-General move that would expose its own General to a source-file attack", () => {
    const pieces = [
      piece("general", "king", 4, 4), piece("screen", "icebreaker", 2, 4),
      piece("attacker", "icebreaker", 0, 4, "green", "red"),
    ];
    expect(generalIsAttacked("red", pieces)).toBe(false);
    expect(targets(pieces, "screen", true)).not.toContain("red-2-3");
  });

  it("never lets a normal move capture a General and advances the surviving turn sequence correctly", () => {
    const pieces = [piece("red-general", "king", 4, 4), piece("green-general", "king", 3, 4, "green", "red"), piece("red-chariot", "icebreaker", 3, 3)];
    expect(targets(pieces, "red-chariot", true)).not.toContain("red-3-4");
    const opening = initialSanguoState();
    const redSoldier = opening.pieces.find((candidate) => candidate.id === "red-scout-0")!;
    const legal = legalSanguoTargets(redSoldier, opening.pieces)[0];
    const next = applySanguoMove(opening, redSoldier.id, legal);
    expect(next?.turn).toBe("green");
  });

  it("removes only the defeated General and transfers every remaining physical army coin on the separate resolution action", () => {
    const pieces = [piece("red-general", "king", 4, 4), piece("green-general", "king", 4, 4, "green"), piece("green-horse", "rider", 2, 2, "green")];
    const resolved = removeGeneralAndAppropriate(pieces, { defeated: "green", victor: "red", reason: "checkmate" });
    expect(resolved.find((candidate) => candidate.id === "green-general")?.captured).toBe(true);
    expect(resolved.find((candidate) => candidate.id === "green-horse")).toMatchObject({ sector: "green", controller: "red", node: { sector: "green", rank: 2, file: 2 } });

    const completed = resolveSanguoAppropriation({ ...sanguoStateFrom(pieces), pending: { defeated: "green", victor: "red", reason: "checkmate" } });
    expect(completed?.defeated).toEqual(["green"]);
    expect(completed?.turn).toBe("blue");
  });
});
