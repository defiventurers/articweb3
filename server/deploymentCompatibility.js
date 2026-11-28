// Read-only release evidence. This module never creates accounts, rooms or chain
// transactions, and does not confuse a matching commit with a compatible API.
const { createHash } = require('node:crypto');

const ENDPOINTS = Object.freeze({
  games: '/arctic-play/health',
  cloud: '/arctic-play/v3/capabilities',
  para: '/arctic-play/v3/auth/para/config',
  fair: '/arctic-play/v3/fair/config',
  launch: '/launch/status',
  legacy: '/health'
});
const fullCommit = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && /^[a-zA-Z0-9._:-]{1,100}$/.test(value) ? value : null;
const bool = value => typeof value === 'boolean' ? value : null;
const integer = value => Number.isSafeInteger(value) ? value : null;

function publicKeyId(key) {
  if (!record(key) || key.kty !== 'EC' || key.crv !== 'P-256' ||
      !/^[A-Za-z0-9_-]{43}$/.test(key.x || '') || !/^[A-Za-z0-9_-]{43}$/.test(key.y || '')) return null;
  return createHash('sha256').update(JSON.stringify({ kty: key.kty, crv: key.crv, x: key.x, y: key.y })).digest('hex');
}

function reviewedRequirements({ backendCommit, paraEnvironment, paraChainId } = {}) {
  if (!fullCommit(backendCommit)) throw Error('A full reviewed backend commit is required.');
  if (!['BETA', 'PRODUCTION'].includes(paraEnvironment) || !Number.isSafeInteger(paraChainId) || paraChainId < 1) {
    throw Error('The reviewed Para environment and chain ID are required.');
  }
  const engine = require('./arcticPlayGames.cjs');
  const manifest = require('../shared/fair-play/rules-manifest.json');
  const trust = require('../shared/fair-play/trust.json');
  return {
    backendCommit,
    gameVersion: engine.VERSION,
    games: engine.GAME_LIST.map(({ id, players }) => ({ id, players })),
    capabilities: ['chaturanga-long-dice-v1', 'dominion-teams-v1', 'browser-play-v1',
      'fair-play-v1', 'hall-access-v1', 'account-play-v1', 'shanshui-antarctic-v1'],
    cloudVersion: 2,
    para: { provider: 'para', environment: paraEnvironment, chainId: paraChainId },
    fair: { protocol: manifest.protocol, rulesHash: manifest.rulesHash, serverKeyIds: trust.keys.map(publicKeyId).filter(Boolean) }
  };
}

// Select safe, bounded operational fields. In particular, never persist an API
// key, session, RPC URL, database binding, error stack or arbitrary response body.
function publicFields(kind, body) {
  if (!record(body)) return null;
  if (body.code === 'LAUNCH_RESET_PAUSED' && body.paused === true) return { code: body.code, paused: true };
  if (kind === 'games') return {
    ok: bool(body.ok), version: text(body.version), buildCommit: fullCommit(body.buildCommit) ? body.buildCommit : null,
    capabilities: Array.isArray(body.capabilities) && body.capabilities.length <= 100 ? body.capabilities.map(text) : null,
    games: Array.isArray(body.games) && body.games.length <= 100 ? body.games.map(game => ({ id: text(game?.id), players: integer(game?.players) })) : null
  };
  if (kind === 'cloud') return { version: integer(body.version), cloud: bool(body.cloud), accountPlay: bool(body.accountPlay), commerce: bool(body.commerce) };
  if (kind === 'para') return { enabled: bool(body.enabled), provider: text(body.provider), environment: text(body.environment), chainId: integer(body.chainId) };
  if (kind === 'fair') return {
    enabled: bool(body.enabled), protocol: text(body.protocol),
    rulesHash: typeof body.rulesHash === 'string' && /^[a-f0-9]{64}$/.test(body.rulesHash) ? body.rulesHash : null,
    serverKeyId: publicKeyId(body.serverKey), payouts: bool(body.payouts)
  };
  if (kind === 'launch') return {
    ok: bool(body.ok), mode: text(body.mode), lockedMatchMode: text(body.lockedMatchMode),
    chainId: integer(body.chainId), highStakesAllowed: bool(body.highStakesAllowed),
    legalPublicMainnetApproved: bool(body.legalPublicMainnetApproved)
  };
  if (kind === 'legacy') return { ok: bool(body.ok), chainId: integer(body.chainId), highStakesEnabled: bool(body.highStakesEnabled) };
  return null;
}

function checkedBase(value) {
  let url;
  try { url = new URL(value); } catch { throw Error('Provide an HTTPS service origin or an HTTP loopback origin.'); }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw Error('Provide an HTTPS service origin or an HTTP loopback origin without credentials or a path.');
  }
  return url.origin;
}

async function readPublicEndpoint(base, kind, { fetcher = fetch, timeoutMs = 10000, maxBytes = 65536 } = {}) {
  const result = { path: ENDPOINTS[kind], status: null, contentType: null, body: null, error: null };
  try {
    const response = await fetcher(base + result.path, { method: 'GET', redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) });
    result.status = response.status;
    const mediaType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    result.contentType = mediaType === 'application/json' ? 'application/json' : 'other';
    if (response.redirected || response.status >= 300 && response.status < 400) { await response.body?.cancel(); result.error = 'UNEXPECTED_REDIRECT'; return result; }
    if (result.contentType !== 'application/json') { await response.body?.cancel(); result.error = 'EXPECTED_JSON'; return result; }
    const reader = response.body?.getReader();
    if (!reader) { result.error = 'MISSING_BODY'; return result; }
    let bytes = 0;
    const chunks = [];
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBytes) { await reader.cancel(); result.error = 'RESPONSE_TOO_LARGE'; return result; }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { result.error = 'INVALID_JSON'; return result; }
    result.body = publicFields(kind, body);
    if (!result.body) result.error = 'INVALID_SCHEMA';
  } catch (error) {
    result.error = ['TimeoutError', 'AbortError'].includes(error.name) ? 'TIMEOUT' : 'REQUEST_FAILED';
  }
  return result;
}

function assessCompatibility(responses, expected) {
  const checks = [];
  const add = (name, status, reason) => checks.push({ name, status, reason });
  const compare = (name, actual, wanted) => add(name, actual === null || actual === undefined ? 'unresolved' : actual === wanted ? 'pass' : 'incompatible',
    actual === null || actual === undefined ? 'Required field is missing or malformed.' : actual === wanted ? 'Matches the reviewed client contract.' : 'Differs from the reviewed client contract.');
  function body(kind) {
    const response = responses[kind];
    if (response?.status === 503 && response?.body?.code === 'LAUNCH_RESET_PAUSED' && response.body.paused === true) {
      add(kind + '.response', 'unresolved', 'Launch pause hides this interface; do not infer its runtime authority.'); return null;
    }
    if (!response || response.error || response.status !== 200 || response.contentType !== 'application/json' || !record(response.body)) {
      add(kind + '.response', 'unresolved', 'An exact 200 JSON response with the expected schema is required.'); return null;
    }
    return response.body;
  }
  const games = body('games');
  if (games) {
    compare('games.ok', games.ok, true);
    // A different commit is an evidence mismatch, not proof of a broken API.
    add('backend.commit', games.buildCommit === expected.backendCommit ? 'pass' : 'unresolved',
      games.buildCommit === expected.backendCommit ? 'Matches the reviewed backend deployment.' : 'Reconcile deployment identity before assessing this candidate.');
    compare('games.version', games.version, expected.gameVersion);
    if (!Array.isArray(games.capabilities) || games.capabilities.some(v => !v)) add('games.capabilities', 'unresolved', 'Capability schema is invalid.');
    else for (const capability of expected.capabilities) add('capability.' + capability, games.capabilities.includes(capability) ? 'pass' : 'blocked',
      games.capabilities.includes(capability) ? 'Required capability is advertised.' : 'Required capability is unavailable; investigate the build and configuration.');
    if (!Array.isArray(games.games) || games.games.some(g => !g.id || !Number.isSafeInteger(g.players))) add('games.catalogue', 'unresolved', 'Catalogue schema is invalid.');
    else {
      const actual = new Map(games.games.map(g => [g.id, g.players]));
      const match = actual.size === games.games.length && expected.games.every(g => actual.get(g.id) === g.players);
      add('games.catalogue', match ? 'pass' : 'incompatible', match ? 'All reviewed game IDs and seat counts are preserved.' : 'A required game ID or seat count differs.');
    }
  }
  const cloud = body('cloud');
  if (cloud) {
    compare('cloud.version', cloud.version, expected.cloudVersion);
    for (const field of ['cloud', 'accountPlay']) add('cloud.' + field, cloud[field] === true ? 'pass' : cloud[field] === false ? 'blocked' : 'unresolved',
      cloud[field] === true ? 'Required account capability is available.' : 'Required account capability is unavailable or unknown.');
    // Commerce includes non-match purchases; it is not the funded-game switch.
    add('cloud.commerceSchema', typeof cloud.commerce === 'boolean' ? 'pass' : 'unresolved',
      typeof cloud.commerce === 'boolean' ? 'The existing commerce flag has the expected boolean shape.' : 'Commerce capability schema is unknown.');
  }
  const para = body('para');
  if (para) {
    for (const key of ['provider', 'environment', 'chainId']) compare('para.' + key, para[key], expected.para[key]);
    add('para.enabled', para.enabled === true ? 'pass' : para.enabled === false ? 'blocked' : 'unresolved', para.enabled === true ? 'Configured sign-in is advertised; consent is not exercised by this probe.' : 'Required sign-in is unavailable or unknown.');
  }
  const fair = body('fair');
  if (fair) {
    compare('fair.protocol', fair.protocol, expected.fair.protocol);
    compare('fair.rulesHash', fair.rulesHash, expected.fair.rulesHash);
    add('fair.serverKey', fair.serverKeyId && expected.fair.serverKeyIds.includes(fair.serverKeyId) ? 'pass' : 'unresolved',
      fair.serverKeyId && expected.fair.serverKeyIds.includes(fair.serverKeyId) ? 'The advertised public key is pinned by the reviewed client.' : 'The advertised recording key is missing or is not pinned.');
    add('fair.enabled', fair.enabled === true ? 'pass' : fair.enabled === false ? 'blocked' : 'unresolved', fair.enabled === true ? 'Proof recording is advertised; independent proof replay is a separate acceptance check.' : 'Proof recording is unavailable or unknown.');
    compare('free.fairPayoutsDisabled', fair.payouts, false);
  }
  const launch = body('launch');
  if (launch) {
    compare('launch.ok', launch.ok, true);
    const held = launch.mode === 'off' && launch.lockedMatchMode === 'off' && launch.highStakesAllowed === false && launch.legalPublicMainnetApproved === false;
    add('free.launchGate', held ? 'pass' : 'blocked', held ? 'The proposed free-release launch switches are closed.' : 'The free-release launch policy requires off mode and public/funded permission disabled.');
  }
  const legacy = body('legacy');
  if (legacy) {
    compare('legacy.ok', legacy.ok, true);
    add('free.highStakesDisabled', legacy.highStakesEnabled === false ? 'pass' : legacy.highStakesEnabled === true ? 'blocked' : 'unresolved',
      legacy.highStakesEnabled === false ? 'The legacy server reports high stakes disabled.' : 'The legacy funded switch is enabled or unknown.');
    if (launch) compare('legacy.launchChainAgreement', legacy.chainId, launch.chainId);
  }
  return {
    schema: 'fonso-deployment-compatibility-v1',
    ok: checks.length > 0 && checks.every(check => check.status === 'pass'),
    scope: 'Read-only backend contract and free-release policy preflight; excludes consent, gameplay, database recovery, physical APK acceptance and deployment approval.',
    checks
  };
}

async function probeCompatibility({ baseUrl, expected, fetcher = fetch, timeoutMs = 10000 } = {}) {
  const origin = checkedBase(baseUrl);
  const responses = Object.fromEntries(await Promise.all(Object.keys(ENDPOINTS).map(async key => [key, await readPublicEndpoint(origin, key, { fetcher, timeoutMs })])));
  return { observedAt: new Date().toISOString(), origin, expected, responses, assessment: assessCompatibility(responses, expected) };
}

module.exports = { ENDPOINTS, publicKeyId, publicFields, reviewedRequirements, checkedBase, readPublicEndpoint, assessCompatibility, probeCompatibility };
