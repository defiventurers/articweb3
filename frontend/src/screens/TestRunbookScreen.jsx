import { BetaBlockerTriagePanel } from "../components/BetaBlockerTriagePanel.jsx";
import { BetaCycleProgressPanel } from "../components/BetaCycleProgressPanel.jsx";
import { BetaFailureReportPanel } from "../components/BetaFailureReportPanel.jsx";
import { BetaGasPolicyPanel } from "../components/BetaGasPolicyPanel.jsx";
import { BetaLaunchGuardPanel } from "../components/BetaLaunchGuardPanel.jsx";
import { BetaNextWavePlanPanel } from "../components/BetaNextWavePlanPanel.jsx";
import { BetaReleaseDecisionPanel } from "../components/BetaReleaseDecisionPanel.jsx";
import { BetaReleaseGatePanel } from "../components/BetaReleaseGatePanel.jsx";
import { BetaTesterHandoffPanel } from "../components/BetaTesterHandoffPanel.jsx";
import { BetaTesterRosterPanel } from "../components/BetaTesterRosterPanel.jsx";
import { appConfig } from "../config/chain.js";
import { ETH_VAULT_ADDRESS } from "../config/chainTargets.js";

const SECTIONS = [
  {
    title: "1. Operator preflight",
    checks: [
      "Confirm the latest frontend deploy is live.",
      "Confirm the selected Abstract environment matches the test plan.",
      "Confirm Locked Match Lab is enabled only for the planned beta cycle.",
      "Confirm public links and room invites open correctly."
    ]
  },
  {
    title: "2. System checks",
    checks: [
      "Open Player Hub, then SET, and confirm System Checks are Ready.",
      "Confirm chain sync health and recent event panels load.",
      "Confirm account activity and match history load.",
      "Confirm testers can reconnect and return to their room."
    ]
  },
  {
    title: "3. Funding readiness",
    checks: [
      "Open Player Hub and read Entry Readiness.",
      "Confirm each tester is connected to the planned network.",
      "Confirm each tester can cover the selected test entry.",
      "Use explorer links when debugging a failed lock."
    ]
  },
  {
    title: "4. Locked Match cycle",
    checks: [
      "Create a public room using the smallest test entry.",
      "Share the invite link with testers.",
      "Confirm every tester joins and locks successfully.",
      "Play the match to completion."
    ]
  },
  {
    title: "5. Records and recovery",
    checks: [
      "Confirm match history shows the finished room.",
      "Confirm account activity includes room-linked records.",
      "Confirm recent indexed events show lock and settlement activity.",
      "Run one expired-lock recovery drill before widening the beta."
    ]
  }
];

export function TestRunbookScreen({ onBack }) {
  const indexerBase = getBackendBaseUrl();
  return (
    <section className="screen data-screen proof-screen">
      <div className="card data-card-shell proof-card">
        <header className="data-header">
          <p className="data-kicker">Closed Beta</p>
          <h1>Test Runbook</h1>
          <p className="data-subtitle">Repeatable control room for one full Locked Match test cycle on {appConfig.isMainnet ? "Abstract Mainnet guarded mode" : "Abstract Testnet"}.</p>
        </header>

        <section className="data-detail-panel">
          <strong>Current environment</strong>
          <div className="detail-chip-grid">
            <span className="stat-chip">Mode: {appConfig.chainEnv}</span>
            <span className="stat-chip">Chain: {appConfig.chainId}</span>
            <span className="stat-chip">Vault: {shortAddress(ETH_VAULT_ADDRESS)}</span>
            <span className="stat-chip">High Stakes: {appConfig.features.highStakes ? "Enabled" : "Disabled"}</span>
          </div>
          <p className="data-subtitle">Keep testing on the planned environment until every gate and triage item is clean.</p>
        </section>

        <BetaReleaseGatePanel />
        <BetaGasPolicyPanel />
        <BetaLaunchGuardPanel />
        <BetaBlockerTriagePanel />
        <BetaReleaseDecisionPanel />
        <BetaNextWavePlanPanel />
        <BetaCycleProgressPanel />
        <BetaTesterRosterPanel />
        <BetaTesterHandoffPanel />

        <section className="data-detail-panel">
          <strong>Quick operator links</strong>
          <div className="detail-chip-grid">
            {indexerBase && <a className="stat-chip" href={`${indexerBase}/indexer/health`} target="_blank" rel="noreferrer">Indexer Health</a>}
            {indexerBase && <a className="stat-chip" href={`${indexerBase}/indexer/stats`} target="_blank" rel="noreferrer">Indexer Stats</a>}
            {indexerBase && <a className="stat-chip" href={`${indexerBase}/indexer/events?limit=10`} target="_blank" rel="noreferrer">Recent Events</a>}
            <a className="stat-chip" href={addressUrl(ETH_VAULT_ADDRESS)} target="_blank" rel="noreferrer">Vault Explorer</a>
          </div>
        </section>

        <div className="data-list compact-detail-list">
          {SECTIONS.map((section) => (
            <article className="mini-data-card" key={section.title}>
              <strong>{section.title}</strong>
              <ol className="audit-line-list">
                {section.checks.map((check) => <li key={check}>{check}</li>)}
              </ol>
            </article>
          ))}
        </div>

        <BetaFailureReportPanel />

        <section className="data-detail-panel">
          <strong>Pass condition</strong>
          <p className="data-subtitle">One beta cycle passes only when room creation, entry locks, team select, gameplay, settlement visibility, account records, event visibility, and recovery behavior all work without manual correction.</p>
        </section>

        <button className="primary-btn data-back-btn" onClick={onBack}>Back To Hub</button>
      </div>
    </section>
  );
}

function shortAddress(value) {
  if (!value) return "—";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getBackendBaseUrl() {
  const raw = import.meta.env.VITE_BACKEND_HTTP_URL || import.meta.env.VITE_API_URL || import.meta.env.VITE_WS_URL || "";
  if (!raw) return "";
  let base = String(raw).trim();
  if (base.startsWith("wss://")) base = "https://" + base.slice(6);
  if (base.startsWith("ws://")) base = "http://" + base.slice(5);
  return base.replace(/\/$/, "");
}

function addressUrl(value) {
  const explorer = import.meta.env.VITE_ABSTRACT_EXPLORER_URL || import.meta.env.VITE_ABSTRACT_EXPLORER || appConfig.explorerUrl;
  return String(explorer).replace(/\/$/, "") + "/address/" + value;
}
