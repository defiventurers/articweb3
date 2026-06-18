import { useEffect, useState } from "react";

const STORAGE_KEY = "artic.closedBeta.flowCheck.v1";
const FLOWS = [
  "Cover to profile",
  "Player Hub readiness",
  "Room create",
  "Invite link open",
  "Join invited room",
  "Entry lock",
  "Team select",
  "Game finish",
  "History review",
  "Recovery check"
];

export function BetaFlowCheckPanel() {
  const [checked, setChecked] = useState(() => loadChecks());
  const [copyNote, setCopyNote] = useState("");
  const completed = FLOWS.filter((flow) => checked[flow]).length;
  const passed = completed === FLOWS.length;

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checked)); } catch {}
  }, [checked]);

  function toggle(flow) {
    setChecked((current) => ({ ...current, [flow]: !current[flow] }));
  }

  function reset() {
    setChecked({});
    setCopyNote("");
  }

  async function copyFlowCheck() {
    const lines = [
      "Closed Beta Flow Check",
      `Status: ${passed ? "PASS" : "INCOMPLETE"}`,
      `Progress: ${completed}/${FLOWS.length}`,
      "",
      ...FLOWS.map((flow) => `${checked[flow] ? "[x]" : "[ ]"} ${flow}`)
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("Flow check copied.");
    } catch {
      setCopyNote("Copy failed. Select the checklist manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Flow check</strong>
      <p className="data-subtitle">Run these flows after frontend changes before inviting more testers.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Status: {passed ? "PASS" : "INCOMPLETE"}</span>
        <span className="stat-chip">Progress: {completed}/{FLOWS.length}</span>
      </div>
      <ol className="audit-line-list">
        {FLOWS.map((flow) => (
          <li key={flow}>
            <label style={{ display: "flex", gap: "0.55rem", alignItems: "center" }}>
              <input type="checkbox" checked={Boolean(checked[flow])} onChange={() => toggle(flow)} />
              <span>{flow}</span>
            </label>
          </li>
        ))}
      </ol>
      <button className="secondary-btn" type="button" onClick={copyFlowCheck}>Copy Flow Check</button>
      <button className="secondary-btn" type="button" onClick={reset}>Reset Flow Check</button>
      {copyNote && <p className="data-subtitle">{copyNote}</p>}
    </section>
  );
}

function loadChecks() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
