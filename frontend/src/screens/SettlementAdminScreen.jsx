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

export function SettlementAdminScreen({ onBack }) {
  const { address } = useAccount();
  const publicClient = useMemo(() => createPublicClient({ chain: abstractChain, transport: http(appConfig.rpcUrl) }), []);
  const [state, setState] = useState(EMPTY_STATE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ownerMatches = state.owner && address && state.owner.toLowerCase() === address.toLowerCase();

  useEffect(() => {
    refreshVaultState();
  }, [publicClient]);

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

  async function readVault(functionName, fallback) {
    try {
      return await publicClient.readContract({ address: ETH_VAULT_ADDRESS, abi: ethVaultAbi, functionName });
    } catch {
      return fallback;
    }
  }

  return (
    <section className="screen">
      <div className="card">
        <h1>Settlement Admin</h1>
        <p className="note">Read-only vault dashboard. No game settings are changed from this screen.</p>

        <div className="rules-panel">
          <strong>Network</strong><span>{appConfig.isMainnet ? "Abstract Mainnet" : "Abstract Testnet"}</span>
          <strong>Vault</strong><span>{ETH_VAULT_ADDRESS || "Not configured"}</span>
          <strong>Connected wallet</strong><span>{address || "Not connected"}</span>
          <strong>Vault owner</strong><span>{state.owner || "Reading from chain..."}</span>
          <strong>Owner connected</strong><span>{ownerMatches ? "Yes" : "No"}</span>
          <strong>Game server</strong><span>{state.gameServer || "Reading from chain..."}</span>
          <strong>Max entry</strong><span>{formatEth(state.maxEntryAmount)} ETH</span>
          <strong>Active locks</strong><span>{String(state.activeLocks)} / {String(state.maxActiveLocks)}</span>
          <strong>Lock timeout</strong><span>{String((state.defaultLockTimeout || 0n) / 60n)} minutes</span>
          <strong>Deposits paused</strong><span>{state.depositsPaused ? "Yes" : "No"}</span>
          <strong>New locks paused</strong><span>{state.locksPaused ? "Yes" : "No"}</span>
          <strong>Settlement paused</strong><span>{state.settlementPaused ? "Yes" : "No"}</span>
          <strong>Balance exits paused</strong><span>{state.exitsPaused ? "Yes" : "No"}</span>
        </div>

        <button className="secondary-btn" disabled={busy} onClick={refreshVaultState}>{busy ? "Refreshing..." : "Refresh Vault State"}</button>
        {error && <p className="error">{error}</p>}
        <button className="secondary-btn" disabled={busy} onClick={onBack}>Back To Hub</button>
      </div>
    </section>
  );
}

function formatEth(value) {
  try { return trimEth(formatEther(value || 0n)); } catch { return "0"; }
}

function trimEth(value) {
  const [whole, decimal = ""] = String(value || "0").split(".");
  const cleanDecimal = decimal.slice(0, 6).replace(/0+$/, "");
  return cleanDecimal ? `${whole}.${cleanDecimal}` : whole;
}
