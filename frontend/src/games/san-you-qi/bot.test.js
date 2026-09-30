import { describe, expect, it } from "vitest";
import { createInitialState, getLegalActions } from "./rules.js";
import { BOT_LEVELS, SAN_YOU_EVAL_WEIGHTS, chooseSanYouBotAction, evaluateSanYouState } from "./bot.js";

describe("San You Qi bot levels", () => {
  it("defines Easy, Medium and Hard as distinct decision levels", () => {
    expect(Object.keys(BOT_LEVELS)).toEqual(["easy", "medium", "hard"]);
    expect(BOT_LEVELS.easy.depth).toBeLessThan(BOT_LEVELS.medium.depth);
    expect(BOT_LEVELS.medium.depth).toBeLessThan(BOT_LEVELS.hard.depth);
  });

  it("Medium and Hard are deterministic search modes with materially larger budgets", () => {
    expect(BOT_LEVELS.medium.search).toBe("paranoid");
    expect(BOT_LEVELS.hard.search).toBe("paranoid");
    expect(BOT_LEVELS.medium.depth).toBeGreaterThanOrEqual(4);
    expect(BOT_LEVELS.hard.depth).toBeGreaterThan(BOT_LEVELS.medium.depth);
    expect(BOT_LEVELS.hard.budgetMs).toBeGreaterThan(BOT_LEVELS.medium.budgetMs);
    expect(BOT_LEVELS.hard.qDepth).toBeGreaterThan(BOT_LEVELS.medium.qDepth);
  });

  it("Medium no longer injects random top-three mistakes", () => {
    const state = createInitialState();
    const a = chooseSanYouBotAction(state, "medium", {
      budgetMs: 80,
      maxDepth: 2,
      beam: 10,
      qDepth: 1,
      random: () => 0,
    });
    const b = chooseSanYouBotAction(state, "medium", {
      budgetMs: 80,
      maxDepth: 2,
      beam: 10,
      qDepth: 1,
      random: () => 0.99,
    });

    expect(a.action).toEqual(b.action);
    expect(a.stats.search).toBe("iterative-paranoid-alpha-beta");
  });

  it("evaluation rewards the current promotion rules for Soldier and Flag", () => {
    const base = createInitialState();
    const soldier = base.pieces.find((piece) => piece.id === "red-soldier-1");
    const flag = base.pieces.find((piece) => piece.id === "red-flag-1");

    const before = evaluateSanYouState(base, "red", SAN_YOU_EVAL_WEIGHTS);

    soldier.promoted = true;
    soldier.leftHome = true;
    flag.leftHome = true;

    const after = evaluateSanYouState(base, "red", SAN_YOU_EVAL_WEIGHTS);
    expect(after).toBeGreaterThan(before);
  });

  it("returns legal actions for every supported difficulty", () => {
    const state = createInitialState();
    const legal = getLegalActions(state);

    for (const difficulty of ["easy", "medium", "hard"]) {
      const result = chooseSanYouBotAction(state, difficulty, {
        random: () => 0,
        budgetMs: difficulty === "hard" ? 25 : undefined,
      });
      expect(result.action).toBeTruthy();
      expect(legal).toContainEqual(result.action);
    }
  });
});
