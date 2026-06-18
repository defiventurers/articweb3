import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "artic.closedBeta.backendPreflight.v1";
const DEFAULT_TIMEOUT_MS = 9000;

export function BetaBackendPreflightPanel() {
  const backendBase = useMemo(() => getBackendBaseUrl(), []);
  const [preflight, setPreflight] = useState(() => loadStoredPreflight());
  const [status, setStatus] = useState(preflight ? "loaded" : "idle");
  const [error, setError] = useState("");
  const [copyNote, setCopyNote] = useState("");
  const failedGates = getFailedGates(preflight);

  useEffect(() => {
    refreshPreflight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshPreflight() {
    if (!backendBase) {
      setStatus("error");
      setError("Backend URL is not configured. Set VITE_BACKEND_HTTP_URL or VITE_WS_URL.");
      return;
    }
    setStatus("loading");
    setError("");
    setCopyNote("");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const response = await fetch(`${backendBase}/mainnet/preflight`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok || data?.ok === false) throw new Error(data?.error || `HTTP ${response.status}`);
      setPreflight(data);
      setStatus("loaded");
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ fetchedAt: Date.now(), backendBase, data }));
    } catch (err) {
      setStatus("error");
      setError(err.name === "AbortError" ? "Preflight request timed out." : err.message || "Preflight request failed.");
    } finally {
      clearTimeout(timer);
    }
  }

  async function copyReport() {
    const payload = {
      copiedAt: new Date().toISOString(),
      backendBase,
      status,
      error: error || null,
      preflight
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopyNote("Preflight report copied.");
    } catch {
      setCopyNote("Copy failed. Select the visible report manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Backend preflight</strong>
      <p className="data-subtitle">Live backend readiness from <code>/mainnet/preflight</code>. READY means capped internal rehearsal only.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Request: {status}</span>
        <span className="stat-chip">Readiness: {preflight?.readiness || "—"}</span>
        <span className="stat-chip">Failed gates: {failedGates.length}</span>
      </div>

      {error && <p className="data-subtitle">{error}</p>}

      {preflight && (
        <div className="data-list compact-detail-list">
          <article className="mini-data-card">
            <strong>Chain</strong>
            <span>Env: {preflight.chain?.env || "—"}</span>
            <span>Chain ID: {preflight.chain?.chainId || "—"}</span>
            <span>Mainnet: {preflight.chain?.isMainnet ? "Yes" : "No"}</span>
          </article>
          <article className="mini-data-card">
            <strong>RPC</strong>
            <span>Status: {preflight.rpc?.ok ? "OK" : "Issue"}</span>
            <span>Latest block: {preflight.rpc?.latestBlock ?? "—"}</span>
            <span>Chain match: {preflight.rpc?.chainMatches ? "Yes" : "No"}</span>
          </article>
          <article className="mini-data-card">
            <strong>Vault & signer</strong>
            <span>Vault: {preflight.vault?.usableAddress ? shortAddress(preflight.vault.address) : "Issue"}</span>
            <span>Signer: {preflight.settlementSigner?.valid ? shortAddress(preflight.settlementSigner.address) : "Issue"}</span>
            <span>High Stakes: {preflight.highStakes?.enabled ? "Enabled" : "Disabled"}</span>
          </article>
          <article className="mini-data-card">
            <strong>Database & indexer</strong>
            <span>DB: {preflight.database?.databaseReady ? "Ready" : "Issue"}</span>
            <span>Indexer runs: {preflight.indexer?.totalRuns ?? 0}</span>
            <span>Indexed events: {preflight.indexer?.totalIndexed ?? 0}</span>
          </article>
          <article className="mini-data-card">
            <strong>Failed gates</strong>
            {failedGates.length ? failedGates.map((gate) => <span key={gate}>{gate}</span>) : <span>None</span>}
          </article>
        </div>
      )}

      <button className="secondary-btn" type="button" onClick={refreshPreflight}>Refresh Preflight</button>
      <button className="secondary-btn" type="button" onClick={copyReport}>Copy Preflight Report</button>
      {copyNote && <p className="data-subtitle">{copyNote}</p>}
    </section>
  );
}

function getFailedGates(preflight) {
  if (!preflight?.gates) return [];
  return Object.entries(preflight.gates).filter(([, value]) => !value).map(([key]) => key);
}

function getBackendBaseUrl() {
  const raw = import.meta.env.VITE_BACKEND_HTTP_URL || import.meta.env.VITE_API_URL || import.meta.env.VITE_WS_URL || "https://articweb3.onrender.com";
  let base = String(raw || "").trim();
  if (base.startsWith("wss://")) base = "https://" + base.slice(6);
  if (base.startsWith("ws://")) base = "http://" + base.slice(5);
  return base.replace(/\/$/, "");
}

function shortAddress(value) {
  const text = String(value || "");
  return text.length > 12 ? `${text.slice(0, 6)}...${text.slice(-4)}` : text || "—";
}

function loadStoredPreflight() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return parsed?.data || null;
  } catch {
    return null;
  }
}
