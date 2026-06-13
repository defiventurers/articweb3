import { DepositPanel } from "../components/DepositPanel.jsx";
import "../styles/playerHub.css";

const SHOW_VAULT_DEPLOYER = import.meta.env.VITE_ENABLE_VAULT_DEPLOYER === "true";
const SHOW_SETTLEMENT_ADMIN = import.meta.env.VITE_ENABLE_SETTLEMENT_ADMIN === "true";

export function PlayerHubScreen({ profile, onOpenIce, onHighStakes, onMatchHistory, onLeaderboard, onAccountActivity, onMyRooms, onDevQA, onVaultDeployer, onSettlementAdmin, onBack }) {
  return (
    <section className="art-screen player-hub-art-screen" aria-label="Player Hub">
      <div className="art-stage player-hub-art-stage">
        <img className="screen-art" src="/assets/screens/playerhub.png" alt="Arctic Dominion Player Hub" draggable="false" />

        <div className="ph-profile-text">{profile.name} · {profile.points} points</div>
        <DepositPanel variant="art" />

        <button className="ph-hit ph-play-open" aria-label="Play Open Ice" onClick={onOpenIce} />
        <button className="ph-hit ph-high-stakes" aria-label="High Stakes Lab" onClick={onHighStakes} />
        <button className="ph-hit ph-match-history" aria-label="Match History" onClick={onMatchHistory} />
        <button className="ph-hit ph-leaderboard" aria-label="Leaderboard" onClick={onLeaderboard} />
        <button className="ph-hit ph-account-activity" aria-label="Account Activity" onClick={onAccountActivity} />
        <button className="ph-hit ph-my-rooms" aria-label="My Rooms" onClick={onMyRooms} />
        <button className="ph-hit ph-back" aria-label="Back" onClick={onBack} />

        <aside className="ph-dev-rail" aria-label="Developer tools">
          <button type="button" onClick={onDevQA} title="Dev QA Checklist">QA</button>
          {SHOW_SETTLEMENT_ADMIN && <button type="button" onClick={onSettlementAdmin} title="Settlement Admin">SET</button>}
          {SHOW_VAULT_DEPLOYER && <button type="button" onClick={onVaultDeployer} title="Deploy Vault">DEP</button>}
        </aside>
      </div>
    </section>
  );
}
