const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {createPassportRoutes} = require('../antarcticPassport');

const error = (message, status = 400) => Object.assign(Error(message), {status});
const pathFor = token => '/passport/metadata/46630/' + token + '.json';
const evidence = {chainId: 46630, tokenId: '3', blockNumber: 100, blockHash: '0x' + 'ab'.repeat(32)};

test('existing on-chain Passport metadata survives a missing backend receipt association without inventing account achievements', async () => {
  let chainReads = 0, accountReads = 0;
  const routes = createPassportRoutes({
    store: {configured: true, confirmedToken: async () => null, close: async () => {}},
    accountStore: {get: async () => { accountReads++; throw Error('No associated account'); }},
    metadataReader: {get: async (chain, token) => { chainReads++; assert.equal(chain, 46630); assert.equal(token, '3'); return evidence; }, close() {}},
  });
  try {
    const data = await routes.route({path: pathFor('3'), method: 'GET', error});
    assert.equal(data.name, 'Antarctic Passport #3');
    assert.equal(data.image, 'https://articweb3.onrender.com/arctic-play/app/art/passport-book-v2/company-passport-cover.webp');
    assert.deepEqual(data.attributes, [{trait_type: 'Network', value: 'Robinhood Chain Testnet'}]);
    assert.equal(data.properties.personalData, 'excluded');
    assert.equal(data.properties.tokenId, '3');
    assert.equal(Object.hasOwn(data.properties, 'updatedAt'), false);
    assert.equal(chainReads, 1);
    assert.equal(accountReads, 0);
  } finally { await routes.close(); }
});

test('confirmed backend associations keep their existing metadata and never need chain fallback', async () => {
  const at = Date.parse('2026-11-12T13:27:55Z');
  const routes = createPassportRoutes({
    store: {configured: true, confirmedToken: async () => ({account_id: 'private-account', created_at: at}), close: async () => {}},
    accountStore: {get: async () => ({identity: {email: 'private@example.test'}, gameWallet: {address: 'private-wallet'}})},
    metadataReader: {get: async () => { throw Error('Unexpected fallback'); }, close() {}},
  });
  try {
    const data = await routes.route({path: pathFor('3'), method: 'GET', error});
    assert.equal(data.attributes.find(a => a.trait_type === 'Arrival').value, new Date(at).toISOString());
    assert.equal(data.properties.updatedAt, at);
    for (const value of ['private-account', 'private@example.test', 'private-wallet']) assert.equal(JSON.stringify(data).includes(value), false);
  } finally { await routes.close(); }
});

test('missing tokens return 404, and configured database outages do not fall through to fabricated metadata', async () => {
  let outage = false, reads = 0;
  const routes = createPassportRoutes({
    store: {configured: true, confirmedToken: async () => { if (outage) throw Error('private database detail'); return null; }, close: async () => {}},
    metadataReader: {get: async () => { reads++; return null; }, close() {}},
  });
  try {
    await assert.rejects(routes.route({path: pathFor('999'), method: 'GET', error}), e => e.status === 404);
    assert.equal(reads, 1);
    outage = true;
    await assert.rejects(routes.route({path: pathFor('3'), method: 'GET', error}), e => e.status === 503 && !e.message.includes('private'));
    assert.equal(reads, 1);
  } finally { await routes.close(); }
});

test('Passport metadata recovery remains readable through the actual paused company HTTP route while writes remain blocked', async t => {
  const prior = process.env.AK_LAUNCH_RESET_PAUSED;
  process.env.AK_LAUNCH_RESET_PAUSED = 'true';
  const {createCompanyService} = require('../companyService');
  const service = createCompanyService({
    store: {get: async () => null, init: async () => {}, close: async () => {}, transact: async () => { throw Error('No writes authorized'); }},
    passportOptions: {
      store: {configured: true, confirmedToken: async () => null, close: async () => {}},
      metadataReader: {get: async (chain, token) => chain === 46630 && token === '3' ? evidence : null, close() {}},
    },
  });
  const server = http.createServer(service.handleHttp);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await service.close();
    if (prior === undefined) delete process.env.AK_LAUNCH_RESET_PAUSED;
    else process.env.AK_LAUNCH_RESET_PAUSED = prior;
  });
  const base = 'http://127.0.0.1:' + server.address().port + '/arctic-play/v3';
  const response = await fetch(base + pathFor('3'));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^application\/json/);
  assert.equal((await response.json()).name, 'Antarctic Passport #3');
  assert.equal((await fetch(base + pathFor('999'))).status, 404);
  for (const token of ['0', '-1', '03', '1e3', '3' + '0'.repeat(31)]) assert.equal((await fetch(base + pathFor(token))).status, 404);
  const write = await fetch(base + '/passport', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'});
  assert.equal(write.status, 503);
  assert.equal((await write.json()).code, 'LAUNCH_RESET_PAUSED');
});
