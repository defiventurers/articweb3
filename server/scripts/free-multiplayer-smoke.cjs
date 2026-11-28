#!/usr/bin/env node
'use strict';
// Run the free multiplayer acceptance tests against a fresh loopback-only cluster.
// No connection string, live signer, cloud database or production dump is used.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { execFile, spawn } = require('node:child_process');
const { promisify } = require('node:util');
const execute = promisify(execFile);

async function run({ bindir = process.env.PG_BINDIR } = {}) {
  if (!bindir || !path.isAbsolute(bindir)) throw Error('Set PG_BINDIR to installed local PostgreSQL 18 binaries.');
  if (process.getuid?.() === 0) throw Error('Run the fixture as an unprivileged user.');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fonso-free-multiplayer-'));
  await fs.chmod(dir, 0o700);
  const data = path.join(dir, 'data');
  const socket = net.createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const fixtureUrl = `postgresql://fixture@127.0.0.1:${port}/postgres`;
  const env = { ...process.env, DATABASE_URL: '', DATABASE_SSL: 'false',
    FONSO_MULTIPLAYER_TEST_DATABASE_URL: fixtureUrl, AK_PASSPORT_RUNTIME_ENABLED: 'false',
    AK_VISA_DELIVERY_ENABLED: 'false', PGCONNECT_TIMEOUT: '5', PGOPTIONS: '', PGPASSWORD: '', PGSSLMODE: 'disable' };
  const pg = (name, args) => execute(path.join(bindir, name), args, { env, timeout: 30000, maxBuffer: 1024 * 1024 });
  let started = false;
  try {
    const version = (await pg('postgres', ['--version'])).stdout.trim();
    if (!/PostgreSQL\) 18\./.test(version)) throw Error('Use PostgreSQL 18 to match the observed database major version.');
    await pg('initdb', ['-D', data, '-U', 'fixture', '-A', 'trust', '--no-locale', '--encoding=UTF8']);
    await pg('pg_ctl', ['-D', data, '-l', path.join(dir, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port} -c unix_socket_directories=''`, '-w', '-t', '15', 'start']);
    started = true;
    console.log(`Isolated free multiplayer fixture: ${version}; ${process.version}; loopback only.`);
    const tests = ['free-multiplayer-socket', 'arctic-play-socket-recovery', 'two-stones-online', 'room-store-ordering'];
    const exitCode = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['--test', ...tests.map(name => `tests/${name}.test.js`)], {
        cwd: path.resolve(__dirname, '..'), env, stdio: 'inherit', timeout: 180000,
      });
      child.once('error', reject);
      child.once('exit', (code, signal) => signal ? reject(Error('Fixture test process was interrupted.')) : resolve(code));
    });
    if (exitCode !== 0) throw Error('Free multiplayer acceptance tests failed.');
  } finally {
    if (started) await pg('pg_ctl', ['-D', data, '-m', 'fast', '-w', '-t', '15', 'stop']);
    await fs.rm(dir, { recursive: true, force: true });
  }
}

if (require.main === module) run().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { run };
