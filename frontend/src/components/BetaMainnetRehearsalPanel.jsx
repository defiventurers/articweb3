import { useEffect, useState } from "react";

const STORAGE_KEY = "artic.closedBeta.mainnetRehearsal.v1";
const STEPS = [
  "Internal wallets funded with tiny amount",
  "Mainnet env audit passed",
  "Backend health checked",
  "Create capped room",
  "Share invite with internal tester",
  "Confirm tiny lock",
  "Finish match",
  "Confirm history record",
  "Confirm indexed event visibility",
  "Confirm recovery plan still valid",
  "Record evidence packet"
];

export function BetaMainnetRehearsalPanel() {
  const [checked, setChecked] = useState(() => loadState());
  const [copyNote, setCopyNote] = useState("");
  const count = STEPS.filter((step) => checked[step]).length;
  const passed = count === STEPS.length;

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checked)); } catch {}
  }, [checked]);

  function toggle(step) {
    setChecked((current) => ({ ...current, [step]: !current[step] }));
  }

  function reset() {
    setChecked({});
    setCopyNote("");
  }

  async function copyDrill() {
    const lines = [
      "Mainnet Rehearsal Drill",
      `Status: ${passed ? "PASS" : "INCOMPLETE"}`,
      `Progress: ${count}/${STEPS.length}`,
      "",
      ...STEPS.map((step) => `${checked[step] ? "[x]" : "[ ]"} ${step}`)
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("Mainnet rehearsal drill copied.");
    } catch {
      setCopyNote("Copy failed. Select the drill manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Mainnet rehearsal drill</strong>
      <p className="data-subtitle">Tiny-value internal rehearsal only. This is not public launch approval.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Status: {passed ? "PASS" : "INCOMPLETE"}</span>
        <span className="stat-chip">Progress: {count}/{STEPS.length}</span>
      </div>
      <ol className="audit-line-list">
        {STEPS.map((step) => (
          <li key={step}>
            <label style={{ display: "flex", gap: "0.55rem", alignItems: "center" }}>
              <input type="checkbox" checked={Boolean(checked[step])} onChange={() => toggle(step)} />
              <span>{step}</span>
            </label>
          </li>
        ))}
      </ol>
      <button className="secondary-btn" type="button" onClick={copyDrill}>Copy Rehearsal Drill</button>
      <button className="secondary-btn" type="button" onClick={reset}>Reset Rehearsal Drill</button>
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
