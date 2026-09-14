import { describe, expect, it } from "vitest";
import {
  applyShogiAction,
  assessImpasse,
  actionKey,
  chooseShogiBotAction,
  createEmptyShogiState,
  createShogiState,
  emptyHand,
  getLegalActions,
  indexOf,
  isInCheck,
  positionKey
} from "./rules.js";

const piece = (id, side, type, promoted = false) => ({ id, side, type, promoted });
const put = (state, row, col, value) => { state.board[indexOf(row, col)] = value; return state; };
const refresh = (state) => { state.positionHistory = []; return state; };

describe("standard Shogi rules", () => {
  it("creates the documented 9×9, 40-piece position with 30 legal opening moves", () => {
    const state = createShogiState();
    expect(state.board).toHaveLength(81);
    expect(state.board.filter(Boolean)).toHaveLength(40);
    expect(getLegalActions(state)).toHaveLength(30);
  });

  it("offers optional promotion on entry and forces a pawn on the last rank", () => {
    const state = refresh(createEmptyShogiState());
    put(state, 8, 4, piece("rk", "red", "king"));
    put(state, 0, 4, piece("bk", "blue", "king"));
    put(state, 3, 0, piece("rs", "red", "silver"));
    put(state, 1, 8, piece("rp", "red", "pawn"));
    const silver = getLegalActions(state).filter((a) => a.from === indexOf(3, 0) && a.to === indexOf(2, 0));
    const pawn = getLegalActions(state).filter((a) => a.from === indexOf(1, 8));
    expect(silver.map((a) => a.promote).sort()).toEqual([false, true]);
    expect(pawn).toHaveLength(1);
    expect(pawn[0].promote).toBe(true);
  });

  it("demotes a captured promoted piece into the captor's hand", () => {
    const state = refresh(createEmptyShogiState());
    put(state, 8, 4, piece("rk", "red", "king"));
    put(state, 0, 4, piece("bk", "blue", "king"));
    put(state, 4, 4, piece("rr", "red", "rook"));
    put(state, 4, 6, piece("bs", "blue", "silver", true));
    const result = applyShogiAction(state, { kind: "move", from: indexOf(4, 4), to: indexOf(4, 6), promote: false });
    expect(result.state.hands.red.silver).toBe(1);
  });

  it("enforces nifu and dead-rank drop restrictions", () => {
    const state = refresh(createEmptyShogiState({ hands: { red: { ...emptyHand(), pawn: 1, knight: 1 }, blue: emptyHand() } }));
    put(state, 8, 4, piece("rk", "red", "king"));
    put(state, 0, 4, piece("bk", "blue", "king"));
    put(state, 5, 2, piece("rp", "red", "pawn"));
    const drops = getLegalActions(state).filter((a) => a.kind === "drop");
    expect(drops.some((a) => a.type === "pawn" && a.to % 9 === 2)).toBe(false);
    expect(drops.some((a) => a.type === "pawn" && Math.floor(a.to / 9) === 0)).toBe(false);
    expect(drops.some((a) => a.type === "knight" && Math.floor(a.to / 9) <= 1)).toBe(false);
  });

  it("filters moves that expose the king", () => {
    const state = refresh(createEmptyShogiState());
    put(state, 8, 4, piece("rk", "red", "king"));
    put(state, 0, 8, piece("bk", "blue", "king"));
    put(state, 0, 4, piece("br", "blue", "rook"));
    put(state, 7, 4, piece("rg", "red", "gold"));
    expect(isInCheck(state, "red")).toBe(false);
    const goldMoves = getLegalActions(state).filter((a) => a.from === indexOf(7, 4));
    expect(goldMoves.every((a) => a.to % 9 === 4)).toBe(true);
  });

  it("rejects a pawn drop that gives immediate mate", () => {
    const state = refresh(createEmptyShogiState({ hands: { red: { ...emptyHand(), pawn: 1 }, blue: emptyHand() } }));
    put(state, 8, 4, piece("rk", "red", "king"));
    put(state, 0, 4, piece("bk", "blue", "king"));
    put(state, 2, 4, piece("rg", "red", "gold"));
    put(state, 0, 3, piece("bp1", "blue", "pawn"));
    put(state, 0, 5, piece("bp2", "blue", "pawn"));
    put(state, 1, 3, piece("bp3", "blue", "pawn"));
    put(state, 1, 5, piece("bp4", "blue", "pawn"));
    expect(getLegalActions(state).some((a) => a.kind === "drop" && a.type === "pawn" && a.to === indexOf(1, 4))).toBe(false);
  });

  it("recognizes a legal mating move and ends before king capture", () => {
    const state = refresh(createEmptyShogiState());
    put(state, 8, 8, piece("rk", "red", "king"));
    put(state, 0, 4, piece("bk", "blue", "king"));
    put(state, 2, 4, piece("rr", "red", "rook"));
    put(state, 1, 3, piece("rg1", "red", "gold"));
    put(state, 1, 5, piece("rg2", "red", "gold"));
    const result = applyShogiAction(state, { kind: "move", from: indexOf(2, 4), to: indexOf(1, 4), promote: false });
    expect(result.state.winner).toBe("red");
    expect(result.state.result).toBe("checkmate");
  });

  it("uses the documented 24-point impasse count when both kings enter", () => {
    const hands = { red: { ...emptyHand(), rook: 2, bishop: 2, gold: 4, silver: 3 }, blue: { ...emptyHand(), pawn: 17 } };
    const state = refresh(createEmptyShogiState({ hands }));
    put(state, 1, 4, piece("rk", "red", "king"));
    put(state, 7, 4, piece("bk", "blue", "king"));
    const result = assessImpasse(state);
    expect(result.eligible).toBe(true);
    expect(result.points.red).toBeGreaterThanOrEqual(24);
    expect(result.state.winner).toBe("red");
  });

  it("draws on the fourth occurrence of the complete position", () => {
    let state = createEmptyShogiState();
    put(state, 8, 4, piece("rk", "red", "king"));
    put(state, 0, 4, piece("bk", "blue", "king"));
    put(state, 6, 0, piece("rg", "red", "gold"));
    put(state, 2, 8, piece("bg", "blue", "gold"));
    state.positionHistory = [{ key: positionKey(state), mover: null, gaveCheck: false }];
    const cycle = [
      { kind: "move", from: indexOf(6, 0), to: indexOf(6, 1), promote: false },
      { kind: "move", from: indexOf(2, 8), to: indexOf(2, 7), promote: false },
      { kind: "move", from: indexOf(6, 1), to: indexOf(6, 0), promote: false },
      { kind: "move", from: indexOf(2, 7), to: indexOf(2, 8), promote: false }
    ];
    for (let repeat = 0; repeat < 3; repeat += 1) for (const action of cycle) state = applyShogiAction(state, action).state;
    expect(state.draw).toBe(true);
    expect(state.result).toBe("repetition");
  });

  it("always chooses a legal action for the practice bot", () => {
    const state = createShogiState({ turn: "blue" });
    const legal = new Set(getLegalActions(state).map(actionKey));
    expect(legal.has(actionKey(chooseShogiBotAction(state, "blue")))).toBe(true);
  });
});
