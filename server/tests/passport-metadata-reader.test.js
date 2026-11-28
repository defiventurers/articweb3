const test = require('node:test');
const assert = require('node:assert/strict');
const {REVIEWED_PASSPORT, metadataReaderConfig, createPassportMetadataReader} = require('../passportMetadataReader');

let reviewedCode;
test.before(async () => {
  const {compile} = await import('../../contracts/launch/compile.mjs');
  reviewedCode = compile().AntarcticPassport.runtimeBytecode;
});

function fixture(options = {}) {
  const state = {chainId: 46630n, code: reviewedCode, issued: 20n, safeIssued: 20n,
    owner: '0x' + '12'.repeat(20), safeOwner: '0x' + '12'.repeat(20), uriBase: REVIEWED_PASSPORT.metadataBase,
    safeUriBase: REVIEWED_PASSPORT.metadataBase, reorg: false, blockReads: 0, providers: 0,
    destroyed: 0, ownerReads: 0, clock: 1000, failure: false};
  const provider = {
    getNetwork: async () => { if (state.failure) throw Error('secret RPC credential must not escape'); return {chainId: state.chainId}; },
    getCode: async address => { assert.equal(address, REVIEWED_PASSPORT.address); return state.code; },
    getBlockNumber: async () => 101,
    getBlock: async number => { assert.equal(number, 100); state.blockReads++; return {hash: '0x' + (state.reorg && state.blockReads % 2 === 0 ? 'bb' : 'aa').repeat(32)}; },
    destroy: () => { state.destroyed++; },
  };
  const contract = {
    totalIssued: async opts => opts?.blockTag === 100 ? state.safeIssued : state.issued,
    ownerOf: async (token, opts) => { state.ownerReads++; assert.match(token, /^[1-9]\d*$/); return opts?.blockTag === 100 ? state.safeOwner : state.owner; },
    tokenURI: async (token, opts) => (opts?.blockTag === 100 ? state.safeUriBase : state.uriBase) + token + '.json',
  };
  const reader = createPassportMetadataReader({env: {}, now: () => state.clock,
    providerFactory: () => { state.providers++; return provider; },
    contractFactory: (address, supplied) => { assert.equal(address, REVIEWED_PASSPORT.address); assert.equal(supplied, provider); return contract; },
    ...options,
  });
  return {state, reader, provider, contract};
}
const isUnavailable = e => e.status === 503 && e.message === 'Passport metadata verification is temporarily unavailable.';

test('metadata configuration is read-only, pins the existing collection and does not borrow another chain configuration', () => {
  const env = new Proxy({AK_VISA_CHAIN_ID: '11124', AK_VISA_CONTRACT: '0x' + '34'.repeat(20), AK_VISA_RPC_URL: 'https://wrong-network.invalid'}, {
    get(target, key) { assert.doesNotMatch(String(key), /KEY|SIGNER|DELIVERY_ENABLED|RUNTIME_ENABLED/); return target[key]; },
  });
  assert.deepEqual(metadataReaderConfig(env), {chainId: 46630, address: REVIEWED_PASSPORT.address, rpc: 'https://rpc.testnet.chain.robinhood.com'});
  assert.equal(metadataReaderConfig({AK_VISA_RPC_URL_46630: 'https://configured-provider.invalid'}).rpc, 'https://configured-provider.invalid');
  assert.throws(() => metadataReaderConfig({AK_VISA_CONTRACT_46630: '0x' + '34'.repeat(20)}), isUnavailable);
  assert.throws(() => metadataReaderConfig({AK_VISA_RPC_URL_46630: 'http://insecure.invalid'}), isUnavailable);
});

test('reviewed code, current and two-block owners, intended URI and canonical block are required for existing-token metadata', async t => {
  const {reader, state} = fixture(); t.after(() => reader.close());
  assert.deepEqual(await reader.get(46630, '3'), {chainId: 46630, tokenId: '3', blockNumber: 100, blockHash: '0x' + 'aa'.repeat(32)});
  assert.equal(state.ownerReads, 2); assert.equal(state.blockReads, 2); assert.equal(state.destroyed, 1);
});

test('wrong chain, altered code, empty code, unstable ownership, wrong URI, pending confirmations and reorg all fail closed', async t => {
  for (const changes of [
    {chainId: 4663n}, {code: '0x00'}, {code: '0x'}, {safeOwner: '0x' + '34'.repeat(20)},
    {owner: '0x' + '00'.repeat(20)}, {uriBase: 'https://unrelated.invalid/'},
    {safeUriBase: 'https://unrelated.invalid/'}, {safeIssued: 2n}, {reorg: true}, {failure: true},
  ]) {
    await t.test(Object.keys(changes).join(','), async () => {
      const {reader, state} = fixture(); Object.assign(state, changes);
      try { await assert.rejects(reader.get(46630, '3'), isUnavailable); assert.equal(state.destroyed, 1); }
      finally { await reader.close(); }
    });
  }
});

test('nonexistent tokens stay absent; invalid token IDs and unsupported chains cannot trigger RPC', async t => {
  const {reader, state} = fixture(); t.after(() => reader.close());
  for (const token of ['0', '-1', '03', '1e3', '1' + '0'.repeat(31), '3.json']) assert.equal(await reader.get(46630, token), null);
  assert.equal(await reader.get(11124, '3'), null); assert.equal(state.providers, 0);
  assert.equal(await reader.get(46630, '999'), null); assert.equal(state.ownerReads, 0); assert.equal(state.providers, 1);
});

test('requests coalesce and bounded positive/negative caches expire instead of accumulating arbitrary token IDs', async t => {
  const {reader, state} = fixture({maxCacheEntries: 2}); t.after(() => reader.close());
  const values = await Promise.all(Array.from({length: 10}, () => reader.get(46630, '3')));
  assert.equal(values.every(value => value.tokenId === '3'), true); assert.equal(state.providers, 1);
  await reader.get(46630, '3'); assert.equal(state.providers, 1);
  await reader.get(46630, '4'); await reader.get(46630, '5');
  await reader.get(46630, '3'); assert.equal(state.providers, 4);
  state.clock += 30001; await reader.get(46630, '3'); assert.equal(state.providers, 5);
  await reader.get(46630, '999'); await reader.get(46630, '999'); assert.equal(state.providers, 6);
  state.clock += 5001; await reader.get(46630, '999'); assert.equal(state.providers, 7);
});

test('in-flight limits and deadlines bound failing RPC work, destroy providers and return only safe errors', async t => {
  const {reader, state, provider} = fixture({maxInFlight: 2, timeoutMs: 25}); t.after(() => reader.close());
  provider.getNetwork = () => new Promise(() => {});
  const first = assert.rejects(reader.get(46630, '3'), isUnavailable);
  const second = assert.rejects(reader.get(46630, '4'), isUnavailable);
  await assert.rejects(reader.get(46630, '5'), isUnavailable);
  await Promise.all([first, second]);
  assert.equal(state.providers, 2); assert.equal(state.destroyed, 2);
  // Short failure cooldown also bounds sequential retries during an outage.
  await assert.rejects(reader.get(46630, '6'), isUnavailable); assert.equal(state.providers, 2);
  state.clock += 2001; provider.getNetwork = async () => ({chainId: 46630n});
  assert.equal((await reader.get(46630, '3')).tokenId, '3'); assert.equal(state.providers, 3);
});

test('closing the reader forbids further RPC calls', async () => {
  const {reader, state} = fixture(); await reader.close();
  await assert.rejects(reader.get(46630, '3'), isUnavailable); assert.equal(state.providers, 0);
});
