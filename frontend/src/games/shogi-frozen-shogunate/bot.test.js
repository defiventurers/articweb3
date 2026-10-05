import { describe, expect, it } from "vitest";
import { chooseShogiSearchAction } from "./bot.js";
import { actionKey, applyShogiAction, createShogiState, createEmptyShogiState, getLegalActions, indexOf } from "./rules.js";

describe("Shogi difficulty levels", () => {
  it.each(["easy", "medium", "hard"])("returns a legal action without changing the position on %s", difficulty => {
    const state = createShogiState();
    const before = JSON.stringify(state);
    const action = chooseShogiSearchAction(state, difficulty, { budgetMs: 200 });
    expect(getLegalActions(state).map(actionKey)).toContain(actionKey(action));
    expect(JSON.stringify(state)).toBe(before);
  });
  it("Easy varies its legal moves", () => {
    const state = createShogiState();
    expect(actionKey(chooseShogiSearchAction(state,"easy",{random:()=>0}))).not.toBe(actionKey(chooseShogiSearchAction(state,"easy",{random:()=>.999})));
  });
  it.each(["medium", "hard"])("finds a mating move on %s", difficulty => {
    const state = createEmptyShogiState();
    const put = (r,c,side,type) => {state.board[indexOf(r,c)]={id:`${side}-${type}-${r}-${c}`,side,type,promoted:false};};
    put(8,8,"red","king");put(0,4,"blue","king");put(2,4,"red","rook");put(1,3,"red","gold");put(1,5,"red","gold");
    const action = chooseShogiSearchAction(state,difficulty,{budgetMs:2500});
    expect(applyShogiAction(state,action).state.winner).toBe("red");
  });
  it.each(["medium", "hard"])("avoids losing a rook for a defended pawn on %s", difficulty => {
    const state = createEmptyShogiState();
    const put = (r,c,side,type) => {state.board[indexOf(r,c)]={id:`${side}-${type}-${r}-${c}`,side,type,promoted:false};};
    put(8,4,"red","king");put(0,8,"blue","king");put(4,0,"red","rook");put(4,2,"blue","pawn");put(3,2,"blue","gold");
    const action = chooseShogiSearchAction(state,difficulty,{budgetMs:2500});
    expect(actionKey(action)).not.toBe(`m:${indexOf(4,0)}:${indexOf(4,2)}:0`);
  });
});
