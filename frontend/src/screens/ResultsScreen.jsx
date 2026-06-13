import { useMemo, useState } from "react";
import { formatEther } from "viem";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import { ETH_VAULT_ADDRESS } from "../config/chainTargets.js";
import { ethVaultAbi } from "../contracts/abis.js";
import { recordVaultActivity } from "../network/socketClient.js";
import { addressUrl, txUrl, shortHash, shortAddress } from "../utils/explorerLinks.js";

const TEAM_LABELS = { green: "Abster", red: "Retsba", blue: "Pengu", yellow: "Polly" };

export function ResultsScreen({ room, profile, onBackToLobby }) {
  const { data: abstractClient } = useAbstractClient();
  const [claimStatus, setClaimStatus] = useState("");
  const [claimError, setClaimError] = useState("");
  const [busy, setBusy] = useState(false);
  const placements = room.placements?.length ? room.placements : fallbackPlacements(room);
  const payoutByWallet = new Map((room.payoutPlan || []).map((item) => [String(item.wallet || "").toLowerCase(), item]));
  const myPayout = profile?.wallet ? payoutByWallet.get(String(profile.wallet).toLowerCase()) : null;
  const myPayoutWei = BigInt(myPayout?.payoutWei || "0");
  const isEscrowTestRoom = room.roomMode === "high_stakes";
  const canClaim = isEscrowTestRoom && myPayoutWei > 0n && room.settlementStatus === "settled";
  const shareUrl = useMemo(() => `${window.location.origin}${window.location.pathname}?spectate=${room.roomCode}`, [room.roomCode]);

  async function claimPayout() {
    if (!abstractClient || !profile) {
      setClaimError("Connect the winning player wallet first.");
      return;
    }
    try {
      setBusy(true);
      setClaimError("");
      setClaimStatus("Open AGW and confirm payout withdrawal.");
      const txHash = await abstractClient.writeContract({
        address: ETH_VAULT_ADDRESS,
        abi: ethVaultAbi,
        functionName: "withdraw",
        args: [myPayoutWei]
      });
      await recordVaultActivity({
        profile,
        activity: {
          type: "withdraw",
          currency: "ETH",
          amountWei: myPayoutWei.toString(),
          roomCode: room.roomCode,
          matchId: room.matchId,
          contractMatchId: room.contractMatchId,
          txHash,
          status: "submitted",
          note: "Winner payout withdrawal"
        }
      });
      setClaimStatus(`Withdrawal submitted: ${shortHash(txHash)}`);
    } catch (err) {
      setClaimError(err.shortMessage || err.message || "Payout withdrawal failed.");
    } finally {
      setBusy(false);
    }
  }

  async function shareMatch() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setClaimStatus("Spectator link copied.");
    } catch {
      setClaimStatus(shareUrl);
    }
  }

  return (
    <section className="screen proof-screen">
      <div className="card proof-card">
        <h1>Match Complete</h1>
        <p className="note">Room {room.roomCode} · {isEscrowTestRoom ? "Testnet Lock Lab" : "Open Ice"}</p>

        <div className="proof-actions">
          <button className="primary-btn" onClick={shareMatch}>Share Match</button>
          <button className="primary-btn" disabled={!canClaim || busy} onClick={claimPayout}>{busy ? "Claiming..." : "Claim / Withdraw Payout"}</button>
        </div>

        {myPayout && <p className="note">Your payout: {formatEth(myPayout.payoutWei)} ETH · +{myPayout.points} points</p>}
        {claimStatus && <p className="note">{claimStatus}</p>}
        {claimError && <p className="error-text">{claimError}</p>}

        <div className="room-list proof-list">
          {placements.map((player, index) => {
            const payout = payoutByWallet.get(String(player.wallet || "").toLowerCase());
            return (
              <div className="room-row proof-row" key={player.wallet || `${player.team}-${index}`}>
                <strong>#{player.position || index + 1} · {player.name || "Player"}</strong>
                <span>{TEAM_LABELS[player.team] || player.team}</span>
                <span>{shortAddress(player.wallet)}</span>
                {payout && <span>{formatEth(payout.payoutWei)} ETH · +{payout.points} pts</span>}
              </div>
            );
          })}
        </div>

        {isEscrowTestRoom && (
          <div className="rules-panel proof-grid">
            <strong>Settlement Proof</strong>
            <span>Status: {room.settlementStatus || "pending"}</span>
            <span>Contract Match ID: {shortHash(room.contractMatchId)}</span>
            <span>Proof Hash: {room.proofHash ? shortHash(room.proofHash) : "—"}</span>
            {ETH_VAULT_ADDRESS && <a href={addressUrl(ETH_VAULT_ADDRESS)} target="_blank" rel="noreferrer">View Vault Contract</a>}
            {room.settlementTxHash ? <a href={txUrl(room.settlementTxHash)} target="_blank" rel="noreferrer">View Settlement Tx: {shortHash(room.settlementTxHash)}</a> : <span>Settlement Tx: waiting</span>}
            {myPayout?.entryTxHash ? <a href={txUrl(myPayout.entryTxHash)} target="_blank" rel="noreferrer">View Entry Lock Tx</a> : null}
            {room.settlementError && <span>Settlement Error: {room.settlementError}</span>}
            {!canClaim && myPayoutWei > 0n && room.settlementStatus !== "settled" && <span>Claim unlocks after settlement is confirmed.</span>}
          </div>
        )}

        <button className="primary-btn" onClick={onBackToLobby}>Back To Lobby</button>
      </div>
    </section>
  );
}

function formatEth(value) {
  try { return formatEther(BigInt(value || "0")); } catch { return "0"; }
}

function fallbackPlacements(room) {
  return (room.players || []).map((player, index) => ({ ...player, position: index + 1 }));
}
