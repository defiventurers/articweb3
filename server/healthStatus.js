'use strict';

const { databaseOptions } = require('./databaseSecurity');

const HEALTH_SCHEMA = 'artic.health.v1';
const HEALTH_SERVICE = 'artic-web3-server';

function databaseRequired(env) {
  // A configured database is never made optional by a flag. Production must
  // also fail readiness if its connection setting was accidentally removed.
  return Boolean(env.DATABASE_URL) || env.DATABASE_REQUIRED === 'true' ||
    env.NODE_ENV === 'production' || env.RENDER === 'true';
}

function createHealthStatus({
  env = process.env,
  now = Date.now,
  poolFactory = options => new (require('pg').Pool)(options),
  inspectSchema = (client, options) => require('./databaseSchema').inspectDatabaseSchema(client, options),
  checkPrivileges = client => require('./databasePrivileges').gameplayPrivilegesReady(client),
  startupStatus = () => require('./startupReadiness').status(),
  timeoutMs = 2000,
  cacheMs = 500
} = {}) {
  const configured = Boolean(env.DATABASE_URL);
  const required = databaseRequired(env);
  let pool, inFlight, cached, closed = false;

  function base(check, ok) {
    return {
      schema: HEALTH_SCHEMA,
      service: HEALTH_SERVICE,
      check,
      ok,
      status: check === 'liveness' ? 'alive' : ok ? 'ready' : 'not_ready',
      generatedAt: new Date(now()).toISOString()
    };
  }

  function getPool() {
    if (!pool) {
      pool = poolFactory({
        ...databaseOptions(env.DATABASE_URL, env),
        max: 1,
        connectionTimeoutMillis: timeoutMs,
        query_timeout: timeoutMs,
        statement_timeout: timeoutMs,
        idleTimeoutMillis: 10000,
        allowExitOnIdle: true
      });
      // Idle connection failures are operational state, never public errors or
      // uncaught EventEmitter exceptions. The next check must reconnect.
      pool.on('error', () => { cached = undefined; });
    }
    return pool;
  }

  async function probeDatabase() {
    let client, timer, expired = false, released = false, failed = false;
    const release = destroy => {
      if (client && !released) { released = true; client.release(destroy); }
    };
    const work = (async () => {
      try {
        client = await getPool().connect();
        if (expired) { release(true); return 'unavailable'; }
        const ping = await client.query("SELECT 1 AS healthy, current_setting('transaction_read_only') = 'off' AS writable");
        if (expired || ping?.rows?.[0]?.healthy !== 1 || ping.rows[0].writable !== true) return 'unavailable';
        // Read-only schema inspection; health requests never run migrations.
        const schema = await inspectSchema(client, { scope: 'gameplay' });
        if (expired || schema?.ok !== true) return 'unavailable';
        const permissions = await checkPrivileges(client);
        return !expired && permissions === true ? 'ready' : 'unavailable';
      } catch {
        failed = true;
        return 'unavailable';
      } finally {
        release(expired || failed);
      }
    })();
    try {
      return await Promise.race([
        work,
        new Promise(resolve => {
          timer = setTimeout(() => {
            expired = true;
            release(true);
            resolve('unavailable');
          }, timeoutMs);
        })
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  async function databaseStatus() {
    if (!configured) return { required, status: 'not_configured' };
    if (closed) return { required, status: 'unavailable' };
    if (cached && now() < cached.expiresAt) return { required, status: cached.status };
    // At most one bounded probe is active even under concurrent monitors.
    if (!inFlight) {
      inFlight = probeDatabase().then(status => {
        cached = { status, expiresAt: now() + cacheMs };
        return status;
      }).finally(() => { inFlight = undefined; });
    }
    return { required, status: await inFlight };
  }

  return {
    liveness: () => base('liveness', true),
    async readiness() {
      const database = await databaseStatus();
      const observed = startupStatus();
      const startup = { status: ['starting', 'ready', 'failed'].includes(observed) ? observed : 'failed' };
      const ok = (!database.required || database.status === 'ready') && startup.status === 'ready';
      return { ...base('readiness', ok), dependencies: { database, startup } };
    },
    async close() { closed = true; await inFlight; await pool?.end(); }
  };
}

module.exports = { HEALTH_SCHEMA, HEALTH_SERVICE, databaseRequired, createHealthStatus };
