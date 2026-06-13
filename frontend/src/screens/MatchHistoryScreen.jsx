import { useEffect, useMemo, useState } from "react";
import { formatEther } from "viem";
import { ETH_VAULT_ADDRESS } from "../config/chainTargets.js";
import { getGameHistory, getVaultActivity } from "../network/socketClient.js";
import { addressUrl, txUrl, shortAddress, shortHash } from "../utils/explorerLinks.js";
import { shortVerificationStatus, verifyDiceProofs } from "../utils/diceProofVerifier.js";

const TEAM_LABELS = { green: "Abster", red: "Retsba", blue: "Pengu", yellow: "Polly" };
const PIECE_LETTER = { king: "K", elephant: "E", horse: "H", ship: "S", pawn: "P" };

export function MatchHistoryScreen({ profile, onBack }) {
  const [history, setHistory] = useState([]);
  const [activity, setActivity] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadHistory() {
    if (!profile) return;
    setLoading(true);
    setError("");
    try {
      const [rows, activityRows] = await Promise.all([getGameHistory({ profile }), getVaultActivity({ profile })]);
      setHistory(rows);
      setActivity(activityRows);
    } catch (err) {
      setError(err.message || "Could not load match history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadHistory(); }, [profile?.wallet]);

  const withdrawals = useMemo(() => activity.filter((item) => String(item.type || "").toLowerCase().includes("withdraw")), [activity]);

  if (selected) {
    const withdrawal = findWithdrawal(selected, withdrawals);
    return <MatchDetail item={selected} withdrawal={withdrawal} onBack={() => setSelected(null)} />;
  }

  return (
    <section className="screen proof-screen">
      <div className="card proof-card">
        <h1>Match History</h1>
        <p className="note">Finished games, proof pages, placements, payouts, points, and settlement transactions for {profile?.name}.</p>
        <button className="primary-btn" disabled={loading} onClick={loadHistory}>{loading ? "Loading..." : "Refresh History"}</button>
        {error && <p className="error-text">{error}</p>}
        {!loading && !history.length && <p className="note">No finished games recorded yet. Complete a match first.</p>}
        <div className="room-list proof-list">
          {history.map((item) => {
            const withdrawal = findWithdrawal(item, withdrawals);
            return (
              <div className="room-row proof-row" key={item.id}>
                <strong>Room {item.roomCode} · {item.roomMode === "high_stakes" ? "High Stakes" : "Open Ice"}</strong>
                <span>{formatDate(item.finishedAt)}</span>
                <span>{TEAM_LABELS[item.team] || item.team || "—"} · #{item.position || "—"}</span>
                <span>{formatEth(item.payoutWei)} ETH · +{item.points || 0} pts</span>
                <span>Settlement: {item.settlementStatus || "—"}</span>
                <span>Withdrawal: {withdrawal?.status || item.withdrawalStatus || "—"}</span>
                <button className="primary-btn" onClick={() => setSelected(item)}>Open Match Detail</button>
              </div>
            );
          })}
        </div>
        <button className="primary-btn" onClick={onBack}>Back To Hub</button>
      </div>
    </section>
  );
}

function MatchDetail({ item, withdrawal, onBack }) {
  const [verifyReport, setVerifyReport] = useState(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const players = item.players || [];
  const randomness = item.randomness || inferRandomnessFromAudit(item.auditLog || []);
  const diceProofs = randomness?.diceProofs || [];
  const board = item.finalBoardState?.board;
  const withdrawalTx = withdrawal?.txHash || item.withdrawalTxHash;
  const withdrawalStatus = withdrawal?.status || item.withdrawalStatus;

  async function verifyProofs() {
    setVerifyBusy(true);
    try { setVerifyReport(await verifyDiceProofs(randomness || {})); }
    finally { setVerifyBusy(false); }
  }

  return (
    <section className="screen proof-screen">
      <div className="card proof-card">
        <h1>Match Detail</h1>
        <p className="note">Room {item.roomCode} · {formatDate(item.finishedAt)}</p>
        <div className="rules-panel proof-grid">
          <strong>Core Proof</strong>
          <span>Room Code: {item.roomCode}</span>
          <span>Contract Match ID: {shortHash(item.contractMatchId)}</span>
          <span>Proof Hash: {item.proofHash ? shortHash(item.proofHash) : "—"}</span>
          <span>Settlement Status: {item.settlementStatus || "—"}</span>
          {ETH_VAULT_ADDRESS && <a href={addressUrl(ETH_VAULT_ADDRESS)} target="_blank" rel="noreferrer">View Vault Contract</a>}
          {item.entryTxHash && <a href={txUrl(item.entryTxHash)} target="_blank" rel="noreferrer">View Entry Tx: {shortHash(item.entryTxHash)}</a>}
          {item.settlementTxHash && <a href={txUrl(item.settlementTxHash)} target="_blank" rel="noreferrer">View Settlement Tx: {shortHash(item.settlementTxHash)}</a>}
          {withdrawalTx ? <a href={txUrl(withdrawalTx)} target="_blank" rel="noreferrer">View Withdrawal Tx: {shortHash(withdrawalTx)}</a> : <span>Withdrawal Tx: —</span>}
          <span>Withdrawal Status: {withdrawalStatus || "—"}</span>
        </div>

        <div className="rules-panel proof-grid">
          <strong>Players / Placements / Payouts</strong>
          {players.length ? players.map((player) => (
            <span key={player.wallet}>#{player.position || "—"} · {player.name || "Player"} · {TEAM_LABELS[player.team] || player.team || "—"} · {shortAddress(player.wallet)} · Entry {player.entryTxHash ? shortHash(player.entryTxHash) : "—"} · Payout {formatEth(player.payoutWei || (sameWallet(player.wallet, item.wallet) ? item.payoutWei : "0"))} ETH · +{player.points ?? (sameWallet(player.wallet, item.wallet) ? item.points : 0)} pts</span>
          )) : <span>{TEAM_LABELS[item.team] || item.team} · #{item.position} · {formatEth(item.payoutWei)} ETH · +{item.points || 0} pts</span>}
        </div>

        <div className="rules-panel proof-grid">
          <strong>Dice Proof Verifier</strong>
          <span>Seed Hash: {randomness?.serverSeedHash ? shortHash(randomness.serverSeedHash) : "—"}</span>
          <span>Seed Reveal: {randomness?.serverSeedReveal ? shortHash(randomness.serverSeedReveal) : "—"}</span>
          <span>Dice Proofs: {diceProofs.length}</span>
          <button className="primary-btn" disabled={verifyBusy || !diceProofs.length} onClick={verifyProofs}>{verifyBusy ? "Verifying..." : "Verify Dice Proofs"}</button>
          {verifyReport && <span className={`verify-pill ${verifyReport.status}`}>{shortVerificationStatus(verifyReport.status)} · {verifyReport.summary}</span>}
          {(verifyReport?.results || diceProofs.slice(-8).map((proof) => ({ proof, status: "waiting", reason: "Not verified yet." }))).slice(-12).map((item) => <span className={`verify-line ${item.status}`} key={item.proof.inputHash}>Turn {item.proof.turnNonce} · {TEAM_LABELS[item.proof.team] || item.proof.team} · {item.proof.dice?.join(" / ")} · {shortVerificationStatus(item.status)} · {item.reason || shortHash(item.proof.inputHash)}</span>)}
        </div>

        {board && <ReadOnlyBoard board={board} />}

        <div className="rules-panel proof-grid">
          <strong>Audit Log</strong>
          {(item.auditLog || []).slice(-40).reverse().map((event, index) => <span key={`${event.at}-${index}`}>{formatDate(event.at)} · {event.type || "event"} · {compactEvent(event)}</span>)}
        </div>

        <button className="primary-btn" onClick={onBack}>Back To History</button>
      </div>
    </section>
  );
}

function ReadOnlyBoard({ board }) { return <div className="spectator-board-grid" aria-label="Final board state">{board.flatMap((row, rowIndex) => row.map((piece, colIndex) => <div className="spectator-cell" key={`${rowIndex}-${colIndex}`}>{piece ? <span>{piece.team?.slice(0, 1)?.toUpperCase()}{PIECE_LETTER[piece.type] || "?"}</span> : null}</div>))}</div>; }
function findWithdrawal(item, withdrawals) { return withdrawals.find((activity) => sameWallet(activity.wallet, item.wallet) && (activity.contractMatchId === item.contractMatchId || activity.matchId === item.matchId || activity.roomCode === item.roomCode)); }
function sameWallet(a, b) { return String(a || "").toLowerCase() === String(b || "").toLowerCase(); }
function inferRandomnessFromAudit(auditLog) { const commit = auditLog.find((item) => item.type === "randomness_committed"); const reveal = auditLog.find((item) => item.type === "randomness_revealed"); const diceProofs = auditLog.filter((item) => item.type === "dice_rolled" && item.proof).map((item) => item.proof); if (!commit && !reveal && !diceProofs.length) return null; return { scheme: "server-commit-reveal-v1", serverSeedHash: commit?.serverSeedHash || reveal?.serverSeedHash || diceProofs[0]?.serverSeedHash, serverSeedReveal: reveal?.serverSeedReveal || null, diceProofs }; }
function compactEvent(event) { const clone = { ...event }; delete clone.at; delete clone.type; const text = JSON.stringify(clone); return text.length > 180 ? `${text.slice(0, 180)}...` : text; }
function formatEth(value) { try { return formatEther(BigInt(value || "0")); } catch { return "0"; } }
function formatDate(value) { if (!value) return "—"; return new Date(value).toLocaleString(); }
