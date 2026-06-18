import { useEffect, useState } from "react";
import { appConfig } from "../config/chain.js";

const STORAGE_KEY = "artic.closedBeta.mainnetReadiness.v1";
const GATES = [
  "Three clean testnet cycles recorded",
  "Mainnet vault address confirmed",
  "Mainnet contract explorer verification complete",
  "Frontend mainnet environment reviewed",
  "Backend mainnet environment reviewed",
  "Settlement signer alignment reviewed",
  "Indexer mainnet event visibility checked",
  "Tiny-value internal mainnet rehearsal planned",
  "Recovery drill plan ready",
  "Rollback owner assigned",
  "Capped beta scope confirmed",
  "Public launch remains blocked until review"
];

export function BetaMainnetReadinessPanel() {
  const [checked, setChecked] = useState(() => loadState());
  const [copyNote, setCopyNote] = useState("");
  const complete = GATES.every((gate) => checked[gate]);
  const count = GATES.filter((gate) => checked[gate]).length;

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checked)); } catch {}
  }, [checked]);

  function toggle(gate) {
    setChecked((current) => ({ ...current, [gate]: !current[gate] }));
  }

  function reset() {
    setChecked({});
    setCopyNote("");
  }

  async function copyReadiness() {
    const lines = [
      "Mainnet Readiness Gate",
      `Current app env: ${appConfig.chainEnv} / ${appConfig.chainId}`,
      `Status: ${complete ? "READY FOR CAPPED MAINNET REHEARSAL" : "HOLD"}`,
      `Progress: ${count}/${GATES.length}`,
      "",
      ...GATES.map((gate) => `${checked[gate] ? "[x]" : "[ ]"} ${gate}`)
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("Mainnet readiness copied.");
    } catch {
      setCopyNote("Copy failed. Select the readiness gate manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Mainnet readiness</strong>
      <p className="data-subtitle">Separates capped mainnet rehearsal from public launch. Public launch stays blocked until review is complete.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Status: {complete ? "REHEARSAL READY" : "HOLD"}</span>
        <span className="stat-chip">Progress: {count}/{GATES.length}</span>
      </div>
      <ol className="audit-line-list">
        {GATES.map((gate) => (
          <li key={gate}>
            <label style={{ display: "flex", gap: "0.55rem", alignItems: "center" }}>
              <input type="checkbox" checked={Boolean(checked[gate])} onChange={() => toggle(gate)} />
              <span>{gate}</span>
            </label>
          </li>
        ))}
      </ol>
      <button className="secondary-btn" type="button" onClick={copyReadiness}>Copy Mainnet Readiness</button>
      <button className="secondary-btn" type="button" onClick={reset}>Reset Mainnet Readiness</button>
      {copyNote && <p className="data-subtitle">{copyNote}</p>}
    </section>
  );
}

function loadState() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
