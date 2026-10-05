import { describe, expect, it } from 'vitest';
import { chooseXiangqiAction, getLegalActions, applyAction, createInitialState } from './engine';
import { xiangqiStateFrom, type XiangqiPiece } from '../heritage-arcade/ported/game/xiangqiRules';
describe('Xiangqi command bots', () => {
  it.each(['easy','medium','hard'])('%s returns a legal move for either army', difficulty => {
    let state = createInitialState();
    for (let turn = 0; turn < 2; turn++) {
      const action = chooseXiangqiAction(state,difficulty,{budgetMs:150,maxNodes:500});
      expect(getLegalActions(state)).toContainEqual(action);
      const result = applyAction(state,action!);
      expect(result.error).toBeUndefined(); state = result.state!;
    }
  });
  it('hard saves a threatened chariot rather than losing it for a soldier', () => {
    const pieces: XiangqiPiece[] = [
      {id:'rK',side:'red',role:'general',row:9,col:4},
      {id:'bK',side:'black',role:'general',row:0,col:4},
      {id:'screen',side:'red',role:'soldier',row:5,col:4},
      {id:'rR',side:'red',role:'chariot',row:6,col:0},
      {id:'bR',side:'black',role:'chariot',row:3,col:0},
      {id:'bait',side:'black',role:'soldier',row:6,col:1},
    ];
    const state=xiangqiStateFrom(pieces);
    const action=chooseXiangqiAction(state,'hard',{budgetMs:2000,maxNodes:20000,depth:3});
    expect(action?.pieceId).toBe('rR');
    expect(action?.to).not.toEqual({row:6,col:1});
  });
  it('rejects wrong-side commands and has no actions after victory', () => {
    const state=createInitialState();
    expect(applyAction(state,{pieceId:'black-soldier-0',to:{row:4,col:0}}).error).toBeTruthy();
    expect(chooseXiangqiAction({...state,winner:'red'},'hard')).toBeNull();
  });
});
