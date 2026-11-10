// Independent proof replay composes the same game authorities as the server.
import * as base from './games.ts';
import * as mountain from '../../../frontend/src/games/shanshui-xiangqi/mobileAdapter.js';
import * as commander from './coTuLenhFairAdapter.js';
const adapter=id=>commander.isCommander(id)?commander:mountain.isShanshui(id)?mountain:base;
export const VERSION=base.VERSION;
export const GAME_LIST=[...base.GAME_LIST,mountain.TABLE,mountain.FOUR_PLAYER_TABLE,commander.TABLE];
export const game=id=>commander.isCommander(id)?commander.TABLE:mountain.definition(id)||base.game(id);
export const create=(id,options)=>adapter(id).create(id,options);
export const actions=(id,state)=>adapter(id).actions(id,state);
export const validateAction=(id,state,key)=>commander.isCommander(id)?commander.validateAction(id,state,key):actions(id,state).find(a=>a.id===key);
export const apply=(id,state,action,context)=>adapter(id).apply(id,state,action,context);
export const turn=state=>commander.ownsState(state)?commander.turn(state):mountain.ownsState(state)?mountain.turn(state):base.turn(state);
export const result=state=>commander.ownsState(state)?commander.result(state):mountain.ownsState(state)?mountain.result(state):base.result(state);
export const forfeit=(id,state,seat)=>adapter(id).forfeit(id,state,seat);
export const board=id=>adapter(id).board(id);
export const pieces=(id,state)=>adapter(id).pieces(id,state);
