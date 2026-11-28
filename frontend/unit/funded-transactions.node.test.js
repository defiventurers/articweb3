import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { depositWithAuthorization, lockWithAuthorization } from '../src/network/fundedTransactions.js';

const wallet = '0x' + '1'.repeat(40), other = '0x' + '2'.repeat(40);
const match = '0x' + 'a'.repeat(64), contract = { address: '0x' + '3'.repeat(40), abi: [] };
const room = () => ({ roomMode: 'high_stakes', roomCode: 'TEST', contractMatchId: match, entryWei: '100', status: 'waiting', countdownStartTime: null, highStakesExpiresAt: 2000, players: [{ wallet, entryLocked: false }] });
const approval = () => ({ policy: 'funded-access-v1', wallet, chainId: 2741, mode: 'internal' });
const roomResponse = value => ({ room: value || room(), fundedAuthorization: approval() });
function fixture() {
  const calls = [], client = { account: { address: wallet }, chain: { id: 2741 }, writeContract: async tx => { calls.push(tx); return 'fixture-tx'; } };
  let context = { address: wallet, profileWallet: wallet, chainId: 2741, client };
  return {
    calls, client, context: () => context, setContext: value => { context = value; },
    deposit: options => depositWithAuthorization({ getContext: () => context, expectedChainId: 2741, contract, value: 100n, authorize: async () => ({ rooms: [], fundedAuthorization: approval() }), ...options }),
    lock: options => lockWithAuthorization({ getContext: () => context, expectedChainId: 2741, contract, room: room(), loadRoom: async () => roomResponse(), now: () => 1000, ...options })
  };
}

test('a denied funded deposit never reaches the wallet, while approval is requested for the exact wallet', async () => {
  const f = fixture();
  for (const error of ['Internal access denied', 'Locked mode is off', 'Socket is not authenticated']) {
    await assert.rejects(() => f.deposit({ authorize: async identity => { assert.equal(identity, wallet); throw Error(error); } }), new RegExp(error));
  }
  assert.equal(f.calls.length, 0);
  const order = [];
  const result = await f.deposit({ authorize: async identity => { order.push('authorized'); assert.equal(identity, wallet); return { fundedAuthorization: approval() }; }, onReady: () => { order.push('ready'); assert.equal(f.calls.length, 0); } });
  assert.equal(result, 'fixture-tx'); assert.deepEqual(order, ['authorized', 'ready']);
  assert.deepEqual(f.calls, [{ ...contract, functionName: 'deposit', value: 100n }]);
});

test('wallet, profile, client-account, chain changes and unmounting stop funding before any write', async () => {
  const invalid = [
    context => ({ ...context, address: other }),
    context => ({ ...context, profileWallet: other }),
    context => ({ ...context, chainId: 11124 }),
    context => ({ ...context, client: { ...context.client, account: { address: other } } }),
    context => ({ ...context, client: { ...context.client, chain: { id: 11124 } } }),
    () => null
  ];
  for (const change of invalid) {
    const f = fixture(); f.setContext(change(f.context()));
    await assert.rejects(() => f.deposit()); assert.equal(f.calls.length, 0);
  }
  for (const operation of ['deposit', 'lock']) {
    const f = fixture();
    const changeWallet = async () => {
      f.setContext({ ...f.context(), address: other, profileWallet: other, client: { ...f.client, account: { address: other } } });
      return roomResponse();
    };
    await assert.rejects(() => f[operation]({ authorize: changeWallet, loadRoom: changeWallet }), /wallet changed/);
    assert.equal(f.calls.length, 0);
  }
});

test('funded locks reject denied access, stale match/amount, missing membership, finished or already-locked rooms', async () => {
  const f = fixture();
  await assert.rejects(() => f.lock({ loadRoom: async () => { throw Error('Internal access revoked'); } }), /revoked/);
  const changes = [
    { roomCode: 'ELSE' }, { contractMatchId: '0x' + 'b'.repeat(64) }, { entryWei: '101' },
    { roomMode: 'open_ice' }, { players: [] }, { players: [{ wallet: other, entryLocked: false }] },
    { players: [{ wallet, entryLocked: true }] }, { status: 'cancelled' }, { status: 'playing' },
    { countdownStartTime: 1 }, { highStakesExpiresAt: 999 }
  ];
  for (const patch of changes) await assert.rejects(() => f.lock({ loadRoom: async () => roomResponse({ ...room(), ...patch }) }));
  assert.equal(f.calls.length, 0);
});

test('a freshly authorized matching room locks exactly its server-provided match and amount once', async () => {
  const f = fixture(); let reads = 0;
  const result = await f.lock({ loadRoom: async query => { reads++; assert.deepEqual(query, { roomCode: 'TEST', wallet }); return roomResponse(); } });
  assert.equal(reads, 1); assert.equal(result.txHash, 'fixture-tx'); assert.equal(result.wallet, wallet);
  assert.deepEqual(result.room, room());
  assert.deepEqual(f.calls, [{ ...contract, functionName: 'depositAndLock', args: [match], value: 100n }]);
});

test('the funded screen routes every new deposit/lock through the guarded helpers', async () => {
  const screen = await fs.readFile(new URL('../src/screens/HighStakesScreen.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(screen, /\.writeContract\s*\(/, 'Do not add a direct funded write that skips server authorization.');
  assert.match(screen, /await depositWithAuthorization\(/); assert.match(screen, /await lockWithAuthorization\(/);
  assert.match(screen, /getGameState\(\{ roomCode, profile: \{ wallet \}, withAuthorization: true \}\)/);
});

test('stale backend responses and authorization for another wallet or chain cannot authorize funding', async () => {
  const f = fixture();
  const responses = [
    {}, { rooms: [], launchBlocked: true }, { fundedAuthorization: { ...approval(), policy: 'old-policy' } },
    { fundedAuthorization: { ...approval(), wallet: other } }, { fundedAuthorization: { ...approval(), chainId: 11124 } },
    { fundedAuthorization: { ...approval(), mode: 'off' } }
  ];
  for (const response of responses) {
    await assert.rejects(() => f.deposit({ authorize: async () => response }), /server has not confirmed/);
    await assert.rejects(() => f.lock({ loadRoom: async () => ({ room: room(), ...response }) }), /server has not confirmed/);
  }
  assert.equal(f.calls.length, 0);
});
