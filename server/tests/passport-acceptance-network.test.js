const test = require('node:test');
const assert = require('node:assert/strict');
const {createPassportRoutes} = require('../antarcticPassport');

test('Egg acceptance binds confirmed receipt evidence to the registered wallet network as well as wallet and edition', async () => {
  const wallet = '0x' + '12'.repeat(20);
  let receiptChain = 11124;
  const routes = createPassportRoutes({
    chainId: 46630,
    store: {get: async () => ({wallet, chainId: 46630, eggSerial: 3}), close: async () => {}},
    deliveryRuntime: {
      status: () => ({ready: true}),
      verifyEgg: async () => ({confirmed: true, chainId: receiptChain, wallet, tokenId: '3'}),
    },
  });
  const ctx = {path: '/passport/egg/acceptance', method: 'GET', req: {},
    authenticated: async (_request, fn) => fn({id: 'account', gameWallet: {provider: 'para', address: wallet, chainId: 46630}})};
  try {
    assert.equal((await routes.route(ctx)).confirmed, false);
    receiptChain = 46630;
    assert.equal((await routes.route(ctx)).confirmed, true);
  } finally { await routes.close(); }
});
