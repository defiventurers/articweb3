import { DepositPanel } from "../components/DepositPanel.jsx";
import { OptimizedImage } from "../components/OptimizedImage.jsx";
import "../styles/playerHub.css";

const SHOW_VAULT_DEPLOYER = import.meta.env.VITE_ENABLE_VAULT_DEPLOYER === "true";
const SHOW_SETTLEMENT_ADMIN = import.meta.env.VITE_ENABLE_SETTLEMENT_ADMIN === "true";

export function PlayerHubScreen({ profile, onOpenIce, onHighStakes, onMatchHistory, onLeaderboard, onAccountActivity, onMyRooms, onDevQA, onVaultDeployer, onSettlementAdmin, onBack }) {
  return (
    <section id="screenPlayerHub" className="art-screen playerhub-screen" aria-label="Player Hub">
      <div className="menu-screen-shell">
        <div className="art-stage screen-stage playerhub-stage">
          <OptimizedImage className="screen-art" src="/assets/screens/playerhub.png" alt="Player Hub" />

          <div className="playerhub-overlay" aria-hidden="true">
            <div id="playerHubWalletText" className="playerhub-wallet-text">{profile.name}</div>
            <div id="playerHubPointsText" className="playerhub-points-text">{profile.points} pts</div>
          </div>

          <DepositPanel variant="art" />

          <div className="hitbox-layer playerhub-hitboxes">
            <button id="openIceBtn" className="screen-hitbox open-ice-hitbox" aria-label="Play Open Ice" onClick={onOpenIce} />
            <button id="highStakesBtn" className="screen-hitbox high-stakes-hitbox" aria-label="High Stakes Lab" onClick={onHighStakes} />
            <button id="matchHistoryBtn" className="screen-hitbox match-history-hitbox" aria-label="Match History" onClick={onMatchHistory} />
            <button id="leaderboardBtn" className="screen-hitbox leaderboard-hitbox" aria-label="Leaderboard" onClick={onLeaderboard} />
            <button id="accountActivityBtn" className="screen-hitbox account-activity-hitbox" aria-label="Account Activity" onClick={onAccountActivity} />
            <button id="myRoomsBtn" className="screen-hitbox my-rooms-hitbox" aria-label="My Rooms" onClick={onMyRooms} />
            <button id="playerHubBackBtn" className="screen-hitbox playerhub-back-hitbox" aria-label="Back" onClick={onBack} />
          </div>

          <aside className="ph-dev-rail" aria-label="Developer tools">
            <button type="button" onClick={onDevQA} title="Dev QA Checklist">QA</button>
            {SHOW_SETTLEMENT_ADMIN && <button type="button" onClick={onSettlementAdmin} title="Settlement Admin">SET</button>}
            {SHOW_VAULT_DEPLOYER && <button type="button" onClick={onVaultDeployer} title="Vault Tool">VAULT</button>}
          </aside>
        </div>
      </div>
    </section>
  );
}
