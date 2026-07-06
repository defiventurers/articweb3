import { useEffect, useMemo, useState } from "react";
import { formatEther } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import { appConfig } from "../config/chain.js";
import { ETH_TARGETS_READY, ETH_VAULT_ADDRESS } from "../config/chainTargets.js";
import { ethVaultAbi } from "../contracts/abis.js";
import { ExpiredLockRecovery } from "../components/ExpiredLockRecovery.jsx";
import { InvitedRoomPanel } from "../components/InvitedRoomPanel.jsx";
import { confirmEntryLock, createRoom, joinRoom, listRooms } from "../network/socketClient.js";
import { FALLBACK_HIGH_STAKES_TIERS, getFallbackTierSnapshot, getHighStakesTiers } from "../network/highStakesTiers.js";
import "../styles/highStakes.css";

const FALLBACK_TIERS = FALLBACK_HIGH_STAKES_TIERS;
const ROOM_PAGE_SIZE = 9;
const CALIBRATION_QUERY_KEY = "calibrateHighstakes";
const NETWORK_LOCK_COPY = appConfig.isMainnet ? "mainnet lock" : "testnet lock";
const NETWORK_ETH_COPY = appConfig.isMainnet ? "mainnet ETH" : "testnet ETH";
const DEFAULT_HIGH_STAKES_WAIT_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const ROOM_SEEN_STORAGE_PREFIX = "artic-highstakes-room-seen-at:";

export function HighStakesScreen({ profile, initialRoomCode = "", onRoomReady, onBack }) {
  const { address } = useAccount();
  const { data: abstractClient } = useAbstractClient();
  const [room, setRoom] = useState(null);
  const [publicRooms, setPublicRooms] = useState([]);
  const [roomPage, setRoomPage] = useState(0);
  const [joinCode, setJoinCode] = useState(() => clean(initialRoomCode));
  const [showInvitePanel, setShowInvitePanel] = useState(() => Boolean(clean(initialRoomCode)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [tierPickerMode, setTierPickerMode] = useState(null);
  const [hasCurrentRoomLock, setHasCurrentRoomLock] = useState(false);
  const [tierSnapshot, setTierSnapshot] = useState(() => getFallbackTierSnapshot());
  const [nowMs, setNowMs] = useState(() => Date.now());

  const calibrateHighstakes = useMemo(() => isHighstakesCalibrationEnabled(), []);
  const invitedRoomCode = useMemo(() => clean(initialRoomCode), [initialRoomCode]);
  const displayName = getDisplayName(profile, address);

  const walletBalanceQuery = useBalance({ address, query: { enabled: Boolean(address) } });
  const availableQuery = useReadContract({
    address: ETH_VAULT_ADDRESS,
    abi: ethVaultAbi,
    functionName: "availableBalance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && ETH_TARGETS_READY) }
  });

  const lockedQuery = useReadContract({
    address: ETH_VAULT_ADDRESS,
    abi: ethVaultAbi,
    functionName: "lockedBalance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && ETH_TARGETS_READY) }
  });

  const activePublicRooms = useMemo(() => publicRooms.filter((candidate) => !isExpiredRoom(candidate, nowMs)), [publicRooms, nowMs]);
  const hasExpiredPublicRooms = activePublicRooms.length !== publicRooms.length;
  const pageCount = Math.max(1, Math.ceil(activePublicRooms.length / ROOM_PAGE_SIZE));
  const visibleRooms = useMemo(() => {
    const start = roomPage * ROOM_PAGE_SIZE;
    return activePublicRooms.slice(start, start + ROOM_PAGE_SIZE);
  }, [activePublicRooms, roomPage]);
  const hasNextPage = roomPage < pageCount - 1;
  const hasPrevPage = roomPage > 0;
  const availableBalance = availableQuery.data || 0n;
  const lockedBalance = lockedQuery.data || 0n;
  const walletBalance = walletBalanceQuery.data?.value || 0n;
  const roomEntryWei = room ? BigInt(room.entryWei || "0") : 0n;
  const hasWalletForRoom = !room || roomEntryWei <= 0n || walletBalance >= roomEntryWei;
  const tiers = tierSnapshot.tiers?.length ? tierSnapshot.tiers : FALLBACK_TIERS;

  useEffect(() => {
    refreshRooms();
    refreshTiers();
    const clock = setInterval(() => setNowMs(Date.now()), 1000);
    const roomRefresh = setInterval(() => refreshRooms(), 15000);
    const onPacket = (event) => {
      const packet = event.detail;
      const nextRoom = normalizeRoomCountdown(packet?.payload?.room);
      if (packet?.type !== "room_state" || nextRoom?.roomMode !== "high_stakes") return;
      setPublicRooms((current) => mergeRoomList(current, nextRoom));
      setRoom((currentRoom) => (currentRoom?.roomCode === nextRoom.roomCode ? nextRoom : currentRoom));
    };
    window.addEventListener("server-packet", onPacket);
    return () => {
      clearInterval(clock);
      clearInterval(roomRefresh);
      window.removeEventListener("server-packet", onPacket);
    };
  }, []);

  useEffect(() => {
    if (invitedRoomCode) {
      setJoinCode(invitedRoomCode);
      setShowInvitePanel(true);
    }
  }, [invitedRoomCode]);

  useEffect(() => {
    setRoomPage((page) => clampPage(page, activePublicRooms.length));
  }, [activePublicRooms.length]);

  useEffect(() => {
    if (!hasExpiredPublicRooms) return;
    const timer = setTimeout(() => refreshRooms(), 1000);
    return () => clearTimeout(timer);
  }, [hasExpiredPublicRooms]);

  useEffect(() => {
    setHasCurrentRoomLock(false);
  }, [room?.contractMatchId, address]);

  async function refreshTiers() {
    try {
      setTierSnapshot(await getHighStakesTiers());
    } catch (err) {
      setTierSnapshot((current) => ({ ...(current?.tiers?.length ? current : getFallbackTierSnapshot()), ok: false, error: err.message || "Tier refresh failed." }));
    }
  }

  async function refreshBalances() {
    await Promise.all([availableQuery.refetch?.(), lockedQuery.refetch?.(), walletBalanceQuery.refetch?.()]);
  }

  async function refreshRooms() {
    try {
      const rooms = await listRooms({ roomMode: "high_stakes" });
      const liveRooms = rooms.map(normalizeRoomCountdown).filter((candidate) => !isExpiredRoom(candidate, Date.now()));
      setPublicRooms(liveRooms);
      setRoomPage((page) => clampPage(page, liveRooms.length));
    } catch (err) {
      setError(err.message || "Could not load rooms.");
    }
  }

  async function refreshAfterRecovery() {
    await Promise.all([refreshBalances(), refreshRooms(), refreshTiers()]);
    setHasCurrentRoomLock(false);
  }

  async function makeRoom(tier) {
    await run(async () => {
      const created = normalizeRoomCountdown(await createRoom({ visibility: "public", roomMode: "high_stakes", entryTier: tier.code, profile }));
      setRoom(created);
      setTierPickerMode(null);
      await refreshRooms();
    });
  }

  async function depositTier(tier) {
    if (!abstractClient) return setError("Wallet client is not ready. Reconnect AGW and try again.");
    await run(async () => {
      const value = BigInt(tier.entryWei || tier.fallbackWei || "0");
      setStatus(`Open AGW to deposit ${formatEntry(value.toString())} ETH for ${tier.label || `$${tier.entryFeeUsd}`} on ${appConfig.isMainnet ? "Abstract Mainnet" : "Abstract Testnet"}.`);
      await abstractClient.writeContract({ address: ETH_VAULT_ADDRESS, abi: ethVaultAbi, functionName: "deposit", value });
      setTierPickerMode(null);
      await refreshBalances();
    });
  }

  async function enterRoom(codeValue = joinCode) {
    const code = clean(codeValue);
    if (code.length !== 4) return setError("Enter a 4-character room code.");
    await run(async () => {
      const joined = normalizeRoomCountdown(await joinRoom({ roomCode: code, profile }));
      setRoom(joined);
      setJoinCode("");
      setShowInvitePanel(false);
      await refreshRooms();
    });
  }

  async function joinInvitedRoom() {
    await enterRoom(invitedRoomCode || joinCode);
    cleanInviteQueryParams();
  }

  async function copyInvitedRoomLink() {
    const code = invitedRoomCode || joinCode;
    if (!code) return;
    await copyLines([`Invite link: ${buildRoomInviteUrl(code)}`, `Room code: ${code}`], "Invite link copied.");
  }

  function dismissInvitedRoom() {
    setShowInvitePanel(false);
    cleanInviteQueryParams();
  }

  async function confirmWithWallet() {
    if (!room || hasCurrentRoomLock) return;
    if (!hasWalletForRoom) return setError(`Not enough wallet ETH for this ${NETWORK_LOCK_COPY}. Fund wallet or choose a smaller room.`);
    if (!abstractClient) return setError("Wallet client is not ready. Reconnect AGW and try again.");
    await run(async () => {
      const value = BigInt(room.entryWei || "0");
      if (!room.contractMatchId || value <= 0n) throw new Error("Room data is not ready.");
      setStatus(`Open AGW and confirm the ${NETWORK_LOCK_COPY}.`);
      const txHash = await abstractClient.writeContract({
        address: ETH_VAULT_ADDRESS,
        abi: ethVaultAbi,
        functionName: "depositAndLock",
        args: [room.contractMatchId],
        value
      });
      setStatus("Confirming on server...");
      const nextRoom = normalizeRoomCountdown(await waitForLock(txHash));
      setHasCurrentRoomLock(true);
      onRoomReady(nextRoom);
    });
  }

  async function waitForLock(txHash) {
    let lastError;
    for (let attempt = 0; attempt < 18; attempt += 1) {
      try {
        return await confirmEntryLock({ roomCode: room.roomCode, profile, txHash });
      } catch (err) {
        lastError = err;
        await delay(2500);
      }
    }
    throw lastError || new Error("Server could not verify yet. Wait a few seconds and try again.");
  }

  async function copyRoomInvite() {
    if (!room) return;
    const lines = [
      "Open Ice Closed Beta Room Invite",
      `Invite link: ${buildRoomInviteUrl(room.roomCode)}`,
      `Room code: ${room.roomCode}`,
      `Mode: Locked Match Lab`,
      `Entry: ${formatEntry(room.entryWei)} ETH`,
      `Network: ${appConfig.isMainnet ? "Abstract Mainnet" : "Abstract Testnet"}`,
      "",
      "Steps:",
      "1. Open the invite link.",
      "2. Connect Abstract Global Wallet.",
      "3. Complete or confirm profile.",
      "4. Click Join Invited Room in High Stakes Lab.",
      "5. Confirm the lock in AGW.",
      "6. Select a team after lock confirmation."
    ];
    await copyLines(lines, "Room invite copied.");
  }

  async function copyLockDebugContext() {
    if (!room) return;
    const lockedCount = room.players?.filter((player) => player.entryLocked).length || 0;
    const lines = [
      "Locked Match Debug Context",
      `Room code: ${room.roomCode}`,
      `Invite link: ${buildRoomInviteUrl(room.roomCode)}`,
      `Contract match id: ${room.contractMatchId || "—"}`,
      `Entry wei: ${room.entryWei || "—"}`,
      `Entry ETH: ${formatEntry(room.entryWei)}`,
      `Wallet: ${address || "—"}`,
      `Wallet ETH: ${formatAmount(walletBalance)}`,
      `Vault available ETH: ${formatAmount(availableBalance)}`,
      `Vault locked ETH: ${formatAmount(lockedBalance)}`,
      `Players: ${room.playerCount || 1}/${room.maxPlayers || 4}`,
      `Locked players: ${lockedCount}`,
      `Auto-cancel: ${formatRoomCountdown(room, Date.now()) || "—"}`,
      `Refund status: ${room.refundStatus || "—"}`,
      `Status: ${room.status || "—"}`
    ];
    await copyLines(lines, "Lock debug context copied.");
  }

  async function copyLines(lines, successMessage) {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setError("");
      setStatus(successMessage);
    } catch {
      setStatus("");
      setError("Copy failed. Select the room details manually.");
    }
  }

  async function run(action) {
    if (busy) return;
    try {
      setBusy(true);
      setError("");
      await action();
    } catch (err) {
      setError(err.shortMessage || err.message || "Request failed.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  function nextPage() {
    if (!hasNextPage) return;
    setRoomPage((page) => Math.min(pageCount - 1, page + 1));
  }

  function prevPage() {
    if (!hasPrevPage) return;
    setRoomPage((page) => Math.max(0, page - 1));
  }

  function roomSlot(slotIndex) {
    const realRoom = visibleRooms[slotIndex];
    const sampleRoom = calibrateHighstakes ? getCalibrationRoom(slotIndex, nowMs) : null;
    const slotRoom = realRoom || sampleRoom;
    const globalIndex = roomPage * ROOM_PAGE_SIZE + slotIndex;
    const isSample = !realRoom && Boolean(sampleRoom);
    const countdown = formatRoomCountdown(slotRoom, nowMs);

    return (
      <div className={`highstakes-room-card hs-room-${slotIndex}`} key={`slot-${slotIndex}`}>
        {slotRoom && (
          <>
            <div className="hs-room-code" data-calibrate={`room-${slotIndex}-code`} title={countdown ? `Auto-cancel ${countdown}` : undefined}>{slotRoom.roomCode}</div>
            {countdown && <div className="hs-room-autocancel" data-calibrate={`room-${slotIndex}-autocancel`}>({countdown})</div>}
            <div className="hs-room-count" data-calibrate={`room-${slotIndex}-users`}>{slotRoom.playerCount || 0}/{slotRoom.maxPlayers || 4}</div>
            <div className="hs-room-fee" data-calibrate={`room-${slotIndex}-eth`}>{formatEntry(slotRoom.entryWei)} ETH</div>
            <div className="hs-room-usd" data-calibrate={`room-${slotIndex}-usd`}>{getUsdEntryLabel(slotRoom) || "ENTRY"}</div>
          </>
        )}
        {slotRoom && <button className="screen-hitbox hs-room-join-hitbox" data-calibrate={`room-${slotIndex}-join`} aria-label={`Join room ${slotRoom.roomCode}`} disabled={busy || (!isSample && !canJoin(slotRoom, nowMs))} onClick={() => !isSample && enterRoom(slotRoom.roomCode)} />}
        {!slotRoom && <div className="hs-room-empty">{globalIndex === 0 ? "No public rooms" : ""}</div>}
      </div>
    );
  }

  return (
    <section id="screenHighStakes" className={`art-screen highstakes-screen ${calibrateHighstakes ? "is-calibrating" : ""}`} aria-label="Locked Match Mode">
      <div className="highstakes-shell">
        <div className="art-stage highstakes-stage">
          <img className="screen-art" src="/assets/screens/highstakes.png" alt="Locked Match Mode" draggable="false" />

          <div className="highstakes-overlay">
            <div id="highStakesWalletText" className="highstakes-wallet-text" data-calibrate="wallet-text">{displayName}</div>
            <div id="highStakesPointsText" className="highstakes-points-text" data-calibrate="points-text">{profile?.points ?? ""}</div>
            <div id="highStakesAvailableBalance" className="highstakes-lock-value available-lock-value" data-calibrate="available-lock">{formatAmount(availableBalance)} ETH</div>
            <div id="highStakesLockedBalance" className="highstakes-lock-value locked-lock-value" data-calibrate="locked-lock">{formatAmount(lockedBalance)} ETH</div>
            <div className="highstakes-page-text" data-calibrate="page-text">Page {roomPage + 1}/{pageCount}</div>
            {hasPrevPage && <div className="highstakes-prev-page-label">PREV PAGE</div>}
            {Array.from({ length: ROOM_PAGE_SIZE }, (_, index) => roomSlot(index))}
            {(status || error) && <div className={`highstakes-toast ${error ? "error" : ""}`}>{error || status}</div>}
          </div>

          <div className="hitbox-layer highstakes-hitboxes">
            <button id="highStakesCreateRoomBtn" className="screen-hitbox hs-create-room-hitbox" data-calibrate="create-room-hitbox" aria-label="Create Room" disabled={busy} onClick={() => setTierPickerMode("create")} />
            <button id="highStakesRefreshRoomsBtn" className="screen-hitbox hs-refresh-rooms-hitbox" data-calibrate="refresh-rooms-hitbox" aria-label="Refresh Rooms" disabled={busy} onClick={() => { refreshRooms(); refreshTiers(); }} />
            <button id="highStakesPrevPageBtn" className="screen-hitbox hs-prev-page-hitbox" data-calibrate="prev-page-hitbox" aria-label="Previous Page" disabled={busy || !hasPrevPage} onClick={prevPage} />
            <button id="highStakesNextPageBtn" className="screen-hitbox hs-next-page-hitbox" data-calibrate="next-page-hitbox" aria-label="Next Page" disabled={busy || !hasNextPage} onClick={nextPage} />
            <button id="highStakesDepositBtn" className="screen-hitbox hs-deposit-hitbox" data-calibrate="deposit-hitbox" aria-label="Deposit" disabled={busy || !ETH_TARGETS_READY} onClick={() => setTierPickerMode("deposit")} />
            <button id="highStakesBackBtn" className="screen-hitbox hs-back-hitbox" data-calibrate="back-hitbox" aria-label="Back To Hub" disabled={busy} onClick={onBack} />
          </div>

          <input
            id="highStakesPrivateRoomInput"
            className="highstakes-private-input"
            data-calibrate="private-room-input"
            inputMode="text"
            autoComplete="off"
            maxLength={4}
            aria-label="Private room code"
            value={joinCode}
            onChange={(event) => setJoinCode(clean(event.target.value))}
          />
          <button id="highStakesJoinPrivateBtn" className="screen-hitbox hs-join-private-hitbox" data-calibrate="join-private-hitbox" aria-label="Join Private Room" disabled={busy} onClick={() => enterRoom()} />

          {showInvitePanel && invitedRoomCode && !room && !tierPickerMode && (
            <InvitedRoomPanel roomCode={invitedRoomCode} busy={busy} onJoin={joinInvitedRoom} onDismiss={dismissInvitedRoom} onCopyLink={copyInvitedRoomLink} />
          )}

          {tierPickerMode && (
            <div className="highstakes-modal" role="dialog" aria-modal="true" aria-label={tierPickerMode === "create" ? "Choose entry amount" : "Choose deposit amount"}>
              <div className="highstakes-modal-card">
                <h3>{tierPickerMode === "create" ? "Choose Entry" : `Deposit ${NETWORK_ETH_COPY}`}</h3>
                <p>{tierPickerMode === "create" ? `Pick the ${NETWORK_LOCK_COPY} amount for the new room.` : `Pick how much ${NETWORK_ETH_COPY} to deposit into available balance.`}</p>
                <div className="highstakes-tier-grid">
                  {tiers.map((tier) => (
                    <button key={tier.code} type="button" className={`highstakes-tier-btn entry-${tier.code}`} disabled={busy} onClick={() => tierPickerMode === "create" ? makeRoom(tier) : depositTier(tier)}>
                      <strong>{tier.label || `$${tier.entryFeeUsd} Entry`}</strong>
                      <span>{formatEntry(tier.entryWei || tier.fallbackWei)} ETH</span>
                    </button>
                  ))}
                </div>
                <p className="highstakes-modal-note">
                  ETH/USD {tierSnapshot.ethUsd ? `$${Number(tierSnapshot.ethUsd).toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "unavailable"} · {tierSnapshot.ok ? "daily backend rate" : "fallback rate"}
                </p>
                <button type="button" className="highstakes-modal-cancel" disabled={busy} onClick={() => setTierPickerMode(null)}>Cancel</button>
              </div>
            </div>
          )}

          {room && (
            <div className="highstakes-modal" role="dialog" aria-modal="true" aria-label={`Confirm ${NETWORK_LOCK_COPY}`}>
              <div className="highstakes-modal-card">
                <h3>Room {room.roomCode}</h3>
                <p>{getUsdEntryLabel(room) || "Entry"} · Required lock {formatEntry(room.entryWei)} ETH</p>
                <p>Wallet {formatAmount(walletBalance)} ETH · Vault available {formatAmount(availableBalance)} ETH</p>
                {formatRoomCountdown(room, nowMs) && <p>Auto-cancels in {formatRoomCountdown(room, nowMs)} if fewer than 4 players join.</p>}
                {room.refundStatus && <p>Refund status: {room.refundStatus}</p>}
                {!hasWalletForRoom && <p className="error">Wallet ETH is below this room lock. Fund wallet or choose a smaller room.</p>}
                <p>{room.playerCount || 1}/4 players · {room.players?.filter((player) => player.entryLocked).length || 0} locked</p>
                <button type="button" className="highstakes-modal-cancel" disabled={busy} onClick={copyRoomInvite}>Copy Room Invite</button>
                <button type="button" className="highstakes-modal-cancel" disabled={busy} onClick={copyLockDebugContext}>Copy Lock Debug</button>
                <ExpiredLockRecovery room={room} busy={busy} onRecovered={refreshAfterRecovery} onLockStateChange={setHasCurrentRoomLock} />
                {hasCurrentRoomLock ? (
                  <button type="button" className="highstakes-modal-primary" disabled>Entry Lock Confirmed</button>
                ) : (
                  <button type="button" className="highstakes-modal-primary" disabled={busy || !hasWalletForRoom || isExpiredRoom(room, nowMs)} onClick={confirmWithWallet}>{busy ? "Working..." : `Confirm ${appConfig.isMainnet ? "Mainnet" : "Testnet"} Lock`}</button>
                )}
                <button type="button" className="highstakes-modal-cancel" disabled={busy} onClick={() => setRoom(null)}>Choose Another Room</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function mergeRoomList(current, nextRoom) {
  const normalizedRoom = normalizeRoomCountdown(nextRoom);
  const roomStillListed = normalizedRoom?.visibility === "public" && normalizedRoom.status === "waiting" && !isExpiredRoom(normalizedRoom, Date.now());
  const filtered = current.filter((item) => item.roomCode !== normalizedRoom?.roomCode);
  return roomStillListed ? [normalizedRoom, ...filtered] : filtered;
}

function canJoin(room, nowMs = Date.now()) {
  return room && room.status === "waiting" && !room.countdownStartTime && Number(room.playerCount || 0) < Number(room.maxPlayers || 4) && !isExpiredRoom(room, nowMs);
}

function clampPage(page, totalRooms) {
  const maxPage = Math.max(0, Math.ceil(totalRooms / ROOM_PAGE_SIZE) - 1);
  return Math.min(page, maxPage);
}

function getDisplayName(profile, address) {
  if (profile?.name && String(profile.name).trim()) return String(profile.name).trim();
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getCalibrationRoom(index, nowMs = Date.now()) {
  const expiresAt = nowMs + (2 * 60 * 60 * 1000) - (index * 7 * 60 * 1000);
  const samples = [
    { roomCode: "YS3B", entryFeeUsd: 1, entryWei: FALLBACK_TIERS[0].entryWei, playerCount: 2, maxPlayers: 4, status: "waiting", highStakesExpiresAt: expiresAt },
    { roomCode: "A352", entryFeeUsd: 4, entryWei: FALLBACK_TIERS[1].entryWei, playerCount: 1, maxPlayers: 4, status: "waiting", highStakesExpiresAt: expiresAt },
    { roomCode: "FTY2", entryFeeUsd: 16, entryWei: FALLBACK_TIERS[2].entryWei, playerCount: 3, maxPlayers: 4, status: "waiting", highStakesExpiresAt: expiresAt },
    { roomCode: "J4VE", entryFeeUsd: 4, entryWei: FALLBACK_TIERS[1].entryWei, playerCount: 2, maxPlayers: 4, status: "waiting", highStakesExpiresAt: expiresAt },
    { roomCode: "T6RK", entryFeeUsd: 1, entryWei: FALLBACK_TIERS[0].entryWei, playerCount: 4, maxPlayers: 4, status: "waiting", highStakesExpiresAt: expiresAt },
    { roomCode: "H9CY", entryFeeUsd: 4, entryWei: FALLBACK_TIERS[1].entryWei, playerCount: 1, maxPlayers: 4, status: "waiting", highStakesExpiresAt: expiresAt },
    { roomCode: "B3UA", entryFeeUsd: 16, entryWei: FALLBACK_TIERS[2].entryWei, playerCount: 3, maxPlayers: 4, status: "waiting", highStakesExpiresAt: expiresAt },
    { roomCode: "W5DN", entryFeeUsd: 4, entryWei: FALLBACK_TIERS[1].entryWei, playerCount: 1, maxPlayers: 4, status: "waiting", highStakesExpiresAt: expiresAt },
    { roomCode: "Z1GF", entryFeeUsd: 1, entryWei: FALLBACK_TIERS[0].entryWei, playerCount: 2, maxPlayers: 4, status: "waiting", highStakesExpiresAt: expiresAt }
  ];
  return samples[index] || null;
}

function normalizeRoomCountdown(room) {
  if (!room || room.roomMode !== "high_stakes" || room.status !== "waiting") return room;
  const serverExpiresAt = Number(room.highStakesExpiresAt || 0);
  if (Number.isFinite(serverExpiresAt) && serverExpiresAt > 0) return room;
  const timeoutMs = Number(room.highStakesWaitTimeoutMs || DEFAULT_HIGH_STAKES_WAIT_TIMEOUT_MS);
  const createdAt = Number(room.createdAt || 0);
  const firstSeenAt = createdAt > 0 ? createdAt : getRoomFirstSeenAt(room.roomCode);
  return { ...room, highStakesWaitTimeoutMs: timeoutMs, highStakesExpiresAt: firstSeenAt + timeoutMs, highStakesCountdownFallback: true };
}

function getRoomFirstSeenAt(roomCode) {
  const key = `${ROOM_SEEN_STORAGE_PREFIX}${clean(roomCode)}`;
  const now = Date.now();
  if (typeof window === "undefined" || !window.localStorage) return now;
  const existing = Number(window.localStorage.getItem(key) || 0);
  if (Number.isFinite(existing) && existing > 0) return existing;
  window.localStorage.setItem(key, String(now));
  return now;
}

function getUsdEntryLabel(room) {
  const usd = Number(room?.entryFeeUsd || 0);
  return Number.isFinite(usd) && usd > 0 ? `$${usd} Entry` : "";
}

function formatRoomCountdown(room, nowMs = Date.now()) {
  if (!room || room.status !== "waiting") return "";
  const normalizedRoom = normalizeRoomCountdown(room);
  const expiresAt = Number(normalizedRoom.highStakesExpiresAt || 0);
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return "";
  const remainingMs = Math.max(0, expiresAt - nowMs);
  if (remainingMs <= 0) return "canceling";
  const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h${String(minutes).padStart(2, "0")}m` : `${minutes}m`;
}

function isExpiredRoom(room, nowMs = Date.now()) {
  if (!room || room.status !== "waiting") return false;
  const normalizedRoom = normalizeRoomCountdown(room);
  const expiresAt = Number(normalizedRoom.highStakesExpiresAt || 0);
  return Number.isFinite(expiresAt) && expiresAt > 0 && nowMs >= expiresAt;
}

function formatEntry(value) {
  try { return trimEth(formatEther(BigInt(value || "0"))); } catch { return "0"; }
}

function formatAmount(value) {
  return trimEth(formatEther(value || 0n));
}

function trimEth(value) {
  const [whole, decimal = ""] = String(value || "0").split(".");
  const cleanDecimal = decimal.slice(0, 8).replace(/0+$/, "");
  return cleanDecimal ? `${whole}.${cleanDecimal}` : whole;
}

function clean(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

function buildRoomInviteUrl(roomCode) {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.delete("spectate");
  url.searchParams.set("highStakesRoom", clean(roomCode));
  return url.toString();
}

function cleanInviteQueryParams() {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  url.searchParams.delete("highStakesRoom");
  url.searchParams.delete("hsRoom");
  url.searchParams.delete("lockedRoom");
  window.history.replaceState({}, "", url.toString());
}

function isHighstakesCalibrationEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(CALIBRATION_QUERY_KEY) === "1";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
