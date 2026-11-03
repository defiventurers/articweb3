/** Shanshui Xiangqi, Antarctic v1. Source rules and explicit digital decisions:
 * docs/game-builds/shanshui-xiangqi/RULES.md. Pure, shared browser/server authority. */
export const RULESET_VERSION = 'shanshui-antarctic-v1';
export const ARMIES = Object.freeze(['red', 'blue', 'purple', 'green']);
export const TEAMS = Object.freeze({ white: ['red', 'purple'], black: ['blue', 'green'] });
export const ROLE_LABELS = Object.freeze({ king: 'General', advisor: 'Advisor', elephant: 'Elephant', horse: 'Horse', chariot: 'Chariot', cannon: 'Cannon', 'mountain-soldier': 'Mountain infantry', 'river-soldier': 'River infantry' });
export const ROLES = Object.freeze(Object.keys(ROLE_LABELS));
export const ARMY_META = Object.freeze({
  blue: { color: '#348ff4', team: 'black', rowSign: 1, colSign: 1, corner: [0, 0] },
  red: { color: '#ed5269', team: 'white', rowSign: 1, colSign: -1, corner: [0, 12] },
  purple: { color: '#a465e8', team: 'white', rowSign: -1, colSign: 1, corner: [12, 0] },
  green: { color: '#31b788', team: 'black', rowSign: -1, colSign: -1, corner: [12, 12] },
});
export const teamOf = army => ARMY_META[army]?.team;
export const allyOf = army => TEAMS[teamOf(army)]?.find(a => a !== army);
export const pointKey = ({ row, col }) => `${row},${col}`;
export const samePoint = (a, b) => a.row === b.row && a.col === b.col;
export const inBoard = p => !!p && Number.isInteger(p.row) && Number.isInteger(p.col) && p.row >= 0 && p.row <= 12 && p.col >= 0 && p.col <= 12;
export const pieceAt = (state, p) => state.pieces.find(unit => samePoint(unit, p));
export const isMountain = p => p.col === 6;
export const isRiver = p => p.row === 6;
export function inPalace(army, p) {
  const meta = ARMY_META[army];
  return !!meta && inBoard(p) && Math.abs(p.row - meta.corner[0]) <= 2 && Math.abs(p.col - meta.corner[1]) <= 2;
}
export function inElephantTerritory(army, p) {
  const m = ARMY_META[army];
  return !!m && inBoard(p) && (p.row - 6) * m.rowSign <= 0 && (p.col - 6) * m.colSign <= 0;
}
export function inAdvisorNetwork(army, p) {
  const m = ARMY_META[army];
  return inPalace(army, p) && (Math.abs(p.row - m.corner[0]) + Math.abs(p.col - m.corner[1])) % 2 === 1;
}
export function inElephantNetwork(army, p) {
  const m = ARMY_META[army];
  if (!inElephantTerritory(army, p)) return false;
  const row = Math.abs(p.row - m.corner[0]), col = Math.abs(p.col - m.corner[1]);
  return row % 2 === 0 && col % 2 === 0 && (row + col) % 4 === 2;
}
export function crossedTerrain(piece) {
  const meta = ARMY_META[piece.army];
  return piece.role === 'mountain-soldier' ? (piece.col - 6) * meta.colSign > 0 : (piece.row - 6) * meta.rowSign > 0;
}
export const survivingArmies = state => ARMIES.filter(a => !state.eliminated[a]);
export const requiresKingSafety = (state, army) => !state.eliminated[army] && !!state.eliminated[allyOf(army)];
export const controllingSeat = state => state.controlMode === 'four' ? state.turn : teamOf(state.turn) === 'white' ? 'red' : 'blue';

const BLUE_START = [
  ['king', 0, 0], ['advisor', 0, 1], ['advisor', 1, 0], ['elephant', 0, 2], ['elephant', 2, 0],
  ['cannon', 0, 3], ['cannon', 3, 0], ['chariot', 0, 4], ['chariot', 4, 0], ['horse', 1, 3], ['horse', 3, 1],
  ['mountain-soldier', 0, 5], ['mountain-soldier', 2, 5], ['mountain-soldier', 4, 5],
  ['river-soldier', 5, 0], ['river-soldier', 5, 2], ['river-soldier', 5, 4],
];
export function createInitialState({ controlMode = 'two' } = {}) {
  if (!['two', 'four'].includes(controlMode)) throw new Error('Choose two players or four-player teams.');
  const state = { rulesetVersion: RULESET_VERSION, controlMode, pieces: ARMIES.flatMap(army => BLUE_START.map(([role, row, col], index) => ({
    id: `${army}-${role}-${index}`, army, role,
    row: ARMY_META[army].rowSign === 1 ? row : 12 - row,
    col: ARMY_META[army].colSign === 1 ? col : 12 - col,
  }))), turn: 'red', eliminated: {}, ply: 0, halfmove: 0, passes: 0, lastMove: null, outcome: null, repetitions: {}, note: 'Red opens. Red + Purple face Blue + Green.' };
  state.repetitions[positionKey(state)] = 1;
  return state;
}

const ORTHOGONAL = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAGONAL = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
function normalAction(piece, to, kind = 'move') { return { kind, pieceId: piece.id, to: { row: to.row, col: to.col } }; }
export function actionKey(action) { return action.kind === 'pass' ? 'pass' : `${action.kind}|${action.pieceId}|${pointKey(action.to)}`; }

/** Movement geometry only: no turn or king-safety filter. Suitable for practice. */
export function pseudoActions(state, piece) {
  if (!piece || !ARMY_META[piece.army] || state.eliminated[piece.army]) return [];
  const list = [], occupancy = new Map(state.pieces.map(p => [pointKey(p), p]));
  const at = p => occupancy.get(pointKey(p));
  const enemy = p => p && teamOf(p.army) !== teamOf(piece.army);
  const add = (row, col) => { const to = { row, col }; if (inBoard(to) && (!at(to) || enemy(at(to)))) list.push(normalAction(piece, to)); };
  if (piece.role === 'chariot' || piece.role === 'cannon') {
    for (const [dr, dc] of ORTHOGONAL) {
      let screen = false;
      for (let step = 1; step <= 12; step++) {
        const to = { row: piece.row + dr * step, col: piece.col + dc * step };
        if (!inBoard(to)) break;
        const target = at(to);
        if (piece.role === 'chariot') { if (!target || enemy(target)) list.push(normalAction(piece, to)); if (target) break; }
        else if (!screen) { if (!target) list.push(normalAction(piece, to)); else screen = true; }
        else if (target) { if (enemy(target)) list.push(normalAction(piece, to)); break; }
      }
    }
  } else if (piece.role === 'king') {
    for (const [dr, dc] of ORTHOGONAL) { const to = { row: piece.row + dr, col: piece.col + dc }; if (inPalace(piece.army, to)) add(to.row, to.col); }
    // Digital decision: clear orthogonal lines in either orientation; one atomic action.
    for (const [dr, dc] of ORTHOGONAL) for (let step = 1; step <= 12; step++) {
      const to = { row: piece.row + dr * step, col: piece.col + dc * step };
      if (!inBoard(to)) break;
      const target = at(to);
      if (target) { if (enemy(target) && target.role === 'king') list.push(normalAction(piece, to, 'royal-capture')); break; }
    }
  } else if (piece.role === 'advisor') {
    for (const [dr, dc] of DIAGONAL) { const to = { row: piece.row + dr, col: piece.col + dc }; if (inAdvisorNetwork(piece.army, to)) add(to.row, to.col); }
  } else if (piece.role === 'elephant') {
    for (const [dr, dc] of DIAGONAL) { const to = { row: piece.row + dr * 2, col: piece.col + dc * 2 }; if (inElephantNetwork(piece.army, to) && !at({ row: piece.row + dr, col: piece.col + dc })) add(to.row, to.col); }
  } else if (piece.role === 'horse') {
    for (const [dr, dc] of ORTHOGONAL) {
      if (at({ row: piece.row + dr, col: piece.col + dc })) continue;
      for (const sign of [-1, 1]) add(piece.row + dr * 2 + dc * sign, piece.col + dc * 2 + dr * sign);
    }
  } else if (piece.role === 'mountain-soldier' || piece.role === 'river-soldier') {
    const meta = ARMY_META[piece.army], mountain = piece.role === 'mountain-soldier';
    const offsets = mountain ? [[0, meta.colSign]] : [[meta.rowSign, 0]];
    if (crossedTerrain(piece)) offsets.push(...(mountain ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]]));
    for (const [dr, dc] of offsets) {
      const to = { row: piece.row + dr, col: piece.col + dc };
      if (!(mountain ? isRiver(to) : isMountain(to))) add(to.row, to.col);
    }
  }
  return list;
}

function transitionPieces(state, action) {
  const mover = state.pieces.find(p => p.id === action.pieceId), victim = pieceAt(state, action.to);
  const defeated = victim?.role === 'king' ? victim.army : null;
  return { defeated, victim, pieces: state.pieces.filter(p => p.id !== victim?.id && p.army !== defeated).map(p => p.id === mover.id && action.kind !== 'royal-capture' ? { ...p, ...action.to } : { ...p }) };
}
export function isInCheck(state, army = state.turn) {
  const king = state.pieces.find(p => p.army === army && p.role === 'king');
  if (!king) return true;
  return state.pieces.some(p => teamOf(p.army) !== teamOf(army) && !state.eliminated[p.army] && pseudoActions(state, p).some(a => samePoint(a.to, king)));
}
export function legalActionsForArmy(state, army) {
  if (state.outcome || state.eliminated[army]) return [];
  return state.pieces.filter(p => p.army === army).flatMap(p => pseudoActions(state, p)).filter(action => {
    if (!requiresKingSafety(state, army)) return true;
    const { pieces, defeated } = transitionPieces(state, action);
    const next = { ...state, pieces, eliminated: defeated ? { ...state.eliminated, [defeated]: 'captured' } : state.eliminated };
    return !isInCheck(next, army);
  });
}
export function getLegalActions(state) {
  if (state.outcome) return [];
  const moves = legalActionsForArmy(state, state.turn);
  // The unadjudicated four-army stalemate case uses an explicit forced pass.
  return moves.length ? moves : requiresKingSafety(state, state.turn) ? [] : [{ kind: 'pass' }];
}
function nextArmy(state, from) { const start = ARMIES.indexOf(from); for (let i = 1; i <= 4; i++) { const army = ARMIES[(start + i) % 4]; if (!state.eliminated[army]) return army; } return null; }
function teamOutcome(state) {
  for (const team of ['white', 'black']) if (TEAMS[team].every(a => state.eliminated[a])) return { type: 'win', winner: team === 'white' ? 'black' : 'white', winners: [...TEAMS[team === 'white' ? 'black' : 'white']], reason: 'Both opposing armies defeated' };
  return null;
}
export function resolveTurn(state) {
  let next = state;
  for (let i = 0; i < 4; i++) {
    const outcome = teamOutcome(next); if (outcome) return { ...next, outcome };
    if (!requiresKingSafety(next, next.turn) || legalActionsForArmy(next, next.turn).length) return next;
    const reason = isInCheck(next, next.turn) ? 'checkmate' : 'stalemate', defeated = next.turn;
    next = { ...next, eliminated: { ...next.eliminated, [defeated]: reason }, pieces: next.pieces.filter(p => p.army !== defeated), note: `${defeated} is defeated by ${reason}.` };
    next = { ...next, turn: nextArmy(next, defeated) };
  }
  return { ...next, outcome: teamOutcome(next) };
}
export function positionKey(state) {
  return `${state.turn}|${ARMIES.filter(a => state.eliminated[a]).join(',')}|${state.pieces.map(p => `${p.army}:${p.role}:${p.row}:${p.col}`).sort().join(';')}`;
}
export function applyAction(state, requested) {
  if (state.rulesetVersion !== RULESET_VERSION) return { error: 'This position uses a different Shanshui ruleset.' };
  if (state.outcome) return { error: 'This match has ended.' };
  if (!requested || typeof requested !== 'object' || (requested.kind !== 'pass' && (!inBoard(requested.to) || typeof requested.pieceId !== 'string'))) return { error: 'Invalid move.' };
  const action = getLegalActions(state).find(a => actionKey(a) === actionKey(requested));
  if (!action) return { error: 'That action is not legal for the active army.' };
  let next = { ...state, pieces: state.pieces.map(p => ({ ...p })), eliminated: { ...state.eliminated }, repetitions: { ...state.repetitions }, ply: state.ply + 1 };
  if (action.kind === 'pass') {
    next.passes = state.passes + 1; next.halfmove++;
    next.lastMove = { kind: 'pass', army: state.turn }; next.note = `${state.turn} has no move and passes.`;
  } else {
    const mover = state.pieces.find(p => p.id === action.pieceId), { pieces, defeated, victim } = transitionPieces(state, action);
    next.pieces = pieces; next.passes = 0; next.halfmove = victim ? 0 : state.halfmove + 1;
    if (defeated) next.eliminated[defeated] = 'captured';
    next.lastMove = { ...action, army: mover.army, from: { row: mover.row, col: mover.col }, captured: victim?.id || null, defeated };
    next.note = action.kind === 'royal-capture' ? `${mover.army} captures ${victim.army}'s General and returns.` : `${mover.army} ${ROLE_LABELS[mover.role]} ${victim ? 'captures' : 'moves'} to ${pointKey(action.to)}.${defeated ? ` ${defeated}'s army leaves the board.` : ''}`;
  }
  next.turn = nextArmy(next, state.turn);
  next = resolveTurn(next);
  if (!next.outcome && next.passes >= survivingArmies(next).length) next.outcome = { type: 'draw', reason: 'Every surviving army passed without a move' };
  if (!next.outcome) { const key = positionKey(next); next.repetitions[key] = (next.repetitions[key] || 0) + 1; if (next.repetitions[key] >= 3) next.outcome = { type: 'draw', reason: 'Threefold repetition (Antarctic rule)' }; }
  if (!next.outcome && next.halfmove >= 400) next.outcome = { type: 'draw', reason: '400 actions without capture (Antarctic rule)' };
  return { state: next };
}
export function resign(state, armyOrTeam) {
  if (state.outcome) return state;
  const armies = TEAMS[armyOrTeam] || (ARMIES.includes(armyOrTeam) ? [armyOrTeam] : []);
  if (!armies.length) throw new Error('Choose a valid army or team.');
  const next = { ...state, pieces: state.pieces.filter(p => !armies.includes(p.army)), eliminated: { ...state.eliminated }, note: `${armyOrTeam} resigned.` };
  for (const army of armies) next.eliminated[army] = 'resigned';
  next.outcome = teamOutcome(next);
  if (!next.outcome && next.eliminated[next.turn]) next.turn = nextArmy(next, next.turn);
  return next.outcome ? next : resolveTurn(next);
}

const VALUES = { king: 1200, chariot: 90, cannon: 45, horse: 40, elephant: 20, advisor: 18, 'mountain-soldier': 10, 'river-soldier': 10 };
function evaluate(state, rootTeam) {
  if (state.outcome) return state.outcome.type === 'draw' ? 0 : state.outcome.winner === rootTeam ? 100000 : -100000;
  let score = 0;
  for (const p of state.pieces) { const value = VALUES[p.role] + (p.role.endsWith('soldier') && crossedTerrain(p) ? 8 : 0); score += teamOf(p.army) === rootTeam ? value : -value; }
  for (const army of survivingArmies(state)) if (isInCheck(state, army)) score += teamOf(army) === rootTeam ? -180 : 180;
  return score;
}
export function chooseAction(state, { difficulty = 'medium', budgetMs = 160, maxNodes = 1200, random = Math.random } = {}) {
  const legal = getLegalActions(state); if (!legal.length) return null;
  if (difficulty === 'easy') return legal[Math.min(legal.length - 1, Math.floor(random() * legal.length))];
  const rootTeam = teamOf(state.turn), deadline = Date.now() + budgetMs; let nodes = 0;
  const order = (position, actions) => [...actions].sort((a, b) => (b.kind === 'pass' ? -1 : VALUES[pieceAt(position, b.to)?.role] || 0) - (a.kind === 'pass' ? -1 : VALUES[pieceAt(position, a.to)?.role] || 0));
  const halt = {};
  function search(position, depth, alpha, beta) {
    if (++nodes > maxNodes || Date.now() >= deadline) throw halt;
    if (!depth || position.outcome) return evaluate(position, rootTeam);
    const maximizing = teamOf(position.turn) === rootTeam;
    let best = maximizing ? -Infinity : Infinity;
    const choices = getLegalActions(position); if (!choices.length) return evaluate(resolveTurn(position), rootTeam);
    for (const a of order(position, choices)) {
      const next = applyAction(position, a).state, value = search(next, depth - 1, alpha, beta);
      best = maximizing ? Math.max(best, value) : Math.min(best, value);
      if (maximizing) alpha = Math.max(alpha, best); else beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = order(state, legal)[0];
  for (let depth = 1; depth <= (difficulty === 'hard' ? 3 : 2); depth++) {
    let candidate = best, score = -Infinity;
    try { for (const a of order(state, legal)) { const value = search(applyAction(state, a).state, depth - 1, score, Infinity); if (value > score) { candidate = a; score = value; } } best = candidate; }
    catch (error) { if (error !== halt) throw error; break; }
  }
  return best;
}

/** Validate editor/import data before it can become a playable local match. */
export function validateSetup(pieces) {
  const errors = [], ids = new Set(), occupied = new Set();
  if (!Array.isArray(pieces) || pieces.length > 68) return ['A setup must contain at most 68 pieces.'];
  for (const p of pieces) {
    if (!p || typeof p.id !== 'string' || ids.has(p.id)) { errors.push('Every piece needs a unique identity.'); continue; } ids.add(p.id);
    if (!ARMY_META[p.army] || !ROLES.includes(p.role) || !inBoard(p)) { errors.push('A piece has an invalid army, role or point.'); continue; }
    const key = pointKey(p); if (occupied.has(key)) errors.push('Two pieces cannot occupy the same point.'); occupied.add(key);
    if (['king', 'advisor'].includes(p.role) && !inPalace(p.army, p)) errors.push(`${p.army} ${p.role} must be in its palace.`);
    if (p.role === 'advisor' && !inAdvisorNetwork(p.army, p)) errors.push(`${p.army} Advisor must use its four-point diamond.`);
    if (p.role === 'elephant' && !inElephantNetwork(p.army, p)) errors.push(`${p.army} Elephant must use its reachable home network.`);
    if ((p.role === 'mountain-soldier' && isRiver(p)) || (p.role === 'river-soldier' && isMountain(p))) errors.push('Infantry cannot stand on its forbidden terrain.');
  }
  for (const army of ARMIES) if (pieces.filter(p => p?.army === army && p.role === 'king').length !== 1) errors.push(`${army} needs exactly one General.`);
  return [...new Set(errors)];
}
