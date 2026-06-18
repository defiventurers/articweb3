import { useEffect, useState } from "react";
import { appConfig } from "../config/chain.js";

const STORAGE_KEY = "artic.closedBeta.envCutover.v1";
const DEFAULT_STATE = {
  frontendEnv: "HOLD",
  backendEnv: "HOLD",
  rpcChecked: "No",
  explorerChecked: "No",
  vaultChecked: "No",
  owner: "",
  note: ""
};
const STATES = ["HOLD", "REVIEWING", "READY", "RETEST FIRST"];
const YES_NO = ["No", "Yes", "N/A"];
const inputStyle = { width: "100%", minWidth: 0, padding: "0.45rem 0.55rem", borderRadius: "10px", border: "1px solid rgba(148, 217, 255, 0.22)", background: "rgba(4, 28, 52, 0.4)", color: "inherit" };

export function BetaEnvCutoverPanel() {
  const [state, setState] = useState(() => loadState());
  const [copyNote, setCopyNote] = useState("");
  const ready = state.frontendEnv === "READY" && state.backendEnv === "READY" && state.rpcChecked === "Yes" && state.explorerChecked === "Yes" && state.vaultChecked === "Yes";

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  function update(key, value) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setState(DEFAULT_STATE);
    setCopyNote("");
  }

  async function copySummary() {
    const lines = [
      "Mainnet Environment Cutover",
      `Current app env: ${appConfig.chainEnv} / ${appConfig.chainId}`,
      `Status: ${ready ? "READY" : "HOLD"}`,
      `Frontend env: ${state.frontendEnv}`,
      `Backend env: ${state.backendEnv}`,
      `RPC checked: ${state.rpcChecked}`,
      `Explorer checked: ${state.explorerChecked}`,
      `Vault checked: ${state.vaultChecked}`,
      `Owner: ${state.owner || "—"}`,
      `Note: ${state.note || "—"}`
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("Environment cutover copied.");
    } catch {
      setCopyNote("Copy failed. Select the summary manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Mainnet environment cutover</strong>
      <p className="data-subtitle">Track whether frontend, backend, RPC, explorer, and vault configuration are ready for a capped rehearsal.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Status: {ready ? "READY" : "HOLD"}</span>
        <span className="stat-chip">Current env: {appConfig.chainEnv}</span>
      </div>
      <div className="data-list compact-detail-list">
        <article className="mini-data-card">
          <strong>Cutover checks</strong>
          <select style={inputStyle} value={state.frontendEnv} onChange={(event) => update("frontendEnv", event.target.value)}>{STATES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select style={inputStyle} value={state.backendEnv} onChange={(event) => update("backendEnv", event.target.value)}>{STATES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select style={inputStyle} value={state.rpcChecked} onChange={(event) => update("rpcChecked", event.target.value)}>{YES_NO.map((item) => <option key={item} value={item}>RPC {item}</option>)}</select>
          <select style={inputStyle} value={state.explorerChecked} onChange={(event) => update("explorerChecked", event.target.value)}>{YES_NO.map((item) => <option key={item} value={item}>Explorer {item}</option>)}</select>
          <select style={inputStyle} value={state.vaultChecked} onChange={(event) => update("vaultChecked", event.target.value)}>{YES_NO.map((item) => <option key={item} value={item}>Vault {item}</option>)}</select>
          <input style={inputStyle} value={state.owner} onChange={(event) => update("owner", event.target.value)} placeholder="Owner" />
          <input style={inputStyle} value={state.note} onChange={(event) => update("note", event.target.value)} placeholder="Note" />
        </article>
      </div>
      <button className="secondary-btn" type="button" onClick={copySummary}>Copy Env Cutover</button>
      <button className="secondary-btn" type="button" onClick={reset}>Reset Env Cutover</button>
      {copyNote && <p className="data-subtitle">{copyNote}</p>}
    </section>
  );
}

function loadState() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return parsed && typeof parsed === "object" ? { ...DEFAULT_STATE, ...parsed } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}
