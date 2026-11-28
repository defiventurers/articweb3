#!/usr/bin/env node
// Usage from the repository root. The expected interfaces are read from this
// checkout, not guessed from a deployment SHA or silently learned from the API.
// node server/scripts/check-deployment-compatibility.js --origin https://SERVICE \
//   --backend-commit FULL_COMMIT --para-environment BETA --para-chain-id 46630
const { probeCompatibility, reviewedRequirements } = require('../deploymentCompatibility');

async function main(argv) {
  const names = new Set(['--origin', '--backend-commit', '--para-environment', '--para-chain-id']);
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!names.has(argv[i]) || !argv[i + 1] || Object.hasOwn(args, argv[i])) throw Error('Provide each required option exactly once.');
    args[argv[i]] = argv[i + 1];
  }
  const expected = reviewedRequirements({ backendCommit: args['--backend-commit'], paraEnvironment: args['--para-environment'], paraChainId: Number(args['--para-chain-id']) });
  const result = await probeCompatibility({ baseUrl: args['--origin'], expected });
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exitCode = result.assessment.ok ? 0 : 1;
}

if (require.main === module) main(process.argv.slice(2)).catch(() => {
  // Do not echo caller arguments, URLs with credentials or network errors.
  process.stderr.write('Compatibility check could not run. Use --origin, --backend-commit (full SHA), --para-environment and --para-chain-id; see BATCH_B_COMPATIBILITY.md.\n');
  process.exitCode = 2;
});
module.exports = { main };
