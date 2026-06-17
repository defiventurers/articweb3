import { appConfig } from "../config/chain.js";
import { ETH_TARGETS_READY, ETH_VAULT_ADDRESS } from "../config/chainTargets.js";

const gridStyle = {
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

export function SystemCheckPanel({ vaultState, backendHealth, signerMatchesGameServer }) {
  const backendOnline = Boolean(backendHealth?.ok);
  const chainMatches = backendHealth?.chainId === appConfig.chainId;
  const storesReady = allStoresReady(backendHealth);
  const capacityReady = BigInt(vaultState?.maxActiveLocks || 0n) > 0n && BigInt(vaultState?.activeLocks || 0n) < BigInt(vaultState?.maxActiveLocks || 0n);
  const entryOpen = !vaultState?.depositsPaused && !vaultState?.locksPaused;

  const rows = [
    ["Frontend chain", check(appConfig.chainId === (appConfig.isMainnet ? 2741 : 11124), `chain ${appConfig.chainId}`)],
    ["Backend chain", check(chainMatches, backendHealth?.chainId ? `backend ${backendHealth.chainId}` : "not read")],
    ["Vault target", check(ETH_TARGETS_READY && Boolean(ETH_VAULT_ADDRESS), ETH_VAULT_ADDRESS || "missing")],
    ["Backend online", check(backendOnline, backendOnline ? "online" : "not confirmed")],
    ["Signer alignment", check(signerMatchesGameServer, signerMatchesGameServer ? "matches game server" : "check signer")],
    ["Database stores", check(storesReady, databaseStoreSummary(backendHealth))],
    ["Room capacity", check(capacityReady, `${String(vaultState?.activeLocks || 0n)} / ${String(vaultState?.maxActiveLocks || 0n)} active locks`)],
    ["Entry flow", check(entryOpen, entryOpen ? "open" : "paused")]
  ];

  return (
    <>
      <h3>System Checks</h3>
      <div style={gridStyle}>
        {rows.map(([label, value]) => (
          <div key={label} style={rowStyle}>
            <strong style={labelStyle}>{label}</strong>
            <span style={valueStyle}>{value}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function check(ok, detail) {
  return `${ok ? "Ready" : "Check"} · ${detail}`;
}

function allStoresReady(health) {
  if (!health) return false;
  const stores = [health.historyStore, health.profileStore, health.vaultActivityStore, health.roomStore];
  return stores.length > 0 && stores.every((store) => store?.databaseReady);
}

function databaseStoreSummary(health) {
  if (!health) return "not read";
  const stores = [health.historyStore, health.profileStore, health.vaultActivityStore, health.roomStore];
  const ready = stores.filter((store) => store?.databaseReady).length;
  return `${ready}/${stores.length} ready`;
}
