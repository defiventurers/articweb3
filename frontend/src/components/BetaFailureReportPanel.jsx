import { useState } from "react";
import { appConfig } from "../config/chain.js";

const REPORT_LINES = [
  "Closed Beta Failure Report",
  "Environment:",
  "Public account address:",
  "Room code:",
  "Entry tier:",
  "Public transaction link:",
  "Screen:",
  "Action clicked:",
  "Visible error:",
  "Expected result:",
  "Actual result:",
  "Recent Events filter checked:",
  "Browser/device:"
];

export function BetaFailureReportPanel() {
  const [copyNote, setCopyNote] = useState("");

  async function copyTemplate() {
    const text = REPORT_LINES.map((line) => line === "Environment:" ? `Environment: ${appConfig.chainEnv} / ${appConfig.chainId}` : line).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopyNote("Failure report template copied.");
    } catch {
      setCopyNote("Copy failed. Select the template manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Beta failure report helper</strong>
      <ol className="audit-line-list">
        {REPORT_LINES.map((line) => <li key={line}>{line}</li>)}
      </ol>
      <button className="secondary-btn" type="button" onClick={copyTemplate}>Copy Failure Report Template</button>
      {copyNote && <p className="data-subtitle">{copyNote}</p>}
      <p className="data-subtitle">Ask testers for public debugging identifiers only: account address, room code, public transaction link, screen, action, and visible error.</p>
    </section>
  );
}
