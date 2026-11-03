const test = require('node:test'), assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createArcticPlayService } = require('../arcticPlayService');
const engine = require('../arcticPlayGames.cjs');
const legacy = require('../arcticPlayEngine.cjs');
const CAPABILITY = 'shanshui-antarctic-v1';
function harness() {
  const rooms = new Map(), saved = new Map(); let serial = 0;
  const service = createArcticPlayService({ requireLogin: false, accessOptions: { requireAccount: false }, rooms,
    send: (ws, packet) => ws.packets.push(packet), ok: (ws, id, type, payload) => ws.packets.push({ requestId: id, type, payload }),
    fail: (ws, id, message) => ws.packets.push({ requestId: id, type: 'error', payload: { message } }),
    saveRoomSafe: async room => saved.set(room.roomCode, structuredClone(room)), loadSavedRoom: async code => saved.get(code),
  });
  const socket = () => ({ readyState: 1, packets: [] });
  async function call(ws, type, payload = {}, capabilities = true) { const id = String(++serial); await service.dispatch(ws, id, type, { ...payload, ...(capabilities ? { capabilities: [CAPABILITY] } : {}) }); return ws.packets.find(p => p.requestId === id); }
  return { rooms, saved, service, socket, call };
}
for (const id of ['shanshui', 'shanshui-2v2']) test(`${id}: private seats, correct army ownership, stale moves, chat, reconnect and stored state`, async t => {
  const h = harness(); t.after(() => h.service.close()); const clients = [], definition = engine.game(id);
  for (let i = 0; i < definition.players; i++) {
    const ws = h.socket(), playerId = randomUUID();
    const response = await h.call(ws, i ? 'ap_room_join' : 'ap_room_create', { tableId: id, playerId, seat: definition.seats[i], name: `Player ${i}`, roomCode: clients[0]?.session.roomCode });
    assert.notEqual(response.type, 'error', response.payload.message);
    clients.push({ ws, session: { roomCode: response.payload.room.roomCode, playerId, seatToken: response.payload.seatToken } });
  }
  const host = clients[0], room = h.rooms.get(host.session.roomCode);
  for (const client of clients) await h.call(client.ws, 'ap_room_ready', { ...client.session, ready: true });
  assert.notEqual((await h.call(host.ws, 'ap_room_start', host.session)).type, 'error');
  const initialRevision = room.revision, illegalActor = clients[1];
  let first = engine.actions(id, room.gameState)[0];
  const wrong = await h.call(illegalActor.ws, 'ap_game_action', { ...illegalActor.session, revision: room.revision, actionId: first.id });
  assert.equal(wrong.type, 'error'); assert.equal(room.revision, initialRevision);
  for (const army of ['red', 'blue', 'purple', 'green']) {
    assert.equal(room.gameState.turn, army);
    const seat = engine.turn(room.gameState), index = definition.seats.indexOf(seat), client = clients[index];
    const action = engine.actions(id, room.gameState)[0], oldRevision = room.revision;
    assert.ok(action.source.startsWith(`piece:${army}-`));
    const response = await h.call(client.ws, 'ap_game_action', { ...client.session, revision: oldRevision, actionId: action.id });
    assert.notEqual(response.type, 'error', response.payload.message);
    assert.equal(room.revision, oldRevision + 1);
    const stale = await h.call(client.ws, 'ap_game_action', { ...client.session, revision: oldRevision, actionId: action.id });
    assert.equal(stale.type, 'error'); assert.equal(room.revision, oldRevision + 1);
  }
  const beforeChat = room.revision; await h.call(host.ws, 'ap_room_chat', { ...host.session, text: 'Hold the river!' }); assert.equal(room.revision, beforeChat);
  const intruder = await h.call(h.socket(), 'ap_room_get', { ...host.session, seatToken: 'f'.repeat(64) }); assert.equal(intruder.type, 'error');
  const restored = await h.call(h.socket(), 'ap_room_get', { ...host.session, verifyStored: true }); assert.notEqual(restored.type, 'error'); assert.equal(restored.payload.storageVerified, true); assert.deepEqual(restored.payload.room.gameState, room.gameState);
  const outdated = await h.call(host.ws, 'ap_room_get', host.session, false); assert.equal(outdated.type, 'error'); assert.match(outdated.payload.message, /v1 client/);
  const clone = structuredClone(room); clone.gameState.rulesetVersion = 'shanshui-unknown'; h.rooms.set(room.roomCode, clone);
  assert.equal((await h.call(host.ws, 'ap_room_get', host.session)).type, 'error');
});
test('adding Shanshui preserves every existing production game and room version', () => {
  assert.equal(engine.VERSION, legacy.VERSION);
  for (const game of legacy.GAME_LIST) { assert.deepEqual(engine.game(game.id), legacy.game(game.id)); assert.deepEqual(engine.create(game.id), legacy.create(game.id)); }
  assert.ok(engine.game('dominion')); assert.equal(engine.game('shanshui-2v2').players, 4);
});
test('new Shanshui rooms reject clients without their explicit rules capability', async t => {
  const h = harness(); t.after(() => h.service.close());
  const response = await h.call(h.socket(), 'ap_room_create', { tableId: 'shanshui', playerId: randomUUID(), name: 'Host' }, false);
  assert.equal(response.type, 'error'); assert.equal(h.rooms.size, 0);
});
