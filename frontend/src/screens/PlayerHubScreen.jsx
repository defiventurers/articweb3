import { DepositPanel } from "../components/DepositPanel.jsx";
import "../styles/playerHub.css";

const SHOW_VAULT_DEPLOYER = import.meta.env.VITE_ENABLE_VAULT_DEPLOYER === "true";
const SHOW_SETTLEMENT_ADMIN = import.meta.env.VITE_ENABLE_SETTLEMENT_ADMIN === "true";

export function PlayerHubScreen({ profile, onOpenIce, onHighStakes, onMatchHistory, onLeaderboard, onAccountActivity, onMyRooms, onDevQA, onVaultDeployer, onSettlementAdmin, onBack }) {
  return (
    <section className="player-hub-page">
      <div className="player-hub-shell">
        <aside className="player-hub-admin-rail" aria-label="Developer tools">
          <button type="button" onClick={onDevQA} title="Dev QA Checklist">QA</button>
          {SHOW_SETTLEMENT_ADMIN && <button type="button" onClick={onSettlementAdmin} title="Settlement Admin">SET</button>}
          {SHOW_VAULT_DEPLOYER && <button type="button" onClick={onVaultDeployer} title="Deploy Vault">DEP</button>}
        </aside>

        <div className="player-hub-card">
          <header className="player-hub-header">
            <div>
              <p className="player-hub-kicker">Arctic Dominion</p>
              <h1 className="player-hub-title">Player Hub</h1>
            </div>
            <div className="player-hub-profile-pill">{profile.name} · {profile.points} points</div>
          </header>

          <div className="hub-mode-grid">
            <button className="player-hub-mode open hero" onClick={onOpenIce}>
              <strong>Play Open Ice</strong>
              <span>Free rooms, fast practice, no lock required.</span>
            </button>
            <button className="player-hub-mode locked hero" onClick={onHighStakes}>
              <strong>High Stakes Lab</strong>
              <span>Testnet entry locks and settlement testing.</span>
            </button>
          </div>

          <DepositPanel profile={profile} />

          <div className="hub-section-heading">
            <strong>Command Center</strong>
            <span>Proofs, rankings, activity, and reconnects.</span>
          </div>

          <div className="hub-tools-grid">
            <button className="player-hub-mode locked" onClick={onMatchHistory}>
              <strong>Match History</strong>
              <span>Proof pages and audit trails.</span>
            </button>
            <button className="player-hub-mode locked" onClick={onLeaderboard}>
              <strong>Leaderboard</strong>
              <span>Points, wins, and games.</span>
            </button>
            <button className="player-hub-mode locked" onClick={onAccountActivity}>
              <strong>Account Activity</strong>
              <span>Locks, payouts, withdrawals.</span>
            </button>
            <button className="player-hub-mode locked" onClick={onMyRooms}>
              <strong>My Rooms</strong>
              <span>Resume active matches.</span>
            </button>
          </div>

          <button className="player-hub-back" onClick={onBack}>Back</button>
        </div>
      </div>
    </section>
  );
}
