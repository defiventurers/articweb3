import { useEffect, useState } from "react";

const STORAGE_KEY = "artic.closedBeta.releaseGate.v1";
const GATES = [
  "Frontend deploy verified",
  "Backend deploy verified when needed",
  "System checks ready",
  "Indexer health ready",
  "Recent events visible",
  "Funding readiness confirmed",
  "Four-wallet lock cycle passed",
  "Settlement visibility passed",
  "Recovery drill passed",
  "No unresolved blocking tester report"
];

export function BetaReleaseGatePanel() {
  const [checked, setChecked] = useState(() => loadGate());
  const [copyNote, setCopyNote] = useState("");
  const passed = GATES.every((gate) => checked[gate]);
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

  async function copyGate() {
    const lines = [
      "Closed Beta Release Gate",
      `Status: ${passed ? "PASS" : "BLOCKED"}`,
      `Progress: ${count}/${GATES.length}`,
      "",
      ...GATES.map((gate) => `${checked[gate] ? "[x]" : "[ ]"} ${gate}`)
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("Release gate summary copied.");
    } catch {
      setCopyNote("Copy failed. Select the gate summary manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Closed-beta release gate</strong>
      <p className="data-subtitle">Do not widen the beta until every gate is checked.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Gate: {passed ? "PASS" : "BLOCKED"}</span>
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
      <button className="secondary-btn" type="button" onClick={copyGate}>Copy Release Gate</button>
      <button className="secondary-btn" type="button" onClick={reset}>Reset Release Gate</button>
      {copyNote && <p className="data-subtitle">{copyNote}</p>}
    </section>
  );
}

function loadGate() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
