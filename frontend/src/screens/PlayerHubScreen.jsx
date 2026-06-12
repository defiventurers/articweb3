import { DepositPanel } from "../components/DepositPanel.jsx";
import "../styles/playerHub.css";

const SHOW_VAULT_DEPLOYER = import.meta.env.VITE_ENABLE_VAULT_DEPLOYER === "true";

export function PlayerHubScreen({ profile, onOpenIce, onHighStakes, onVaultDeployer, onBack }) {
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

        <button className="player-hub-mode open" onClick={onOpenIce}>
          <strong>Open Ice</strong>
          <span>Create or join free rooms. No crypto required.</span>
        </button>

        <button className="player-hub-mode locked" onClick={onHighStakes}>
          <strong>High Stakes</strong>
          <span>Coming after balance checks and settlement testing.</span>
        </button>

        {SHOW_VAULT_DEPLOYER && (
          <button className="player-hub-mode locked" onClick={onVaultDeployer}>
            <strong>Deploy Vault</strong>
            <span>Local admin tool for AGW deployment.</span>
          </button>
        )}

        <button className="player-hub-back" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
