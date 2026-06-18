import { useEffect, useState } from "react";
import { appConfig } from "../config/chain.js";
import { ETH_VAULT_ADDRESS } from "../config/chainTargets.js";

const STORAGE_KEY = "artic.closedBeta.contractVerification.v1";
const DEFAULT_STATE = {
  chain: appConfig.chainEnv,
  vaultAddress: ETH_VAULT_ADDRESS || "",
  sourceStatus: "Not started",
  explorerStatus: "Not started",
  abiStatus: "Not checked",
  owner: "",
  evidenceLink: "",
  note: ""
};
const STATUSES = ["Not started", "Reviewing", "Submitted", "Verified", "Blocked"];
const ABI_STATUSES = ["Not checked", "Matches", "Mismatch", "N/A"];
const inputStyle = { width: "100%", minWidth: 0, padding: "0.45rem 0.55rem", borderRadius: "10px", border: "1px solid rgba(148, 217, 255, 0.22)", background: "rgba(4, 28, 52, 0.4)", color: "inherit" };

export function BetaContractVerificationPanel() {
  const [state, setState] = useState(() => loadState());
  const [copyNote, setCopyNote] = useState("");
  const ready = state.sourceStatus === "Verified" && state.explorerStatus === "Verified" && state.abiStatus === "Matches";

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
      "Contract Verification",
      `Status: ${ready ? "READY" : "HOLD"}`,
      `Chain: ${state.chain || "—"}`,
      `Vault address: ${state.vaultAddress || "—"}`,
      `Source status: ${state.sourceStatus}`,
      `Explorer status: ${state.explorerStatus}`,
      `ABI status: ${state.abiStatus}`,
      `Owner: ${state.owner || "—"}`,
      `Evidence link: ${state.evidenceLink || "—"}`,
      `Note: ${state.note || "—"}`
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("Verification summary copied.");
    } catch {
      setCopyNote("Copy failed. Select the summary manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Contract verification</strong>
      <p className="data-subtitle">Track explorer verification and ABI alignment before capped mainnet rehearsal.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Status: {ready ? "READY" : "HOLD"}</span>
        <span className="stat-chip">ABI: {state.abiStatus}</span>
      </div>
      <div className="data-list compact-detail-list">
        <article className="mini-data-card">
          <strong>Verification checks</strong>
          <input style={inputStyle} value={state.chain} onChange={(event) => update("chain", event.target.value)} placeholder="Chain" />
          <input style={inputStyle} value={state.vaultAddress} onChange={(event) => update("vaultAddress", event.target.value)} placeholder="Vault address" />
          <select style={inputStyle} value={state.sourceStatus} onChange={(event) => update("sourceStatus", event.target.value)}>{STATUSES.map((item) => <option key={item} value={item}>Source {item}</option>)}</select>
          <select style={inputStyle} value={state.explorerStatus} onChange={(event) => update("explorerStatus", event.target.value)}>{STATUSES.map((item) => <option key={item} value={item}>Explorer {item}</option>)}</select>
          <select style={inputStyle} value={state.abiStatus} onChange={(event) => update("abiStatus", event.target.value)}>{ABI_STATUSES.map((item) => <option key={item} value={item}>ABI {item}</option>)}</select>
          <input style={inputStyle} value={state.owner} onChange={(event) => update("owner", event.target.value)} placeholder="Owner" />
          <input style={inputStyle} value={state.evidenceLink} onChange={(event) => update("evidenceLink", event.target.value)} placeholder="Explorer evidence link" />
          <input style={inputStyle} value={state.note} onChange={(event) => update("note", event.target.value)} placeholder="Note" />
        </article>
      </div>
      <button className="secondary-btn" type="button" onClick={copySummary}>Copy Verification</button>
      <button className="secondary-btn" type="button" onClick={reset}>Reset Verification</button>
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
