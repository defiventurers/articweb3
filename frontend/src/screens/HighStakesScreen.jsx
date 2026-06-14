import { useEffect, useMemo, useState } from "react";
import { formatEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import { ETH_TARGETS_READY, ETH_VAULT_ADDRESS } from "../config/chainTargets.js";
import { ethVaultAbi } from "../contracts/abis.js";
import { confirmEntryLock, createRoom, joinRoom, listRooms } from "../network/socketClient.js";
import "../styles/highStakes.css";

const TIERS = [
  { code: "1", label: "$1 Entry", fallbackWei: "1000000000000000" },
  { code: "4", label: "$4 Entry", fallbackWei: "2000000000000000" },
  { code: "16", label: "$16 Entry", fallbackWei: "3000000000000000" }
];

const ROOM_PAGE_SIZE = 9;
const CALIBRATION_QUERY_KEY = "calibrateHighstakes";

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
  const [calibrationOverrides, setCalibrationOverrides] = useState({});

  const calibrateHighstakes = useMemo(() => isHighstakesCalibrationEnabled(), []);
  const calibrationTargets = useMemo(() => getCalibrationTargets(), []);
  const displayName = getDisplayName(profile, address);

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

  function calibrationStyle(targetId) {
    return calibrateHighstakes ? calibrationOverrides[targetId] : undefined;
  }

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
      setStatus(`Open AGW to deposit ${formatEntry(value.toString())} ETH.`);
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
    const roomCodeTarget = `room-${slotIndex}-code`;
    const usersTarget = `room-${slotIndex}-users`;
    const ethTarget = `room-${slotIndex}-eth`;
    const usdTarget = `room-${slotIndex}-usd`;
    const joinTarget = `room-${slotIndex}-join`;

    return (
      <div className={`highstakes-room-card hs-room-${slotIndex}`} key={`slot-${slotIndex}`}>
        {slotRoom && (
          <>
            <div className="hs-room-code" data-calibrate={roomCodeTarget} style={calibrationStyle(roomCodeTarget)}>{slotRoom.roomCode}</div>
            <div className="hs-room-count" data-calibrate={usersTarget} style={calibrationStyle(usersTarget)}>{slotRoom.playerCount || 0}/{slotRoom.maxPlayers || 4}</div>
            <div className="hs-room-fee" data-calibrate={ethTarget} style={calibrationStyle(ethTarget)}>{formatEntry(slotRoom.entryWei)} ETH</div>
            <div className="hs-room-usd" data-calibrate={usdTarget} style={calibrationStyle(usdTarget)}>{getUsdEntryLabelFromWei(slotRoom.entryWei)}</div>
          </>
        )}
        {slotRoom && <button className="screen-hitbox hs-room-join-hitbox" data-calibrate={joinTarget} style={calibrationStyle(joinTarget)} aria-label={`Join room ${slotRoom.roomCode}`} disabled={busy || !canJoin(slotRoom)} onClick={() => enterRoom(slotRoom.roomCode)} />}
        {!slotRoom && <div className="hs-room-empty">{globalIndex === 0 ? "No public rooms" : ""}</div>}
      </div>
    );
  }

  return (
    <section id="screenHighStakes" className={`art-screen highstakes-screen ${calibrateHighstakes ? "is-calibrating" : ""}`} aria-label="High Stakes Lab">
      <div className="highstakes-shell">
        <div className="art-stage highstakes-stage">
          <img className="screen-art" src="/assets/screens/highstakes-lab.png" alt="High Stakes Lab" draggable="false" />

          <div className="highstakes-overlay">
            <div id="highStakesWalletText" className="highstakes-wallet-text" data-calibrate="wallet-text" style={calibrationStyle("wallet-text")}>{displayName}</div>
            <div id="highStakesPointsText" className="highstakes-points-text" data-calibrate="points-text" style={calibrationStyle("points-text")}>{profile?.points ?? ""}</div>
            <div id="highStakesAvailableBalance" className="highstakes-lock-value available-lock-value" data-calibrate="available-lock" style={calibrationStyle("available-lock")}>
              {formatAmount(availableBalance)} ETH
            </div>
            <div id="highStakesLockedBalance" className="highstakes-lock-value locked-lock-value" data-calibrate="locked-lock" style={calibrationStyle("locked-lock")}>
              {formatAmount(lockedBalance)} ETH
            </div>
            <div className="highstakes-page-text" data-calibrate="page-text" style={calibrationStyle("page-text")}>{publicRooms.length > ROOM_PAGE_SIZE ? `Page ${roomPage + 1}` : ""}</div>
            {Array.from({ length: ROOM_PAGE_SIZE }, (_, index) => roomSlot(index))}
            {(status || error) && <div className={`highstakes-toast ${error ? "error" : ""}`}>{error || status}</div>}
          </div>

          <div className="hitbox-layer highstakes-hitboxes">
            <button id="highStakesCreateRoomBtn" className="screen-hitbox hs-create-room-hitbox" data-calibrate="create-room-hitbox" style={calibrationStyle("create-room-hitbox")} aria-label="Create Room" disabled={busy} onClick={() => setTierPickerMode("create")} />
            <button id="highStakesRefreshRoomsBtn" className="screen-hitbox hs-refresh-rooms-hitbox" data-calibrate="refresh-rooms-hitbox" style={calibrationStyle("refresh-rooms-hitbox")} aria-label="Refresh Rooms" disabled={busy} onClick={refreshRooms} />
            <button id="highStakesNextPageBtn" className="screen-hitbox hs-next-page-hitbox" data-calibrate="next-page-hitbox" style={calibrationStyle("next-page-hitbox")} aria-label="Next Page" disabled={busy || publicRooms.length <= ROOM_PAGE_SIZE} onClick={nextPage} />
            <button id="highStakesDepositBtn" className="screen-hitbox hs-deposit-hitbox" data-calibrate="deposit-hitbox" style={calibrationStyle("deposit-hitbox")} aria-label="Deposit" disabled={busy || !ETH_TARGETS_READY} onClick={() => setTierPickerMode("deposit")} />
            <button id="highStakesBackBtn" className="screen-hitbox hs-back-hitbox" data-calibrate="back-hitbox" style={calibrationStyle("back-hitbox")} aria-label="Back To Hub" disabled={busy} onClick={onBack} />
          </div>

          <input
            id="highStakesPrivateRoomInput"
            className="highstakes-private-input"
            data-calibrate="private-room-input"
            style={calibrationStyle("private-room-input")}
            inputMode="text"
            autoComplete="off"
            maxLength={4}
            aria-label="Private room code"
            value={joinCode}
            onChange={(event) => setJoinCode(clean(event.target.value))}
          />
          <button id="highStakesJoinPrivateBtn" className="screen-hitbox hs-join-private-hitbox" data-calibrate="join-private-hitbox" style={calibrationStyle("join-private-hitbox")} aria-label="Join Private Room" disabled={busy} onClick={() => enterRoom()} />

          <HighstakesCalibrator enabled={calibrateHighstakes} targetIds={calibrationTargets} overrides={calibrationOverrides} setOverrides={setCalibrationOverrides} />

          {tierPickerMode && (
            <div className="highstakes-modal" role="dialog" aria-modal="true" aria-label={tierPickerMode === "create" ? "Choose entry amount" : "Choose deposit amount"}>
              <div className="highstakes-modal-card">
                <h3>{tierPickerMode === "create" ? "Choose Entry" : "Deposit Testnet ETH"}</h3>
                <p>{tierPickerMode === "create" ? "Pick the testnet lock amount for the new room." : "Pick how much testnet ETH to deposit into available balance."}</p>
                <div className="highstakes-tier-grid">
                  {TIERS.map((tier) => (
                    <button key={tier.code} type="button" className={`highstakes-tier-btn entry-${tier.code}`} disabled={busy} onClick={() => tierPickerMode === "create" ? makeRoom(tier) : depositTier(tier)}>
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
                <p>{getUsdEntryLabelFromWei(room.entryWei) || "Entry"} · Required lock {formatEntry(room.entryWei)} ETH</p>
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

function HighstakesCalibrator({ enabled, targetIds, overrides, setOverrides }) {
  const [selected, setSelected] = useState(targetIds[0] || "");
  const [draft, setDraft] = useState({ left: "", top: "", width: "", height: "", fontSize: "" });

  useEffect(() => {
    if (!enabled || !selected) return;
    const element = document.querySelector(`[data-calibrate="${selected}"]`);
    const stage = document.querySelector(".highstakes-stage");
    if (!element || !stage) return;

    const stageRect = stage.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const computed = window.getComputedStyle(element);
    const override = overrides[selected] || {};

    setDraft({
      left: override.left || toPercent(rect.left - stageRect.left, stageRect.width),
      top: override.top || toPercent(rect.top - stageRect.top, stageRect.height),
      width: override.width || toPercent(rect.width, stageRect.width),
      height: override.height || toPercent(rect.height, stageRect.height),
      fontSize: override.fontSize || computed.fontSize || ""
    });
  }, [enabled, selected]);

  if (!enabled) return null;

  function updateField(field, value) {
    const nextDraft = { ...draft, [field]: value };
    setDraft(nextDraft);
    setOverrides((current) => ({ ...current, [selected]: compactStyle(nextDraft) }));
  }

  function exportPositions() {
    const stage = document.querySelector(".highstakes-stage");
    if (!stage) return;
    const stageRect = stage.getBoundingClientRect();
    const result = {};
    document.querySelectorAll("[data-calibrate]").forEach((element) => {
      const key = element.getAttribute("data-calibrate");
      if (!key) return;
      const rect = element.getBoundingClientRect();
      const computed = window.getComputedStyle(element);
      result[key] = {
        left: toPercent(rect.left - stageRect.left, stageRect.width),
        top: toPercent(rect.top - stageRect.top, stageRect.height),
        width: toPercent(rect.width, stageRect.width),
        height: toPercent(rect.height, stageRect.height),
        fontSize: computed.fontSize
      };
    });
    const json = JSON.stringify(result, null, 2);
    console.log("High Stakes calibration positions", result);
    navigator.clipboard?.writeText(json).catch(() => {});
  }

  return (
    <div className="highstakes-calibrator">
      <strong>High Stakes Calibration</strong>
      <select value={selected} onChange={(event) => setSelected(event.target.value)}>
        {targetIds.map((targetId) => <option key={targetId} value={targetId}>{targetId}</option>)}
      </select>
      {["left", "top", "width", "height", "fontSize"].map((field) => (
        <label key={field}>
          <span>{field}</span>
          <input value={draft[field] || ""} onChange={(event) => updateField(field, event.target.value)} placeholder={field === "fontSize" ? "1.6cqw" : "0%"} />
        </label>
      ))}
      <button type="button" onClick={exportPositions}>EXPORT POSITIONS</button>
    </div>
  );
}

function mergeRoomList(current, nextRoom) {
  const roomStillListed = nextRoom.visibility === "public" && nextRoom.status === "waiting";
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

function getDisplayName(profile, address) {
  if (profile?.name && String(profile.name).trim()) return String(profile.name).trim();
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getUsdEntryLabel(entryEth) {
  const value = Number(entryEth).toFixed(3);
  const map = {
    "0.001": "$1",
    "0.002": "$4",
    "0.003": "$16"
  };
  return map[value] || "";
}

function getUsdEntryLabelFromWei(value) {
  return getUsdEntryLabel(formatEntry(value));
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

function isHighstakesCalibrationEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(CALIBRATION_QUERY_KEY) === "1";
}

function getCalibrationTargets() {
  const base = [
    "wallet-text",
    "points-text",
    "available-lock",
    "locked-lock",
    "page-text",
    "create-room-hitbox",
    "refresh-rooms-hitbox",
    "next-page-hitbox",
    "private-room-input",
    "join-private-hitbox",
    "deposit-hitbox",
    "back-hitbox"
  ];
  const roomTargets = Array.from({ length: ROOM_PAGE_SIZE }, (_, index) => [
    `room-${index}-code`,
    `room-${index}-users`,
    `room-${index}-eth`,
    `room-${index}-usd`,
    `room-${index}-join`
  ]).flat();
  return [...base, ...roomTargets];
}

function toPercent(value, total) {
  if (!total) return "0%";
  return `${((value / total) * 100).toFixed(2)}%`;
}

function compactStyle(style) {
  return Object.fromEntries(Object.entries(style).filter(([, value]) => String(value || "").trim()));
}
