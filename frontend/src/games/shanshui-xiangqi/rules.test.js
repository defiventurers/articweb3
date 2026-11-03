import test from 'node:test';
import assert from 'node:assert/strict';
import * as r from './rules.js';
const unit = (army, role, row, col, id = `${army}-${role}-test`) => ({ id, army, role, row, col });
function fixture(extra = [], turn = 'red') {
  const s = r.createInitialState();
  return { ...s, turn, repetitions: {}, pieces: [unit('red', 'king', 1, 12), unit('blue', 'king', 0, 0), unit('purple', 'king', 12, 1), unit('green', 'king', 11, 11), ...extra] };
}
const to = (state, id) => r.getLegalActions(state).filter(a => a.pieceId === id).map(a => r.pointKey(a.to));
const move = (state, id, row, col, kind = 'move') => { const result = r.applyAction(state, { kind, pieceId: id, to: { row, col } }); assert.ok(result.state, result.error); return result.state; };

test('169 points, 68 unique pieces, distinct infantry and source army order', () => {
  let state = r.createInitialState(); assert.equal(state.pieces.length, 68); assert.equal(new Set(state.pieces.map(r.pointKey)).size, 68);
  for (const army of r.ARMIES) { const ps = state.pieces.filter(p => p.army === army); assert.equal(ps.length, 17); for (const role of ['mountain-soldier', 'river-soldier']) assert.equal(ps.filter(p => p.role === role).length, 3); }
  for (const expected of ['red', 'blue', 'purple', 'green']) { assert.equal(state.turn, expected); const old = JSON.stringify(state); const next = r.applyAction(state, r.getLegalActions(state)[0]).state; assert.equal(JSON.stringify(state), old); state = next; }
  assert.equal(state.turn, 'red');
});
test('infantry for every army crosses its own terrain, unlocks on opposite foot/bank and never retreats', () => {
  for (const army of r.ARMIES) for (const role of ['mountain-soldier', 'river-soldier']) {
    const m = r.ARMY_META[army], mountain = role.startsWith('mountain'), sign = mountain ? m.colSign : m.rowSign;
    const p = unit(army, role, mountain ? 4 : 6 - sign, mountain ? 6 - sign : 4);
    const state = fixture([p], army); let targets = to(state, p.id);
    assert.deepEqual(targets, [mountain ? '4,6' : '6,4']);
    p.row = mountain ? 4 : 6; p.col = mountain ? 6 : 4; assert.equal(r.crossedTerrain(p), false); assert.equal(to(state, p.id).length, 1);
    p.row = mountain ? 4 : 6 + sign; p.col = mountain ? 6 + sign : 4;
    assert.equal(r.crossedTerrain(p), true); targets = to(state, p.id); assert.equal(targets.length, 3);
    assert.ok(!targets.includes(mountain ? `4,${6}` : `6,4`));
  }
});
test('infantry cannot enter its forbidden centre line, including the overlap', () => {
  let s = fixture([unit('red', 'mountain-soldier', 5, 5)], 'red');
  assert.ok(!to(s, 'red-mountain-soldier-test').some(k => k.startsWith('6,')));
  s = fixture([unit('red', 'river-soldier', 7, 5)], 'red');
  assert.ok(!to(s, 'red-river-soldier-test').includes('7,6'));
});
test('Cannon capture needs exactly one real piece of any army; allied targets cannot be captured', () => {
  const cannon = unit('red', 'cannon', 4, 4), victim = unit('blue', 'horse', 4, 9), screen = unit('purple', 'horse', 4, 6), second = unit('green', 'horse', 4, 7);
  assert.ok(!to(fixture([cannon, victim]), cannon.id).includes('4,9'));
  assert.ok(to(fixture([cannon, victim, screen]), cannon.id).includes('4,9'));
  assert.ok(!to(fixture([cannon, victim, screen, second]), cannon.id).includes('4,9'));
  assert.ok(!to(fixture([cannon, { ...victim, army: 'purple' }, screen]), cannon.id).includes('4,9'));
});
test('Horse leg and Elephant eye blockers are retained; elephant may enter but never cross terrain', () => {
  const horse = unit('red', 'horse', 4, 8), blocker = unit('blue', 'horse', 4, 7);
  assert.ok(to(fixture([horse]), horse.id).includes('3,6')); assert.ok(!to(fixture([horse, blocker]), horse.id).includes('3,6'));
  const elephant = unit('purple', 'elephant', 8, 2), s = fixture([elephant], 'purple');
  assert.ok(to(s, elephant.id).includes('6,4'));
  assert.ok(!to(fixture([{ ...elephant, row: 6, col: 4 }], 'purple'), elephant.id).includes('4,2'));
  assert.ok(!to(fixture([elephant, unit('green', 'horse', 7, 3)], 'purple'), elephant.id).includes('6,4'));
});
test('palace pieces stay in their own palace and Advisors use the four-point diamond; allies block captures', () => {
  const s = fixture([unit('red', 'advisor', 0, 11), unit('red', 'chariot', 4, 4), unit('purple', 'horse', 4, 5)]);
  assert.ok(to(s, 'red-advisor-test').every(k => r.inPalace('red', { row: Number(k.split(',')[0]), col: Number(k.split(',')[1]) })));
  assert.deepEqual(to(s, 'red-advisor-test').sort(), ['1,10']);
  assert.equal(r.inAdvisorNetwork('red',{row:1,col:11}),false);
  assert.ok(!to(s, 'red-chariot-test').includes('4,5')); assert.ok(!to(s, 'red-chariot-test').includes('4,6'));
});
test('four-army phase allows ignoring a General attack, then capture removes only its army', () => {
  const attacker = unit('blue', 'chariot', 1, 8), quiet = unit('red', 'horse', 4, 8), s = fixture([attacker, quiet]);
  assert.equal(r.isInCheck(s, 'red'), true); assert.equal(r.requiresKingSafety(s, 'red'), false); assert.ok(to(s, quiet.id).length);
  s.turn = 'blue'; const next = move(s, attacker.id, 1, 12);
  assert.equal(next.eliminated.red, 'captured'); assert.ok(!next.pieces.some(p => p.army === 'red')); assert.ok(next.pieces.some(p => p.army === 'purple')); assert.equal(next.outcome, null); assert.equal(next.turn, 'purple');
});
test('lone-army safety forbids ignoring check while a team retaining its ally remains in capture phase', () => {
  const attacker = unit('blue', 'chariot', 1, 8), quiet = unit('red', 'horse', 4, 8), s = fixture([attacker, quiet]);
  s.eliminated.purple = 'captured'; s.pieces = s.pieces.filter(p => p.army !== 'purple');
  assert.equal(r.requiresKingSafety(s, 'red'), true); assert.deepEqual(to(s, quiet.id), []); assert.equal(r.requiresKingSafety(s, 'blue'), false);
});
test('facing-General capture is one action, returns to origin, eliminates target army and works on columns', () => {
  for (const vertical of [false, true]) {
    const victimArmy = vertical ? 'blue' : 'green';
    const s = fixture([], 'purple'); s.pieces = s.pieces.filter(p => !['purple', victimArmy].includes(p.army));
    s.pieces.push(unit('purple', 'king', 12, 0), unit(victimArmy, 'king', vertical ? 0 : 12, vertical ? 0 : 12), unit(victimArmy, 'horse', 7, 8));
    const before = JSON.stringify(s), next = move(s, 'purple-king-test', vertical ? 0 : 12, vertical ? 0 : 12, 'royal-capture');
    assert.equal(JSON.stringify(s), before); assert.equal(next.ply, 1); assert.ok(next.pieces.some(p => p.army === 'purple' && p.row === 12 && p.col === 0)); assert.ok(!next.pieces.some(p => p.army === victimArmy)); assert.equal(next.eliminated[victimArmy], 'captured');
  }
});
test('a lone army may capture an attacking General: elimination is applied before safety testing', () => {
  const s = fixture([], 'red'); s.eliminated.purple = 'captured'; s.pieces = s.pieces.filter(p => p.army !== 'purple' && p.army !== 'blue');
  s.pieces.push(unit('blue', 'king', 1, 0), unit('blue', 'chariot', 1, 8));
  // Chariot blocks the facing royal capture; a red Chariot removes the attacking army instead.
  s.pieces.push(unit('red', 'chariot', 2, 0));
  const next = move(s, 'red-chariot-test', 1, 0); assert.equal(next.eliminated.blue, 'captured'); assert.ok(!next.pieces.some(p => p.id === 'blue-chariot-test'));
});
test('no-move armies pass only with an ally; lone-army stalemate defeats that army on its turn', () => {
  const s = r.createInitialState(); s.pieces = [];
  for (const army of r.ARMIES) { const [r0, c0] = r.ARMY_META[army].corner; for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) s.pieces.push(unit(army, row === 0 && col === 0 ? 'king' : 'advisor', r0 + row * r.ARMY_META[army].rowSign, c0 + col * r.ARMY_META[army].colSign, `${army}-${row}-${col}`)); }
  assert.deepEqual(r.getLegalActions(s), [{ kind: 'pass' }]); let n = s; for (let i = 0; i < 4; i++) n = r.applyAction(n, { kind: 'pass' }).state; assert.equal(n.outcome.type, 'draw');
  s.eliminated.purple = 'captured'; s.pieces = s.pieces.filter(p => p.army !== 'purple'); const finished = r.resolveTurn(s);
  assert.equal(finished.eliminated.red, 'stalemate'); assert.equal(finished.outcome.winner, 'black');
});
test('turn skipping, team-level resignation, ruleset rejection and off-board input rejection', () => {
  let s = fixture([unit('red', 'horse', 4, 8)]); s.eliminated.blue = 'captured'; s.pieces = s.pieces.filter(p => p.army !== 'blue');
  let next = r.applyAction(s, r.getLegalActions(s).find(a => a.pieceId === 'red-horse-test')).state; assert.equal(next.turn, 'purple');
  assert.equal(r.controllingSeat(s), 'red'); assert.equal(r.controllingSeat({ ...s, turn: 'purple' }), 'red'); assert.equal(r.controllingSeat({ ...s, controlMode: 'four', turn: 'purple' }), 'purple');
  assert.equal(r.resign(s, 'white').outcome.winner, 'black'); assert.ok(r.applyAction({ ...s, rulesetVersion: 'other' }, { kind: 'pass' }).error);
  assert.ok(r.applyAction(s, { kind: 'move', pieceId: 'red-horse-test', to: { row: NaN, col: 4 } }).error);
  assert.ok(r.applyAction(s, { kind: 'pass' }).error);
});
test('threefold repetition uses side to move, army roles and elimination state, not interchangeable piece IDs', () => {
  const s = fixture([unit('red', 'horse', 4, 8)]), a = r.getLegalActions(s).find(a => a.pieceId === 'red-horse-test');
  const n = r.applyAction(s, a).state, key = r.positionKey(n); s.repetitions[key] = 2;
  assert.equal(r.applyAction(s, a).state.outcome.reason, 'Threefold repetition (Antarctic rule)');
  assert.equal(r.positionKey(s), r.positionKey({ ...s, pieces: s.pieces.map(p => ({ ...p, id: p.id + 'renamed' })) }));
  assert.notEqual(r.positionKey(s), r.positionKey({ ...s, turn: 'blue' }));
});
test('bot selects a legal General capture and editor rejects impossible or duplicate setups', () => {
  const s = fixture([unit('red', 'chariot', 0, 4)]);
  const a = r.chooseAction(s, { difficulty: 'hard', budgetMs: 1000, maxNodes: 400 });
  assert.ok(r.getLegalActions(s).some(x => r.actionKey(x) === r.actionKey(a))); assert.equal(r.pieceAt(s, a.to)?.role, 'king');
  assert.deepEqual(r.validateSetup(r.createInitialState().pieces), []);
  assert.ok(r.validateSetup([...s.pieces, { ...s.pieces[0] }]).length); assert.ok(r.validateSetup([]).length);
});
