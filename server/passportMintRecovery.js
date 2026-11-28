const { ZeroAddress } = require('ethers');

// A process can stop after broadcast but before its transaction hash is saved.
// The reviewed ERC-721 contracts keep tokenForClaim immutable. Find the first
// historical block containing that claim, then read its exact mint Transfer.
// This never submits a transaction and never substitutes a different claim.
async function recoverMintTransaction({ provider, collection, job, claim }) {
  if (claim?.confirmed !== true) return null;
  const safeBlock = (await provider.getBlockNumber()) - 1;
  if (!Number.isSafeInteger(safeBlock) || safeBlock < 0) return null;
  const address = await collection.getAddress();
  const expected = BigInt(claim.tokenId);
  if (expected <= 0n || await collection.tokenForClaim(job.claim_id, { blockTag: safeBlock }) !== expected) return null;
  let low = 0, high = safeBlock;
  // At most 53 bisections for a JavaScript safe-integer block number. Historical
  // RPC/pruning errors propagate to the normal retry state; they are not proof.
  for (let step = 0; low < high && step < 53; step++) {
    const middle = low + Math.floor((high - low) / 2);
    const code = await provider.getCode(address, middle);
    const token = code === '0x' ? 0n : await collection.tokenForClaim(job.claim_id, { blockTag: middle });
    if (token === 0n) low = middle + 1;
    else if (token === expected) high = middle;
    else throw Error('Claim history is inconsistent.');
  }
  if (low !== high) return null;
  const logs = await provider.getLogs({ address, fromBlock: low, toBlock: low,
    topics: collection.interface.encodeFilterTopics('Transfer', [ZeroAddress, job.wallet, expected]) });
  const hashes = [...new Set(logs.filter(log => !log.removed).map(log => log.transactionHash))];
  // The caller re-verifies chain, claim, owner, receipt, event and canonicality
  // before storing confirmed. A log search alone is never an acceptance proof.
  return hashes.length === 1 && /^0x[0-9a-f]{64}$/i.test(hashes[0]) ? hashes[0] : null;
}

module.exports = { recoverMintTransaction };
