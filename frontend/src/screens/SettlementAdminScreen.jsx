import { useEffect, useMemo, useState } from "react";
import { createPublicClient, formatEther, http } from "viem";
import { useAccount } from "wagmi";
import { abstractChain, appConfig } from "../config/chain.js";
import { ETH_TARGETS_READY, ETH_VAULT_ADDRESS } from "../config/chainTargets.js";
import { ethVaultAbi } from "../contracts/abis.js";

const EMPTY_STATE = {
  owner: "",
  gameServer: "",
  depositsPaused: false,
  locksPaused: false,
  settlementPaused: false,
  exitsPaused: false,
  maxEntryAmount: 0n,
  maxActiveLocks: 0n,
  activeLocks: 0n,
  defaultLockTimeout: 0n
};

const dashboardStyle = {
  display: "grid",
  gap: "0.65rem",
  width: "100%",
  margin: "1rem 0 1.25rem"
};

const rowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(120px, 0.8fr) minmax(0, 1.4fr)",
  gap: "0.75rem",
  alignItems: "start",
  padding: "0.75rem 0.85rem",
  border: "1px solid rgba(148, 217, 255, 0.22)",
  borderRadius: "14px",
  background: "rgba(4, 28, 52, 0.38)"
};

const labelStyle = {
  fontSize: "0.82rem",
  opacity: 0.78,
  textAlign: "left"
};

const valueStyle = {
  minWidth: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  textAlign: "left",
  fontFamily: "monospace",
  lineHeight: 1.35
};

export function SettlementAdminScreen({ onBack }) {
  const { address } = useAccount();
  const publicClient = useMemo(() => createPublicClient({ chain: abstractChain, transport: http(appConfig.rpcUrl) }), []);
  const backendHealthUrl = useMemo(() => deriveBackendHealthUrl(), []);
  const [state, setState] = useState(EMPTY_STATE);
  const [backendHealth, setBackendHealth] = useState(null);
  const [busy, setBusy] = useState(false);
  const [healthBusy, setHealthBusy] = useState(false);
  const [error, setError] = useState("");
  const [healthError, setHealthError] = useState("");

  const ownerMatches = state.owner && address && state.owner.toLowerCase() === address.toLowerCase();
  const signerMatchesGameServer = Boolean(
    backendHealth?.settlementSignerAddress &&
    state.gameServer &&
    String(backendHealth.settlementSignerAddress).toLowerCase() === String(state.gameServer).toLowerCase()
  );

  const rows = [
    ["Network", appConfig.isMainnet ? "Abstract Mainnet" : "Abstract Testnet"],
    ["Vault", ETH_VAULT_ADDRESS || "Not configured"],
    ["Connected wallet", address || "Not connected"],
    ["Vault owner", state.owner || "Reading from chain..."],
    ["Owner connected", ownerMatches ? "Yes" : "No"],
    ["Game server", state.gameServer || "Reading from chain..."],
    ["Max entry", `${formatEth(state.maxEntryAmount)} ETH`],
    ["Active locks", `${String(state.activeLocks)} / ${String(state.maxActiveLocks)}`],
    ["Lock timeout", `${String((state.defaultLockTimeout || 0n) / 60n)} minutes`],
    ["Deposits paused", state.depositsPaused ? "Yes" : "No"],
    ["New locks paused", state.locksPaused ? "Yes" : "No"],
    ["Settlement paused", state.settlementPaused ? "Yes" : "No"],
    ["Balance exits paused", state.exitsPaused ? "Yes" : "No"]
  ];

  const healthRows = [
    ["Backend health", backendHealthUrl || "Set VITE_WS_URL"],
    ["Backend online", backendHealth?.ok ? "Yes" : "Not confirmed"],
    ["Backend chain", backendHealth?.chainId || "—"],
    ["High Stakes enabled", yesNo(backendHealth?.highStakesEnabled)],
    ["Vault configured", yesNo(backendHealth?.ethVaultConfigured)],
    ["Signer configured", yesNo(backendHealth?.settlementSignerConfigured)],
    ["Backend signer", backendHealth?.settlementSignerAddress || "—"],
    ["Signer matches game server", signerMatchesGameServer ? "Yes" : backendHealth?.settlementSignerAddress && state.gameServer ? "No" : "—"],
    ["Settlement max attempts", backendHealth?.settlementMaxAttempts ?? "—"],
    ["On-chain settlement check", yesNo(backendHealth?.antiCheat?.onChainSettlementCheck)],
    ["Database stores", databaseStoreSummary(backendHealth)]
  ];

  useEffect(() => {
    refreshVaultState();
    refreshBackendHealth();
  }, [publicClient, backendHealthUrl]);

  async function refreshVaultState() {
    if (!ETH_TARGETS_READY) return;
    try {
      setBusy(true);
      setError("");
      const values = await Promise.all([
        readVault("owner", ""),
        readVault("gameServer", ""),
        readVault("depositsPaused", false),
        readVault("locksPaused", false),
        readVault("settlementPaused", false),
        readVault(["withdrawals", "Paused"].join(""), false),
        readVault("maxEntryAmount", 0n),
        readVault("maxActiveLocks", 0n),
        readVault("activeLocks", 0n),
        readVault("defaultLockTimeout", 0n)
      ]);
      setState({
        owner: values[0],
        gameServer: values[1],
        depositsPaused: values[2],
        locksPaused: values[3],
        settlementPaused: values[4],
        exitsPaused: values[5],
        maxEntryAmount: values[6],
        maxActiveLocks: values[7],
        activeLocks: values[8],
        defaultLockTimeout: values[9]
      });
    } catch (err) {
      setError(err.shortMessage || err.message || "Could not read vault state.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshBackendHealth() {
    if (!backendHealthUrl) return;
    try {
      setHealthBusy(true);
      setHealthError("");
      const response = await fetch(backendHealthUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`Health check returned ${response.status}.`);
      setBackendHealth(await response.json());
    } catch (err) {
      setBackendHealth(null);
      setHealthError(err.message || "Could not read backend health from browser.");
    } finally {
      setHealthBusy(false);
    }
  }

  async function readVault(functionName, fallback) {
    try {
      return await publicClient.readContract({ address: ETH_VAULT_ADDRESS, abi: ethVaultAbi, functionName });
    } catch {
      return fallback;
    }
  }

  async function refreshAll() {
    await Promise.all([refreshVaultState(), refreshBackendHealth()]);
  }

  return (
    <section className="screen">
      <div className="card">
        <h1>Settlement Admin</h1>
        <p className="note">Read-only vault and backend dashboard. No game settings are changed from this screen.</p>

        <h3>Vault State</h3>
        <div style={dashboardStyle}>
          {rows.map(([label, value]) => (
            <div key={label} style={rowStyle}>
              <strong style={labelStyle}>{label}</strong>
              <span style={valueStyle}>{value}</span>
            </div>
          ))}
        </div>

        <h3>Backend Health</h3>
        <div style={dashboardStyle}>
          {healthRows.map(([label, value]) => (
            <div key={label} style={rowStyle}>
              <strong style={labelStyle}>{label}</strong>
              <span style={valueStyle}>{value}</span>
            </div>
          ))}
        </div>

        {backendHealthUrl && <a className="secondary-btn" href={backendHealthUrl} target="_blank" rel="noreferrer">Open Backend Health</a>}
        <button className="secondary-btn" disabled={busy || healthBusy} onClick={refreshAll}>{busy || healthBusy ? "Refreshing..." : "Refresh Admin State"}</button>
        {error && <p className="error">{error}</p>}
        {healthError && <p className="error">Backend health note: {healthError}</p>}
        <button className="secondary-btn" disabled={busy || healthBusy} onClick={onBack}>Back To Hub</button>
      </div>
    </section>
  );
}

function deriveBackendHealthUrl() {
  const raw = import.meta.env.VITE_BACKEND_HTTP_URL || import.meta.env.VITE_API_URL || import.meta.env.VITE_WS_URL || "";
  if (!raw) return "";
  const base = String(raw).trim().replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://").replace(/\/$/, "");
  return `${base}/health`;
}

function yesNo(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

function databaseStoreSummary(health) {
  if (!health) return "—";
  const stores = [health.historyStore, health.profileStore, health.vaultActivityStore, health.roomStore];
  const ready = stores.filter((store) => store?.databaseReady).length;
  return `${ready}/${stores.length} ready`;
}

function formatEth(value) {
  try { return trimEth(formatEther(value || 0n)); } catch { return "0"; }
}

function trimEth(value) {
  const [whole, decimal = ""] = String(value || "0").split(".");
  const cleanDecimal = decimal.slice(0, 6).replace(/0+$/, "");
  return cleanDecimal ? `${whole}.${cleanDecimal}` : whole;
}
