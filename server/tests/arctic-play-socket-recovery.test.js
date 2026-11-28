const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID, createHash } = require('node:crypto');
const { Pool } = require('pg');
const { Wallet } = require('ethers');
const { startFreeBackend } = require('./helpers/free-multiplayer-fixture.cjs');
const { localTestDatabaseUrl } = require('./helpers/local-test-database.cjs');
const engine = require('../fairPlayEngine.cjs');
const manifest = require('../../shared/fair-play/rules-manifest.json');

async function isolatedDatabase(t) {
  const source = localTestDatabaseUrl(process.env.FONSO_MULTIPLAYER_TEST_DATABASE_URL);
  const name = 'fonso_multiplayer_' + randomBytes(8).toString('hex');
  const admin = new Pool({ connectionString: source.href }), backends = [], databaseErrors = [];
  let created = false, pool, company;
  admin.on('error', error => databaseErrors.push('admin:' + error.code));
  t.after(async () => {
    try {
      for (const backend of backends) await backend.close();
      await company?.close(); await pool?.end();
      // Close consumers before dropping the exact database created here.
      if (created) await admin.query('DROP DATABASE ' + name);
    } finally { await admin.end(); }
    assert.deepEqual(databaseErrors, [], 'The fixture must not conceal asynchronous database failures.');
  });
  await admin.query('CREATE DATABASE ' + name); created = true;
  source.pathname = '/' + name;
  const databaseUrl = source.href;
  pool = new Pool({ connectionString: databaseUrl });
  pool.on('error', error => databaseErrors.push('observer:' + error.code));
  company = require('../companyStore').createCompanyStore({ databaseUrl });
  await company.init();
  async function start(options = {}) { const backend = await startFreeBackend(t, { databaseUrl, ...options }); backends.push(backend); return backend; }
  async function account() {
    const id = randomUUID(), key = randomBytes(32).toString('base64url'), at = Date.now();
    await company.transact('account', id, () => ({ id, sessions: [{ hash: createHash('sha256').update(key).digest('hex'),
      issuedAt: at, lastSeen: at, expires: at + 3600000 }], progress: {}, revision: 0, entitlements: {}, metrics: [] }));
    return { id, session: id + '.' + key };
  }
  return { start, account, pool };
}

test('actual Android socket protocol restores a signed free Shogi table after disconnect and backend restart',
  { skip: !process.env.FONSO_MULTIPLAYER_TEST_DATABASE_URL, timeout: 30000 }, async t => {
    const fixture = await isolatedDatabase(t), core = await import('../../shared/fair-play/core.js');
    t.diagnostic('Signed socket fixture database created.');
    const serverKey = await core.generateKey(), users = [await fixture.account(), await fixture.account()];
    let backend = await fixture.start({ fairKey: serverKey.privateKey });
    const actors = await Promise.all(users.map(async user => ({ user, id: randomUUID(), keys: await core.generateKey(), client: await backend.connect() })));
    const capabilities = ['fair-play-v1'];
    const session = actor => ({ roomCode, playerId: actor.id, cloudSession: actor.user.session, seatToken: actor.seatToken, capabilities });
    const forged = await actors[0].client.request('ap_room_create', { tableId: 'shogi', playerId: actors[0].id, capabilities, fairKey: actors[0].keys.publicKey });
    assert.equal(forged.type, 'error');
    const created = await actors[0].client.request('ap_room_create', { tableId: 'shogi', playerId: actors[0].id,
      cloudSession: users[0].session, seat: 'red', capabilities, fairKey: actors[0].keys.publicKey });
    assert.equal(created.type, 'ap_room_create_ok', created.payload?.message);
    let room = created.payload.room;
    const roomCode = room.roomCode;
    actors[0].seatToken = created.payload.seatToken;
    const occupied = await actors[1].client.request('ap_room_join', { roomCode, playerId: actors[1].id,
      cloudSession: users[1].session, seat: 'red', capabilities, fairKey: actors[1].keys.publicKey });
    assert.equal(occupied.type, 'error'); assert.match(occupied.payload.message, /unavailable/);
    const joined = await actors[1].client.request('ap_room_join', { roomCode, playerId: actors[1].id,
      cloudSession: users[1].session, capabilities, fairKey: actors[1].keys.publicKey });
    assert.equal(joined.type, 'ap_room_join_ok'); actors[1].seatToken = joined.payload.seatToken;
    assert.deepEqual(joined.payload.room.players.map(player => player.seat).sort(), ['blue', 'red']);
    for (const actor of actors) {
      actor.seat = joined.payload.room.players.find(player => player.id === actor.id).seat;
      assert.equal((await actor.client.request('ap_room_ready', { ...session(actor), ready: true })).type, 'ap_room_ready_ok');
    }
    assert.equal((await actors[1].client.request('ap_room_start', session(actors[1]))).type, 'error');
    const started = await actors[0].client.request('ap_room_start', session(actors[0]));
    assert.equal(started.type, 'ap_room_start_ok', started.payload?.message); room = started.payload.room;
    assert.equal(room.status, 'playing'); assert.equal(room.fair.available, true);
    assert.equal(room.fair.chain.configured, false);
    assert.equal(room.fair.header.rulesHash, manifest.rulesHash); assert.equal(room.fair.header.options.randomness, 'drand-quicknet-v1');
    assert.equal(room.players.some(player => player.bot), false);
    t.diagnostic('Signed Shogi table started with independent account sessions.');
    assert.equal(JSON.stringify(room).includes('tokenHash'), false);
    const bundle = async actor => (await actor.client.request('ap_fair_get', session(actor))).payload.bundle;
    async function state(actor) { const response = await actor.client.request('ap_room_get', session(actor)); assert.equal(response.type, 'ap_room_get_ok'); return response.payload.room; }
    const active = () => actors.find(actor => actor.seat === engine.turn(room.gameState));
    const original = structuredClone(room.gameState), originalRevision = room.revision;
    const first = active(), second = actors.find(actor => actor !== first);
    const illegalIntent = await core.makeIntent({ bundle: await bundle(first), actor: first.id, actionId: 'invalid', before: room.gameState }, first.keys.privateKey);
    const illegal = await first.client.request('ap_game_action', { ...session(first), revision: room.revision, actionId: 'invalid', fairIntent: illegalIntent });
    assert.equal(illegal.type, 'error'); assert.match(illegal.payload.message, /no longer legal/);
    assert.equal((await second.client.request('ap_game_action', { ...session(second), revision: room.revision, actionId: 'invalid' })).type, 'error');
    assert.equal((await second.client.request('ap_room_get', { ...session(first), cloudSession: second.user.session })).type, 'error');
    assert.equal((await second.client.request('ap_room_get', { ...session(first), seatToken: '0'.repeat(64) })).type, 'error');
    assert.deepEqual((await state(first)).gameState, original); assert.equal((await state(first)).revision, originalRevision);
    async function move({ duplicate = false } = {}) {
      const actor = active(), before = structuredClone(room.gameState), revision = room.revision;
      const actionId = engine.actions('shogi', room.gameState)[0].id;
      const intent = await core.makeIntent({ bundle: await bundle(actor), actor: actor.id, actionId, before }, actor.keys.privateKey);
      const payload = { ...session(actor), revision, actionId, fairIntent: intent };
      let result;
      if (duplicate) {
        const replies = await Promise.all([actor.client.request('ap_game_action', payload), actor.client.request('ap_game_action', payload)]);
        assert.equal(replies.filter(reply => reply.type === 'ap_game_action_ok').length, 1);
        assert.equal(replies.filter(reply => reply.type === 'error').length, 1);
        result = replies.find(reply => reply.type === 'ap_game_action_ok');
      } else result = await actor.client.request('ap_game_action', payload);
      assert.equal(result.type, 'ap_game_action_ok', result.payload?.message); room = result.payload.room;
      assert.equal(room.revision, revision + 1);
      assert.deepEqual(room.gameState, engine.apply('shogi', before, actionId));
      for (const player of actors) {
        const update = await player.client.waitFor(packet => packet.type === 'ap_room_update' && packet.payload.room.revision === room.revision);
        assert.deepEqual(update.payload.room.gameState, room.gameState);
      }
      const stale = await actor.client.request('ap_game_action', payload);
      assert.equal(stale.type, 'error'); assert.match(stale.payload.message, /board changed/i);
    }
    await move({ duplicate: true }); await move();
    t.diagnostic('Two signed moves and duplicate rejection completed.');
    const disconnected = actors[1], remembered = structuredClone(room);
    await disconnected.client.close(); disconnected.client = await backend.connect();
    const resumed = await disconnected.client.request('ap_room_join', session(disconnected));
    assert.equal(resumed.type, 'ap_room_join_ok'); assert.equal(resumed.payload.room.players.find(player => player.id === disconnected.id).seat, disconnected.seat);
    assert.equal(resumed.payload.room.revision, remembered.revision); assert.deepEqual(resumed.payload.room.gameState, remembered.gameState);
    const stored = await actors[0].client.request('ap_room_get', { ...session(actors[0]), verifyStored: true });
    assert.equal(stored.type, 'ap_room_get_ok', stored.payload?.message); assert.equal(stored.payload.storageVerified, true);
    assert.equal(stored.payload.savedRevision, room.revision);
    await backend.close();
    t.diagnostic('First backend stopped after verified storage.');
    backend = await fixture.start({ fairKey: serverKey.privateKey });
    for (const actor of actors) {
      actor.client = await backend.connect();
      const restored = await actor.client.request('ap_room_join', session(actor));
      assert.equal(restored.type, 'ap_room_join_ok', restored.payload?.message);
      assert.equal(restored.payload.room.matchId, remembered.matchId);
      assert.equal(restored.payload.room.revision, remembered.revision);
      assert.deepEqual(restored.payload.room.gameState, remembered.gameState);
      assert.equal(restored.payload.room.players.find(player => player.id === actor.id).seat, actor.seat);
      room = restored.payload.room;
    }
    const restoredProof = await bundle(actors[0]);
    t.diagnostic('Both seats restored after backend restart.');
    assert.equal((await core.verifyBundle(restoredProof, { engine, rulesHash: manifest.rulesHash, trustedKeys: [serverKey.publicKey] })).moves, 2);
    await move(); await move();
    const resigning = actors[1], signed = await core.makeIntent({ bundle: await bundle(resigning), actor: resigning.id,
      actionId: null, kind: 'resign', before: room.gameState }, resigning.keys.privateKey);
    const ended = await resigning.client.request('ap_room_leave', { ...session(resigning), fairIntent: signed });
    assert.equal(ended.type, 'ap_room_left'); assert.equal(ended.payload.room.status, 'finished');
    const final = ended.payload.room;
    const hostUpdate = await actors[0].client.waitFor(packet => packet.type === 'ap_room_update' && packet.payload.room.status === 'finished');
    assert.deepEqual(hostUpdate.payload.room.gameState, final.gameState);
    assert.deepEqual(engine.result(hostUpdate.payload.room.gameState), engine.result(final.gameState));
    assert.equal(engine.result(final.gameState).winner, actors[0].seat);
    assert.equal(final.fair.closed, true); assert.equal(final.fair.eventCount, 5);
    const proof = await bundle(actors[0]);
    const verified = await core.verifyBundle(proof, { engine, rulesHash: manifest.rulesHash, trustedKeys: [serverKey.publicKey] });
    assert.equal(verified.moves, 5); assert.ok(proof.closure);
    assert.deepEqual(proof.closure.result, engine.result(final.gameState));
    const altered = structuredClone(proof); altered.events[0].afterHash = '0'.repeat(64);
    await assert.rejects(core.verifyBundle(altered, { engine, rulesHash: manifest.rulesHash, trustedKeys: [serverKey.publicKey] }));
    assert.equal((await actors[0].client.request('ap_game_action', { ...session(actors[0]), revision: final.revision, actionId: 'invalid' })).type, 'error');
    const savedFinal = await actors[0].client.request('ap_room_get', { ...session(actors[0]), verifyStored: true });
    assert.equal(savedFinal.payload.storageVerified, true);
    const saved = (await fixture.pool.query('SELECT room_mode,room_json FROM rooms WHERE room_code=$1', [roomCode])).rows[0];
    assert.equal(saved.room_mode, 'free'); assert.equal(saved.room_json.fair.bundle.events.length, 5);
  });

test('Two Stones replay receipts survive actual PostgreSQL storage and process restart',
  { skip: !process.env.FONSO_MULTIPLAYER_TEST_DATABASE_URL, timeout: 20000 }, async t => {
    const fixture = await isolatedDatabase(t);
    let backend = await fixture.start();
    const wallets = { blue: Wallet.createRandom(), coral: Wallet.createRandom() }, clients = {};
    for (const side of ['blue', 'coral']) { clients[side] = await backend.connect(); await backend.login(clients[side], wallets[side]); }
    const created = await clients.blue.request('ts_room_create', { wallet: wallets.blue.address, side: 'blue' }), roomCode = created.payload.room.roomCode;
    await clients.coral.request('ts_room_join', { wallet: wallets.coral.address, roomCode });
    const moves = [['place','blue-1',null,'nw'],['place','coral-1',null,'sw'],['place','blue-2',null,'ne'],['place','coral-2',null,'se'],
      ['move','blue-1','nw','c'],['move','coral-1','sw','nw'],['move','blue-1','c','sw'],['move','coral-1','nw','c'],
      ['move','blue-1','sw','nw'],['move','coral-2','se','sw'],['move','blue-2','ne','se'],['move','coral-1','c','ne']];
    let room, original;
    for (let n = 0; n < moves.length; n++) {
      const [type, pieceId, from, to] = moves[n], side = n % 2 ? 'coral' : 'blue';
      const payload = { wallet: wallets[side].address, roomCode, action: { type, pieceId, to, ...(from ? { from } : {}) } };
      if (n === 4) original = payload;
      const reply = await clients[side].request('ts_game_action', payload, 'persisted_' + n);
      assert.equal(reply.type, 'ts_game_action_result'); room = reply.payload.room;
    }
    let persisted;
    for (let n = 0; n < 100; n++) {
      persisted = (await fixture.pool.query('SELECT room_json FROM rooms WHERE room_code=$1', [roomCode])).rows[0]?.room_json;
      if (persisted?.gameState.ply === 12 && persisted.acceptedActionRequestHashes?.length === 12) break;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.equal(persisted.gameState.ply, 12); assert.equal(persisted.acceptedActionRequestHashes.length, 12);
    assert.equal(JSON.stringify(room).includes('acceptedActionRequestHashes'), false);
    await backend.close(); backend = await fixture.start();
    const restored = await backend.connect(); await backend.login(restored, wallets.blue);
    const state = await restored.request('ts_room_join', { wallet: wallets.blue.address, roomCode });
    assert.deepEqual(state.payload.room.gameState, room.gameState);
    const duplicate = await restored.request('ts_game_action', original, 'persisted_4');
    assert.equal(duplicate.type, 'error'); assert.match(duplicate.payload.message, /already processed/);
    assert.deepEqual((await restored.request('ts_game_state', { wallet: wallets.blue.address, roomCode })).payload.room.gameState, room.gameState);
  });
