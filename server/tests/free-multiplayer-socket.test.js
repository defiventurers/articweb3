const test = require('node:test');
const assert = require('node:assert/strict');
const { Wallet } = require('ethers');
const { startFreeBackend } = require('./helpers/free-multiplayer-fixture.cjs');
const { localTestDatabaseUrl } = require('./helpers/local-test-database.cjs');

const WALLET_PREFIXES = ['nif', 'fwh', 'fish', 'bti', 'ih', 'siw', 'gt', 'cr', 'fgg', 'str', 'ir', 'ck', 'ts', 'av', 'pt', 'ag', 'sir', 'kf'];

test('multiplayer fixtures refuse PostgreSQL connection overrides before opening a connection', () => {
  for (const invalid of ['postgresql://fixture@db.example.test/postgres', 'https://127.0.0.1/postgres',
    'postgresql://fixture@127.0.0.1/postgres?host=db.example.test&port=5433',
    'postgresql://fixture@localhost/postgres?service=production', 'postgresql://fixture@127.0.0.1/postgres#override']) {
    assert.throws(() => localTestDatabaseUrl(invalid), /isolated loopback PostgreSQL/);
  }
  assert.equal(localTestDatabaseUrl('postgresql://fixture@127.0.0.1:5432/postgres').hostname, '127.0.0.1');
});

test('wallet-profile legacy families reject anonymous impersonation but preserve public listings', { timeout: 15000 }, async t => {
  const backend = await startFreeBackend(t), owner = Wallet.createRandom();
  const authenticated = await backend.connect(), anonymous = await backend.connect();
  await backend.login(authenticated, owner);
  const admitted = [];
  for (const prefix of WALLET_PREFIXES) {
    const listed = await anonymous.request(prefix + '_room_list');
    assert.equal(listed.type, prefix + '_room_list_result');
    const result = await anonymous.request(prefix + '_room_create', { wallet: owner.address, visibility: 'private' });
    if (result.type !== 'error') admitted.push(prefix);
    for (const action of ['room_join', 'game_state', 'game_action', 'legal_actions', 'history', 'my_rooms']) {
      const denied = await anonymous.request(prefix + '_' + action, { wallet: owner.address, roomCode: 'NONE' });
      assert.equal(denied.type, 'error', prefix + '_' + action);
      assert.match(denied.payload.message, /Login with this wallet/);
    }
    const allowed = await authenticated.request(prefix + '_room_create', { wallet: owner.address, visibility: 'private' });
    assert.equal(allowed.type, prefix + '_room_create_result', prefix + ': ' + allowed.payload?.message);
  }
  assert.deepEqual(admitted, [], 'No anonymous socket may create a room as a previously registered wallet.');
});

test('Two Stones requires the signature-bound socket for a registered player identity', { timeout: 15000 }, async t => {
  const backend = await startFreeBackend(t);
  const blue = Wallet.createRandom(), coral = Wallet.createRandom();
  const host = await backend.connect(), guest = await backend.connect(), anonymous = await backend.connect();
  await backend.login(host, blue); await backend.login(guest, coral);
  const created = await host.request('ts_room_create', { wallet: blue.address, side: 'blue', visibility: 'private' });
  assert.equal(created.type, 'ts_room_create_result', created.payload?.message);
  const roomCode = created.payload.room.roomCode;
  assert.equal((await guest.request('ts_room_join', { wallet: coral.address, roomCode })).type, 'ts_room_join_result');
  const forged = await anonymous.request('ts_game_action', { wallet: blue.address, roomCode,
    action: { type: 'place', pieceId: 'blue-1', to: 'nw' } });
  assert.equal(forged.type, 'error', 'An unsigned socket must not act as a globally registered wallet.');
  const state = await host.request('ts_game_state', { wallet: blue.address, roomCode });
  assert.equal(state.payload.room.gameState.ply, 0);
  for (const type of ['ts_room_create', 'ts_room_join', 'ts_game_state', 'ts_legal_actions', 'ts_history', 'ts_my_rooms']) {
    const denied = await anonymous.request(type, { wallet: blue.address, roomCode });
    assert.equal(denied.type, 'error', type);
    assert.match(denied.payload.message, /Login with this wallet/);
  }
  const mismatched = await guest.request('ts_game_action', { wallet: blue.address, roomCode,
    action: { type: 'place', pieceId: 'blue-1', to: 'nw' } });
  assert.equal(mismatched.type, 'error');
  assert.match(mismatched.payload.message, /Wallet session mismatch/);
});

test('two independent free clients finish a legal Two Stones match with synchronized turns and restored seats', { timeout: 15000 }, async t => {
  const backend = await startFreeBackend(t);
  const wallets = { blue: Wallet.createRandom(), coral: Wallet.createRandom() };
  const clients = { blue: await backend.connect(), coral: await backend.connect() };
  await backend.login(clients.blue, wallets.blue, 'Blue Fixture');
  await backend.login(clients.coral, wallets.coral, 'Coral Fixture');
  const created = await clients.blue.request('ts_room_create', { wallet: wallets.blue.address, side: 'blue', visibility: 'public' });
  assert.equal(created.type, 'ts_room_create_result');
  const roomCode = created.payload.room.roomCode;
  assert.equal(created.payload.room.roomMode, 'open_ice');
  const observer = await backend.connect();
  assert.ok((await observer.request('ts_room_list')).payload.rooms.some(room => room.roomCode === roomCode));
  const joined = await clients.coral.request('ts_room_join', { wallet: wallets.coral.address, roomCode: roomCode.toLowerCase(), side: 'blue' });
  assert.equal(joined.type, 'ts_room_join_result');
  let room = joined.payload.room;
  assert.equal(room.status, 'playing');
  assert.deepEqual(room.players.map(player => player.side).sort(), ['blue', 'coral']);
  assert.equal(room.players.find(player => player.wallet === wallets.coral.address.toLowerCase()).side, 'coral');
  const state = side => clients[side].request('ts_game_state', { wallet: wallets[side].address, roomCode });
  const action = (type, pieceId, to, from) => ({ type, pieceId, ...(from ? { from } : {}), to });
  async function play(side, move, requestId) {
    const response = await clients[side].request('ts_game_action', { wallet: wallets[side].address,
      roomCode, action: move, gameState: { winner: side, ply: 999 } }, requestId);
    assert.equal(response.type, 'ts_game_action_result', response.payload?.message);
    room = response.payload.room;
    for (const client of Object.values(clients)) {
      const update = await client.waitFor(packet => packet.type === 'ts_room_state' && packet.payload.room.roomCode === roomCode && packet.payload.room.gameState.ply === room.gameState.ply);
      assert.deepEqual(update.payload.room.gameState, room.gameState);
    }
    return room;
  }
  const wrongTurn = await clients.coral.request('ts_game_action', { wallet: wallets.coral.address, roomCode,
    action: action('place', 'coral-1', 'ne') });
  assert.equal(wrongTurn.type, 'error'); assert.match(wrongTurn.payload.message, /not your turn/i);
  const illegal = await clients.blue.request('ts_game_action', { wallet: wallets.blue.address, roomCode,
    action: action('place', 'coral-1', 'off-board') });
  assert.equal(illegal.type, 'error'); assert.equal((await state('blue')).payload.room.gameState.ply, 0);
  await play('blue', action('place', 'blue-1', 'nw'), 'same-placement');
  const duplicate = await clients.blue.request('ts_game_action', { wallet: wallets.blue.address, roomCode,
    action: action('place', 'blue-1', 'nw') }, 'same-placement');
  assert.equal(duplicate.type, 'error'); assert.equal((await state('coral')).payload.room.gameState.ply, 1);
  // Request IDs belong to a wallet/room, not a global shared counter.
  await play('coral', action('place', 'coral-1', 'ne'), 'same-placement');

  const beforeDisconnect = structuredClone(room.gameState), matchId = room.matchId;
  await clients.blue.close();
  clients.blue = await backend.connect();
  const unsignedResume = await clients.blue.request('ts_room_join', { wallet: wallets.blue.address, roomCode });
  assert.equal(unsignedResume.type, 'error');
  await backend.login(clients.blue, wallets.blue, 'Blue Fixture');
  const resumed = await clients.blue.request('ts_room_join', { wallet: wallets.blue.address, roomCode });
  assert.equal(resumed.type, 'ts_room_join_result');
  assert.equal(resumed.payload.room.matchId, matchId);
  assert.equal(resumed.payload.room.playerCount, 2);
  assert.equal(resumed.payload.room.players.find(player => player.wallet === wallets.blue.address.toLowerCase()).side, 'blue');
  assert.deepEqual(resumed.payload.room.gameState, beforeDisconnect);
  assert.deepEqual((await state('coral')).payload.room.gameState, beforeDisconnect);

  await play('blue', action('place', 'blue-2', 'sw'));
  await play('coral', action('place', 'coral-2', 'se'));
  await play('blue', action('move', 'blue-1', 'c', 'nw'));
  assert.equal(room.status, 'finished');
  assert.equal(room.result.winner, 'blue'); assert.equal(room.result.reason, 'immobilization');
  assert.equal(room.result.plies, 5); assert.equal(room.result.draw, false);
  assert.match(room.proofHash, /^[a-f0-9]{64}$/);
  const agreed = await Promise.all(['blue', 'coral'].map(state));
  for (const response of agreed) {
    assert.equal(response.payload.room.proofHash, room.proofHash);
    assert.deepEqual(response.payload.room.result, room.result);
    assert.deepEqual(response.payload.room.gameState, room.gameState);
  }
  const finished = structuredClone(room);
  const afterEnd = await clients.coral.request('ts_game_action', { wallet: wallets.coral.address, roomCode,
    action: action('move', 'coral-1', 'nw', 'ne') });
  assert.equal(afterEnd.type, 'error'); assert.match(afterEnd.payload.message, /has ended/);
  assert.deepEqual((await state('blue')).payload.room.gameState, finished.gameState);
  for (const side of ['blue', 'coral']) {
    const history = (await clients[side].request('ts_history', { wallet: wallets[side].address })).payload.history;
    assert.equal(history.length, 1); assert.equal(history[0].won, side === 'blue');
    assert.equal(history[0].matchId, matchId); assert.equal(history[0].proofHash, room.proofHash);
    assert.equal(history[0].roomMode, 'open_ice'); assert.equal(history[0].entryWei, '0'); assert.equal(history[0].payoutWei, '0');
  }
});

test('a delayed duplicate request cannot become a new move when its original action is legal again', { timeout: 15000 }, async t => {
  const backend = await startFreeBackend(t), wallets = { blue: Wallet.createRandom(), coral: Wallet.createRandom() };
  const clients = { blue: await backend.connect(), coral: await backend.connect() };
  for (const side of ['blue', 'coral']) await backend.login(clients[side], wallets[side]);
  const created = await clients.blue.request('ts_room_create', { wallet: wallets.blue.address, side: 'blue' });
  const roomCode = created.payload.room.roomCode;
  await clients.coral.request('ts_room_join', { wallet: wallets.coral.address, roomCode });
  const moves = [
    ['place', 'blue-1', null, 'nw'], ['place', 'coral-1', null, 'sw'],
    ['place', 'blue-2', null, 'ne'], ['place', 'coral-2', null, 'se'],
    ['move', 'blue-1', 'nw', 'c'], ['move', 'coral-1', 'sw', 'nw'],
    ['move', 'blue-1', 'c', 'sw'], ['move', 'coral-1', 'nw', 'c'],
    ['move', 'blue-1', 'sw', 'nw'], ['move', 'coral-2', 'se', 'sw'],
    ['move', 'blue-2', 'ne', 'se'], ['move', 'coral-1', 'c', 'ne'],
  ];
  let room, original;
  for (let n = 0; n < moves.length; n++) {
    const [type, pieceId, from, to] = moves[n], side = n % 2 ? 'coral' : 'blue';
    const payload = { wallet: wallets[side].address, roomCode, action: { type, pieceId, to, ...(from ? { from } : {}) } };
    if (n === 4) original = payload;
    const result = await clients[side].request('ts_game_action', payload, 'req_fixture_' + n);
    assert.equal(result.type, 'ts_game_action_result', result.payload?.message);
    room = result.payload.room;
  }
  assert.equal(room.gameState.ply, 12); assert.equal(room.status, 'playing');
  const legal = await clients.blue.request('ts_legal_actions', { wallet: wallets.blue.address, roomCode });
  assert.ok(legal.payload.actions.some(action => action.pieceId === 'blue-1' && action.from === 'nw' && action.to === 'c'));
  await clients.blue.close();
  clients.blue = await backend.connect();
  await backend.login(clients.blue, wallets.blue);
  assert.equal((await clients.blue.request('ts_room_join', { wallet: wallets.blue.address, roomCode })).type, 'ts_room_join_result');
  const repeated = await clients.blue.request('ts_game_action', original, 'req_fixture_4');
  assert.equal(repeated.type, 'error', 'The same already-applied message is not a fresh choice on a later turn.');
  const after = await clients.blue.request('ts_game_state', { wallet: wallets.blue.address, roomCode });
  assert.deepEqual(after.payload.room.gameState, room.gameState);
});
