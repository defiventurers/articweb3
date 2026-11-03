// Additive composition: preserve the published legacy engine and all existing room versions.
const legacy = require('./arcticPlayEngine.cjs');
const shanshui = require('./shanshuiEngine.cjs');
const byId = name => (id, ...args) => shanshui.isShanshui(id) ? shanshui[name](id, ...args) : legacy[name](id, ...args);
module.exports = {
  ...legacy,
  GAME_LIST: [...legacy.GAME_LIST.filter(g => !shanshui.isShanshui(g.id)), shanshui.TABLE],
  game: id => shanshui.definition(id) || legacy.game(id),
  create: byId('create'), actions: byId('actions'), apply: byId('apply'), pieces: byId('pieces'), board: byId('board'),
  chooseBot: byId('chooseBot'), forfeit: byId('forfeit'),
  turn: state => shanshui.ownsState(state) ? shanshui.turn(state) : legacy.turn(state),
  result: state => shanshui.ownsState(state) ? shanshui.result(state) : legacy.result(state),
  inCheck: (id, state) => shanshui.isShanshui(id) ? shanshui.inCheck(state) : legacy.inCheck(id, state),
  hand: (id, state) => shanshui.isShanshui(id) ? [] : legacy.hand(id, state),
  seatName: (id, seat) => shanshui.isShanshui(id) ? shanshui.seatName(id, seat) : legacy.seatName(id, seat),
};
