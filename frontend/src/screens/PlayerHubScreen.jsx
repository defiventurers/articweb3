import { DepositPanel } from "../components/DepositPanel.jsx";
import "../styles/playerHub.css";

const SHOW_VAULT_DEPLOYER = import.meta.env.VITE_ENABLE_VAULT_DEPLOYER === "true";
const SHOW_SETTLEMENT_ADMIN = import.meta.env.VITE_ENABLE_SETTLEMENT_ADMIN === "true";

export function PlayerHubScreen({ profile, onOpenIce, onHighStakes, onMatchHistory, onVaultDeployer, onSettlementAdmin, onBack }) {
  return (
    <section className="player-hub-page">
      <div className="player-hub-card">
        <h1 className="player-hub-title">Player Hub</h1>

        <div className="player-hub-profile-pill">
          {profile.name} · {profile.points} points
        </div>

        <button className="player-hub-mode open" onClick={onOpenIce}>
          <strong>Play Open Ice Now</strong>
          <span>Free play. No deposit required.</span>
        </button>

        <DepositPanel />

        <button className="player-hub-mode locked" onClick={onMatchHistory}>
          <strong>Match History</strong>
          <span>Review locks, outcomes, payouts, settlement txs, and points.</span>
        </button>

        <button className="player-hub-mode open" onClick={onOpenIce}>
          <strong>Open Ice</strong>
          <span>Create or join free rooms. No crypto required.</span>
        </button>

        <button className="player-hub-mode locked" onClick={onHighStakes}>
          <strong>High Stakes</strong>
          <span>Testnet lock lab and settlement testing.</span>
        </button>

        {SHOW_VAULT_DEPLOYER && (
          <button className="player-hub-mode locked" onClick={onVaultDeployer}>
            <strong>Deploy Vault</strong>
            <span>Local admin tool for AGW deployment.</span>
          </button>
        )}

        {SHOW_SETTLEMENT_ADMIN && (
          <button className="player-hub-mode locked" onClick={onSettlementAdmin}>
            <strong>Settlement Admin</strong>
            <span>Set backend wallet as vault game server.</span>
          </button>
        )}

        <button className="player-hub-back" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
