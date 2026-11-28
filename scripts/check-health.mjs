#!/usr/bin/env node
import { probeHealth } from '../server/healthMonitor.js';

const [url, ...options] = process.argv.slice(2);
const known = new Set(['--liveness', '--allow-memory']);
if (!url || options.some(option => !known.has(option))) {
  console.error('Usage: node scripts/check-health.mjs <exact-health-url> [--liveness] [--allow-memory]');
  process.exitCode = 2;
} else {
  const check = options.includes('--liveness') ? 'liveness' : 'readiness';
  const result = await probeHealth(url, { check, requireDatabase: check === 'readiness' && !options.includes('--allow-memory') });
  // No response body, URLs, credentials or infrastructure details are logged.
  console.log(JSON.stringify(result));
  process.exitCode = result.ok ? 0 : 1;
}
