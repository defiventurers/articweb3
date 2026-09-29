import { describe, expect, it } from "vitest";
import { createInitialState, getLegalActions } from "./rules.js";
import { BOT_LEVELS, chooseSanYouBotAction } from "./bot.js";

describe("San You Qi bot levels", () => {
  it("defines Easy, Medium and Hard as distinct decision levels", () => {
    expect(Object.keys(BOT_LEVELS)).toEqual(["easy", "medium", "hard"]);
    expect(BOT_LEVELS.easy.depth).toBeLessThan(BOT_LEVELS.medium.depth);
    expect(BOT_LEVELS.medium.depth).toBeLessThan(BOT_LEVELS.hard.depth);
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
