const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { createServer } = require('node:net');
const path = require('node:path');
const WebSocket = require('ws');
const { Wallet } = require('ethers');

async function fixture(t, env = {}) {
  const reserved = createServer();
  reserved.listen(0, '127.0.0.1');
  await once(reserved, 'listening');
  const port = reserved.address().port;
  await new Promise(resolve => reserved.close(resolve));
  const boot = `
    // Only the price fetch is mocked; use the real production bootstrap, HTTP
    // wrappers, signature verification, WebSocket dispatcher and room services.
    const tiers = require('./highStakesTiers.js');
    tiers.refreshHighStakesTierSnapshot = async () => tiers.getHighStakesTierSnapshot();
    process.on('message', message => { Object.assign(process.env, message.env); process.send({ changed: true }); });
    require('./scripts/start-with-runtime-status.js');
  `;
  const child = spawn(process.execPath, ['-r', './allGamesBackendBootstrap.js', '-e', boot], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env, PORT: String(port), DATABASE_URL: '', ETH_SETTLEMENT_SIGNER: '',
      ETH_VAULT_ADDRESS: '', VITE_ETH_VAULT_ADDRESS: '', HIGH_STAKES_ENABLED: 'true',
      LOCKED_MATCH_MODE: 'internal', ABSTRACT_CHAIN_ID: '2741',
      LEGAL_PUBLIC_MAINNET_APPROVED: 'false', LOCKED_MATCH_INTERNAL_WALLETS: '',
      ETH_INDEXER_AUTO_RUN: 'false', ETH_INDEXER_SCHEDULED_RUN: 'false', ETH_INDEXER_HEARTBEAT: 'false',
      AK_PASSPORT_RUNTIME_ENABLED: 'false', AK_RH_EVENT_INDEX_ENABLED: 'false',
      WS_AUTH_LIMIT: '100', WS_ACTION_LIMIT: '1000', WS_ROOM_CREATE_LIMIT: '100', ...env
    }, stdio: ['ignore', 'pipe', 'pipe', 'ipc']
  });
  const sockets = [];
  let output = '';
  child.stderr.on('data', data => { output += data; });
  child.stdout.on('data', data => { output += data; });
  t.after(async () => {
    for (const ws of sockets) ws.terminate();
    if (child.exitCode === null) { child.kill(); await once(child, 'exit'); }
  });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw Error(`Fixture startup failed: ${output}`);
    try { await fetch(`http://127.0.0.1:${port}/health`); ready = true; break; }
    catch { await new Promise(resolve => setTimeout(resolve, 50)); }
  }
  assert.ok(ready, output);
  let serial = 0;
  async function connect() {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    sockets.push(ws);
    await once(ws, 'open');
    return ws;
  }
  function request(ws, type, payload = {}) {
    const requestId = `funded-${++serial}`;
    return new Promise((resolve, reject) => {
      const handler = raw => {
        const packet = JSON.parse(raw);
        if (packet.requestId !== requestId) return;
        clearTimeout(timer); ws.off('message', handler); resolve(packet);
      };
      const timer = setTimeout(() => { ws.off('message', handler); reject(Error(`Timed out: ${type}`)); }, 5000);
      ws.on('message', handler); ws.send(JSON.stringify({ type, requestId, payload }));
    });
  }
  async function login(ws, wallet) {
    const { payload } = await request(ws, 'profile_auth_challenge', { address: wallet.address });
    const response = await request(ws, 'profile_login', {
      address: wallet.address, name: 'Fixture Player', challenge: payload.challenge,
      signature: await wallet.signMessage(payload.challenge)
    });
    assert.equal(response.type, 'profile_login_result', response.payload?.message);
  }
  async function configure(updates) {
    const changed = once(child, 'message'); child.send({ env: updates }); await changed;
  }
  return { connect, request, login, configure, base: `http://127.0.0.1:${port}` };
}

test('a valid public wallet cannot create an internal funded room', { timeout: 15000 }, async t => {
  const approved = Wallet.createRandom(), outsider = Wallet.createRandom();
  const f = await fixture(t, { LOCKED_MATCH_INTERNAL_WALLETS: approved.address });
  const ws = await f.connect();
  await f.login(ws, outsider);
  const denied = await f.request(ws, 'room_create', { wallet: outsider.address, roomMode: 'high_stakes', visibility: 'public' });
  assert.equal(denied.type, 'error', 'A signed-in wallet must not gain internal funded access merely because internal mode is enabled.');
  assert.match(denied.payload.message, /internal.*access|not authorized|allowlist/i);
});

test('production socket guards use verified identity and stored funded mode; free rooms remain playable', { timeout: 20000 }, async t => {
  const owner = Wallet.createRandom(), tester = Wallet.createRandom(), outsider = Wallet.createRandom();
  const f = await fixture(t, { LOCKED_MATCH_INTERNAL_WALLETS: `${owner.address},${tester.address}` });
  const ownerWs = await f.connect(), testerWs = await f.connect(), outsiderWs = await f.connect(), anonymousWs = await f.connect();
  await f.login(ownerWs, owner); await f.login(testerWs, tester); await f.login(outsiderWs, outsider);
  const success = (reply, type) => assert.equal(reply.type, type, reply.payload?.message);
  const denied = reply => { assert.equal(reply.type, 'error'); assert.match(reply.payload.message, /funded|wallet|Login|session|switched off/i); };
  const created = await f.request(ownerWs, 'room_create', { wallet: owner.address, roomMode: 'high_stakes', visibility: 'public' });
  success(created, 'room_create_result');
  const roomCode = created.payload.room.roomCode;
  success(await f.request(testerWs, 'room_join', { wallet: tester.address, roomCode }), 'room_join_result');
  success(await f.request(ownerWs, 'spectate_room', { roomCode }), 'spectate_room_result');
  const listed = await f.request(ownerWs, 'room_list', { roomMode: 'high_stakes' });
  assert.ok(listed.payload.rooms.some(room => room.roomCode === roomCode));
  assert.deepEqual(listed.payload.fundedAuthorization, { policy: 'funded-access-v1', wallet: owner.address.toLowerCase(), chainId: 2741, mode: 'internal' });
  const current = await f.request(ownerWs, 'game_state', { wallet: owner.address, roomCode });
  assert.deepEqual(current.payload.fundedAuthorization, listed.payload.fundedAuthorization);
  denied(await f.request(anonymousWs, 'room_list', { roomMode: 'high_stakes', wallet: owner.address, role: 'operator' }));
  denied(await f.request(outsiderWs, 'room_list', { roomMode: 'high_stakes' }));
  denied(await f.request(outsiderWs, 'room_create', { wallet: owner.address, roomMode: 'high_stakes' }));
  for (const type of ['room_join', 'room_confirm_entry', 'room_select_team', 'game_state', 'game_roll_dice', 'game_select_square', 'game_end_turn', 'spectate_room', 'ap_game_state', 'ctl_game_state', 'sg_game_state', 'sy_game_state', 'sh_game_state', 'xq_game_state', 'ss_game_state', 'nif_game_state']) {
    denied(await f.request(outsiderWs, type, { wallet: outsider.address, roomCode, roomMode: 'open_ice', role: 'operator', team: 'red', row: 0, col: 0 }));
  }
  denied(await f.request(anonymousWs, 'spectate_room', { roomCode, wallet: owner.address }));
  const notLocked = await f.request(ownerWs, 'room_select_team', { wallet: owner.address, roomCode, team: 'red' });
  assert.equal(notLocked.type, 'error'); assert.match(notLocked.payload.message, /Lock your entry first/);
  const noVault = await f.request(ownerWs, 'room_confirm_entry', { wallet: owner.address, roomCode });
  assert.equal(noVault.type, 'error'); assert.match(noVault.payload.message, /vault is not configured/);
  // Claimed allowlisted identity without its private key cannot establish a session.
  const challenge = await f.request(anonymousWs, 'profile_auth_challenge', { address: owner.address });
  denied(await f.request(anonymousWs, 'profile_login', {
    address: owner.address, name: 'Forged Player', challenge: challenge.payload.challenge,
    signature: await outsider.signMessage(challenge.payload.challenge)
  }));

  const free = await f.request(outsiderWs, 'room_create', { wallet: outsider.address, roomMode: 'open_ice', visibility: 'public' });
  success(free, 'room_create_result');
  assert.equal(free.payload.room.entryWei, '0');
  const freeCode = free.payload.room.roomCode;
  success(await f.request(anonymousWs, 'spectate_room', { roomCode: freeCode }), 'spectate_room_result');
  success(await f.request(outsiderWs, 'room_select_team', { wallet: outsider.address, roomCode: freeCode, team: 'red' }), 'room_select_team_result');
  const filled = await f.request(outsiderWs, 'dev_fill_room', { wallet: outsider.address, roomCode: freeCode });
  success(filled, 'dev_fill_room_result'); assert.equal(filled.payload.room.playerCount, 4);

  // Remove an approved tester. Existing room codes/session state do not retain privilege.
  await f.configure({ LOCKED_MATCH_INTERNAL_WALLETS: owner.address });
  denied(await f.request(testerWs, 'game_state', { wallet: tester.address, roomCode }));
  const mine = await f.request(testerWs, 'my_rooms', { wallet: tester.address });
  success(mine, 'my_rooms_result'); assert.equal(mine.payload.rooms.some(room => room.roomCode === roomCode), false);
  await f.configure({ LOCKED_MATCH_MODE: 'off' });
  denied(await f.request(ownerWs, 'spectate_room', { roomCode }));
  success(await f.request(outsiderWs, 'game_state', { wallet: outsider.address, roomCode: freeCode }), 'game_state_result');
});

test('empty internal allowlist fails closed; operator HTTP routes retain header-only authorization', { timeout: 15000 }, async t => {
  const operatorKey = 'fixture-only-operator-'.repeat(3), wallet = Wallet.createRandom();
  const f = await fixture(t, { SETTLEMENT_OPERATOR_KEY: operatorKey, ETH_INDEXER_RUN_KEY: operatorKey });
  const ws = await f.connect(); await f.login(ws, wallet);
  assert.equal((await f.request(ws, 'room_create', { wallet: wallet.address, roomMode: 'high_stakes' })).type, 'error');
  for (const endpoint of ['/ops/settlement/rooms', '/ops/settlement/debug?roomCode=NONE', '/mainnet/preflight', '/indexer/run']) {
    for (const options of [{}, { headers: { Authorization: 'Bearer forged', 'X-Operator': 'true' } }]) {
      const response = await fetch(f.base + endpoint, options); assert.equal(response.status, 403, endpoint);
    }
  }
  const queryCredential = await fetch(f.base + '/ops/settlement/rooms?key=' + encodeURIComponent(operatorKey));
  assert.equal(queryCredential.status, 403);
  const preflight = await fetch(f.base + '/ops/settlement/rooms', { method: 'OPTIONS', headers: {
    Origin: 'https://antarcticgaming.co', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization'
  } });
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get('access-control-allow-headers'), /authorization/i);
  const untrusted = await fetch(f.base + '/ops/settlement/rooms', { method: 'OPTIONS', headers: { Origin: 'https://untrusted.example' } });
  assert.equal(untrusted.status, 403);
  const allowed = await fetch(f.base + '/ops/settlement/rooms', { headers: { Origin: 'https://antarcticgaming.co', Authorization: 'Bearer ' + operatorKey } });
  assert.equal(allowed.status, 200); assert.equal((await allowed.json()).ok, true);
});

test('malformed scalar identities return errors without terminating the production socket handler', { timeout: 15000 }, async t => {
  const f = await fixture(t), ws = await f.connect();
  for (const field of ['wallet', 'address', 'roomCode', 'name', 'challenge', 'signature', 'playerId', 'token']) {
    for (const value of [{ toString: null }, [], null, 42]) {
      const response = await f.request(ws, 'room_list', { [field]: value });
      assert.equal(response.type, 'error'); assert.match(response.payload.message, /Invalid identity or room/);
    }
  }
  const alive = await f.request(ws, 'room_list', { roomMode: 'open_ice' });
  assert.equal(alive.type, 'room_list_result'); assert.deepEqual(alive.payload.rooms, []);
});
