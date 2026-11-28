const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { Pool } = require('pg');
const { BrowserProvider, ContractFactory, Wallet } = require('ethers');
const { createPassportStore } = require('../antarcticPassportStore');
const { createAdapter, deliverOne } = require('../antarcticPassportWorker');

async function databaseFixture(t) {
  const url = process.env.AK_PASSPORT_TEST_DATABASE_URL;
  if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw Error('Use a disposable local test database.');
  const schema = 'passport_recovery_' + randomBytes(8).toString('hex');
  const admin = new Pool({ connectionString: url });
  await admin.query('CREATE SCHEMA ' + schema);
  const pools = [];
  const makeStore = () => {
    const pool = new Pool({ connectionString: url, options: '-c search_path=' + schema });
    pools.push(pool);
    return createPassportStore({ pool, eggsEnabled: true });
  };
  t.after(async () => {
    await Promise.all(pools.filter(pool => !pool.ended).map(pool => pool.end()));
    await admin.query('DROP SCHEMA ' + schema + ' CASCADE');
    await admin.end();
  });
  return { makeStore };
}

test('real PostgreSQL lease fencing rejects a late worker after another claim completes',
  { skip: !process.env.AK_PASSPORT_TEST_DATABASE_URL }, async t => {
    const { makeStore } = await databaseFixture(t), first = makeStore(), second = makeStore();
    const account = randomUUID();
    await first.register(account, { playerName: 'Lease Fixture', wallet: Wallet.createRandom().address,
      chainId: 46630, consentVersion: 'fixture', souvenir: false }, Date.now());
    const older = await first.claimJob(1000, 46630, ['visa']);
    assert.equal(older.attempts, 1);
    assert.equal(Number(older.lease_until), 181000);
    assert.equal(await second.claimJob(1001, 46630, ['visa']), null);
    const newer = await second.claimJob(181001, 46630, ['visa']);
    assert.equal(newer.attempts, 2);
    const lease = job => ({ attempts: job.attempts, leaseUntil: job.lease_until });
    await second.updateJob(newer.id, { status: 'confirmed', txHash: '0x' + 'b'.repeat(64),
      tokenId: '1', leaseUntil: 0 }, lease(newer));
    await assert.rejects(first.updateJob(older.id, { status: 'retry', txHash: '0x' + 'a'.repeat(64) }, lease(older)),
      error => error.code === 'DELIVERY_LEASE_LOST');
    const saved = await first.deliveryEvidence(account);
    assert.equal(saved.status, 'confirmed');
    assert.equal(saved.tx_hash, '0x' + 'b'.repeat(64));
  });

test('real PostgreSQL and local EVM recover Passport/Egg broadcast loss, delayed receipt and wrong saved hash without reminting',
  { skip: !process.env.AK_PASSPORT_TEST_DATABASE_URL, timeout: 60000 }, async t => {
    const { makeStore } = await databaseFixture(t), store = makeStore();
    const ganache = (await import('../../contracts/launch/node_modules/ganache/dist/node/core.js')).default;
    const local = ganache.provider({ logging: { quiet: true }, chain: { chainId: 46630 } });
    const provider = new BrowserProvider(local, undefined, { cacheTimeout: 0 });
    t.after(async () => { provider.destroy(); await local.disconnect(); });
    const { compile } = await import('../../contracts/launch/compile.mjs');
    const artifacts = compile(), owner = await provider.getSigner(0), ownerAddress = await owner.getAddress();
    const key = local.getInitialAccounts()[ownerAddress.toLowerCase()].secretKey;
    const passport = await new ContractFactory(artifacts.AntarcticPassport.abi, artifacts.AntarcticPassport.bytecode, owner)
      .deploy(ownerAddress, ownerAddress, 'https://fixture.invalid/passport/46630/');
    await passport.waitForDeployment();
    const egg = await new ContractFactory(artifacts.AntarcticMysteryEgg.abi, artifacts.AntarcticMysteryEgg.bytecode, owner)
      .deploy(ownerAddress, ownerAddress, await passport.getAddress(), 'https://fixture.invalid/egg/46630/');
    await egg.waitForDeployment();
    const config = { chainId: 46630, rpc: 'https://local.invalid', key,
      visa: await passport.getAddress(), egg: await egg.getAddress() };
    const adapter = await createAdapter(config, { provider });
    assert.equal((await adapter.preflight()).eggReady, true);
    const account = randomUUID(), player = Wallet.createRandom();
    const input = { playerName: 'Recovery Fixture', wallet: player.address, chainId: 46630,
      consentVersion: 'fixture', souvenir: false, walletProvider: 'para', campaign: 'first33-20261114' };
    await store.register(account, input, Date.parse('2026-11-14T01:00:00Z'));
    let now = 1000000, broadcasts = 0;
    const hashes = {};
    const loseHash = { ...adapter, send: async job => {
      broadcasts++;
      hashes[job.kind] = await adapter.send(job);
      throw Error('Synthetic process interruption after broadcast and before persistence');
    } };
    const readOnly = { ...adapter, send: async () => assert.fail('A known minted claim must not broadcast again') };

    for (const kind of ['visa', 'egg']) {
      await deliverOne({ store, adapter: loseHash, now: () => now });
      let row = await store.deliveryEvidence(account, kind);
      assert.equal(row.status, 'retry');
      assert.equal(row.tx_hash, null);
      now += 120000;
      await deliverOne({ store, adapter: readOnly, now: () => now });
      row = await store.deliveryEvidence(account, kind);
      assert.equal(row.status, 'submitted');
      assert.equal(row.tx_hash, null, 'One-block claim is not an accepted receipt');
      await local.request({ method: 'evm_mine', params: [] });
      now += 120000;
      await deliverOne({ store, adapter: readOnly, now: () => now });
      row = await store.deliveryEvidence(account, kind);
      assert.equal(row.status, 'confirmed');
      assert.equal(row.tx_hash, hashes[kind]);
      const proof = kind === 'visa' ? await adapter.verifyPassport(row) : await adapter.verifyEgg(row);
      assert.equal(proof.confirmed, true);
      assert.equal(proof.tokenId, '1');
      now += 120000;
    }
    assert.equal(broadcasts, 2);
    assert.equal(await passport.totalIssued(), 1n);
    assert.equal(await egg.mintedCount(), 1n);

    // An idempotent contract call succeeds without another mint Transfer. Its
    // receipt must not replace the original issuance evidence after a restart.
    const visaRow = await store.deliveryEvidence(account);
    const duplicate = await passport.mintVisa(player.address, visaRow.claim_id);
    await duplicate.wait();
    await local.request({ method: 'evm_mine', params: [] });
    await store.updateJob(visaRow.id, { status: 'retry', txHash: duplicate.hash, runAfter: 0, leaseUntil: 0 });
    const restarted = await createAdapter(config, { provider }), restartedStore = makeStore();
    assert.equal((await restarted.verifyPassport({ ...visaRow, tx_hash: duplicate.hash })).confirmed, false);
    await deliverOne({ store: restartedStore, adapter: { ...restarted, send: readOnly.send }, now: () => now });
    assert.equal((await store.deliveryEvidence(account)).tx_hash, hashes.visa);
    assert.equal((await store.deliveryEvidence(account)).status, 'confirmed');

    // Historical RPC failure leaves a visible retry, then resumes safely when
    // the RPC recovers; it cannot turn an existing claim into another send.
    const eggRow = await store.deliveryEvidence(account, 'egg');
    await store.updateJob(eggRow.id, { status: 'retry', txHash: null, runAfter: 0, leaseUntil: 0 });
    await deliverOne({ store, adapter: { ...readOnly, recoverMint: async () => { throw Error('Synthetic archive outage'); } }, now: () => now });
    assert.equal((await store.deliveryEvidence(account, 'egg')).status, 'retry');
    now += 3600000;
    await deliverOne({ store, adapter: readOnly, now: () => now });
    assert.equal((await store.deliveryEvidence(account, 'egg')).status, 'confirmed');
    assert.equal((await store.deliveryEvidence(account, 'egg')).tx_hash, hashes.egg);
    assert.equal(await passport.totalIssued(), 1n);
    assert.equal(await egg.mintedCount(), 1n);
    assert.equal((await passport.ownerOf(1)).toLowerCase(), player.address.toLowerCase());
    assert.equal((await egg.ownerOf(1)).toLowerCase(), player.address.toLowerCase());
  });
