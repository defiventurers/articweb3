const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const policy = require('../fundedAccess.js');
const { transformBackendSource } = require('../loadPrizeBackend.js');
const approved = ['1', '2', '3', '4'].map(value => '0x' + value.repeat(40));
const outsider = '0x' + '5'.repeat(40);

function withEnvironment(overrides, fn) {
  const saved = process.env;
  process.env = { ...saved, LOCKED_MATCH_MODE: 'internal', ABSTRACT_CHAIN_ID: '2741', HIGH_STAKES_ENABLED: 'true', LEGAL_PUBLIC_MAINNET_APPROVED: 'false', LOCKED_MATCH_INTERNAL_WALLETS: approved.join(','), ...overrides };
  try { return fn(); } finally { process.env = saved; }
}
function room() {
  return {
    roomMode: 'high_stakes', roomCode: 'TEST', contractMatchId: 'fixture-match', status: 'finished',
    players: Object.fromEntries(approved.map(wallet => [wallet, { wallet }])),
    payoutPlan: approved.map(wallet => ({ wallet, payoutWei: '0' }))
  };
}

test('internal mode accepts only authenticated allowlisted wallets and rejects malformed allowlists', () => {
  withEnvironment({}, () => {
    assert.equal(policy.walletBlockReason(approved[0].toUpperCase()), '');
    for (const wallet of [undefined, '', outsider, 'operator', '0x' + '0'.repeat(40)]) assert.ok(policy.walletBlockReason(wallet));
  });
  for (const value of ['', '*', 'not-a-wallet', `${approved[0]},*`, `${approved[0]},0x${'0'.repeat(40)}`]) {
    withEnvironment({ LOCKED_MATCH_INTERNAL_WALLETS: value }, () => assert.ok(policy.walletBlockReason(approved[0])));
  }
});

test('launch gates and explicit disable cannot be overridden by client or allowlist state', () => {
  for (const overrides of [
    { LOCKED_MATCH_MODE: 'off' },
    { LOCKED_MATCH_MODE: 'invalid' },
    { LOCKED_MATCH_MODE: 'internal', ABSTRACT_CHAIN_ID: '11124' },
    { LOCKED_MATCH_MODE: 'testnet', ABSTRACT_CHAIN_ID: '2741' },
    { LOCKED_MATCH_MODE: 'testnet', ABSTRACT_CHAIN_ID: '1' },
    { LOCKED_MATCH_MODE: 'testnet', ABSTRACT_CHAIN_ID: '46630' },
    { LOCKED_MATCH_MODE: 'testnet', ABSTRACT_CHAIN_ID: '999999' },
    { LOCKED_MATCH_MODE: 'testnet', ABSTRACT_CHAIN_ID: 'invalid' },
    { LOCKED_MATCH_MODE: 'public', LEGAL_PUBLIC_MAINNET_APPROVED: 'false' },
    { HIGH_STAKES_ENABLED: 'false', ETH_VAULT_ADDRESS: approved[0] }
  ]) withEnvironment(overrides, () => assert.ok(policy.walletBlockReason(approved[0])));
  withEnvironment({ LOCKED_MATCH_MODE: 'testnet', ABSTRACT_CHAIN_ID: '11124' }, () => assert.equal(policy.walletBlockReason(outsider), ''));
  withEnvironment({ LOCKED_MATCH_MODE: 'public', LEGAL_PUBLIC_MAINNET_APPROVED: 'true' }, () => assert.equal(policy.walletBlockReason(outsider), ''));
  withEnvironment({ HIGH_STAKES_ENABLED: '', ETH_VAULT_ADDRESS: '0x' + '0'.repeat(40) }, () => assert.equal(policy.highStakesEnabled(), false));
});

test('stored funded room mode wins over client claims and the guard leaves free traffic unchanged', () => {
  withEnvironment({}, () => {
    const rooms = new Map([['TEST', room()], ['FREE', { roomMode: 'open_ice' }]]);
    assert.ok(policy.messageBlockReason({}, 'spectate_room', { roomCode: 'test', wallet: approved[0], role: 'operator' }, rooms));
    assert.ok(policy.messageBlockReason({ authorizedWallet: outsider }, 'game_roll_dice', { roomCode: ' TEST ', roomMode: 'open_ice' }, rooms));
    assert.equal(policy.messageBlockReason({ authorizedWallet: approved[0] }, 'room_join', { roomCode: 'TEST' }, rooms), '');
    assert.equal(policy.messageBlockReason({}, 'spectate_room', { roomCode: 'FREE' }, rooms), '');
    assert.equal(policy.messageBlockReason({}, 'ap_room_create', { gameId: 'dominion' }, rooms), '');
    for (const value of [null, 42, [], { toString: null }]) {
      assert.match(policy.messageBlockReason({}, 'room_join', { roomCode: value }, rooms), /Invalid identity or room/);
    }
  });
});

test('revoked or anonymous sockets cannot receive funded room broadcasts, room lists or history', () => {
  withEnvironment({}, () => {
    const funded = room(), free = { roomMode: 'open_ice', roomCode: 'FREE' };
    const privatePacket = { type: 'room_state', payload: { room: funded } };
    assert.equal(policy.filterPacket({}, privatePacket), null);
    assert.equal(policy.filterPacket({ authorizedWallet: outsider }, privatePacket), null);
    assert.equal(policy.filterPacket({ authorizedWallet: approved[0] }, privatePacket), privatePacket);
    const denied = policy.filterPacket({}, { ...privatePacket, requestId: '1' });
    assert.equal(denied.type, 'error'); assert.equal(denied.payload.room, undefined);
    const mixed = { payload: { rooms: [funded, free], history: [funded, free] } };
    const filtered = policy.filterPacket({ authorizedWallet: outsider }, mixed);
    assert.deepEqual(filtered.payload.rooms, [free]); assert.deepEqual(filtered.payload.history, [free]);
    assert.equal(mixed.payload.rooms.length, 2, 'Do not mutate persisted records while filtering.');
    const freePacket = { payload: { room: free } }; assert.equal(policy.filterPacket({}, freePacket), freePacket);
  });
});

test('restored funded countdown and settlement require current launch and participant authorization', () => {
  withEnvironment({}, () => {
    assert.equal(policy.roomOperationBlockReason(room()), '');
    const old = room(); old.players[outsider] = { wallet: outsider };
    assert.ok(policy.roomOperationBlockReason(old));
    const substitutedPayout = room(); substitutedPayout.payoutPlan[0].wallet = outsider;
    assert.ok(policy.roomOperationBlockReason(substitutedPayout));
  });
  withEnvironment({ LOCKED_MATCH_MODE: 'off' }, () => {
    assert.ok(policy.roomOperationBlockReason(room()));
    assert.equal(policy.roomOperationBlockReason({ roomMode: 'open_ice' }), '');
  });
});

test('transformed settlement checks authorization before touching a signer or submitting a transaction', async () => {
  const source = transformBackendSource(fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8'));
  const signature = 'async function settleHighStakesIfPossible(room)';
  const functionSource = source.slice(source.indexOf(signature)).split('\n')[0];
  let providers = 0, submissions = 0;
  const context = {
    fundedAccess: policy, settlementReady: () => true, process: { env: { ETH_SETTLEMENT_SIGNER: 'fixture-not-a-key' } },
    ETH_VAULT_ADDRESS: approved[0], ABSTRACT_RPC_URL: 'http://127.0.0.1:1', ETH_VAULT_WRITE_ABI: [], SETTLEMENT_MAX_ATTEMPTS: 3,
    Provider: class { constructor() { providers++; } }, Wallet: class { address = approved[0]; },
    Contract: class {
      async gameServer() { return approved[0]; }
      async settleMatch() { submissions++; return { hash: 'fixture-tx', wait: async () => ({ status: 1 }) }; }
    }, normalizeSecret: value => value, walletOf: value => value.toLowerCase(),
    checkMatchSettled: async () => false, updateHistorySettlement() {}, audit() {}, broadcast() {},
    saveVaultActivity: async () => {}, settlementErrorMessage: () => 'fixture error'
  };
  vm.createContext(context); vm.runInContext(functionSource, context);
  const saved = process.env;
  try {
    process.env = { ...saved, LOCKED_MATCH_MODE: 'off', ABSTRACT_CHAIN_ID: '2741', HIGH_STAKES_ENABLED: 'true', LOCKED_MATCH_INTERNAL_WALLETS: approved.join(',') };
    await context.settleHighStakesIfPossible(room());
    assert.equal(providers, 0); assert.equal(submissions, 0);
    process.env.LOCKED_MATCH_MODE = 'internal'; process.env.LOCKED_MATCH_INTERNAL_WALLETS = '';
    await context.settleHighStakesIfPossible(room());
    assert.equal(providers, 0); assert.equal(submissions, 0);
    process.env.LOCKED_MATCH_INTERNAL_WALLETS = approved.join(',');
    const authorized = room(); await context.settleHighStakesIfPossible(authorized);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(providers, 1); assert.equal(submissions, 1); assert.equal(authorized.settlementStatus, 'settled');
    await context.settleHighStakesIfPossible(authorized); assert.equal(submissions, 1, 'Existing duplicate settlement guard remains effective.');
  } finally { process.env = saved; }
});
