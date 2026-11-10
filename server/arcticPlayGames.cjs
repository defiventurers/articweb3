// Additive composition: preserve the published legacy engine and all existing room versions.
const legacy = require('./arcticPlayEngine.cjs');
const shanshui = require('./shanshuiEngine.cjs');
const longDice = require('./chaturangaLongDice.cjs');
const byId = name => (id, ...args) => shanshui.isShanshui(id) ? shanshui[name](id, ...args) : legacy[name](id, ...args);
module.exports = {
  ...legacy,
  GAME_LIST: [...legacy.GAME_LIST.filter(g => !shanshui.isShanshui(g.id)), shanshui.TABLE],
  game: id => shanshui.definition(id) || legacy.game(id),
  create: (id,options={}) => id==='dominion'&&options.rulesProfile===longDice.LONG_DICE_PROFILE?longDice.createLongDiceGame(options):byId('create')(id,options),
  actions: (id,state) => id==='dominion'&&longDice.isLongDiceState(state)?longDice.longDiceActions(state):byId('actions')(id,state),
  apply: (id,state,actionId,context={}) => id==='dominion'&&longDice.isLongDiceState(state)?longDice.applyLongDice(state,actionId,context.roll):byId('apply')(id,state,actionId,context),
  pieces: byId('pieces'), board: byId('board'),
  chooseBot: (id,state) => id==='dominion'&&longDice.isLongDiceState(state)?longDice.chooseLongDiceBot(state):byId('chooseBot')(id,state), forfeit: byId('forfeit'),
  turn: state => shanshui.ownsState(state) ? shanshui.turn(state) : legacy.turn(state),
  result: state => longDice.isLongDiceState(state)?longDice.longDiceResult(state):shanshui.ownsState(state) ? shanshui.result(state) : legacy.result(state),
  inCheck: (id, state) => shanshui.isShanshui(id) ? shanshui.inCheck(state) : legacy.inCheck(id, state),
  hand: (id, state) => shanshui.isShanshui(id) ? [] : legacy.hand(id, state),
  seatName: (id, seat) => shanshui.isShanshui(id) ? shanshui.seatName(id, seat) : legacy.seatName(id, seat),
};
