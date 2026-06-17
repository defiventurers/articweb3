import { appConfig } from "../config/chain.js";
import { ETH_VAULT_ADDRESS } from "../config/chainTargets.js";

const SECTIONS = [
  {
    title: "1. Preflight",
    checks: [
      "Open Player Hub, then SET, and confirm System Checks are Ready.",
      "Confirm backend chain and frontend chain match.",
      "Confirm signer alignment says Ready.",
      "Confirm database stores are ready.",
      "Confirm entry flow is open."
    ]
  },
  {
    title: "2. Create Locked Match room",
    checks: [
      "Open High Stakes Lab from Player Hub.",
      "Create a public room using the smallest test entry.",
      "Confirm AGW opens and the entry lock succeeds.",
      "Check the room card says your lock is confirmed.",
      "Open My Rooms and confirm the room appears there."
    ]
  },
  {
    title: "3. Fill and play the match",
    checks: [
      "Join with the remaining test wallets.",
      "Each wallet confirms its own entry lock.",
      "Each wallet selects a unique team.",
      "Wait for countdown, then play until the match finishes.",
      "Do not use browser refresh as a shortcut during the first clean run."
    ]
  },
  {
    title: "4. Verify settlement and records",
    checks: [
      "Open Match History and open the finished room detail.",
      "Confirm settlement status is visible.",
      "Confirm settlement attempts are visible.",
      "Open Account Activity and confirm room-linked records exist.",
      "Open SET and confirm backend health is still Ready."
    ]
  },
  {
    title: "5. Recovery drill",
    checks: [
      "Create a separate Locked Match room.",
      "Confirm your entry lock, then leave the room unfinished.",
      "After the lock timeout, open My Rooms or the same room code.",
      "Confirm the recovery panel appears.",
      "Recover the expired lock and verify balances refresh."
    ]
  }
];

export function TestRunbookScreen({ onBack }) {
  return (
    <section className="screen data-screen proof-screen">
      <div className="card data-card-shell proof-card">
        <header className="data-header">
          <p className="data-kicker">Closed Beta</p>
          <h1>Test Runbook</h1>
          <p className="data-subtitle">Repeatable checklist for one full Locked Match test cycle on {appConfig.isMainnet ? "Abstract Mainnet guarded mode" : "Abstract Testnet"}.</p>
        </header>

        <section className="data-detail-panel">
          <strong>Current environment</strong>
          <div className="detail-chip-grid">
            <span className="stat-chip">Mode: {appConfig.chainEnv}</span>
            <span className="stat-chip">Chain: {appConfig.chainId}</span>
            <span className="stat-chip">Vault: {shortAddress(ETH_VAULT_ADDRESS)}</span>
            <span className="stat-chip">High Stakes: {appConfig.features.highStakes ? "Enabled" : "Disabled"}</span>
          </div>
          <p className="data-subtitle">This runbook is for closed beta testing. Keep testing on the configured environment until every step passes cleanly.</p>
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

        <section className="data-detail-panel">
          <strong>Pass condition</strong>
          <p className="data-subtitle">One beta cycle passes only when room creation, entry locks, team select, gameplay, settlement visibility, account records, and recovery behavior all work without manual database edits.</p>
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
