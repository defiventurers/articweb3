/** Icebound Strategy Atlas: smoke coverage for all compact playable routes. */
import { describe, expect, it } from "vitest";
import { COMPACT_MODES } from "./compactModes";
import { actOnCell, createCompactState, demoCompactState, getCells, legalTargets, neighbors } from "./compactRules";

const roster = ["polly", "retsba", "pengu"] as const;

describe("compact board mode catalogue", () => {
  it("provides one live compact rules contract for every non-Mills route", () => {
    const ids = Object.keys(COMPACT_MODES).map(Number).sort((a, b) => a - b);
    expect(ids).toHaveLength(23);
    expect(ids).not.toContain(12);
    expect(ids[0]).toBe(1);
    expect(ids.at(-1)).toBe(24);
  });

  it("creates a board, demo state, and legal first action for every route", () => {
    Object.values(COMPACT_MODES).forEach((mode) => {
      const cells = getCells(mode);
      expect(cells.length).toBeGreaterThan(0);
      let state = createCompactState(mode, [...roster]);
      if (mode.interaction === "march") {
        const token = state.tokens.find((item) => item.owner === state.turn && neighbors(mode, item.cell).some((cell) => !state.tokens.some((other) => other.cell === cell)))!;
        state = actOnCell(state, token.cell)!;
        const target = legalTargets(state)[0] ?? neighbors(mode, token.cell)[0];
        const moved = actOnCell(state, target);
        expect(moved?.actionCount, `mode ${mode.id} must complete an opening march`).toBe(1);
      } else {
        const moved = actOnCell(state, cells[0].id);
        expect(moved?.actionCount, `mode ${mode.id} must complete an opening claim`).toBe(1);
      }
      const demo = demoCompactState(mode, [...roster]);
      expect(demo.lastEvent).toContain("Demo position loaded");
    });
  });
});
