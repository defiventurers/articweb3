import { EntryReadinessPanel } from "../components/EntryReadinessPanel.jsx";
import { WalletStatusPanel } from "../components/WalletStatusPanel.jsx";
import "../styles/devPortal.css";

export function DevPortalScreen({ onTestRunbook, onDevQA, onSettlementAdmin, onVaultDeployer, onExit }) {
  return (
    <section className="dev-portal" aria-label="Arctic Dominion developer tools">
      <div className="dev-portal-card">
        <p className="dev-portal-kicker">Arctic Dominion</p>
        <h1>Developer Console</h1>
        <p className="dev-portal-note">Internal testing, deployment, wallet, and operations tools.</p>

        <div className="dev-portal-actions">
          <button type="button" onClick={onTestRunbook}>Test Runbook</button>
          <button type="button" onClick={onDevQA}>Dev QA Checklist</button>
          <button type="button" onClick={onSettlementAdmin}>Operations Dashboard</button>
          <button type="button" onClick={onVaultDeployer}>Deploy ETH Vault</button>
        </div>

        <button type="button" className="dev-portal-exit" onClick={onExit}>Return to Game</button>
      </div>

      <EntryReadinessPanel />
      <WalletStatusPanel />
    </section>
  );
}
