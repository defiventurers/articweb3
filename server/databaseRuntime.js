'use strict';
const { databaseOptions } = require('./databaseSecurity');

function unavailable() {
  return Object.assign(new Error('Durable storage is temporarily unavailable. Please retry.'), { code: 'DATABASE_UNAVAILABLE', status: 503 });
}

// A failed connection is not a permanent decision to run a configured store in
// memory. Retry schema initialization, never replay a failed application write.
function createStoreRuntime({ databaseUrl, Pool, label, env = process.env, now = Date.now, logger = console.error }) {
  let pool, initialized = false, pending, failed = false, retryAfter = 0;
  function onFailure() { initialized = false; failed = true; retryAfter = now() + 1000; }
  function getPool() {
    if (!databaseUrl) return null;
    if (!pool) {
      pool = new Pool(databaseOptions(databaseUrl, env));
      pool.on('error', onFailure);
      const query = pool.query.bind(pool);
      pool.query = async (...args) => {
        try { return await query(...args); }
        catch { onFailure(); throw unavailable(); }
      };
    }
    return pool;
  }
  async function init(schema) {
    if (!databaseUrl) return false;
    if (initialized) return true;
    if (pending) return pending;
    if (now() < retryAfter) return false;
    const attempt = (async () => {
      try { await schema(); initialized = true; failed = false; return true; }
      catch { onFailure(); logger(`[${label}] Database unavailable; initialization will retry.`); return false; }
    })();
    pending = attempt;
    try { return await attempt; }
    finally { if (pending === attempt) pending = null; }
  }
  async function requireReady(initialize) {
    const result = await initialize();
    if (!result && databaseUrl) throw unavailable();
    return result;
  }
  const status = () => ({ databaseConfigured: Boolean(databaseUrl), databaseReady: initialized, databaseError: failed ? 'Database check pending.' : '' });
  return { getPool, init, requireReady, status, close: async () => { await pool?.end(); } };
}

module.exports = { createStoreRuntime };
