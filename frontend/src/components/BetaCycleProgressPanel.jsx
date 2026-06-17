import { useEffect, useState } from "react";

const STORAGE_KEY = "artic.closedBeta.cycleProgress.v1";
const STEPS = [
  "Operator preflight passed",
  "System checks ready",
  "Funding readiness confirmed",
  "Locked room created",
  "All entry locks confirmed",
  "Match completed",
  "Settlement visibility confirmed",
  "Recent indexed events verified",
  "Recovery drill passed"
];

export function BetaCycleProgressPanel() {
  const [checked, setChecked] = useState(() => loadProgress());
  const [copyNote, setCopyNote] = useState("");

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch {
      // localStorage can be unavailable in privacy-restricted browsers.
    }
  }, [checked]);

  const completed = Object.values(checked).filter(Boolean).length;
  const total = STEPS.length;

  function toggle(step) {
    setChecked((current) => ({ ...current, [step]: !current[step] }));
  }

  function reset() {
    setChecked({});
    setCopyNote("");
  }

  async function copySummary() {
    const lines = [
      "Closed Beta Cycle Summary",
      `Progress: ${completed}/${total}`,
      `Status: ${completed === total ? "Cycle passed" : "In progress"}`,
      "",
      ...STEPS.map((step) => `${checked[step] ? "[x]" : "[ ]"} ${step}`)
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("Cycle summary copied.");
    } catch {
      setCopyNote("Copy failed. Select the checklist manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Beta cycle progress</strong>
      <p className="data-subtitle">Local browser checklist for one clean closed-beta cycle. Reset before starting a fresh cycle.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Progress: {completed}/{total}</span>
        <span className="stat-chip">Status: {completed === total ? "Cycle passed" : "In progress"}</span>
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
      <button className="secondary-btn" type="button" onClick={copySummary}>Copy Cycle Summary</button>
      <button className="secondary-btn" type="button" onClick={reset}>Reset Cycle Progress</button>
      {copyNote && <p className="data-subtitle">{copyNote}</p>}
    </section>
  );
}

function loadProgress() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
