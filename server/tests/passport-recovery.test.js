const test = require('node:test');
const assert = require('node:assert/strict');
const { deliverOne } = require('../antarcticPassportWorker');

const wallet = '0x1234567890123456789012345678901234567890';
const hash = '0x' + 'b'.repeat(64);

function fixture(kind = 'visa', patch = {}) {
  let job = { id: 'job', kind, claim_id: '0x' + 'a'.repeat(64), chain_id: 46630,
    wallet, egg_serial: 3, attempts: 1, lease_until: 180000, ...patch };
  const patches = [];
  const store = {
    claimJob: async () => ({ ...job }),
    updateJob: async (_id, update, lease) => {
      patches.push({ ...update, lease });
      job = { ...job, ...update, tx_hash: update.txHash || job.tx_hash };
    },
  };
  return { store, patches, job: () => job };
}

test('an existing on-chain Passport or Egg cannot be confirmed without its canonical mint receipt', async () => {
  for (const kind of ['visa', 'egg']) {
    const { store, patches } = fixture(kind);
    await deliverOne({ store, adapter: {
      chainId: 46630,
      lookup: async () => ({ recipient: wallet, tokenId: '3', confirmed: true }),
      recoverMint: async () => null,
      verifyPassport: async () => ({ confirmed: false }),
      verifyEgg: async () => ({ confirmed: false }),
      send: async () => assert.fail('An existing claim must never be reminted'),
    } });
    assert.equal(patches.at(-1).status, 'submitted');
    assert.equal(patches.at(-1).errorCode, 'MINT_RECEIPT_PENDING');
  }
});

test('broadcast-before-persist recovery saves the original verified receipt before confirming', async () => {
  for (const kind of ['visa', 'egg']) {
    const f = fixture(kind);
    let recovered = 0;
    const verify = async job => ({ confirmed: job.tx_hash === hash, chainId: 46630,
      wallet, tokenId: '3', transactionHash: job.tx_hash });
    await deliverOne({ store: f.store, adapter: {
      chainId: 46630,
      lookup: async () => ({ recipient: wallet, tokenId: '3', confirmed: true }),
      recoverMint: async () => { recovered++; return hash; },
      verifyPassport: verify, verifyEgg: verify,
      send: async () => assert.fail('Recovery must not submit a transaction'),
    } });
    assert.equal(recovered, 1);
    assert.equal(f.job().tx_hash, hash);
    assert.equal(f.patches.at(-1).status, 'confirmed');
    assert.ok(f.patches.findIndex(p => p.txHash === hash) < f.patches.length - 1);
    assert.deepEqual(f.patches.at(-1).lease, { attempts: 1, leaseUntil: 180000 });
  }
});

test('a stale or unrelated saved receipt is not enough and recovery never broadcasts', async () => {
  const f = fixture('visa', { tx_hash: '0x' + 'c'.repeat(64) });
  await deliverOne({ store: f.store, adapter: {
    chainId: 46630,
    lookup: async () => ({ recipient: wallet, tokenId: '3', confirmed: true }),
    verifyPassport: async () => ({ confirmed: false }),
    recoverMint: async () => null,
    send: async () => assert.fail('Must not replace an already-minted claim'),
  } });
  assert.equal(f.patches.at(-1).status, 'submitted');
  assert.equal(f.patches.at(-1).errorCode, 'MINT_RECEIPT_PENDING');
});

test('a late worker that loses its lease cannot downgrade a newer worker result', async () => {
  let writes = 0;
  const { job } = fixture();
  await deliverOne({ store: {
    claimJob: async () => job(),
    updateJob: async () => { writes++; throw Object.assign(Error('Lease lost'), { code: 'DELIVERY_LEASE_LOST' }); },
  }, adapter: {
    chainId: 46630,
    lookup: async () => null,
    send: async () => hash,
  } });
  assert.equal(writes, 1);
});

test('receipt evidence from another chain, wallet, token or transaction cannot confirm this job', async () => {
  const mismatches = [{ chainId: 11124 }, { wallet: '0x' + 'd'.repeat(40) },
    { tokenId: '4' }, { transactionHash: '0x' + 'e'.repeat(64) }];
  for (const mismatch of mismatches) {
    const f = fixture('visa', { tx_hash: hash });
    await deliverOne({ store: f.store, adapter: {
      chainId: 46630,
      lookup: async () => ({ recipient: wallet, tokenId: '3', confirmed: true }),
      verifyPassport: async () => ({ confirmed: true, chainId: 46630,
        wallet, tokenId: '3', transactionHash: hash, ...mismatch }),
      recoverMint: async () => null,
      send: async () => assert.fail('Existing claim must not be replaced'),
    } });
    assert.equal(f.patches.at(-1).status, 'submitted');
    assert.equal(f.patches.at(-1).errorCode, 'MINT_RECEIPT_PENDING');
  }
});

test('a reverted mint is blocked with its saved hash and never automatically rebroadcast', async () => {
  const f = fixture('visa', { tx_hash: hash });
  await deliverOne({ store: f.store, adapter: {
    chainId: 46630, lookup: async () => null, receipt: async () => ({ status: 0 }),
    send: async () => assert.fail('A saved failed transaction must not be replayed'),
  } });
  assert.equal(f.patches.at(-1).status, 'blocked');
  assert.equal(f.patches.at(-1).errorCode, 'TRANSACTION_REVERTED');
  assert.equal(f.job().tx_hash, hash);
});
