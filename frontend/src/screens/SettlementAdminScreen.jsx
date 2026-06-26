import { useEffect, useMemo, useState } from "react";
import { createPublicClient, formatEther, http } from "viem";
import { useAccount } from "wagmi";
import { RecentSyncEventsPanel } from "../components/RecentSyncEventsPanel.jsx";
import { SyncStatusPanel } from "../components/SyncStatusPanel.jsx";
import { SystemCheckPanel } from "../components/SystemCheckPanel.jsx";
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

const dashboardStyle = { display: "grid", gap: "0.65rem", width: "100%", margin: "1rem 0 1.25rem" };
const twoColStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem", width: "100%", margin: "1rem 0" };
const rowStyle = { display: "grid", gridTemplateColumns: "minmax(120px, 0.8fr) minmax(0, 1.4fr)", gap: "0.75rem", alignItems: "start", padding: "0.75rem 0.85rem", border: "1px solid rgba(148, 217, 255, 0.22)", borderRadius: "14px", background: "rgba(4, 28, 52, 0.38)" };
const cardStyle = { padding: "0.85rem", border: "1px solid rgba(148, 217, 255, 0.22)", borderRadius: "16px", background: "rgba(4, 28, 52, 0.38)", minWidth: 0 };
const labelStyle = { fontSize: "0.82rem", opacity: 0.78, textAlign: "left" };
const valueStyle = { minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word", textAlign: "left", fontFamily: "monospace", lineHeight: 1.35 };
const inputStyle = { width: "100%", padding: "0.7rem 0.85rem", borderRadius: "12px", border: "1px solid rgba(148, 217, 255, 0.24)", background: "rgba(4, 28, 52, 0.5)", color: "inherit", margin: "0.45rem 0" };
const monoBlockStyle = { ...valueStyle, display: "block", maxHeight: 260, overflow: "auto", whiteSpace: "pre-wrap", padding: "0.75rem", borderRadius: "12px", background: "rgba(0, 12, 28, 0.48)" };

export function SettlementAdminScreen({ onBack }) {
  const { address } = useAccount();
  const publicClient = useMemo(() => createPublicClient({ chain: abstractChain, transport: http(appConfig.rpcUrl) }), []);
  const backendHealthUrl = useMemo(() => deriveBackendHealthUrl(), []);
  const baseUrl = useMemo(() => backendHealthUrl.replace(/\/health$/, ""), [backendHealthUrl]);
  const [state, setState] = useState(EMPTY_STATE);
  const [backendHealth, setBackendHealth] = useState(null);
  const [preflight, setPreflight] = useState(null);
  const [tiers, setTiers] = useState(null);
  const [indexerHealth, setIndexerHealth] = useState(null);
  const [indexerStats, setIndexerStats] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [settlementRooms, setSettlementRooms] = useState([]);
  const [debugPacket, setDebugPacket] = useState(null);
  const [selectedContractMatchId, setSelectedContractMatchId] = useState("");
  const [operatorKey, setOperatorKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [healthBusy, setHealthBusy] = useState(false);
  const [opsBusy, setOpsBusy] = useState(false);
  const [error, setError] = useState("");
  const [healthError, setHealthError] = useState("");
  const [opsError, setOpsError] = useState("");

  const ownerMatches = state.owner && address && state.owner.toLowerCase() === address.toLowerCase();
  const signerMatchesGameServer = Boolean(backendHealth?.settlementSignerAddress && state.gameServer && String(backendHealth.settlementSignerAddress).toLowerCase() === String(state.gameServer).toLowerCase());
  const failedRooms = settlementRooms.filter((room) => room.reviewNeeded || ["failed", "needs_settlement_review", "needs_settlement_signer", "needs_game_server_update"].includes(room.settlementStatus));
  const activeHighStakesRooms = settlementRooms.filter((room) => room.status !== "finished" || ["pending", "submitted", "settlement_pending", "submitting"].includes(room.settlementStatus));
  const rehearsal = getRehearsalStatus(settlementRooms, recentEvents, tiers);

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

  const preflightRows = [
    ["Preflight", preflight?.ok ? "PASS" : preflight ? "FAIL" : "Not loaded"],
    ["Chain", preflight?.chainName || preflight?.chain || preflight?.chainId || "—"],
    ["Vault", preflight?.vaultAddress || preflight?.ethVaultAddress || ETH_VAULT_ADDRESS || "—"],
    ["Signer configured", yesNo(preflight?.settlementSignerConfigured)],
    ["Signer matches gameServer", yesNo(preflight?.signerMatchesGameServer)],
    ["Game server", preflight?.gameServer || "—"],
    ["Error", preflight?.error || "—"]
  ];

  const indexerRows = [
    ["Indexer", indexerHealth?.running ? "Running" : indexerHealth ? "Idle" : "Not loaded"],
    ["Total runs", indexerHealth?.totalRuns ?? "—"],
    ["Total indexed", indexerHealth?.totalIndexed ?? indexerStats?.totalEvents ?? "—"],
    ["Latest block", indexerStats?.latestBlock ?? indexerHealth?.lastRun?.latest ?? "—"],
    ["Unique players", indexerStats?.uniquePlayers ?? "—"],
    ["Database ready", yesNo(indexerStats?.store?.databaseReady ?? indexerHealth?.store?.databaseReady)],
    ["Last error", indexerHealth?.lastError || indexerStats?.store?.databaseError || "—"]
  ];

  useEffect(() => {
    refreshAll();
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
      setState({ owner: values[0], gameServer: values[1], depositsPaused: values[2], locksPaused: values[3], settlementPaused: values[4], exitsPaused: values[5], maxEntryAmount: values[6], maxActiveLocks: values[7], activeLocks: values[8], defaultLockTimeout: values[9] });
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

  async function refreshOpsData() {
    if (!baseUrl) return;
    try {
      setOpsBusy(true);
      setOpsError("");
      const [preflightPayload, tiersPayload, indexerHealthPayload, indexerStatsPayload, eventsPayload] = await Promise.all([
        fetchJson(`${baseUrl}/mainnet/preflight`).catch((err) => ({ ok: false, error: err.message })),
        fetchJson(`${baseUrl}/high-stakes/tiers`).catch((err) => ({ ok: false, error: err.message, tiers: [] })),
        fetchJson(`${baseUrl}/indexer/health`).catch((err) => ({ ok: false, error: err.message })),
        fetchJson(`${baseUrl}/indexer/stats`).catch((err) => ({ ok: false, error: err.message, stats: null })),
        fetchJson(`${baseUrl}/indexer/events?limit=25`).catch((err) => ({ ok: false, error: err.message, events: [] }))
      ]);
      setPreflight(preflightPayload);
      setTiers(tiersPayload);
      setIndexerHealth(indexerHealthPayload);
      setIndexerStats(indexerStatsPayload.stats || indexerStatsPayload);
      setRecentEvents(Array.isArray(eventsPayload.events) ? eventsPayload.events : []);

      if (operatorKey.trim()) await refreshSettlementRooms(operatorKey.trim(), false);
    } catch (err) {
      setOpsError(err.message || "Could not refresh operations dashboard.");
    } finally {
      setOpsBusy(false);
    }
  }

  async function refreshSettlementRooms(key = operatorKey.trim(), manageBusy = true) {
    if (!baseUrl) return;
    if (!key) {
      setOpsError("Paste SETTLEMENT_OPERATOR_KEY to load protected settlement rooms.");
      return;
    }
    try {
      if (manageBusy) setOpsBusy(true);
      setOpsError("");
      const payload = await fetchJson(`${baseUrl}/ops/settlement/rooms?key=${encodeURIComponent(key)}&includeAll=true&limit=50`);
      setSettlementRooms(Array.isArray(payload.rooms) ? payload.rooms : []);
    } catch (err) {
      setSettlementRooms([]);
      setOpsError(err.message || "Could not load protected settlement rooms.");
    } finally {
      if (manageBusy) setOpsBusy(false);
    }
  }

  async function loadDebugPacket(room) {
    if (!baseUrl || !operatorKey.trim()) {
      setOpsError("Paste SETTLEMENT_OPERATOR_KEY before opening a debug packet.");
      return;
    }
    const contractMatchId = room?.contractMatchId || selectedContractMatchId;
    if (!contractMatchId) {
      setOpsError("Select or paste a contract match id first.");
      return;
    }
    try {
      setOpsBusy(true);
      setOpsError("");
      const payload = await fetchJson(`${baseUrl}/ops/settlement/debug?key=${encodeURIComponent(operatorKey.trim())}&contractMatchId=${encodeURIComponent(contractMatchId)}`);
      setSelectedContractMatchId(contractMatchId);
      setDebugPacket(payload.debugPacket || payload);
    } catch (err) {
      setDebugPacket(null);
      setOpsError(err.message || "Could not load settlement debug packet.");
    } finally {
      setOpsBusy(false);
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
    await Promise.all([refreshVaultState(), refreshBackendHealth(), refreshOpsData()]);
  }

  return (
    <section className="screen">
      <div className="card">
        <h1>Operations Dashboard</h1>
        <p className="note">Read-only operator cockpit for mainnet preflight, tiers, indexer, settlement visibility, and rehearsal evidence. No game settings or contract state are changed here.</p>

        <SystemCheckPanel vaultState={state} backendHealth={backendHealth} signerMatchesGameServer={signerMatchesGameServer} />

        <h3>Phase 33 Snapshot</h3>
        <div style={twoColStyle}>
          <StatusCard title="Mainnet Preflight" value={preflight?.ok ? "PASS" : preflight ? "FAIL" : "—"} note={preflight?.error || preflight?.chainName || preflight?.chain || "Backend /mainnet/preflight"} danger={preflight && !preflight.ok} />
          <StatusCard title="Indexer" value={indexerHealth?.lastError ? "CHECK" : indexerHealth ? "OK" : "—"} note={`${indexerStats?.totalEvents ?? indexerHealth?.totalIndexed ?? "—"} indexed events`} danger={Boolean(indexerHealth?.lastError)} />
          <StatusCard title="Active High Stakes" value={String(activeHighStakesRooms.length)} note="rooms needing operator attention" danger={activeHighStakesRooms.length > 0} />
          <StatusCard title="Failed / Review" value={String(failedRooms.length)} note="settlement recovery candidates" danger={failedRooms.length > 0} />
          <StatusCard title="Rehearsal Evidence" value={rehearsal.status} note={rehearsal.note} danger={rehearsal.status === "FAIL"} />
          <StatusCard title="Tier Source" value={tiers?.source || "—"} note={tiers?.ethUsd ? `ETH $${Number(tiers.ethUsd).toFixed(2)}` : "dynamic tier endpoint"} danger={Boolean(tiers?.error)} />
        </div>

        <h3>Mainnet Preflight</h3>
        <Rows rows={preflightRows} />

        <h3>Dynamic High Stakes Tiers</h3>
        <div style={twoColStyle}>
          {normalizeTiers(tiers).map((tier) => (
            <div key={tier.code || tier.label} style={cardStyle}>
              <h4>{tier.label || `$${tier.entryFeeUsd || tier.code}`}</h4>
              <p style={valueStyle}>entryWei: {tier.entryWei || "0"}</p>
              <p className="note">USD target: {tier.entryFeeUsd || tier.code || "—"}</p>
            </div>
          ))}
          {!normalizeTiers(tiers).length && <p className="note">No tier data loaded yet.</p>}
        </div>

        <h3>Vault State</h3>
        <Rows rows={rows} />

        <h3>Backend Health</h3>
        <Rows rows={healthRows} />

        <h3>Indexer Status</h3>
        <Rows rows={indexerRows} />
        {indexerStats?.byEvent?.length ? <Rows rows={indexerStats.byEvent.map((item) => [item.eventName, `${item.count} event(s)`])} /> : null}

        <h3>Protected Settlement Rooms</h3>
        <p className="note">Paste the operator key only in your browser. It is used for this request and is not stored.</p>
        <input style={inputStyle} type="password" value={operatorKey} onChange={(event) => setOperatorKey(event.target.value)} placeholder="SETTLEMENT_OPERATOR_KEY" />
        <div>
          <button className="secondary-btn" disabled={opsBusy} onClick={() => refreshSettlementRooms()}>{opsBusy ? "Loading Rooms..." : "Load Settlement Rooms"}</button>
          <button className="secondary-btn" disabled={opsBusy} onClick={refreshOpsData}>{opsBusy ? "Refreshing Ops..." : "Refresh Ops Dashboard"}</button>
        </div>
        <div style={dashboardStyle}>
          {settlementRooms.length ? settlementRooms.map((room) => (
            <div key={room.contractMatchId || room.roomCode} style={rowStyle}>
              <strong style={labelStyle}>{room.roomCode || "Room"}</strong>
              <span style={valueStyle}>
                {room.status || "—"} / settlement {room.settlementStatus || "—"} / attempts {room.settlementAttempts ?? 0}<br />
                match {shortHash(room.contractMatchId)} / payout {room.payoutTotalWei || "0"} wei<br />
                {room.reviewNeeded ? "REVIEW NEEDED" : room.pendingTooLong ? "PENDING TOO LONG" : "No review flag"}
                <br />
                <button className="secondary-btn" disabled={opsBusy} onClick={() => loadDebugPacket(room)}>Copy Debug Packet</button>
              </span>
            </div>
          )) : <p className="note">No protected settlement rooms loaded yet.</p>}
        </div>

        <h3>Settlement Debug Packet</h3>
        <input style={inputStyle} value={selectedContractMatchId} onChange={(event) => setSelectedContractMatchId(event.target.value)} placeholder="Optional contract match id" />
        <button className="secondary-btn" disabled={opsBusy} onClick={() => loadDebugPacket(null)}>Load Debug Packet</button>
        {debugPacket ? <pre style={monoBlockStyle}>{JSON.stringify(debugPacket, null, 2)}</pre> : <p className="note">No debug packet loaded.</p>}

        <h3>Recent Vault Events</h3>
        <div style={dashboardStyle}>
          {recentEvents.length ? recentEvents.map((event) => (
            <div key={event.id || `${event.txHash}-${event.logIndex}`} style={rowStyle}>
              <strong style={labelStyle}>{event.eventName || "Event"}</strong>
              <span style={valueStyle}>block {event.blockNumber} / {event.player || event.matchId || "system"} / {event.amountWei || "0"} wei / {shortHash(event.txHash)}</span>
            </div>
          )) : <p className="note">No recent vault events loaded.</p>}
        </div>

        <SyncStatusPanel />
        <RecentSyncEventsPanel baseUrl={baseUrl} />

        {backendHealthUrl && <a className="secondary-btn" href={backendHealthUrl} target="_blank" rel="noreferrer">Open Backend Health</a>}
        {baseUrl && <a className="secondary-btn" href={`${baseUrl}/mainnet/preflight`} target="_blank" rel="noreferrer">Open Mainnet Preflight</a>}
        {baseUrl && <a className="secondary-btn" href={`${baseUrl}/high-stakes/tiers`} target="_blank" rel="noreferrer">Open Dynamic Tiers</a>}
        <button className="secondary-btn" disabled={busy || healthBusy || opsBusy} onClick={refreshAll}>{busy || healthBusy || opsBusy ? "Refreshing..." : "Refresh All"}</button>
        {error && <p className="error">Vault note: {error}</p>}
        {healthError && <p className="error">Backend health note: {healthError}</p>}
        {opsError && <p className="error">Ops note: {opsError}</p>}
        <button className="secondary-btn" disabled={busy || healthBusy || opsBusy} onClick={onBack}>Back To Hub</button>
      </div>
    </section>
  );
}

function Rows({ rows }) {
  return <div style={dashboardStyle}>{rows.map(([label, value]) => <div key={label} style={rowStyle}><strong style={labelStyle}>{label}</strong><span style={valueStyle}>{String(value)}</span></div>)}</div>;
}

function StatusCard({ title, value, note, danger }) {
  return <div style={{ ...cardStyle, borderColor: danger ? "rgba(255, 126, 126, 0.55)" : "rgba(148, 217, 255, 0.22)" }}><h4>{title}</h4><strong style={{ ...valueStyle, fontSize: "1.4rem" }}>{value}</strong><p className="note">{note}</p></div>;
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) throw new Error(payload.error || `${url} returned ${response.status}.`);
  return payload;
}

function deriveBackendHealthUrl() {
  const raw = import.meta.env.VITE_BACKEND_HTTP_URL || import.meta.env.VITE_API_URL || import.meta.env.VITE_WS_URL || "";
  if (!raw) return "";
  const base = String(raw).trim().replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://").replace(/\/$/, "");
  return `${base}/health`;
}

function normalizeTiers(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.tiers)) return payload.tiers;
  if (payload.tiers && typeof payload.tiers === "object") return Object.values(payload.tiers);
  return [];
}

function getRehearsalStatus(rooms, events, tiersPayload) {
  const tierEntries = new Set(normalizeTiers(tiersPayload).map((tier) => String(tier.entryWei || "0")));
  const settledRooms = rooms.filter((room) => ["settled", "submitted"].includes(room.settlementStatus));
  const indexedSettlement = events.find((event) => event.eventName === "MatchSettled");
  const roomWithFullPool = settledRooms.find((room) => tierEntries.has(String(BigInt(room.payoutTotalWei || "0") / 4n)) || Number(room.payoutTotalWei || 0) > 0);
  if (roomWithFullPool && indexedSettlement) return { status: "PASS", note: `room ${roomWithFullPool.roomCode || shortHash(roomWithFullPool.contractMatchId)} plus indexed settlement` };
  if (roomWithFullPool) return { status: "PARTIAL", note: "settled room found; indexer settlement not in latest events" };
  return { status: "PENDING", note: "load settlement rooms with operator key" };
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

function shortHash(value) {
  const text = String(value || "");
  return text.length > 14 ? `${text.slice(0, 8)}...${text.slice(-6)}` : text || "—";
}
