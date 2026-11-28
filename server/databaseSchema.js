'use strict';
const contract = require('./databaseSchemaContract.json');

const COLUMN_SQL = `SELECT table_name, column_name, udt_name, is_nullable
 FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[])`;
const INDEX_SQL = `SELECT tab.relname AS table_name, i.indisprimary AS is_primary,
 i.indisvalid AND i.indisready AS valid,
 array_agg(att.attname::text ORDER BY keys.position) AS columns,
 pg_get_expr(i.indpred, i.indrelid) AS predicate
 FROM pg_index i JOIN pg_class tab ON tab.oid=i.indrelid
 JOIN pg_namespace ns ON ns.oid=tab.relnamespace
 JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS keys(attnum, position) ON keys.position<=i.indnkeyatts
 JOIN pg_attribute att ON att.attrelid=tab.oid AND att.attnum=keys.attnum
 WHERE ns.nspname='public' AND i.indisunique AND tab.relname=ANY($1::text[])
 GROUP BY tab.relname,i.indexrelid,i.indisprimary,i.indisvalid,i.indisready,i.indpred,i.indrelid`;

function requiredTables(scope = 'application') {
  if (!['core', 'gameplay', 'application', 'chain'].includes(scope)) throw new Error('Unknown database schema scope.');
  return Object.entries(contract.tables).filter(([name, table]) => scope === 'chain' || table.scope === 'core' || scope === 'gameplay' && name === 'ak_documents' || scope === 'application' && table.scope === 'application');
}
const normalizePredicate = value => String(value || '').replace(/[()\s]/g, '').toLowerCase();

function compareDatabaseSchema(columns, indexes, { scope = 'application' } = {}) {
  const tables = requiredTables(scope), issues = [];
  const actual = new Map(columns.map(column => [column.table_name + '.' + column.column_name, column]));
  for (const [name, expected] of tables) {
    for (const [column, shape] of Object.entries(expected.columns)) {
      const found = actual.get(name + '.' + column);
      if (!found) issues.push({ table: name, column, code: 'MISSING_COLUMN' });
      else if (found.udt_name !== shape.type || (found.is_nullable === 'YES') !== shape.nullable) issues.push({ table: name, column, code: 'INCOMPATIBLE_COLUMN' });
    }
    const candidates = indexes.filter(index => index.table_name === name && index.valid !== false);
    const matches = (index, wanted) => Array.isArray(index.columns) && index.columns.join(',') === wanted.columns.join(',') && normalizePredicate(index.predicate) === normalizePredicate(wanted.predicate);
    if (!candidates.some(index => index.is_primary && matches(index, { columns: expected.primary }))) issues.push({ table: name, code: 'MISSING_PRIMARY_KEY' });
    for (const unique of expected.unique) if (!candidates.some(index => matches(index, unique))) issues.push({ table: name, columns: unique.columns, code: 'MISSING_UNIQUE_INDEX' });
  }
  return { ok: issues.length === 0, contractVersion: contract.version, scope, tablesChecked: tables.length, issues };
}

async function inspectDatabaseSchema(db, options = {}) {
  const names = requiredTables(options.scope).map(([name]) => name);
  const columns = await db.query(COLUMN_SQL, [names]);
  const indexes = await db.query(INDEX_SQL, [names]);
  return compareDatabaseSchema(columns.rows, indexes.rows, options);
}

module.exports = { inspectDatabaseSchema, compareDatabaseSchema, requiredTables, COLUMN_SQL, INDEX_SQL };
