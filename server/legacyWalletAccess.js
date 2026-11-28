// These older game families use the shared wallet-profile login. The separate
// sg/sy/ss/sh/xq/ctl/ap private-seat and account protocols authenticate themselves.
const WALLET_GAME_PREFIXES = Object.freeze([
  'nif', 'fwh', 'fish', 'bti', 'ih', 'siw', 'gt', 'cr', 'fgg',
  'str', 'ir', 'ck', 'ts', 'av', 'pt', 'ag', 'sir', 'kf',
]);
const prefixes = new Set(WALLET_GAME_PREFIXES);

function requiresWalletSession(type) {
  if (typeof type !== 'string') return false;
  const split = type.indexOf('_');
  if (split < 1) return false;
  const prefix = type.slice(0, split);
  return prefixes.has(prefix) && type !== prefix + '_room_list';
}

module.exports = { WALLET_GAME_PREFIXES, requiresWalletSession };
