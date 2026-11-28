const {Contract, FetchRequest, JsonRpcProvider, ZeroAddress, getAddress} = require('ethers');
const {createHash} = require('node:crypto');

// The existing collection and digest were independently checked against its
// successful deployment and exact build. This reader cannot mint, link an
// account, change ownership, or accept a replacement collection from a request.
const REVIEWED_PASSPORT = Object.freeze({
  chainId: 46630,
  address: '0xF059141A4e21eF5786e66e96F1c4357858a0De11',
  metadataBase: 'https://articweb3.onrender.com/arctic-play/v3/passport/metadata/46630/',
  runtimeHash: require('../shared/chain/launch-contracts.json').contracts.AntarcticPassport.runtimeHash,
});
const ABI = [
  'function totalIssued() view returns (uint256)',
  'function ownerOf(uint256) view returns (address)',
  'function tokenURI(uint256) view returns (string)',
];
const unavailable = () => Object.assign(Error('Passport metadata verification is temporarily unavailable.'), {status: 503});

function metadataReaderConfig(env = process.env) {
  const activeChain = Number(env.AK_VISA_CHAIN_ID || 46630);
  const scoped = name => env[name + '_46630'] || (activeChain === 46630 ? env[name] : undefined);
  const address = getAddress(scoped('AK_VISA_CONTRACT') || REVIEWED_PASSPORT.address);
  if (address !== REVIEWED_PASSPORT.address) throw unavailable();
  const rpc = scoped('AK_VISA_RPC_URL') || require('./gameWalletChains.json')[46630].rpcUrls.default.http[0];
  if (new URL(rpc).protocol !== 'https:') throw unavailable();
  return {chainId: 46630, address, rpc};
}

function rpcProvider(config) {
  const request = new FetchRequest(config.rpc);
  request.timeout = 12000;
  return new JsonRpcProvider(request, undefined, {cacheTimeout: 0});
}

function createPassportMetadataReader({env = process.env, providerFactory = rpcProvider,
  contractFactory = (address, provider) => new Contract(address, ABI, provider),
  now = Date.now, timeoutMs = 15000, cacheTtlMs = 30000, maxCacheEntries = 128, maxInFlight = 4} = {}) {
  const cache = new Map(), pending = new Map(), providers = new Set();
  let closed = false, retryAfter = 0;

  async function verify(tokenId) {
    let provider, timer;
    try {
      const config = metadataReaderConfig(env);
      provider = providerFactory(config);
      providers.add(provider);
      const work = (async () => {
        if (Number((await provider.getNetwork()).chainId) !== REVIEWED_PASSPORT.chainId) throw unavailable();
        const code = await provider.getCode(config.address);
        if (!/^0x(?:[0-9a-f]{2})+$/i.test(code) || createHash('sha256').update(Buffer.from(code.slice(2), 'hex')).digest('hex') !== REVIEWED_PASSPORT.runtimeHash) throw unavailable();
        const tip = await provider.getBlockNumber();
        if (!Number.isSafeInteger(tip) || tip < 1) throw unavailable();
        const blockNumber = tip - 1, before = await provider.getBlock(blockNumber);
        if (!before?.hash) throw unavailable();
        const visa = contractFactory(config.address, provider);
        const [issued, safeIssued] = await Promise.all([visa.totalIssued(), visa.totalIssued({blockTag: blockNumber})]);
        if (BigInt(tokenId) > issued) return null;
        // A newly minted token without two L2 blocks is pending, not missing.
        if (BigInt(tokenId) > safeIssued) throw unavailable();
        const [owner, safeOwner, uri, safeUri] = await Promise.all([
          visa.ownerOf(tokenId), visa.ownerOf(tokenId, {blockTag: blockNumber}),
          visa.tokenURI(tokenId), visa.tokenURI(tokenId, {blockTag: blockNumber}),
        ]);
        const expectedUri = REVIEWED_PASSPORT.metadataBase + tokenId + '.json';
        if (getAddress(owner) === ZeroAddress || getAddress(owner) !== getAddress(safeOwner) || uri !== expectedUri || safeUri !== expectedUri) throw unavailable();
        const after = await provider.getBlock(blockNumber);
        if (after?.hash !== before.hash) throw unavailable();
        return {chainId: 46630, tokenId, blockNumber, blockHash: before.hash};
      })();
      return await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => reject(unavailable()), timeoutMs); })]);
    } catch { throw unavailable(); }
    finally {
      clearTimeout(timer);
      providers.delete(provider);
      provider?.destroy?.();
    }
  }

  async function get(chainId, tokenId) {
    // No cross-chain fallback. Unknown chains and malformed IDs never reach RPC.
    if (Number(chainId) !== REVIEWED_PASSPORT.chainId || !/^[1-9]\d{0,30}$/.test(String(tokenId))) return null;
    if (closed) throw unavailable();
    const key = String(tokenId), old = cache.get(key);
    if (old?.expires > now()) return old.value;
    cache.delete(key);
    if (pending.has(key)) return pending.get(key);
    if (retryAfter > now() || pending.size >= maxInFlight) throw unavailable();
    const task = verify(key).then(value => {
      cache.set(key, {value, expires: now() + (value ? cacheTtlMs : Math.min(cacheTtlMs, 5000))});
      while (cache.size > maxCacheEntries) cache.delete(cache.keys().next().value);
      return value;
    }).catch(() => { retryAfter = now() + 2000; throw unavailable(); }).finally(() => pending.delete(key));
    pending.set(key, task);
    return task;
  }

  async function close() {
    closed = true;
    for (const provider of providers) provider.destroy?.();
    await Promise.allSettled(pending.values());
    cache.clear();
  }
  return {get, close};
}

module.exports = {REVIEWED_PASSPORT, metadataReaderConfig, createPassportMetadataReader};
