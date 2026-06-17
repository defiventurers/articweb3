import { useState } from "react";
import { appConfig } from "../config/chain.js";

const TESTER_STEPS = [
  "Connect your Abstract Global Wallet.",
  "Use the configured Abstract test environment only.",
  "Make sure your wallet has enough test ETH for the room entry.",
  "Open High Stakes Lab, join the room code shared by the host, and confirm the lock in AGW.",
  "Select a team only after your entry lock is confirmed.",
  "Play the match to completion and report any visible error with the public tx link if one exists."
];

const HOST_STEPS = [
  "Create the room with the smallest test entry first.",
  "Share the room code and tester steps before asking players to join.",
  "Wait for all players to show locked before starting the clean pass run.",
  "Use Recent Indexed Events to confirm EntryLocked events when there is doubt.",
  "After the match, verify Match History, Account Activity, and indexed events before marking the cycle passed."
];

export function BetaTesterHandoffPanel() {
  const [copyNote, setCopyNote] = useState("");

  async function copyTesterSteps() {
    await copyLines("Tester instructions copied.", [
      "Closed Beta Tester Instructions",
      `Environment: ${appConfig.chainEnv} / ${appConfig.chainId}`,
      "",
      ...TESTER_STEPS.map((step, index) => `${index + 1}. ${step}`)
    ]);
  }

  async function copyHostSteps() {
    await copyLines("Host instructions copied.", [
      "Closed Beta Host Instructions",
      `Environment: ${appConfig.chainEnv} / ${appConfig.chainId}`,
      "",
      ...HOST_STEPS.map((step, index) => `${index + 1}. ${step}`)
    ]);
  }

  async function copyLines(successMessage, lines) {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote(successMessage);
    } catch {
      setCopyNote("Copy failed. Select the instructions manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Tester handoff</strong>
      <p className="data-subtitle">Copy clean instructions before each closed-beta cycle so testers do not improvise the lock flow.</p>
      <div className="data-list compact-detail-list">
        <article className="mini-data-card">
          <strong>Tester steps</strong>
          <ol className="audit-line-list">{TESTER_STEPS.map((step) => <li key={step}>{step}</li>)}</ol>
        </article>
        <article className="mini-data-card">
          <strong>Host steps</strong>
          <ol className="audit-line-list">{HOST_STEPS.map((step) => <li key={step}>{step}</li>)}</ol>
        </article>
      </div>
      <button className="secondary-btn" type="button" onClick={copyTesterSteps}>Copy Tester Instructions</button>
      <button className="secondary-btn" type="button" onClick={copyHostSteps}>Copy Host Instructions</button>
      {copyNote && <p className="data-subtitle">{copyNote}</p>}
    </section>
  );
}
