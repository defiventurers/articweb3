import { describe, expect, it } from "vitest";
import { BOT_LEVELS, SANGUO_EVAL_WEIGHTS, applySanguoAction, chooseSanguoBotAction, evaluateSanguo, sanguoActions } from "./sanguoBot";
import { initialSanguoState, legalSanguoTargets, removeGeneralAndAppropriate, resolveSanguoAppropriation, sameNode, sanguoStateFrom, type SanguoPiece } from "./sanguoRules";

describe("Sanguo bots share human move legality", () => {
  for (const level of ["easy", "medium", "hard"] as const) it(`${level} returns a legal opening move without modifying the position`, () => {
    const state = initialSanguoState(true), before = JSON.stringify(state);
    const result = chooseSanguoBotAction(
      state,
      level,
      level === "easy"
        ? { random: () => 0.25 }
        : { budgetMs: 160, maxDepth: 2, width: 8, qDepth: 1, qWidth: 6 },
    );
    expect(result.action?.type).toBe("move");
    if (result.action?.type !== "move") throw new Error("Move expected");
    const action = result.action, piece = state.pieces.find(p => p.id === action.pieceId)!;
    expect(legalSanguoTargets(piece, state.pieces).some(target => sameNode(target, action.to))).toBe(true);
    expect(applySanguoAction(state, action)?.turn).toBe("green");
    expect(JSON.stringify(state)).toBe(before);
    if (level !== "easy") {
      expect(result.stats.search).toBe("iterative-paranoid-alpha-beta");
    }
  });


  it("Medium and Hard use deterministic deeper search without deliberate random mistakes", () => {
    expect(BOT_LEVELS.medium.search).toBe("paranoid");
    expect(BOT_LEVELS.hard.search).toBe("paranoid");
    expect(BOT_LEVELS.medium.depth).toBeGreaterThanOrEqual(4);
    expect(BOT_LEVELS.hard.depth).toBeGreaterThan(BOT_LEVELS.medium.depth);
    expect(BOT_LEVELS.hard.qDepth).toBeGreaterThan(BOT_LEVELS.medium.qDepth);
    expect(BOT_LEVELS.hard.budget).toBeGreaterThan(BOT_LEVELS.medium.budget);

    const state = initialSanguoState();
    const common = { budgetMs: 180, maxDepth: 2, width: 8, qDepth: 1, qWidth: 6 };
    const first = chooseSanguoBotAction(state, "medium", { ...common, random: () => 0 });
    const second = chooseSanguoBotAction(state, "medium", { ...common, random: () => 0.99 });

    expect(first.action).toEqual(second.action);
    expect(first.stats.search).toBe("iterative-paranoid-alpha-beta");
  });

  it("evaluation understands crossed Soldiers and controlled appropriated material", () => {
    const base = initialSanguoState();
    const before = evaluateSanguo(base, SANGUO_EVAL_WEIGHTS).red;

    const soldier = base.pieces.find(p => p.id === "red-scout-0")!;
    soldier.node = { sector: "blue", rank: 1, file: 8 };

    const appropriated = base.pieces.find(p => p.id === "green-rider-1")!;
    appropriated.controller = "red";

    const after = evaluateSanguo(base, SANGUO_EVAL_WEIGHTS).red;
    expect(after).toBeGreaterThan(before);
  });

  it("Medium takes a free Chariot before a Soldier", () => {
    const pieces: SanguoPiece[] = [
      ...["red", "green", "blue"].map(sector => ({ id: `${sector}-king`, role: "king", controller: sector, sector, node: { sector, rank: 4, file: 3 } })),
      { id: "rook", role: "icebreaker", controller: "red", sector: "red", node: { sector: "red", rank: 2, file: 0 } },
      { id: "prize", role: "icebreaker", controller: "green", sector: "green", node: { sector: "red", rank: 2, file: 2 } },
      { id: "pawn", role: "scout", controller: "blue", sector: "blue", node: { sector: "red", rank: 1, file: 0 } },
    ] as SanguoPiece[];
    const result = chooseSanguoBotAction(sanguoStateFrom(pieces), "medium", {
      budgetMs: 350,
      maxDepth: 3,
      width: 12,
      qDepth: 1,
      qWidth: 8,
    });
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
      const { action } = chooseSanguoBotAction(
        state,
        i % 2 ? "medium" : "easy",
        i % 2
          ? { random: () => 0.37, budgetMs: 25, maxDepth: 1, width: 6, qDepth: 0, qWidth: 4 }
          : { random: () => 0.37 },
      );
      expect(action).not.toBeNull();
      const next = applySanguoAction(state, action!);
      expect(next).not.toBeNull(); state = next!;
      if (state.pending) state = resolveSanguoAppropriation(state)!;
    }
    expect([...seen].sort()).toEqual(["blue", "green", "red"]);
  });
});
