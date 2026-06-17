import { useState } from "react";

const STORAGE_KEYS = [
  "artic.closedBeta.releaseGate.v1",
  "artic.closedBeta.gasPolicy.v1",
  "artic.closedBeta.launchGuard.v1",
  "artic.closedBeta.blockerTriage.v1",
  "artic.closedBeta.releaseDecision.v1",
  "artic.closedBeta.nextWavePlan.v1",
  "artic.closedBeta.cycleProgress.v1",
  "artic.closedBeta.testerRoster.v1",
  "artic.closedBeta.evidencePacket.v1"
];

export function BetaOpsSnapshotPanel() {
  const [copyNote, setCopyNote] = useState("");

  async function copySnapshot() {
    const snapshot = {
      exportedAt: new Date().toISOString(),
      page: typeof window === "undefined" ? "" : window.location.href,
      localRunState: readLocalState()
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
      setCopyNote("RUN snapshot copied.");
    } catch {
      setCopyNote("Copy failed. Use the individual copy buttons above.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>RUN snapshot</strong>
      <p className="data-subtitle">Copy one local-browser snapshot for operator handoff after a closed-beta cycle.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Tracked panels: {STORAGE_KEYS.length}</span>
        <span className="stat-chip">Scope: local browser</span>
      </div>
      <button className="secondary-btn" type="button" onClick={copySnapshot}>Copy Full RUN Snapshot</button>
      {copyNote && <p className="data-subtitle">{copyNote}</p>}
    </section>
  );
}

function readLocalState() {
  const output = {};
  if (typeof window === "undefined") return output;
  for (const key of STORAGE_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      output[key] = null;
      continue;
    }
    try {
      output[key] = JSON.parse(raw);
    } catch {
      output[key] = raw;
    }
  }
  return output;
}
