import { useState } from "react";
import { formatEther } from "viem";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import { ETH_VAULT_ADDRESS } from "../config/chainTargets.js";
import { ethVaultAbi } from "../contracts/abis.js";

const TEAM_LABELS = {
  green: "Abster",
  red: "Retsba",
  blue: "Pengu",
  yellow: "Polly"
};

export function ResultsScreen({ room, onBackToLobby }) {
  const { data: abstractClient } = useAbstractClient();
  const [manualStatus, setManualStatus] = useState("");
  const [manualError, setManualError] = useState("");
  const [busy, setBusy] = useState(false);
  const placements = room.placements?.length ? room.placements : fallbackPlacements(room);
  const payoutByWallet = new Map((room.payoutPlan || []).map((item) => [item.wallet, item]));
  const isEscrowTestRoom = room.roomMode === "high_stakes";
  const canManualSettle = isEscrowTestRoom && room.settlementStatus === "failed" && !room.settlementTxHash && room.payoutPlan?.length === 4;

  async function manualSettle() {
    if (!abstractClient) {
      setManualError("Connect the wallet currently set as vault gameServer.");
      return;
    }
    try {
      setBusy(true);
      setManualError("");
      setManualStatus("Open AGW and confirm manual settlement.");
      const orderedWallets = room.payoutPlan.map((item) => item.wallet);
      const payoutAmounts = room.payoutPlan.map((item) => BigInt(item.payoutWei || "0"));
      const txHash = await abstractClient.writeContract({
        address: ETH_VAULT_ADDRESS,
        abi: ethVaultAbi,
        functionName: "settleMatch",
        args: [room.contractMatchId, orderedWallets, payoutAmounts]
      });
      setManualStatus(`Manual settlement submitted: ${txHash.slice(0, 10)}...${txHash.slice(-6)}`);
    } catch (err) {
      setManualError(err.shortMessage || err.message || "Manual settlement failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="screen">
      <div className="card">
        <h1>Match Complete</h1>

        <p className="note">
          Room {room.roomCode} · {isEscrowTestRoom ? "Testnet escrow result" : "Open Ice result"}
        </p>

        <div className="room-list">
          {placements.map((player, index) => {
            const payout = payoutByWallet.get(player.wallet);
            return (
              <div className="room-row" key={player.wallet || `${player.team}-${index}`}>
                <strong>{player.position || index + 1}. {player.name || "Player"}</strong>
                <span>{TEAM_LABELS[player.team] || player.team}</span>
                {payout && <span>{formatEther(BigInt(payout.payoutWei || "0"))} ETH · +{payout.points} pts</span>}
              </div>
            );
          })}
        </div>

        {isEscrowTestRoom && (
          <div className="rules-panel">
            <strong>Settlement</strong>
            <span>Status: {room.settlementStatus || "pending"}</span>
            {room.settlementTxHash && <span>Tx: {room.settlementTxHash.slice(0, 10)}...{room.settlementTxHash.slice(-6)}</span>}
            {room.settlementStatus === "needs_settlement_signer" && <span>Render is missing the settlement signer.</span>}
            {room.settlementStatus === "failed" && <span>Backend auto-settlement failed before a tx was submitted. Use manual fallback with the current vault gameServer wallet.</span>}
            {!room.settlementTxHash && !["failed", "needs_settlement_signer"].includes(room.settlementStatus) && <span>Waiting for settlement.</span>}
            {canManualSettle && (
              <button className="primary-btn" disabled={busy} onClick={manualSettle}>
                {busy ? "Submitting..." : "Manual Settle With AGW"}
              </button>
            )}
            {manualStatus && <span>{manualStatus}</span>}
            {manualError && <span>{manualError}</span>}
          </div>
        )}

        <button className="primary-btn" onClick={onBackToLobby}>
          Back To Lobby
        </button>
      </div>
    </section>
  );
}

function fallbackPlacements(room) {
  return (room.players || []).map((player, index) => ({
    ...player,
    position: index + 1
  }));
}
