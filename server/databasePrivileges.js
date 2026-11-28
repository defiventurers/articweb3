'use strict';

// Operations used by the legacy lobby stores and current free account store.
// Readiness does not grant permissions or run write/DDL probes.
const GAMEPLAY_PRIVILEGES = Object.freeze({
  rooms: ['SELECT', 'INSERT', 'UPDATE'],
  room_players: ['SELECT', 'INSERT', 'UPDATE'],
  player_profiles: ['SELECT', 'INSERT', 'UPDATE'],
  match_history: ['SELECT', 'INSERT', 'UPDATE'],
  vault_activity: ['SELECT', 'INSERT', 'UPDATE'],
  ak_documents: ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
});

const PRIVILEGES_SQL = `SELECT wanted.table_name, wanted.privilege,
 has_schema_privilege(current_user, 'public', 'USAGE') AND
 has_schema_privilege(current_user, 'public', 'CREATE') AND
 has_table_privilege(current_user, format('%I.%I', 'public', wanted.table_name), wanted.privilege) AS allowed
 FROM unnest($1::text[], $2::text[]) AS wanted(table_name, privilege)`;

async function gameplayPrivilegesReady(client) {
  const expected = Object.entries(GAMEPLAY_PRIVILEGES).flatMap(([table, privileges]) => privileges.map(privilege => [table, privilege]));
  const result = await client.query(PRIVILEGES_SQL, [expected.map(([table]) => table), expected.map(([, privilege]) => privilege)]);
  if (!Array.isArray(result.rows) || result.rows.length !== expected.length) return false;
  // Existing lazy account initialization still executes CREATE TABLE IF NOT
  // EXISTS even for an existing table, so schema CREATE is also necessary.
  // PostgreSQL's comma-separated privilege argument is OR. Each operation here
  // is checked separately, and every required result must be true.
  return expected.every(([table, privilege]) => result.rows.some(row => row.table_name === table && row.privilege === privilege && row.allowed === true));
}

module.exports = { GAMEPLAY_PRIVILEGES, PRIVILEGES_SQL, gameplayPrivilegesReady };
