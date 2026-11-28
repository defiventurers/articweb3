#!/usr/bin/env node
'use strict';
const { createHash } = require('node:crypto');
const { Pool } = require('pg');
const { databaseOptions } = require('../databaseSecurity');
const { inspectDatabaseSchema } = require('../databaseSchema');

function sanitizedBinding(value) {
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Invalid database protocol.');
  const host = url.hostname, database = decodeURIComponent(url.pathname.slice(1));
  const provider = host.endsWith('.neon.tech') ? 'neon' : host.startsWith('dpg-') ? 'render-postgres-candidate' : 'postgres-unconfirmed';
  return { provider, host, database, pooledEndpoint: /-pooler\./.test(host), identitySha256: createHash('sha256').update(host + '/' + database).digest('hex') };
}

async function inspectRuntime({ databaseUrl = process.env.DATABASE_URL, scope = 'application', pool } = {}) {
  if (!databaseUrl) throw new Error('Database configuration is required.');
  const binding = sanitizedBinding(databaseUrl);
  const db = pool || new Pool({ ...databaseOptions(databaseUrl), max: 1, connectionTimeoutMillis: 5000, query_timeout: 5000, statement_timeout: 4000 });
  db.on?.('error', () => {});
  let client;
  try {
    client = await db.connect();
    await client.query('BEGIN READ ONLY');
    const metadata = (await client.query("SELECT current_database() AS database_name, current_setting('server_version') AS server_version, current_setting('transaction_read_only') AS transaction_read_only, pg_is_in_recovery() AS is_read_replica")).rows[0];
    const schema = await inspectDatabaseSchema(client, { scope });
    return { ok: schema.ok, observedAt: new Date().toISOString(), binding, metadata, schema };
  } finally { if (client) { await client.query('ROLLBACK').catch(() => {}); client.release(); } if (!pool) await db.end(); }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) console.log('Read-only: node server/scripts/check-database-schema.cjs [--scope=core|gameplay|application|chain]\nUses private DATABASE_URL. Prints only host/database identity, version and schema compatibility; never credentials or application rows.');
  else if (args.some(value => !/^--scope=(core|gameplay|application|chain)$/.test(value)) || args.length > 1) { console.error('Invalid arguments. Use --help.'); process.exitCode = 2; }
  else inspectRuntime({ scope: args[0]?.split('=')[1] || 'application' }).then(result => { console.log(JSON.stringify(result, null, 2)); if (!result.ok) process.exitCode = 1; }).catch(() => { console.error('Database inspection failed. Verify private connection configuration and access; no data was changed.'); process.exitCode = 1; });
}
module.exports = { sanitizedBinding, inspectRuntime };
