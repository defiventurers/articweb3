import chains from '../../../server/gameWalletChains.json' with { type: 'json' };

// Public, read-only providers. Account tokens and wallet signing never leave cloud.js.
const nftOrigins = {
  4663: 'https://robinhoodchain.blockscout.com',
  46630: 'https://explorer.testnet.chain.robinhood.com',
};
const addressPattern = /^0x[0-9a-fA-F]{40}$/;
export const isWalletAddress = value => typeof value === 'string' && addressPattern.test(value) && !/^0x0{40}$/i.test(value);
export function verifiedWallet(identity, accountId) {
  if (!accountId || identity?.accountId !== accountId) throw Error('Your account changed. Open Wallet again.');
  const w = identity.wallet;
  if (!w || w.provider !== 'para') return null;
  if (!isWalletAddress(w.address)) throw Error('Your linked wallet address is unavailable. Try again.');
  const chain = chains[String(w.chainId)];
  if (!chain) throw Error('This wallet network is not supported in this app version.');
  return { address: w.address, chainId: chain.id, chain, nftOrigin: nftOrigins[chain.id] || null };
}
export function formatEth(wei, places = 6) {
  const n = BigInt(wei);
  if (n < 0n) throw Error('Invalid ETH balance');
  const whole = n / 10n ** 18n;
  const fraction = (n % 10n ** 18n).toString().padStart(18, '0').slice(0, places).replace(/0+$/, '');
  if (n > 0n && whole === 0n && !fraction) return '<0.' + '0'.repeat(places - 1) + '1';
  return whole.toString() + (fraction ? '.' + fraction : '');
}
async function publicJson(url, options = {}, { signal, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 12000);
  try {
    const res = await fetchImpl(url, { ...options, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: controller.signal });
    if (!res.ok) throw Error('The network service is unavailable. Try refreshing.');
    return await res.json();
  } catch (e) {
    if (signal?.aborted) throw e;
    if (controller.signal.aborted) throw Error('The network is taking too long. Try refreshing.');
    throw e;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
export async function readEthBalance(wallet, options) {
  const url = wallet.chain.rpcUrls.default.http[0];
  async function rpc(method, params, id) {
    const json = await publicJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }) }, options);
    if (json?.error || json?.id !== id || !/^0x[0-9a-f]+$/i.test(json?.result || '')) throw Error('The network returned an invalid balance response.');
    return BigInt(json.result);
  }
  if (await rpc('eth_chainId', [], 1) !== BigInt(wallet.chainId)) throw Error('The network returned a different chain. Balance was not loaded.');
  const wei = await rpc('eth_getBalance', [wallet.address, 'latest'], 2);
  return { wei: wei.toString(), formatted: formatEth(wei), checkedAt: Date.now() };
}
const text = (value, limit = 180) => typeof value === 'string' ? value.slice(0, limit) : '';
export function nftImageUrl(value) {
  if (typeof value !== 'string' || value.length > 4096) return null;
  if (value.startsWith('ipfs://')) {
    const rest = value.slice(7).replace(/^ipfs\//, '');
    if (!/^[A-Za-z0-9]+(?:\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*)?$/.test(rest) || rest.includes('..')) return null;
    value = 'https://ipfs.io/ipfs/' + rest;
  }
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; }
}
export function normalizeNft(item, wallet) {
  const instance = item?.token_instance || item, token = item?.token || {}, metadata = instance?.metadata || {};
  const contract = token.address_hash || token.address, id = String(instance?.id ?? ''), type = item?.token_type || token.type;
  if (!isWalletAddress(contract) || !/^\d{1,78}$/.test(id) || !['ERC-721', 'ERC-1155'].includes(type)) return null;
  const owner = item.holder_address_hash || instance.owner?.hash;
  if (owner && (!isWalletAddress(owner) || owner.toLowerCase() !== wallet.address.toLowerCase())) return null;
  const quantity = type === 'ERC-721' ? '1' : String(item.value ?? instance.value ?? '');
  if (!/^\d{1,78}$/.test(quantity) || BigInt(quantity) <= 0n) return null;
  return { key: wallet.chainId + ':' + contract.toLowerCase() + ':' + BigInt(id), chainId: wallet.chainId, contract, tokenId: BigInt(id).toString(), type, quantity,
    name: text(metadata.name) || text(token.name) || 'Collectible #' + id,
    collection: text(token.name) || 'Unnamed collection', description: text(metadata.description, 1200),
    image: nftImageUrl(instance.image_url) || nftImageUrl(metadata.image) || nftImageUrl(metadata.image_url) };
}
export function nftCursor(value) {
  if (value == null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw Error('The NFT service returned an invalid next page.');
  const pairs = Object.entries(value);
  if (!pairs.length) return null;
  if (pairs.length > 15 || pairs.some(([k, v]) => !/^[a-z_]{1,60}$/.test(k) || !['string', 'number', 'boolean'].includes(typeof v) || String(v).length > 200)) throw Error('The NFT service returned an invalid next page.');
  return Object.fromEntries(pairs.sort(([a], [b]) => a.localeCompare(b)));
}
export async function readNftPage(wallet, cursor = null, options) {
  if (!wallet.nftOrigin) throw Error('NFT viewing is not available for this network yet.');
  const query = new URLSearchParams({ ...nftCursor(cursor), type: 'ERC-721,ERC-1155' });
  const payload = await publicJson(wallet.nftOrigin + '/api/v2/addresses/' + wallet.address + '/nft?' + query, {}, options);
  if (!Array.isArray(payload?.items) || !Object.hasOwn(payload, 'next_page_params')) throw Error('The NFT service returned an incomplete response. Try refreshing.');
  const items = payload.items.map(item => normalizeNft(item, wallet)).filter(Boolean), next = nftCursor(payload.next_page_params);
  if (next && JSON.stringify(next) === JSON.stringify(nftCursor(cursor))) throw Error('The NFT service repeated a page. Try refreshing.');
  return { items: mergeNfts([], items), next, skipped: payload.items.length - items.length, checkedAt: Date.now() };
}
export const mergeNfts = (previous, incoming) => [...new Map([...previous, ...incoming].map(n => [n.key, n])).values()];
