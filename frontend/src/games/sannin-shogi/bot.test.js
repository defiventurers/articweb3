import { describe, expect, it } from "vitest";
import { chooseSanninBotAction } from "./bot.js";
import { createInitialState, getLegalActions } from "./rules.js";

describe("Sannin command bot", () => {
  it("returns an action from the rules engine for each supported difficulty", () => {
    const state = createInitialState();
    const legal = getLegalActions(state);
    for (const difficulty of ["easy", "medium"]) expect(legal).toContainEqual(chooseSanninBotAction(state, difficulty));
  });
});
