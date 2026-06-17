import { useEffect, useMemo, useState } from "react";
import { formatEther } from "viem";
import { getMyRooms } from "../network/socketClient.js";

export function MyRoomsScreen({ profile, onResumeRoom, onBack }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const sortedRooms = useMemo(() => [...rooms].sort(sortRoomsForRecovery), [rooms]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRooms(await getMyRooms({ profile }));
    } catch (err) {
      setError(err.message || "Could not load rooms.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [profile?.wallet]);

  return (
    <section className="screen data-screen">
      <div className="card data-card-shell myrooms-shell">
        <header className="data-header">
          <p className="data-kicker">Reconnect</p>
          <h1>My Rooms</h1>
          <p className="data-subtitle">Reconnect to waiting or playing rooms. Open locked rooms here if you need to continue, finish, or recover an expired entry lock.</p>
        </header>

        <button className="primary-btn data-main-action" disabled={loading} onClick={load}>{loading ? "Loading..." : "Refresh Rooms"}</button>
        {error && <p className="error-text data-error">{error}</p>}

        <div className="data-list room-card-list">
          {sortedRooms.map((room) => {
            const highStakes = room.roomMode === "high_stakes";
            const myPlayer = findMyPlayer(room, profile);
            const lockedCount = (room.players || []).filter((player) => player.entryLocked).length;
            const recoveryHint = getRecoveryHint(room, myPlayer);
            return (
              <article className="data-item-card my-room-card" key={room.roomCode}>
                <div className="data-card-topline">
                  <div>
                    <strong>Room {room.roomCode}</strong>
                    <span>{highStakes ? "Locked Match" : "Open Ice"} · {room.playerCount || 0}/4 players</span>
                  </div>
                  <span className={`status-pill ${statusClass(room.status)}`}>{statusLabel(room.status)}</span>
                </div>

                <div className="stat-chip-row">
                  {highStakes && <span className="stat-chip">Entry {formatEntry(room.entryWei)} ETH</span>}
                  {highStakes && <span className="stat-chip">My lock: {myPlayer?.entryLocked ? "Confirmed" : "Not locked"}</span>}
                  {highStakes && <span className="stat-chip">Room locks {lockedCount}/4</span>}
                  {myPlayer?.team && <span className="stat-chip">Team: {teamLabel(myPlayer.team)}</span>}
                  {room.status === "finished" && <span className="stat-chip">Results ready</span>}
                </div>

                <div className="data-card-meta">
                  <span>{recoveryHint}</span>
                  {highStakes && <span>Settlement: {settlementSummary(room)}</span>}
                  {highStakes && <span>Attempts: {room.settlementAttempts ?? 0}</span>}
                  {room.settlementTxHash && <span>Tx: {shortHash(room.settlementTxHash)}</span>}
                </div>

                <button className="primary-btn data-card-action" onClick={() => onResumeRoom(room)}>
                  {buttonLabel(room, myPlayer)}
                </button>
              </article>
            );
          })}
        </div>

        {!loading && !rooms.length && <p className="data-empty">No rooms found for this wallet.</p>}
        <button className="primary-btn data-back-btn" onClick={onBack}>Back To Hub</button>
      </div>
    </section>
  );
}

function sortRoomsForRecovery(a, b) {
  const score = (room) => {
    if (room.status === "playing") return 0;
    if (room.status === "waiting") return 1;
    if (room.settlementStatus && room.settlementStatus !== "settled") return 2;
    if (room.status === "finished") return 3;
    return 4;
  };
  return score(a) - score(b);
}

function findMyPlayer(room, profile) {
  const wallet = String(profile?.wallet || profile?.address || "").toLowerCase();
  return (room.players || []).find((player) => String(player.wallet || "").toLowerCase() === wallet) || null;
}

function getRecoveryHint(room, myPlayer) {
  if (room.status === "playing") return "Game in progress. Resume now.";
  if (room.status === "waiting" && room.roomMode === "high_stakes" && myPlayer?.entryLocked) return "Entry lock confirmed. Wait for all players or open room to recover after expiry.";
  if (room.status === "waiting" && room.roomMode === "high_stakes") return "Join this room to confirm your entry lock.";
  if (room.status === "waiting") return "Waiting room. Resume to select team or invite players.";
  if (room.status === "finished") return "Finished room. Open to review final state and settlement.";
  return "Room can be reopened from here.";
}

function buttonLabel(room, myPlayer) {
  if (room.status === "finished") return "View Results";
  if (room.roomMode === "high_stakes" && myPlayer?.entryLocked) return "Open Locked Room";
  return "Resume";
}

function settlementSummary(room) {
  const status = String(room.settlementStatus || "").toLowerCase();
  if (!status) return "—";
  if (status === "settled") return "Settled";
  if (status === "submitted") return "Submitted";
  if (status === "pending") return "Pending";
  if (status === "settlement_pending") return "Pending confirmation";
  if (status === "needs_settlement_review") return "Needs review";
  if (status === "needs_game_server_update") return "Signer mismatch";
  if (status === "needs_settlement_signer") return "Backend signer missing";
  return statusLabel(status);
}

function statusLabel(status) {
  const value = String(status || "unknown");
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("finished")) return "success";
  if (value.includes("playing")) return "info";
  if (value.includes("waiting")) return "warning";
  if (value.includes("fail") || value.includes("expired") || value.includes("review") || value.includes("mismatch")) return "danger";
  return "neutral";
}

function teamLabel(team) {
  return { green: "Abster", red: "Retsba", blue: "Pengu", yellow: "Polly" }[team] || team || "—";
}

function formatEntry(value) {
  try { return trimEth(formatEther(BigInt(value || "0"))); } catch { return "0"; }
}

function trimEth(value) {
  const [whole, decimal = ""] = String(value || "0").split(".");
  const cleanDecimal = decimal.slice(0, 6).replace(/0+$/, "");
  return cleanDecimal ? `${whole}.${cleanDecimal}` : whole;
}

function shortHash(value) {
  if (!value) return "";
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}
