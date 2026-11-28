const test = require('node:test');
const assert = require('node:assert/strict');
const { gameplayPrivilegesReady, PRIVILEGES_SQL, GAMEPLAY_PRIVILEGES } = require('../databasePrivileges');

test('every required gameplay operation is checked separately without DDL or writes', async () => {
  const queries = [];
  const client = { async query(text, [tables, privileges]) {
    queries.push(text);
    assert.equal(text, PRIVILEGES_SQL); assert.match(text, /^SELECT/); assert.match(text, /has_schema_privilege/);
    assert.match(text, /has_schema_privilege\(current_user, 'public', 'USAGE'\) AND\s+has_schema_privilege\(current_user, 'public', 'CREATE'\)/);
    assert.ok(privileges.every(privilege => !privilege.includes(',')), 'A comma privilege list would accept OR rather than AND.');
    return { rows: tables.map((table_name, i) => ({ table_name, privilege: privileges[i], allowed: true })) };
  } };
  assert.equal(await gameplayPrivilegesReady(client), true); assert.equal(queries.length, 1);
  assert.deepEqual(GAMEPLAY_PRIVILEGES.ak_documents, ['SELECT', 'INSERT', 'UPDATE', 'DELETE']);
});

test('SELECT-only role and any missing required operation cannot pass readiness privileges', async () => {
  for (const deny of ['all-writes', 'INSERT', 'UPDATE', 'DELETE', 'SCHEMA_USAGE', 'SCHEMA_CREATE']) {
    const client = { async query(_text, [tables, privileges]) {
      return { rows: tables.map((table_name, i) => ({ table_name, privilege: privileges[i], allowed: !deny.startsWith('SCHEMA_') && (deny === 'all-writes' ? privileges[i] === 'SELECT' : privileges[i] !== deny) })) };
    } };
    assert.equal(await gameplayPrivilegesReady(client), false, deny);
  }
  assert.equal(await gameplayPrivilegesReady({ query: async () => ({ rows: [] }) }), false);
});
