const ADDRESS = /^0x[0-9a-f]{40}$/i;
const MATCH_ID = /^0x[0-9a-f]{64}$/i;
const normalized = value => typeof value === 'string' ? value.toLowerCase() : '';

function identity(getContext, expectedChainId) {
  const current = getContext();
  const wallet = normalized(current?.address);
  if (!ADDRESS.test(wallet) || /^0x0{40}$/.test(wallet) || wallet !== normalized(current?.profileWallet)
      || wallet !== normalized(current?.client?.account?.address)) {
    throw new Error('Reconnect and sign in with the same wallet before funding this match.');
  }
  if (![11124, 2741].includes(expectedChainId) || current.chainId !== expectedChainId || current.client.chain?.id !== expectedChainId) {
    throw new Error('Switch to the configured Abstract network before funding this match.');
  }
  if (typeof current.client.writeContract !== 'function') throw new Error('The wallet client is not ready.');
  return { wallet, client: current.client };
}

function unchangedIdentity(getContext, expectedChainId, original) {
  const current = identity(getContext, expectedChainId);
  if (current.wallet !== original.wallet || current.client !== original.client) {
    throw new Error('Your wallet changed while access was checked. Try again with the signed-in wallet.');
  }
  return current;
}

function positiveAmount(value) {
  const text = String(value ?? '');
  if (!/^\d+$/.test(text) || BigInt(text) <= 0n) throw new Error('The funded amount is not valid.');
  return BigInt(text);
}

function requireServerAuthorization(response, wallet, chainId) {
  const approval = response?.fundedAuthorization;
  if (response?.launchBlocked || approval?.policy !== 'funded-access-v1' || normalized(approval.wallet) !== wallet
      || approval.chainId !== chainId || !['internal', 'testnet', 'public'].includes(approval.mode)) {
    throw new Error('The server has not confirmed current funded access for this wallet and network.');
  }
}

export async function depositWithAuthorization({ getContext, expectedChainId, authorize, contract, value, onReady = () => {} }) {
  const original = identity(getContext, expectedChainId), amount = positiveAmount(value);
  // The server must compare this wallet to its signature-bound socket identity.
  // A generic launch-status response is not proof of participant authorization.
  const approval = await authorize(original.wallet);
  requireServerAuthorization(approval, original.wallet, expectedChainId);
  const current = unchangedIdentity(getContext, expectedChainId, original);
  onReady();
  return current.client.writeContract({ ...contract, functionName: 'deposit', value: amount });
}

export async function lockWithAuthorization({ getContext, expectedChainId, loadRoom, contract, room, onReady = () => {}, now = Date.now }) {
  const original = identity(getContext, expectedChainId);
  const expectedCode = room?.roomCode, expectedMatchId = room?.contractMatchId, expectedEntry = positiveAmount(room?.entryWei);
  if (typeof expectedCode !== 'string' || !MATCH_ID.test(expectedMatchId || '')) throw new Error('Room data is not ready.');
  const response = await loadRoom({ roomCode: expectedCode, wallet: original.wallet });
  requireServerAuthorization(response, original.wallet, expectedChainId);
  const fresh = response.room;
  const current = unchangedIdentity(getContext, expectedChainId, original);
  if (!fresh || fresh.roomMode !== 'high_stakes' || fresh.roomCode !== expectedCode
      || normalized(fresh.contractMatchId) !== normalized(expectedMatchId) || positiveAmount(fresh.entryWei) !== expectedEntry) {
    throw new Error('The room or entry amount changed. Reopen the room before funding it.');
  }
  const player = Array.isArray(fresh.players) ? fresh.players.find(value => normalized(value.wallet) === current.wallet) : null;
  if (!player || fresh.status !== 'waiting' || fresh.countdownStartTime || player.entryLocked) {
    throw new Error('This room is no longer waiting for an entry from your wallet.');
  }
  if (fresh.highStakesExpiresAt && Number(fresh.highStakesExpiresAt) <= now()) {
    throw new Error('This room expired. Join a current room before funding it.');
  }
  onReady(fresh);
  const txHash = await current.client.writeContract({ ...contract, functionName: 'depositAndLock', args: [fresh.contractMatchId], value: expectedEntry });
  return { txHash, room: fresh, wallet: current.wallet };
}
