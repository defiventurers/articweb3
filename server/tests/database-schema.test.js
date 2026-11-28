const test = require('node:test');
const assert = require('node:assert/strict');
const { compareDatabaseSchema, inspectDatabaseSchema, requiredTables } = require('../databaseSchema');
const { sanitizedBinding, inspectRuntime } = require('../scripts/check-database-schema.cjs');

function snapshot(scope = 'application') {
  const columns = [], indexes = [];
  for (const [table_name, table] of requiredTables(scope)) {
    for (const [column_name, shape] of Object.entries(table.columns)) columns.push({ table_name, column_name, udt_name: shape.type, is_nullable: shape.nullable ? 'YES' : 'NO' });
    indexes.push({ table_name, columns: table.primary, is_primary: true, valid: true, predicate: null });
    for (const unique of table.unique) indexes.push({ table_name, ...unique, is_primary: false, valid: true });
  }
  return { columns, indexes };
}

test('schema inspection rejects missing columns, wrong types and missing uniqueness without changing the database', async () => {
  const data = snapshot(), sql = [];
  const db = { async query(text) { sql.push(text); return { rows: text.includes('information_schema') ? data.columns : data.indexes }; } };
  assert.equal((await inspectDatabaseSchema(db)).ok, true);
  assert.equal(sql.length, 2); assert.ok(sql.every(text => text.trim().startsWith('SELECT')));
  data.columns.splice(data.columns.findIndex(row => row.table_name === 'rooms' && row.column_name === 'room_json'), 1);
  data.columns.find(row => row.table_name === 'ak_documents' && row.column_name === 'body').udt_name = 'text';
  data.indexes.find(row => row.table_name === 'ak_passport_deliveries' && row.columns.join(',') === 'account_id,kind,achievement_code').valid = false;
  const result = await inspectDatabaseSchema(db);
  assert.equal(result.ok, false);
  assert.deepEqual(result.issues.map(issue => issue.code).sort(), ['INCOMPATIBLE_COLUMN', 'MISSING_COLUMN', 'MISSING_UNIQUE_INDEX']);
});

test('schema scopes reflect optional chain indexing and permit additive compatible changes', () => {
  const data = snapshot('application');
  data.columns.push({ table_name: 'rooms', column_name: 'future_addition', udt_name: 'text', is_nullable: 'YES' });
  assert.equal(compareDatabaseSchema(data.columns, data.indexes, { scope: 'core' }).tablesChecked, 5);
  assert.equal(compareDatabaseSchema(data.columns, data.indexes, { scope: 'gameplay' }).tablesChecked, 6);
  assert.equal(compareDatabaseSchema(data.columns.filter(value => value.table_name !== 'ak_documents'), data.indexes, { scope: 'gameplay' }).ok, false);
  assert.equal(compareDatabaseSchema(data.columns, data.indexes).ok, true);
  assert.equal(compareDatabaseSchema(data.columns, data.indexes, { scope: 'chain' }).ok, false);
  assert.throws(() => requiredTables('anything'), /Unknown/);
});

test('runtime inspection emits sanitized binding metadata and uses an explicitly read-only transaction', async () => {
  const data = snapshot('core'), sql = [], fixtureUrl = 'postgresql://fixture-user:fixture-secret@ep-fixture-pooler.region.neon.tech/neondb?sslmode=require';
  const client = { async query(text) {
    sql.push(text);
    if (text.includes('current_database')) return { rows: [{ database_name: 'neondb', server_version: '18.7', transaction_read_only: 'on', is_read_replica: false }] };
    return { rows: text.includes('information_schema') ? data.columns : text.includes('pg_index') ? data.indexes : [] };
  }, release() { sql.push('RELEASE'); } };
  const result = await inspectRuntime({ databaseUrl: fixtureUrl, scope: 'core', pool: { async connect() { return client; } } });
  assert.equal(result.ok, true); assert.equal(result.binding.provider, 'neon'); assert.equal(result.binding.pooledEndpoint, true);
  assert.doesNotMatch(JSON.stringify(result), /fixture-user|fixture-secret|sslmode|postgresql:\/\//);
  assert.equal(sql[0], 'BEGIN READ ONLY'); assert.equal(sql.at(-1), 'RELEASE');
  assert.equal(sanitizedBinding(fixtureUrl).identitySha256, sanitizedBinding(fixtureUrl.replace('fixture-secret', 'rotated-fixture')).identitySha256);
});
