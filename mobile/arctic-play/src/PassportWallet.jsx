import React, { useState, useEffect, useRef } from 'react';
import { cloudRequest, cloudSnapshot, watchCloud } from './cloud.js';
import { verifiedWallet, readEthBalance, readNftPage, mergeNfts } from './walletPortfolio.js';
import './passport-wallet.css';

export const openPassportWallet = () => window.dispatchEvent(new Event('ak-open-wallet'));
function WalletMark() { return <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M23 9V6a2 2 0 0 0-2-2L6 7a3 3 0 0 0-3 3v12a2 2 0 0 0 2 2h18V10H6a3 3 0 0 1 0-6"/><path d="M23 14h-7v6h7"/><circle cx="19" cy="17" r=".7"/></svg>; }
export function WalletEntry() {
  return <section className="pw-entry" aria-label="Wallet"><button type="button" onClick={openPassportWallet}><span className="pw-mark"><WalletMark/></span><span><strong>Wallet</strong><small>Your ETH & NFT collection</small></span><span aria-hidden="true">→</span></button></section>;
}
const defaultGateway = { request: cloudRequest, snapshot: cloudSnapshot, watch: watchCloud };
const sessionKey = snapshot => { const s = snapshot?.session; return s?.accountId && s?.session ? s.accountId + ':' + s.session + ':' + (s.wallet?.address || '') + ':' + (s.wallet?.chainId || '') : ''; };
const message = error => error?.message || 'Could not refresh. Check your connection and try again.';
function NftArt({ item }) {
  const [failed, setFailed] = useState(false);
  return item.image && !failed ? <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/> : <span className="pw-nft-placeholder" aria-label="Artwork unavailable">◇</span>;
}
export function PassportWallet({ gateway = defaultGateway }) {
  const [owner, setOwner] = useState(() => sessionKey(gateway.snapshot())), [revision, setRevision] = useState(0);
  const [state, setState] = useState({ status: 'loading' }), [detail, setDetail] = useState(null), [copied, setCopied] = useState('');
  const request = useRef(null), pageRequest = useRef(null), generation = useRef(0);
  // No portfolio is persisted. A different account immediately hides the old holdings.
  useEffect(() => gateway.watch(snapshot => {
    const key = sessionKey(snapshot); if (key !== owner) { generation.current++; request.current?.abort(); pageRequest.current?.abort(); setState({ status: 'loading' }); setDetail(null); setCopied(''); setOwner(key); }
  }), [gateway, owner]);
  useEffect(() => {
    const controller = new AbortController(), serial = ++generation.current;
    request.current?.abort(); pageRequest.current?.abort(); request.current = controller;
    const active = () => !controller.signal.aborted && serial === generation.current && owner === sessionKey(gateway.snapshot());
    setState({ status: owner ? 'loading' : 'signed-out' }); setDetail(null); setCopied('');
    if (!owner) return () => controller.abort();
    (async () => {
      try {
        const accountId = gateway.snapshot().session.accountId, response = await gateway.request('/passport');
        if (!active()) return;
        const wallet = verifiedWallet(response.identity, accountId);
        if (!wallet) { setState({ status: 'unlinked' }); return; }
        setState({ status: 'ready', wallet, balance: { loading: true }, nfts: { loading: true, items: [] } });
        const balanceTask = readEthBalance(wallet, { signal: controller.signal }).then(value => {
          if (active()) setState(s => ({ ...s, balance: value }));
        }).catch(e => { if (active()) setState(s => ({ ...s, balance: { error: message(e) } })); });
        const nftTask = readNftPage(wallet, null, { signal: controller.signal }).then(value => {
          if (active()) setState(s => ({ ...s, nfts: value }));
        }).catch(e => { if (active()) setState(s => ({ ...s, nfts: { items: [], error: message(e) } })); });
        await Promise.all([balanceTask, nftTask]);
      } catch (e) { if (active()) setState({ status: 'error', error: message(e) }); }
    })();
    return () => { controller.abort(); pageRequest.current?.abort(); };
  }, [gateway, owner, revision]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setRevision(r => r + 1); };
    window.addEventListener('online', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const refresh = () => setRevision(r => r + 1);
  const loading = state.status === 'loading' || state.balance?.loading || state.nfts?.loading || state.nfts?.paging;
  async function loadMore() {
    if (!state.nfts?.next || loading || pageRequest.current) return;
    const controller = new AbortController(), serial = generation.current; pageRequest.current = controller;
    setState(s => ({ ...s, nfts: { ...s.nfts, paging: true, error: '' } }));
    try {
      const page = await readNftPage(state.wallet, state.nfts.next, { signal: controller.signal });
      if (!controller.signal.aborted && serial === generation.current && owner === sessionKey(gateway.snapshot())) setState(s => ({ ...s, nfts: { ...page, skipped: (s.nfts.skipped || 0) + page.skipped, items: mergeNfts(s.nfts.items, page.items) } }));
    } catch (e) {
      if (!controller.signal.aborted && serial === generation.current && owner === sessionKey(gateway.snapshot())) setState(s => ({ ...s, nfts: { ...s.nfts, paging: false, error: message(e) } }));
    } finally { if (pageRequest.current === controller) pageRequest.current = null; }
  }
  async function copyAddress() {
    try { await navigator.clipboard.writeText(state.wallet.address); setCopied('Address copied'); }
    catch { setCopied('Touch and hold the address to copy it.'); }
  }
  if (owner !== sessionKey(gateway.snapshot())) return <p className="pw-message" role="status">Updating your account…</p>;
  if (state.status !== 'ready') return <section className="pw-wallet"><div className="pw-intro"><WalletMark/><h3>Your wallet, in your Passport</h3></div><p role="status">{state.status === 'loading' ? 'Checking your linked wallet…' : state.status === 'signed-out' ? 'Sign in to your account to see your wallet.' : state.status === 'unlinked' ? 'No Para wallet is linked to this account yet. Your wallet will appear here after sign-up creates it.' : state.error}</p>{state.status === 'error' && <button type="button" className="secondary full" onClick={refresh}>Try again</button>}</section>;
  const { wallet, balance, nfts } = state;
  if (detail) return <section className="pw-wallet pw-detail"><button type="button" className="secondary" onClick={() => setDetail(null)}>← Back to NFTs</button><div className="pw-detail-art"><NftArt key={detail.key} item={detail}/></div><small>{detail.collection}</small><h3>{detail.name}</h3>{detail.description && <p>{detail.description}</p>}<dl><dt>Network</dt><dd>{wallet.chain.name}</dd><dt>Token ID</dt><dd>{detail.tokenId}</dd><dt>Standard</dt><dd>{detail.type}</dd><dt>Quantity</dt><dd>{detail.quantity}</dd><dt>Contract</dt><dd><code>{detail.contract}</code></dd></dl></section>;
  return <section className="pw-wallet" aria-label="Wallet holdings">
    <div className="pw-toolbar"><span className="pw-network">{wallet.chain.testnet ? 'Testnet' : 'Mainnet'} · {wallet.chain.name}</span><button type="button" className="pw-refresh" disabled={!!loading} onClick={refresh}>{loading ? 'Refreshing…' : 'Refresh'}</button></div>
    <div className="pw-balance"><span>ETH balance</span><strong aria-live="polite">{balance?.loading ? 'Loading…' : balance?.error ? 'Unavailable' : balance?.formatted}<small>{!balance?.loading && !balance?.error && (wallet.chain.testnet ? 'Test ETH' : 'ETH')}</small></strong>{balance?.error ? <p role="alert">{balance.error}</p> : balance?.checkedAt && <p>Updated {new Date(balance.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}{wallet.chain.testnet && <p className="pw-test-note">Test ETH has no monetary value.</p>}</div>
    <div className="pw-address"><span>Your Para wallet</span><code>{wallet.address}</code><button type="button" onClick={copyAddress}>Copy address</button><small role="status">{copied}</small></div>
    <div className="pw-collection-heading"><h3>NFTs</h3><span>{nfts.loading ? 'Loading…' : nfts.error && !nfts.items.length ? 'Unavailable' : nfts.items.length + (nfts.next ? '+' : '') + ' collectibles'}</span></div>
    {nfts.loading && <p role="status">Loading your collection…</p>}
    {nfts.error && <p className="pw-message" role="alert">{nfts.error}</p>}
    {!nfts.loading && !nfts.error && !nfts.skipped && !nfts.items.length && !nfts.next && <div className="pw-empty"><span aria-hidden="true">◇</span><strong>No NFTs yet</strong><p>NFTs held by this wallet on {wallet.chain.name} will appear here. Newly minted items may take a moment to be indexed.</p></div>}
    {!!nfts.skipped && <p className="pw-message">Some NFT records could not be displayed. This collection may be incomplete.</p>}
    <div className="pw-nft-grid">{nfts.items.map(item => <button type="button" key={item.key} className="pw-nft" onClick={() => setDetail(item)} aria-label={'View ' + item.name}><span className="pw-nft-art"><NftArt item={item}/></span><small>{item.collection}</small><strong>{item.name}</strong><span>#{item.tokenId}{item.type === 'ERC-1155' ? ' · ×' + item.quantity : ''}</span></button>)}</div>
    {nfts.next && <button type="button" className="secondary full" disabled={!!loading} onClick={loadMore}>{nfts.paging ? 'Loading more…' : 'Load more NFTs'}</button>}
    {!nfts.loading && <p className="pw-footnote">Holdings on this network only. Collection data is provided by the network explorer and can take time to update.</p>}
  </section>;
}
