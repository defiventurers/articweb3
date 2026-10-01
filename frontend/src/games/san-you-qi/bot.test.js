import { describe, expect, it } from "vitest";
import { applyAction, createInitialState, getLegalActions } from "./rules.js";
import { BOT_LEVELS, SAN_YOU_EVAL_WEIGHTS, __botTesting, chooseSanYouBotAction, evaluateSanYouState } from "./bot.js";

describe("San You Qi bot levels", () => {
  it("defines Easy, Medium and Hard as distinct decision levels", () => {
    expect(Object.keys(BOT_LEVELS)).toEqual(["easy", "medium", "hard"]);
    expect(BOT_LEVELS.easy.depth).toBeLessThan(BOT_LEVELS.medium.depth);
    expect(BOT_LEVELS.medium.depth).toBeLessThan(BOT_LEVELS.hard.depth);
  });

  it("Medium and Hard model independent kingdoms and become deeper by level", () => {
    expect(BOT_LEVELS.medium.search).toBe("maxn");
    expect(BOT_LEVELS.hard.search).toBe("hybrid");
    expect(BOT_LEVELS.medium.depth).toBeGreaterThanOrEqual(4);
    expect(BOT_LEVELS.hard.depth).toBeGreaterThan(BOT_LEVELS.medium.depth);
    expect(BOT_LEVELS.hard.budgetMs).toBeGreaterThan(BOT_LEVELS.medium.budgetMs);
    expect(BOT_LEVELS.hard.qDepth).toBeGreaterThan(BOT_LEVELS.medium.qDepth);
    expect(BOT_LEVELS.hard.rootBeam).toBeGreaterThan(BOT_LEVELS.medium.rootBeam);
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
    expect(a.stats.search).toBe("iterative-maxn");
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

  it("never degrades below a scored one-ply move when the deeper budget expires", () => {
    const state = createInitialState();

    for (const difficulty of ["medium", "hard"]) {
      const result = chooseSanYouBotAction(state, difficulty, {
        budgetMs: 1,
        maxDepth: 8,
      });
      expect(result.action).toBeTruthy();
      expect(result.stats.completedDepth).toBeGreaterThanOrEqual(1);
      expect(result.score).toBeGreaterThan(-100000000);
    }
  });

  it("remembers a Chariot's previous square and discourages an immediate quiet shuttle", () => {
    let state = createInitialState();

    const play = (pieceId, to) => {
      const action = getLegalActions(state).find(
        (candidate) => candidate.pieceId === pieceId && candidate.to === to,
      );
      expect(action).toBeTruthy();
      const result = applyAction(state, action);
      expect(result.error).toBeNull();
      state = result.state;
    };

    play("red-chariot-1", "red:L1-2");
    play("green-soldier-1", "green:L1-5");
    play("blue-soldier-1", "blue:L1-5");

    const chariot = state.pieces.find((piece) => piece.id === "red-chariot-1");
    expect(chariot.lastMoveFrom).toBe("red:L1-1");
    expect(chariot.lastMovedBy).toBe("red");

    const reversal = getLegalActions(state).find(
      (action) =>
        action.pieceId === "red-chariot-1" &&
        action.to === "red:L1-1",
    );
    expect(reversal).toBeTruthy();
    expect(__botTesting.isRecentReversal(state, reversal)).toBe(true);

    const context = { level: BOT_LEVELS.hard };
    expect(__botTesting.reversalPenalty(state, reversal, context, false))
      .toBe(BOT_LEVELS.hard.chariotReversalPenalty);
    expect(__botTesting.reversalPenalty(state, reversal, context, true)).toBe(0);

    const hard = chooseSanYouBotAction(state, "hard", {
      budgetMs: 5,
      maxDepth: 2,
      beam: 8,
      rootBeam: 12,
      qDepth: 0,
      qBeam: 0,
    });
    expect(hard.action).toBeTruthy();
    expect(hard.action).not.toEqual(reversal);
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
