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
    <section className="screen data-screen proof-screen">
      <div className="card data-card-shell proof-card">
        <header className="data-header">
          <p className="data-kicker">Proofs & Results</p>
          <h1>Match History</h1>
          <p className="data-subtitle">Finished games, placements, points, payouts, and settlement proofs for {profile?.name || "this player"}.</p>
        </header>

        <button className="primary-btn data-main-action" disabled={loading} onClick={loadHistory}>{loading ? "Loading..." : "Refresh History"}</button>
        {error && <p className="error-text data-error">{error}</p>}
        {!loading && !history.length && <p className="data-empty">No finished games recorded yet. Complete a match first.</p>}

        <div className="data-list match-card-list">
          {history.map((item) => {
            const withdrawal = findWithdrawal(item, withdrawals);
            const settlement = settlementView(item);
            return (
              <article className="data-item-card match-history-card" key={item.id}>
                <div className="data-card-topline">
                  <div>
                    <strong>Room {item.roomCode}</strong>
                    <span>{item.roomMode === "high_stakes" ? "High Stakes" : "Open Ice"} · {formatShortDate(item.finishedAt)}</span>
                  </div>
                  <span className={`status-pill ${statusClass(item.settlementStatus || item.withdrawalStatus)}`}>{settlement.label || item.withdrawalStatus || "Finished"}</span>
                </div>

                <div className="stat-chip-row">
                  <span className="stat-chip">Team: {TEAM_LABELS[item.team] || item.team || "—"}</span>
                  <span className="stat-chip">Rank #{item.position || "—"}</span>
                  <span className="stat-chip">+{item.points || 0} pts</span>
                  <span className="stat-chip">Payout {formatEth(item.payoutWei)} ETH</span>
                </div>

                <div className="data-card-meta">
                  <span>Settlement: {settlement.summary}</span>
                  <span>Attempts: {item.settlementAttempts ?? 0}</span>
                  <span>Withdrawal: {withdrawal?.status || item.withdrawalStatus || "—"}</span>
                  <span>Proof: {item.proofHash ? shortHash(item.proofHash) : "—"}</span>
                </div>

                <button className="primary-btn data-card-action" onClick={() => setSelected(item)}>Open Match Detail</button>
              </article>
            );
          })}
        </div>

        <button className="primary-btn data-back-btn" onClick={onBack}>Back To Hub</button>
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
  const settlement = settlementView(item);

  async function verifyProofs() {
    setVerifyBusy(true);
    try { setVerifyReport(await verifyDiceProofs(randomness || {})); }
    finally { setVerifyBusy(false); }
  }

  return (
    <section className="screen data-screen proof-screen">
      <div className="card data-card-shell proof-card">
        <header className="data-header">
          <p className="data-kicker">Match Detail</p>
          <h1>Room {item.roomCode}</h1>
          <p className="data-subtitle">{formatShortDate(item.finishedAt)} · {item.roomMode === "high_stakes" ? "High Stakes" : "Open Ice"}</p>
        </header>

        <section className="data-detail-panel">
          <strong>Core Proof</strong>
          <div className="detail-chip-grid">
            <span className="stat-chip">Contract: {shortHash(item.contractMatchId)}</span>
            <span className="stat-chip">Proof: {item.proofHash ? shortHash(item.proofHash) : "—"}</span>
            <span className="stat-chip">Settlement: {settlement.label}</span>
            <span className="stat-chip">Attempts: {item.settlementAttempts ?? 0}</span>
            <span className="stat-chip">Last check: {formatShortDate(item.settlementCheckedAt)}</span>
            <span className="stat-chip">Withdrawal: {withdrawalStatus || "—"}</span>
          </div>
          <p className="data-subtitle">{settlement.description}</p>
          {item.settlementError && <p className="error-text data-error">Settlement note: {item.settlementError}</p>}
          <div className="data-link-list">
            {ETH_VAULT_ADDRESS && <a href={addressUrl(ETH_VAULT_ADDRESS)} target="_blank" rel="noreferrer">View Vault Contract</a>}
            {item.entryTxHash && <a href={txUrl(item.entryTxHash)} target="_blank" rel="noreferrer">Entry Tx: {shortHash(item.entryTxHash)}</a>}
            {item.settlementTxHash && <a href={txUrl(item.settlementTxHash)} target="_blank" rel="noreferrer">Settlement Tx: {shortHash(item.settlementTxHash)}</a>}
            {withdrawalTx ? <a href={txUrl(withdrawalTx)} target="_blank" rel="noreferrer">Withdrawal Tx: {shortHash(withdrawalTx)}</a> : <span>Withdrawal Tx: —</span>}
          </div>
        </section>

        <section className="data-detail-panel">
          <strong>Players / Placements</strong>
          <div className="data-list compact-detail-list">
            {players.length ? players.map((player) => (
              <article className="mini-data-card" key={player.wallet}>
                <strong>#{player.position || "—"} · {player.name || "Player"}</strong>
                <span>{TEAM_LABELS[player.team] || player.team || "—"} · {shortAddress(player.wallet)}</span>
                <div className="stat-chip-row">
                  <span className="stat-chip">Entry {player.entryTxHash ? shortHash(player.entryTxHash) : "—"}</span>
                  <span className="stat-chip">Payout {formatEth(player.payoutWei || (sameWallet(player.wallet, item.wallet) ? item.payoutWei : "0"))} ETH</span>
                  <span className="stat-chip">+{player.points ?? (sameWallet(player.wallet, item.wallet) ? item.points : 0)} pts</span>
                </div>
              </article>
            )) : (
              <article className="mini-data-card">
                <strong>{TEAM_LABELS[item.team] || item.team} · #{item.position}</strong>
                <span>{formatEth(item.payoutWei)} ETH · +{item.points || 0} pts</span>
              </article>
            )}
          </div>
        </section>

        <section className="data-detail-panel">
          <strong>Dice Proof Verifier</strong>
          <div className="detail-chip-grid">
            <span className="stat-chip">Seed Hash {randomness?.serverSeedHash ? shortHash(randomness.serverSeedHash) : "—"}</span>
            <span className="stat-chip">Reveal {randomness?.serverSeedReveal ? shortHash(randomness.serverSeedReveal) : "—"}</span>
            <span className="stat-chip">Proofs {diceProofs.length}</span>
          </div>
          <button className="primary-btn data-card-action" disabled={verifyBusy || !diceProofs.length} onClick={verifyProofs}>{verifyBusy ? "Verifying..." : "Verify Dice Proofs"}</button>
          {verifyReport && <span className={`verify-pill ${verifyReport.status}`}>{shortVerificationStatus(verifyReport.status)} · {verifyReport.summary}</span>}
          <div className="proof-line-list">
            {(verifyReport?.results || diceProofs.slice(-8).map((proof) => ({ proof, status: "waiting", reason: "Not verified yet." }))).slice(-12).map((item) => <span className={`verify-line ${item.status}`} key={item.proof.inputHash}>Turn {item.proof.turnNonce} · {TEAM_LABELS[item.proof.team] || item.proof.team} · {item.proof.dice?.join(" / ")} · {shortVerificationStatus(item.status)}</span>)}
          </div>
        </section>

        {board && <ReadOnlyBoard board={board} />}

        <section className="data-detail-panel">
          <strong>Audit Log</strong>
          <div className="audit-line-list">
            {(item.auditLog || []).slice(-40).reverse().map((event, index) => <span key={`${event.at}-${index}`}>{formatShortDate(event.at)} · {event.type || "event"} · {compactEvent(event)}</span>)}
          </div>
        </section>

        <button className="primary-btn data-back-btn" onClick={onBack}>Back To History</button>
      </div>
    </section>
  );
}

function ReadOnlyBoard({ board }) { return <div className="spectator-board-grid" aria-label="Final board state">{board.flatMap((row, rowIndex) => row.map((piece, colIndex) => <div className="spectator-cell" key={`${rowIndex}-${colIndex}`}>{piece ? <span>{piece.team?.slice(0, 1)?.toUpperCase()}{PIECE_LETTER[piece.type] || "?"}</span> : null}</div>))}</div>; }
function findWithdrawal(item, withdrawals) { return withdrawals.find((activity) => sameWallet(activity.wallet, item.wallet) && (activity.contractMatchId === item.contractMatchId || activity.matchId === item.matchId || activity.roomCode === item.roomCode)); }
function sameWallet(a, b) { return String(a || "").toLowerCase() === String(b || "").toLowerCase(); }
function inferRandomnessFromAudit(auditLog) { const commit = auditLog.find((item) => item.type === "randomness_committed"); const reveal = auditLog.find((item) => item.type === "randomness_revealed"); const diceProofs = auditLog.filter((item) => item.type === "dice_rolled" && item.proof).map((item) => item.proof); if (!commit && !reveal && !diceProofs.length) return null; return { scheme: "server-commit-reveal-v1", serverSeedHash: commit?.serverSeedHash || reveal?.serverSeedHash || diceProofs[0]?.serverSeedHash, serverSeedReveal: reveal?.serverSeedReveal || null, diceProofs }; }
function compactEvent(event) { const clone = { ...event }; delete clone.at; delete clone.type; const text = JSON.stringify(clone); return text.length > 150 ? `${text.slice(0, 150)}...` : text; }
function formatEth(value) { try { return formatEther(BigInt(value || "0")); } catch { return "0"; } }
function formatShortDate(value) { if (!value) return "—"; return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
function statusClass(status) { const value = String(status || "").toLowerCase(); if (value.includes("confirm") || value.includes("settled") || value.includes("complete") || value.includes("finished")) return "success"; if (value.includes("pending") || value.includes("waiting") || value.includes("submitted")) return "warning"; if (value.includes("fail") || value.includes("error") || value.includes("review") || value.includes("mismatch")) return "danger"; return "neutral"; }
function settlementView(item) {
  const status = String(item.settlementStatus || "").toLowerCase();
  const attempts = item.settlementAttempts ?? 0;
  if (!status) return { label: "Finished", summary: "No settlement needed", description: "This match does not have an on-chain settlement status." };
  if (status === "settled") return { label: "Settled", summary: `Settled after ${attempts} attempt${attempts === 1 ? "" : "s"}`, description: "The backend confirmed this match settlement on-chain." };
  if (status === "submitted") return { label: "Submitted", summary: `Submitted · attempt ${attempts}`, description: "A settlement transaction was submitted and is waiting for final confirmation." };
  if (status === "settlement_pending") return { label: "Pending", summary: `Pending · attempt ${attempts}`, description: "The settlement transaction was submitted, but the backend has not confirmed final success yet." };
  if (status === "pending") return { label: "Pending", summary: "Waiting for backend settlement", description: "The match finished and is waiting for the backend settlement worker." };
  if (status === "failed") return { label: "Failed", summary: `Failed · attempt ${attempts}`, description: "The backend could not complete settlement. Check the settlement note and backend health." };
  if (status === "needs_settlement_signer") return { label: "Needs signer", summary: "Backend signer missing", description: "The backend is missing its settlement signer configuration." };
  if (status === "needs_game_server_update") return { label: "Signer mismatch", summary: "Backend signer does not match vault game server", description: "The configured backend signer does not match the vault game server wallet." };
  if (status === "needs_settlement_review") return { label: "Needs review", summary: `Retry cap reached · ${attempts} attempts`, description: "Settlement hit the retry cap and needs manual review before another attempt." };
  return { label: item.settlementStatus, summary: `${item.settlementStatus} · ${attempts} attempt${attempts === 1 ? "" : "s"}`, description: "Settlement status is reported by the backend." };
}
