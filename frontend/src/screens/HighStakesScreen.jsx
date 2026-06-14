import { useEffect, useMemo, useState } from "react";
import { formatEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import { ETH_TARGETS_READY, ETH_VAULT_ADDRESS } from "../config/chainTargets.js";
import { ethVaultAbi } from "../contracts/abis.js";
import { confirmEntryLock, createRoom, joinRoom, listRooms } from "../network/socketClient.js";
import "../styles/highStakes.css";
import "../styles/highStakesCalibration.css";

const TIERS = [
  { code: "1", label: "$1 Entry", fallbackWei: "1000000000000000" },
  { code: "4", label: "$4 Entry", fallbackWei: "4000000000000000" },
  { code: "16", label: "$16 Entry", fallbackWei: "16000000000000000" }
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
    const realRoom = visibleRooms[slotIndex];
    const sampleRoom = calibrateHighstakes ? getCalibrationRoom(slotIndex) : null;
    const slotRoom = realRoom || sampleRoom;
    const globalIndex = roomPage * ROOM_PAGE_SIZE + slotIndex;
    const isSample = !realRoom && Boolean(sampleRoom);
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
        {slotRoom && <button className="screen-hitbox hs-room-join-hitbox" data-calibrate={joinTarget} style={calibrationStyle(joinTarget)} aria-label={`Join room ${slotRoom.roomCode}`} disabled={busy || (!isSample && !canJoin(slotRoom))} onClick={() => !isSample && enterRoom(slotRoom.roomCode)} />}
        {!slotRoom && <div className="hs-room-empty">{globalIndex === 0 ? "No public rooms" : ""}</div>}
      </div>
    );
  }

  return (
    <section id="screenHighStakes" className={`art-screen highstakes-screen ${calibrateHighstakes ? "is-calibrating" : ""}`} aria-label="High Stakes Lab">
      <div className="highstakes-shell">
        <div className="art-stage highstakes-stage">
          <img className="screen-art" src="/assets/screens/highstakes.png" alt="High Stakes Lab" draggable="false" />

          <div className="highstakes-overlay">
            <div id="highStakesWalletText" className="highstakes-wallet-text" data-calibrate="wallet-text" style={calibrationStyle("wallet-text")}>{displayName}</div>
            <div id="highStakesPointsText" className="highstakes-points-text" data-calibrate="points-text" style={calibrationStyle("points-text")}>{profile?.points ?? ""}</div>
            <div id="highStakesAvailableBalance" className="highstakes-lock-value available-lock-value" data-calibrate="available-lock" style={calibrationStyle("available-lock")}>{formatAmount(availableBalance)} ETH</div>
            <div id="highStakesLockedBalance" className="highstakes-lock-value locked-lock-value" data-calibrate="locked-lock" style={calibrationStyle("locked-lock")}>{formatAmount(lockedBalance)} ETH</div>
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
  const [measured, setMeasured] = useState({});

  useEffect(() => {
    if (!enabled) return;
    function measureTargets() {
      const stage = document.querySelector(".highstakes-stage");
      if (!stage) return;
      const stageRect = stage.getBoundingClientRect();
      const nextMeasured = {};
      targetIds.forEach((targetId) => {
        const element = document.querySelector(`[data-calibrate="${targetId}"]`);
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const computed = window.getComputedStyle(element);
        nextMeasured[targetId] = {
          left: toPercent(rect.left - stageRect.left, stageRect.width),
          top: toPercent(rect.top - stageRect.top, stageRect.height),
          width: toPercent(rect.width, stageRect.width),
          height: toPercent(rect.height, stageRect.height),
          fontSize: computed.fontSize || ""
        };
      });
      setMeasured(nextMeasured);
    }
    measureTargets();
    const timer = window.setTimeout(measureTargets, 100);
    window.addEventListener("resize", measureTargets);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", measureTargets);
    };
  }, [enabled, targetIds, overrides]);

  useEffect(() => {
    if (!enabled) return;
    document.querySelectorAll("[data-calibration-selected]").forEach((element) => element.removeAttribute("data-calibration-selected"));
    const element = document.querySelector(`[data-calibrate="${selected}"]`);
    if (element) element.setAttribute("data-calibration-selected", "true");
    return () => {
      if (element) element.removeAttribute("data-calibration-selected");
    };
  }, [enabled, selected]);

  useEffect(() => {
    if (!enabled || !selected) return;
    const current = getTargetStyle(selected, measured, overrides);
    if (!current) return;
    setDraft({
      left: current.left || "0%",
      top: current.top || "0%",
      width: current.width || "1%",
      height: current.height || "1%",
      fontSize: current.fontSize || ""
    });
  }, [enabled, selected, measured, overrides]);

  if (!enabled) return null;

  function updateField(field, value) {
    const nextDraft = { ...draft, [field]: value };
    setDraft(nextDraft);
    setOverrides((current) => ({ ...current, [selected]: compactStyle(nextDraft) }));
  }

  function nudge(field, amount) {
    const current = readCssNumber(draft[field], field === "fontSize" ? 1.5 : 0);
    const unit = field === "fontSize" ? readCssUnit(draft[field], "cqw") : "%";
    updateField(field, `${roundCss(current + amount)}${unit}`);
  }

  function resetSelected() {
    setOverrides((current) => {
      const next = { ...current };
      delete next[selected];
      return next;
    });
  }

  function resetAll() {
    setOverrides({});
  }

  function startDrag(event, targetId, mode = "move") {
    event.preventDefault();
    event.stopPropagation();
    setSelected(targetId);

    const stage = document.querySelector(".highstakes-stage");
    if (!stage) return;
    const stageRect = stage.getBoundingClientRect();
    const start = getTargetStyle(targetId, measured, overrides);
    if (!start) return;
    const startLeft = readCssNumber(start.left);
    const startTop = readCssNumber(start.top);
    const startWidth = readCssNumber(start.width, 1);
    const startHeight = readCssNumber(start.height, 1);
    const originX = event.clientX;
    const originY = event.clientY;

    function onMove(moveEvent) {
      moveEvent.preventDefault();
      const deltaX = ((moveEvent.clientX - originX) / stageRect.width) * 100;
      const deltaY = ((moveEvent.clientY - originY) / stageRect.height) * 100;
      const nextStyle = {
        left: `${roundCss(startLeft + (mode === "move" ? deltaX : 0))}%`,
        top: `${roundCss(startTop + (mode === "move" ? deltaY : 0))}%`,
        width: `${roundCss(Math.max(0.5, startWidth + (mode === "resize" ? deltaX : 0)))}%`,
        height: `${roundCss(Math.max(0.5, startHeight + (mode === "resize" ? deltaY : 0)))}%`,
        fontSize: start.fontSize || ""
      };
      setOverrides((current) => ({ ...current, [targetId]: compactStyle(nextStyle) }));
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp, { once: true });
  }

  function exportPositions() {
    const result = {};
    targetIds.forEach((targetId) => {
      const style = getTargetStyle(targetId, measured, overrides);
      if (style) result[targetId] = style;
    });
    const css = buildCalibrationCss(result);
    console.log("High Stakes calibration JSON", result);
    console.log("High Stakes calibration CSS", css);
    navigator.clipboard?.writeText(css).catch(() => {});
  }

  return (
    <>
      <div className="highstakes-calibration-drag-layer" aria-label="High Stakes drag calibration layer">
        {targetIds.map((targetId) => {
          const style = getTargetStyle(targetId, measured, overrides);
          if (!style) return null;
          return (
            <div
              key={targetId}
              className={`highstakes-calibration-box ${selected === targetId ? "selected" : ""}`}
              style={style}
              onPointerDown={(event) => startDrag(event, targetId, "move")}
              role="button"
              tabIndex={0}
              title={`Drag ${targetId}`}
            >
              <span className="highstakes-calibration-label">{targetId}</span>
              <span className="highstakes-calibration-resize" onPointerDown={(event) => startDrag(event, targetId, "resize")} aria-hidden="true" />
            </div>
          );
        })}
      </div>
      <div className="highstakes-calibrator">
        <div className="highstakes-calibrator-header">
          <strong>High Stakes Calibration</strong>
          <button type="button" className="secondary" onClick={resetSelected}>Reset</button>
        </div>
        <p className="highstakes-calibrator-hint">Drag any outlined zone directly on the artwork. Bottom-right square resizes. Export copies CSS to clipboard.</p>
        <select value={selected} onChange={(event) => setSelected(event.target.value)}>
          {targetIds.map((targetId) => <option key={targetId} value={targetId}>{targetId}</option>)}
        </select>
        <div className="highstakes-calibrator-controls" aria-label="Move selected zone">
          <span className="cal-spacer" />
          <button type="button" onClick={() => nudge("top", -0.2)}>↑</button>
          <span className="cal-spacer" />
          <button type="button" onClick={() => nudge("left", -0.2)}>←</button>
          <button type="button" onClick={() => nudge("top", 0.2)}>↓</button>
          <button type="button" onClick={() => nudge("left", 0.2)}>→</button>
        </div>
        <div className="highstakes-calibrator-size" aria-label="Resize selected zone">
          <button type="button" onClick={() => nudge("width", -0.2)}>Width −</button>
          <button type="button" onClick={() => nudge("width", 0.2)}>Width +</button>
          <button type="button" onClick={() => nudge("height", -0.2)}>Height −</button>
          <button type="button" onClick={() => nudge("height", 0.2)}>Height +</button>
        </div>
        <div className="highstakes-calibrator-font" aria-label="Change text size">
          <button type="button" onClick={() => nudge("fontSize", -0.1)}>Text −</button>
          <button type="button" onClick={() => nudge("fontSize", 0.1)}>Text +</button>
        </div>
        <hr />
        {["left", "top", "width", "height", "fontSize"].map((field) => (
          <label key={field}>
            <span>{field}</span>
            <input value={draft[field] || ""} onChange={(event) => updateField(field, event.target.value)} placeholder={field === "fontSize" ? "1.6cqw" : "0%"} />
          </label>
        ))}
        <button type="button" onClick={exportPositions}>EXPORT CSS</button>
        <button type="button" className="secondary" onClick={resetAll}>RESET ALL</button>
      </div>
    </>
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

function getCalibrationRoom(index) {
  const samples = [
    { roomCode: "YS3B", entryWei: "1000000000000000", playerCount: 2, maxPlayers: 4 },
    { roomCode: "A352", entryWei: "4000000000000000", playerCount: 1, maxPlayers: 4 },
    { roomCode: "FTY2", entryWei: "16000000000000000", playerCount: 3, maxPlayers: 4 },
    { roomCode: "J4VE", entryWei: "1000000000000000", playerCount: 2, maxPlayers: 4 },
    { roomCode: "T6RK", entryWei: "4000000000000000", playerCount: 4, maxPlayers: 4 },
    { roomCode: "H9CY", entryWei: "16000000000000000", playerCount: 1, maxPlayers: 4 },
    { roomCode: "B3UA", entryWei: "1000000000000000", playerCount: 3, maxPlayers: 4 },
    { roomCode: "W5DN", entryWei: "4000000000000000", playerCount: 1, maxPlayers: 4 },
    { roomCode: "Z1GF", entryWei: "16000000000000000", playerCount: 2, maxPlayers: 4 }
  ];
  return samples[index] || null;
}

function getUsdEntryLabel(entryEth) {
  const value = Number(entryEth).toFixed(3);
  const map = {
    "0.001": "$1",
    "0.004": "$4",
    "0.016": "$16"
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

function getTargetStyle(targetId, measured, overrides) {
  return overrides[targetId] || measured[targetId] || null;
}

function toPercent(value, total) {
  if (!total) return "0%";
  return `${((value / total) * 100).toFixed(2)}%`;
}

function compactStyle(style) {
  return Object.fromEntries(Object.entries(style).filter(([, value]) => String(value || "").trim()));
}

function readCssNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value || ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readCssUnit(value, fallback = "%") {
  const match = String(value || "").trim().match(/[a-z%]+$/i);
  return match?.[0] || fallback;
}

function roundCss(value) {
  return Math.round(value * 100) / 100;
}

function cssSelectorForTarget(targetId) {
  const roomMatch = targetId.match(/^room-(\d+)-(code|users|eth|usd|join)$/);
  if (roomMatch) {
    const [, index, type] = roomMatch;
    const selectors = { code: ".hs-room-code", users: ".hs-room-count", eth: ".hs-room-fee", usd: ".hs-room-usd", join: ".hs-room-join-hitbox" };
    return `.hs-room-${index} ${selectors[type]}`;
  }
  const map = {
    "wallet-text": ".highstakes-wallet-text",
    "points-text": ".highstakes-points-text",
    "available-lock": ".available-lock-value",
    "locked-lock": ".locked-lock-value",
    "page-text": ".highstakes-page-text",
    "create-room-hitbox": ".hs-create-room-hitbox",
    "refresh-rooms-hitbox": ".hs-refresh-rooms-hitbox",
    "next-page-hitbox": ".hs-next-page-hitbox",
    "private-room-input": ".highstakes-private-input",
    "join-private-hitbox": ".hs-join-private-hitbox",
    "deposit-hitbox": ".hs-deposit-hitbox",
    "back-hitbox": ".hs-back-hitbox"
  };
  return map[targetId] || `[data-calibrate="${targetId}"]`;
}

function buildCalibrationCss(result) {
  return Object.entries(result).map(([targetId, style]) => {
    const selector = cssSelectorForTarget(targetId);
    const lines = ["left", "top", "width", "height", "fontSize"].filter((key) => style[key]).map((key) => `  ${key === "fontSize" ? "font-size" : key}: ${style[key]};`);
    return `${selector} {\n${lines.join("\n")}\n}`;
  }).join("\n\n");
}
