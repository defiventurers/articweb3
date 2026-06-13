import { useEffect, useMemo, useState } from "react";
import { formatEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import { ETH_TARGETS_READY, ETH_VAULT_ADDRESS } from "../config/chainTargets.js";
import { ethVaultAbi } from "../contracts/abis.js";
import { confirmEntryLock, createRoom, joinRoom, listRooms } from "../network/socketClient.js";

const TIERS = [
  { code: "1", label: "Tier A", fallbackWei: "1000000000000000" },
  { code: "4", label: "Tier B", fallbackWei: "4000000000000000" },
  { code: "16", label: "Tier C", fallbackWei: "16000000000000000" }
];

const ROOM_PAGE_SIZE = 9;

export function HighStakesScreen({ profile, onRoomReady, onBack }) {
  const { address } = useAccount();
  const { data: abstractClient } = useAbstractClient();
  const [room, setRoom] = useState(null);
  const [publicRooms, setPublicRooms] = useState([]);
  const [roomPage, setRoomPage] = useState(0);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [tierPickerMode, setTierPickerMode] = useState(null);

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

  const visibleRooms = useMemo(() => {
    const start = roomPage * ROOM_PAGE_SIZE;
    return publicRooms.slice(start, start + ROOM_PAGE_SIZE);
  }, [publicRooms, roomPage]);
  const hasNextPage = (roomPage + 1) * ROOM_PAGE_SIZE < publicRooms.length;
  const availableBalance = availableQuery.data || 0n;
  const lockedBalance = lockedQuery.data || 0n;

  useEffect(() => {
    refreshRooms();
    const onPacket = (event) => {
      const packet = event.detail;
      const nextRoom = packet?.payload?.room;
      if (packet?.type !== "room_state" || nextRoom?.roomMode !== "high_stakes") return;
      setPublicRooms((current) => mergeRoomList(current, nextRoom));
      setRoom((currentRoom) => (currentRoom?.roomCode === nextRoom.roomCode ? nextRoom : currentRoom));
    };
    window.addEventListener("server-packet", onPacket);
    return () => window.removeEventListener("server-packet", onPacket);
  }, []);

  async function refreshBalances() {
    await Promise.all([availableQuery.refetch?.(), lockedQuery.refetch?.()]);
  }

  async function refreshRooms() {
    try {
      const rooms = await listRooms({ roomMode: "high_stakes" });
      setPublicRooms(rooms);
      setRoomPage((page) => clampPage(page, rooms.length));
    } catch (err) {
      setError(err.message || "Could not load rooms.");
    }
  }

  async function makeRoom(tier) {
    await run(async () => {
      const created = await createRoom({ visibility: "public", roomMode: "high_stakes", entryTier: tier.code, profile });
      setRoom(created);
      setTierPickerMode(null);
      await refreshRooms();
    });
  }

  async function depositTier(tier) {
    if (!abstractClient) return setError("Wallet client is not ready. Reconnect AGW and try again.");
    await run(async () => {
      const value = BigInt(tier.fallbackWei || "0");
      setStatus(`Open AGW to deposit ${formatEntry(value.toString())}.`);
      await abstractClient.writeContract({ address: ETH_VAULT_ADDRESS, abi: ethVaultAbi, functionName: "deposit", value });
      setTierPickerMode(null);
      await refreshBalances();
    });
  }

  async function enterRoom(codeValue = joinCode) {
    const code = clean(codeValue);
    if (code.length !== 4) return setError("Enter a 4-character room code.");
    await run(async () => {
      const joined = await joinRoom({ roomCode: code, profile });
      setRoom(joined);
      setJoinCode("");
      await refreshRooms();
    });
  }

  async function confirmWithWallet() {
    if (!room) return;
    if (!abstractClient) return setError("Wallet client is not ready. Reconnect AGW and try again.");
    await run(async () => {
      const value = BigInt(room.entryWei || "0");
      if (!room.contractMatchId || value <= 0n) throw new Error("Room data is not ready.");
      setStatus("Open AGW and confirm the testnet lock.");
      const txHash = await abstractClient.writeContract({
        address: ETH_VAULT_ADDRESS,
        abi: ethVaultAbi,
        functionName: "depositAndLock",
        args: [room.contractMatchId],
        value
      });
      setStatus("Confirming on server...");
      const nextRoom = await waitForLock(txHash);
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
    if (!hasNextPage) return setRoomPage(0);
    setRoomPage((page) => page + 1);
  }

  function roomSlot(slotIndex) {
    const slotRoom = visibleRooms[slotIndex];
    const globalIndex = roomPage * ROOM_PAGE_SIZE + slotIndex;
    return (
      <div className={`highstakes-room-card hs-room-${slotIndex}`} key={`slot-${slotIndex}`}>
        {slotRoom && (
          <>
            <div className="hs-room-code">{slotRoom.roomCode}</div>
            <div className={`hs-room-tier tier-${slotRoom.entryTier || "1"}`}>{tierLabel(slotRoom.entryTier)}</div>
            <div className="hs-room-count">{slotRoom.playerCount || 0}/4</div>
            <div className="hs-room-fee">{formatEntry(slotRoom.entryWei)}</div>
            <div className={`hs-room-status ${roomStatus(slotRoom).toLowerCase()}`}>{roomStatus(slotRoom)}</div>
          </>
        )}
        {slotRoom && <button className="screen-hitbox hs-room-join-hitbox" aria-label={`Join room ${slotRoom.roomCode}`} disabled={busy || !canJoin(slotRoom)} onClick={() => enterRoom(slotRoom.roomCode)} />}
        {!slotRoom && <div className="hs-room-empty">{globalIndex === 0 ? "No public rooms" : ""}</div>}
      </div>
    );
  }

  return (
    <section id="screenHighStakes" className="art-screen highstakes-screen" aria-label="High Stakes Lab">
      <div className="highstakes-shell">
        <div className="art-stage highstakes-stage">
          <img className="screen-art" src="/assets/screens/highstakes.png" alt="High Stakes Lab" draggable="false" />

          <div className="highstakes-overlay">
            <div id="highStakesWalletText" className="highstakes-wallet-text">{profile.name}</div>
            <div id="highStakesPointsText" className="highstakes-points-text">{profile.points} pts</div>
            <div id="highStakesAvailableBalance" className="highstakes-lock-value available-lock-value">{formatAmount(availableBalance)} ETH</div>
            <div id="highStakesLockedBalance" className="highstakes-lock-value locked-lock-value">{formatAmount(lockedBalance)} ETH</div>
            <div className="highstakes-page-text">{publicRooms.length > ROOM_PAGE_SIZE ? `Page ${roomPage + 1}` : ""}</div>
            {Array.from({ length: ROOM_PAGE_SIZE }, (_, index) => roomSlot(index))}
            {(status || error) && <div className={`highstakes-toast ${error ? "error" : ""}`}>{error || status}</div>}
          </div>

          <div className="hitbox-layer highstakes-hitboxes">
            <button id="highStakesCreateRoomBtn" className="screen-hitbox hs-create-room-hitbox" aria-label="Create Room" disabled={busy} onClick={() => setTierPickerMode("create")} />
            <button id="highStakesRefreshRoomsBtn" className="screen-hitbox hs-refresh-rooms-hitbox" aria-label="Refresh Rooms" disabled={busy} onClick={refreshRooms} />
            <button id="highStakesNextPageBtn" className="screen-hitbox hs-next-page-hitbox" aria-label="Next Page" disabled={busy || publicRooms.length <= ROOM_PAGE_SIZE} onClick={nextPage} />
            <button id="highStakesDepositBtn" className="screen-hitbox hs-deposit-hitbox" aria-label="Deposit" disabled={busy || !ETH_TARGETS_READY} onClick={() => setTierPickerMode("deposit")} />
            <button id="highStakesBackBtn" className="screen-hitbox hs-back-hitbox" aria-label="Back To Hub" disabled={busy} onClick={onBack} />
          </div>

          <input
            id="highStakesPrivateRoomInput"
            className="highstakes-private-input"
            inputMode="text"
            autoComplete="off"
            maxLength={4}
            aria-label="Private room code"
            value={joinCode}
            onChange={(event) => setJoinCode(clean(event.target.value))}
          />
          <button id="highStakesJoinPrivateBtn" className="screen-hitbox hs-join-private-hitbox" aria-label="Join Private Room" disabled={busy} onClick={() => enterRoom()} />

          {tierPickerMode && (
            <div className="highstakes-modal" role="dialog" aria-modal="true" aria-label={tierPickerMode === "create" ? "Choose room tier" : "Choose deposit amount"}>
              <div className="highstakes-modal-card">
                <h3>{tierPickerMode === "create" ? "Choose Room Tier" : "Deposit Testnet ETH"}</h3>
                <p>{tierPickerMode === "create" ? "Pick the testnet lock tier for the new room." : "Pick how much testnet ETH to deposit into available balance."}</p>
                <div className="highstakes-tier-grid">
                  {TIERS.map((tier) => (
                    <button key={tier.code} type="button" className={`highstakes-tier-btn tier-${tier.code}`} disabled={busy} onClick={() => tierPickerMode === "create" ? makeRoom(tier) : depositTier(tier)}>
                      <strong>{tier.label}</strong>
                      <span>{formatEntry(tier.fallbackWei)} ETH</span>
                    </button>
                  ))}
                </div>
                <button type="button" className="highstakes-modal-cancel" disabled={busy} onClick={() => setTierPickerMode(null)}>Cancel</button>
              </div>
            </div>
          )}

          {room && (
            <div className="highstakes-modal" role="dialog" aria-modal="true" aria-label="Confirm testnet lock">
              <div className="highstakes-modal-card">
                <h3>Room {room.roomCode}</h3>
                <p>{tierLabel(room.entryTier)} · Required lock {formatEntry(room.entryWei)} ETH</p>
                <p>{room.playerCount || 1}/4 players · {room.players?.filter((player) => player.entryLocked).length || 0} locked</p>
                <button type="button" className="highstakes-modal-primary" disabled={busy} onClick={confirmWithWallet}>{busy ? "Working..." : "Confirm Testnet Lock"}</button>
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
  const roomStillListed = nextRoom.status === "waiting" && !nextRoom.countdownStartTime && nextRoom.playerCount < 4;
  const filtered = current.filter((item) => item.roomCode !== nextRoom.roomCode);
  return roomStillListed ? [nextRoom, ...filtered] : filtered;
}

function canJoin(room) {
  return room && room.status === "waiting" && !room.countdownStartTime && Number(room.playerCount || 0) < Number(room.maxPlayers || 4);
}

function roomStatus(room) {
  if (!room) return "";
  if (room.countdownStartTime) return "STARTING";
  if (Number(room.playerCount || 0) >= Number(room.maxPlayers || 4)) return "FULL";
  return "WAITING";
}

function clampPage(page, totalRooms) {
  const maxPage = Math.max(0, Math.ceil(totalRooms / ROOM_PAGE_SIZE) - 1);
  return Math.min(page, maxPage);
}

function tierLabel(code) {
  return TIERS.find((tier) => tier.code === String(code || "1"))?.label || "Tier A";
}

function formatEntry(value) {
  try { return trimEth(formatEther(BigInt(value || "0"))); } catch { return "0"; }
}

function formatAmount(value) {
  return trimEth(formatEther(value || 0n));
}

function trimEth(value) {
  const [whole, decimal = ""] = String(value).split(".");
  const cleanDecimal = decimal.slice(0, 6).replace(/0+$/, "");
  return cleanDecimal ? `${whole}.${cleanDecimal}` : whole;
}

function clean(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
