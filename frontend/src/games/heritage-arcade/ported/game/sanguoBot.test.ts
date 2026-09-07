import { describe, expect, it } from "vitest";
import { applySanguoAction, chooseSanguoBotAction, sanguoActions } from "./sanguoBot";
import { initialSanguoState, legalSanguoTargets, removeGeneralAndAppropriate, resolveSanguoAppropriation, sameNode, sanguoStateFrom, type SanguoPiece } from "./sanguoRules";

describe("Sanguo bots share human move legality", () => {
  for (const level of ["easy", "medium", "hard"] as const) it(`${level} returns a legal opening move without modifying the position`, () => {
    const state = initialSanguoState(true), before = JSON.stringify(state);
    const result = chooseSanguoBotAction(state, level);
    expect(result.action?.type).toBe("move");
    if (result.action?.type !== "move") throw new Error("Move expected");
    const action = result.action, piece = state.pieces.find(p => p.id === action.pieceId)!;
    expect(legalSanguoTargets(piece, state.pieces).some(target => sameNode(target, action.to))).toBe(true);
    expect(applySanguoAction(state, action)?.turn).toBe("green");
    expect(JSON.stringify(state)).toBe(before);
    if (level === "hard") expect(result.stats.completedDepth).toBeGreaterThan(1);
  });

  it("Medium takes a free Chariot before a Soldier", () => {
    const pieces: SanguoPiece[] = [
      ...["red", "green", "blue"].map(sector => ({ id: `${sector}-king`, role: "king", controller: sector, sector, node: { sector, rank: 4, file: 3 } })),
      { id: "rook", role: "icebreaker", controller: "red", sector: "red", node: { sector: "red", rank: 2, file: 0 } },
      { id: "prize", role: "icebreaker", controller: "green", sector: "green", node: { sector: "red", rank: 2, file: 2 } },
      { id: "pawn", role: "scout", controller: "blue", sector: "blue", node: { sector: "red", rank: 1, file: 0 } },
    ] as SanguoPiece[];
    const result = chooseSanguoBotAction(sanguoStateFrom(pieces), "medium");
    expect(result.action).toEqual({ type: "move", pieceId: "rook", to: { sector: "red", rank: 2, file: 2 } });
  });

  it("bots resolve appropriation and stop at game over", () => {
    const state = initialSanguoState();
    state.pending = { defeated: "green", victor: "red", reason: "stalemate" };
    expect(chooseSanguoBotAction(state, "hard").action).toEqual({ type: "resolve" });
    expect(applySanguoAction(state, { type: "resolve" })?.defeated).toContain("green");
    expect(sanguoActions({ ...state, winner: "red" })).toEqual([]);
    expect(sanguoActions({ ...state, draw: "repetition" })).toEqual([]);
  });

  it("a captured kingdom transfers armies it had previously appropriated", () => {
    const state = initialSanguoState();
    state.pieces.find(p => p.id === "blue-rider-1")!.controller = "green";
    const next = removeGeneralAndAppropriate(state.pieces, { defeated: "green", victor: "red", reason: "stalemate" });
    expect(next.find(p => p.id === "blue-rider-1")?.controller).toBe("red");
    expect(next.find(p => p.id === "blue-rider-1")?.sector).toBe("blue");
  });

  it("a bot can play a sequence across both opponents using only authoritative actions", () => {
    let state = initialSanguoState(true);
    const seen = new Set<string>();
    for (let i = 0; i < 18 && !state.winner && !state.draw; i++) {
      seen.add(state.turn);
      const { action } = chooseSanguoBotAction(state, i % 2 ? "medium" : "easy", { random: () => 0.37 });
      expect(action).not.toBeNull();
      const next = applySanguoAction(state, action!);
      expect(next).not.toBeNull(); state = next!;
      if (state.pending) state = resolveSanguoAppropriation(state)!;
    }
    expect([...seen].sort()).toEqual(["blue", "green", "red"]);
  });
});
