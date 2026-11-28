const { getLockedMatchMode, getHighStakesLaunchBlockReason } = require('./launchMode.js');

const WALLET = /^0x[0-9a-f]{40}$/i;
const ZERO_WALLET = /^0x0{40}$/i;
const INTERNAL_DENIAL = 'Internal funded access is not authorized for this wallet.';

function internalWallets() {
  const entries = String(process.env.LOCKED_MATCH_INTERNAL_WALLETS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  // An absent or malformed operator configuration must never widen access.
  if (!entries.length || entries.some(value => !WALLET.test(value) || ZERO_WALLET.test(value))) return new Set();
  return new Set(entries);
}

function highStakesEnabled() {
  const flag = process.env.HIGH_STAKES_ENABLED;
  if (flag !== undefined && flag !== '') return flag === 'true';
  const vault = process.env.ETH_VAULT_ADDRESS || process.env.VITE_ETH_VAULT_ADDRESS || '';
  return WALLET.test(vault) && !ZERO_WALLET.test(vault);
}

function launchBlockReason() {
  return getHighStakesLaunchBlockReason('high_stakes') || (highStakesEnabled() ? '' : 'High Stakes rooms are not enabled yet.');
}

function walletBlockReason(authenticatedWallet) {
  const launchReason = launchBlockReason();
  if (launchReason) return launchReason;
  const wallet = String(authenticatedWallet || '').toLowerCase();
  if (!WALLET.test(wallet) || ZERO_WALLET.test(wallet)) return 'Wallet authentication is required for funded rooms.';
  if (getLockedMatchMode() === 'internal' && !internalWallets().has(wallet)) return INTERNAL_DENIAL;
  return '';
}

function isFunded(room) { return room?.roomMode === 'high_stakes'; }

function authorizationFor(ws) {
  if (walletBlockReason(ws.authorizedWallet)) return null;
  return { policy: 'funded-access-v1', wallet: ws.authorizedWallet.toLowerCase(), chainId: Number(process.env.ABSTRACT_CHAIN_ID || 11124), mode: getLockedMatchMode() };
}

function scalarBlockReason(payload) {
  // These protocol identity fields are strings, never objects to coerce. In
  // particular, JSON can shadow toString and make String(value) throw before
  // authorization. Validate before walletOf and every game-service dispatcher.
  const fields = ['wallet', 'address', 'roomCode', 'name', 'challenge', 'signature', 'playerId', 'token'];
  return fields.some(field => payload[field] !== undefined && typeof payload[field] !== 'string')
    ? 'Invalid identity or room fields.' : '';
}

function messageBlockReason(ws, type, payload, rooms) {
  const invalid = scalarBlockReason(payload);
  if (invalid) return invalid;
  const storedRoom = rooms.get(String(payload.roomCode || '').trim().toUpperCase());
  const requestsFundedMode = (type === 'room_create' || type === 'room_list') && payload.roomMode === 'high_stakes';
  if (!requestsFundedMode && !isFunded(storedRoom)) return '';
  // Only the server's signature-verified socket identity grants access. Never
  // accept payload.wallet, client roles, flags, or a claimed roomMode as proof.
  return walletBlockReason(ws.authorizedWallet);
}

function filterPacket(ws, packet) {
  const denied = walletBlockReason(ws.authorizedWallet);
  if (!denied || !packet.payload) return packet;
  if (isFunded(packet.payload.room)) {
    return packet.requestId === undefined ? null : { type: 'error', requestId: packet.requestId, payload: { message: denied } };
  }
  let payload = packet.payload;
  for (const field of ['rooms', 'history']) {
    if (Array.isArray(payload[field])) payload = { ...payload, [field]: payload[field].filter(item => !isFunded(item)) };
  }
  return payload === packet.payload ? packet : { ...packet, payload };
}

function roomOperationBlockReason(room) {
  if (!isFunded(room)) return '';
  const launchReason = launchBlockReason();
  if (launchReason) return launchReason;
  if (getLockedMatchMode() === 'internal') {
    const allowed = internalWallets(), players = Object.values(room.players || {});
    if (!players.length || players.some(player => !allowed.has(String(player.wallet || '').toLowerCase()))) return INTERNAL_DENIAL;
    // Restored payout records are checked too, before a signer/provider is used.
    if ((room.payoutPlan || []).some(item => !allowed.has(String(item.wallet || '').toLowerCase()))) return INTERNAL_DENIAL;
  }
  return '';
}

module.exports = { highStakesEnabled, walletBlockReason, authorizationFor, scalarBlockReason, messageBlockReason, filterPacket, roomOperationBlockReason };
