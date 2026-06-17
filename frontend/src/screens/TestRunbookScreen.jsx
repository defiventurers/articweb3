import { BetaCycleProgressPanel } from "../components/BetaCycleProgressPanel.jsx";
import { appConfig } from "../config/chain.js";
import { ETH_VAULT_ADDRESS } from "../config/chainTargets.js";

const SECTIONS = [
  {
    title: "1. Operator preflight",
    checks: [
      "Confirm Vercel is on the latest frontend commit.",
      "Confirm Render is on the latest backend commit when backend changes are included.",
      "Confirm frontend chain, backend chain, RPC, explorer, and vault address match the selected environment.",
      "Confirm locked-match mode is enabled only for the intended closed-beta environment.",
      "Keep sensitive backend-only values out of frontend env."
    ]
  },
  {
    title: "2. System checks",
    checks: [
      "Open Player Hub, then SET, and confirm System Checks are Ready.",
      "Confirm backend health is reachable.",
      "Confirm signer alignment says Ready.",
      "Confirm database stores are ready.",
      "Confirm Chain Sync Status can read health and stats."
    ]
  },
  {
    title: "3. Sync checks",
    checks: [
      "Open Indexer Health from the runbook or SET screen.",
      "Open Indexer Stats and confirm the response loads.",
      "Open Recent Events and confirm the events array loads.",
      "After a lock, filter Recent Indexed Events by EntryLocked.",
      "After settlement, filter Recent Indexed Events by MatchSettled."
    ]
  },
  {
    title: "4. Funding readiness",
    checks: [
      "Open Player Hub and read Entry Readiness.",
      "Confirm wallet connected and correct network.",
      "Confirm wallet has enough testnet ETH for the chosen room.",
      "Remember direct lock uses wallet ETH; vault available is shown for deposit and recovery visibility.",
      "Use wallet and vault explorer links when debugging tester reports."
    ]
  },
  {
    title: "5. Create Locked Match room",
    checks: [
      "Open High Stakes Lab from Player Hub.",
      "Create a public room using the smallest test entry.",
      "Confirm AGW opens and the entry lock succeeds.",
      "If confirm is disabled, check wallet ETH and network first.",
      "Open My Rooms and confirm the room appears there."
    ]
  },
  {
    title: "6. Fill and play the match",
    checks: [
      "Join with the remaining test wallets.",
      "Each wallet confirms its own entry lock.",
      "Each wallet selects a unique team.",
      "Wait for countdown, then play until the match finishes.",
      "Do not use browser refresh as a shortcut during the first clean run."
    ]
  },
  {
    title: "7. Verify settlement and records",
    checks: [
      "Open Match History and open the finished room detail.",
      "Confirm settlement status and attempts are visible.",
      "Open Account Activity and confirm room-linked records exist.",
      "Open Recent Indexed Events and use event filters.",
      "Open tx links from the indexed-event feed when debugging."
    ]
  },
  {
    title: "8. Recovery drill",
    checks: [
      "Create a separate Locked Match room.",
      "Confirm your entry lock, then leave the room unfinished.",
      "After the lock timeout, open My Rooms or the same room code.",
      "Confirm the recovery panel appears.",
      "Recover the expired lock and verify balances refresh."
    ]
  },
  {
    title: "9. Common lock-failure diagnosis",
    checks: [
      "Wallet client not ready: reconnect AGW from the profile screen.",
      "Wrong chain: switch to the configured Abstract environment.",
      "Insufficient wallet ETH: fund wallet or choose a smaller test room.",
      "Server not verifying tx yet: wait, refresh sync, then check Recent Indexed Events.",
      "Room state mismatch: refresh rooms, check My Rooms, then retry from the room modal."
    ]
  }
];

const REPORT_FIELDS = [
  "Tester wallet:",
  "Room code:",
  "Room mode:",
  "Entry tier:",
  "Tx hash, if any:",
  "Screen where failure happened:",
  "Exact button clicked:",
  "Visible error message:",
  "Expected result:",
  "Actual result:",
  "Recent Indexed Events filter used:",
  "Browser/device:"
];

export function TestRunbookScreen({ onBack }) {
  const indexerBase = getBackendBaseUrl();
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

        <BetaCycleProgressPanel />

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

        <section className="data-detail-panel">
          <strong>Beta issue report template</strong>
          <ol className="audit-line-list">
            {REPORT_FIELDS.map((field) => <li key={field}>{field}</li>)}
          </ol>
          <p className="data-subtitle">Do not accept vague reports. Every failed test should include wallet, room code, screen, exact action, visible error, and tx hash when available.</p>
        </section>

        <section className="data-detail-panel">
          <strong>Pass condition</strong>
          <p className="data-subtitle">One beta cycle passes only when room creation, entry locks, team select, gameplay, settlement visibility, account records, indexer visibility, and recovery behavior all work without manual database edits.</p>
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
