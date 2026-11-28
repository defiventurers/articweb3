const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { createServer } = require('node:net');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const WebSocket = require('ws');
const { localTestDatabaseUrl } = require('./local-test-database.cjs');

async function startFreeBackend(t, { databaseUrl = '', companyFile = '', fairKey = null } = {}) {
  if (databaseUrl) localTestDatabaseUrl(databaseUrl);
  const reserved = createServer(); reserved.listen(0, '127.0.0.1'); await once(reserved, 'listening');
  const port = reserved.address().port; await new Promise(resolve => reserved.close(resolve));
  const boot = `
    require('dotenv').config = () => ({parsed:{}});
    globalThis.fetch = async () => { throw Error('External network disabled in free multiplayer fixture.'); };
    const http = require('node:http'), listen = http.Server.prototype.listen;
    http.Server.prototype.listen = function(port, callback) { return listen.call(this, port, '127.0.0.1', callback); };
    const tiers = require('./highStakesTiers'); tiers.refreshHighStakesTierSnapshot = async () => tiers.getHighStakesTierSnapshot();
    if(process.env.FONSO_MULTIPLAYER_COMPANY_FILE || process.env.FONSO_MULTIPLAYER_FAIR_KEY) {
      const module = require('./arcticPlayService'), create = module.createArcticPlayService;
      const privateKey = process.env.FONSO_MULTIPLAYER_FAIR_KEY ? JSON.parse(process.env.FONSO_MULTIPLAYER_FAIR_KEY) : null;
      const store = process.env.FONSO_MULTIPLAYER_COMPANY_FILE ? require('./companyStore').createCompanyStore({file:process.env.FONSO_MULTIPLAYER_COMPANY_FILE,development:true}) : undefined;
      module.createArcticPlayService = options => create({...options,
        ...(store ? {companyOptions:{store}} : {}),
        ...(privateKey ? {fairOptions:{privateKey,trustedKeys:[privateKey]}} : {})});
    }
    require('./scripts/start-with-runtime-status.js');
  `;
  // Deliberately do not inherit cloud credentials, database URLs or Node hooks.
  const child = spawn(process.execPath, ['-r', './allGamesBackendBootstrap.js', '-e', boot], {
    cwd: path.resolve(__dirname, '../..'), stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, NODE_ENV: 'test', TZ: 'UTC', PORT: String(port),
      DATABASE_URL: databaseUrl, DATABASE_SSL: 'false', ETH_SETTLEMENT_SIGNER: '', ETH_VAULT_ADDRESS: '', VITE_ETH_VAULT_ADDRESS: '',
      HIGH_STAKES_ENABLED: 'false', LOCKED_MATCH_MODE: 'off', LEGAL_PUBLIC_MAINNET_APPROVED: 'false', LOCKED_MATCH_INTERNAL_WALLETS: '',
      ETH_INDEXER_AUTO_RUN: 'false', ETH_INDEXER_SCHEDULED_RUN: 'false', ETH_INDEXER_HEARTBEAT: 'false',
      AK_PASSPORT_RUNTIME_ENABLED: 'false', AK_RH_EVENT_INDEX_ENABLED: 'false', AK_VISA_DELIVERY_ENABLED: 'false',
      AK_EARLY_AUTO_ENROLL_ENABLED: 'false', AK_LAUNCH_RESET_PAUSED: 'false', AK_RAZORPAY_ENABLED: 'false',
      AK_FAIR_ANCHOR_ENABLED: 'false', AK_FAIR_MAINNET_ENABLED: 'false', AK_FAIR_RELAYER_KEY: '', AK_FAIR_REGISTRY_ADDRESS: '',
      WS_AUTH_LIMIT: '100', WS_ACTION_LIMIT: '1000', WS_ROOM_CREATE_LIMIT: '100',
      FONSO_MULTIPLAYER_COMPANY_FILE: companyFile,
      FONSO_MULTIPLAYER_FAIR_KEY: fairKey ? JSON.stringify(fairKey) : '' },
  });
  let output = ''; const clients = [];
  child.stdout.on('data', data => { output = (output + data).slice(-12000); });
  child.stderr.on('data', data => { output = (output + data).slice(-12000); });
  async function close() {
    for (const client of clients) client.ws.terminate();
    if (child.exitCode === null && child.signalCode === null) { child.kill(); await once(child, 'exit'); }
  }
  t.after(close);
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let n = 0; n < 160; n++) {
      if (child.exitCode !== null || child.signalCode !== null) throw Error('Local multiplayer backend stopped before startup: ' + output);
      try { const response = await fetch(base + (databaseUrl ? '/readyz' : '/healthz')); ready = response.status === 200; if (ready) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.equal(ready, true, 'Production startup and its configured database must become ready.');
    const launch = await (await fetch(base + '/launch/status')).json();
    assert.equal(launch.highStakesAllowed, false, 'Funded games must stay disabled in the fixture.');
  } catch (error) { await close(); throw error; }
  async function connect() {
    const ws = new WebSocket(base.replace('http:', 'ws:')), packets = [];
    ws.on('message', raw => packets.push(JSON.parse(raw)));
    await once(ws, 'open');
    function waitFor(predicate, after = 0) {
      const found = packets.slice(after).find(predicate); if (found) return Promise.resolve(found);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { ws.off('message', handler); reject(Error('Local socket response timed out.')); }, 5000);
        function handler(raw) { const packet = JSON.parse(raw); if (!predicate(packet)) return; clearTimeout(timer); ws.off('message', handler); resolve(packet); }
        ws.on('message', handler);
      });
    }
    function request(type, payload = {}, requestId = randomUUID()) {
      const reply = waitFor(packet => packet.requestId === requestId, packets.length);
      ws.send(JSON.stringify({ type, requestId, payload })); return reply;
    }
    const client = { ws, packets, waitFor, request,
      async close() { if (ws.readyState === WebSocket.CLOSED) return; const ended = once(ws, 'close'); ws.close(); await ended; } };
    clients.push(client); return client;
  }
  async function login(client, wallet, name = 'Fixture Player') {
    const challenge = await client.request('profile_auth_challenge', { address: wallet.address });
    assert.equal(challenge.type, 'profile_auth_challenge_result');
    const response = await client.request('profile_login', { address: wallet.address, name,
      challenge: challenge.payload.challenge, signature: await wallet.signMessage(challenge.payload.challenge) });
    assert.equal(response.type, 'profile_login_result', response.payload?.message);
  }
  return { base, connect, login, close, output: () => output };
}

module.exports = { startFreeBackend };
