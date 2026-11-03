// Adapter to the existing APK room protocol. No alternate movement implementation.
import * as rules from './rules.js';
import { POINTS, pixelPoint, spriteFor, CHAPTERS, capital, PIECE_SIZE } from './presentation.js';
export const CAPABILITY = 'shanshui-antarctic-v1';
export const TABLE = Object.freeze({ id: 'shanshui', name: 'Shanshui Xiangqi', subtitle: 'Four armies. One shared victory.', seats: ['red', 'blue'], players: 2, maxPlayers: 4, tag: 'Mountain & River Chess', accent: '#7550a8', icon: 'shanshui/pieces/purple-king.webp' });
export const FOUR_PLAYER_TABLE = Object.freeze({ ...TABLE, id: 'shanshui-2v2', name: 'Shanshui Xiangqi · 2v2', seats: [...rules.ARMIES], players: 4, subtitle: 'Four-player team adaptation · one army each' });
export const isShanshui = id => id === TABLE.id || id === FOUR_PLAYER_TABLE.id;
export const definition = id => id === FOUR_PLAYER_TABLE.id ? FOUR_PLAYER_TABLE : id === TABLE.id ? TABLE : null;
export const ownsState = state => state?.rulesetVersion === rules.RULESET_VERSION;
export const create = id => rules.createInitialState({ controlMode: id === FOUR_PLAYER_TABLE.id ? 'four' : 'two' });
export const turn = rules.controllingSeat;
export function seatName(id, seat) {
  if (id === TABLE.id) return seat === 'red' ? 'Red + Purple' : seat === 'blue' ? 'Blue + Green' : String(seat);
  return String(seat).split(/\s*\+\s*/).map(capital).join(' + ');
}
export function result(state) {
  if (!state.outcome) return null;
  const winner = state.outcome.type === 'draw' ? null : state.controlMode === 'four' ? rules.TEAMS[state.outcome.winner].join(' + ') : state.outcome.winner === 'white' ? 'red' : 'blue';
  return { winner, winners: winner ? winner.split(/\s*\+\s*/) : [], draw: state.outcome.type === 'draw', reason: state.outcome.reason };
}
export function actions(id, state) { return rules.getLegalActions(state).map(a => ({ id: rules.actionKey(a), source: a.kind === 'pass' ? 'pass' : `piece:${a.pieceId}`, target: a.to ? rules.pointKey(a.to) : null, kind: a.kind, promote: false, raw: a })); }
export function apply(id, state, actionId) {
  const action = actions(id, state).find(a => a.id === actionId);
  if (!action) throw new Error('That move is no longer legal. The board has been refreshed.');
  const result = rules.applyAction(state, action.raw); if (result.error) throw new Error(result.error); return result.state;
}
export const inCheck = state => !state.outcome && rules.requiresKingSafety(state, state.turn) && rules.isInCheck(state);
export const board = () => ({ viewBox: '0 0 1536 1536', image: 'art/shanshui/board-dark.webp', imageWidth: 1536, imageHeight: 1536, size: PIECE_SIZE, cells: POINTS.map(p => ({ id: rules.pointKey(p), ...pixelPoint(p), label: `Row ${p.row + 1}, column ${p.col + 1}` })) });
export function pieces(id, state) { return state.pieces.map(p => ({ id: p.id, source: `piece:${p.id}`, cell: rules.pointKey(p), owner: p.army, origin: p.army, label: rules.ROLE_LABELS[p.role], sprite: spriteFor(p, { root: 'art/shanshui', yanYiRoot: 'art/yanyi/pieces' }), badge: p.role.endsWith('soldier') ? p.role.startsWith('mountain') ? 'M' : 'R' : null })); }
export function chooseBot(id, state) { const action = rules.chooseAction(state); return action ? rules.actionKey(action) : null; }
export function forfeit(id, state, seat) { return rules.resign(state, id === FOUR_PLAYER_TABLE.id ? seat : seat === 'red' ? 'white' : 'black'); }
export const RULES = CHAPTERS;
