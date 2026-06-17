import { useEffect, useState } from "react";

const STORAGE_KEY = "artic.closedBeta.launchGuard.v1";
const GATES = [
  "Closed beta release gate passed",
  "No unresolved blocker issue",
  "Gas policy approved",
  "Contract verification complete",
  "Monitoring and incident owner assigned",
  "Support path ready for testers",
  "Practice economy wording confirmed",
  "Rewards disabled until review is complete",
  "Mainnet rollout capped and reversible",
  "Final operator decision recorded"
];

export function BetaLaunchGuardPanel() {
  const [checked, setChecked] = useState(() => loadGuard());
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

  async function copyGuard() {
    const lines = [
      "Public Launch Guard",
      `Status: ${passed ? "READY FOR CAPPED NEXT STEP" : "HOLD"}`,
      `Progress: ${count}/${GATES.length}`,
      "",
      ...GATES.map((gate) => `${checked[gate] ? "[x]" : "[ ]"} ${gate}`)
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("Launch guard copied.");
    } catch {
      setCopyNote("Copy failed. Select the guard manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Public launch guard</strong>
      <p className="data-subtitle">This is a brake, not a launch button. Keep the product in closed beta until every guard is checked.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Status: {passed ? "READY FOR CAPPED NEXT STEP" : "HOLD"}</span>
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
      <button className="secondary-btn" type="button" onClick={copyGuard}>Copy Launch Guard</button>
      <button className="secondary-btn" type="button" onClick={reset}>Reset Launch Guard</button>
      {copyNote && <p className="data-subtitle">{copyNote}</p>}
    </section>
  );
}

function loadGuard() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
