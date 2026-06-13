import { useEffect, useMemo, useState } from "react";
import { createPublicClient, http, isAddress } from "viem";
import { useAccount } from "wagmi";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import { ETH_TARGETS_READY, ETH_VAULT_ADDRESS } from "../config/chainTargets.js";
import { ethVaultAbi } from "../contracts/abis.js";

const ABSTRACT_TESTNET = {
  id: 11124,
  name: "Abstract Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_ABSTRACT_RPC_URL || "https://api.testnet.abs.xyz"] }
  }
};

export function SettlementAdminScreen({ onBack }) {
  const { address } = useAccount();
  const { data: abstractClient } = useAbstractClient();
  const publicClient = useMemo(
    () => createPublicClient({ chain: ABSTRACT_TESTNET, transport: http(ABSTRACT_TESTNET.rpcUrls.default.http[0]) }),
    []
  );
  const [serverWallet, setServerWallet] = useState(import.meta.env.VITE_SETTLEMENT_WALLET_ADDRESS || "");
  const [owner, setOwner] = useState("");
  const [gameServer, setGameServer] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const connectedWallet = address || "";
  const ownerMatches = owner && connectedWallet && owner.toLowerCase() === connectedWallet.toLowerCase();

  useEffect(() => {
    refreshVaultAdmin();
  }, [publicClient]);

  async function refreshVaultAdmin() {
    if (!ETH_TARGETS_READY) return;
    try {
      setError("");
      const currentOwner = await publicClient.readContract({
        address: ETH_VAULT_ADDRESS,
        abi: ethVaultAbi,
        functionName: "owner"
      });
      const currentGameServer = await publicClient.readContract({
        address: ETH_VAULT_ADDRESS,
        abi: ethVaultAbi,
        functionName: "gameServer"
      });
      setOwner(currentOwner);
      setGameServer(currentGameServer);
    } catch (err) {
      setError(err.shortMessage || err.message || "Could not read vault admin state.");
    }
  }

  async function setSettlementServer() {
    const target = serverWallet.trim();
    if (!isAddress(target)) {
      setError("Paste the fresh backend wallet public address.");
      return;
    }
    if (!abstractClient) {
      setError("Connect the vault-owner AGW first.");
      return;
    }
    if (!ETH_TARGETS_READY) {
      setError("ETH vault address is not configured.");
      return;
    }
    if (owner && connectedWallet && !ownerMatches) {
      setError("Wrong connected wallet. Connect the vault-owner AGW, then paste the backend wallet address here.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      setStatus("Open AGW and approve the game server update.");
      const txHash = await abstractClient.writeContract({
        address: ETH_VAULT_ADDRESS,
        abi: ethVaultAbi,
        functionName: "setGameServer",
        args: [target]
      });
      setStatus(`Submitted ${shortHash(txHash)}. Refreshing vault state...`);
      await delay(3500);
      await refreshVaultAdmin();
      setStatus("Backend settlement wallet set. Put that wallet private key in Render only.");
    } catch (err) {
      setError(err.shortMessage || err.message || "Could not set backend settlement wallet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="screen">
      <div className="card">
        <h1>Settlement Admin</h1>

        <div className="rules-panel">
          <strong>Vault</strong>
          <span>{ETH_VAULT_ADDRESS || "Not configured"}</span>
          <strong>Connected wallet</strong>
          <span>{connectedWallet || "Not connected"}</span>
          <strong>Vault owner</strong>
          <span>{owner || "Reading from chain..."}</span>
          <strong>Current game server</strong>
          <span>{gameServer || "Reading from chain..."}</span>
        </div>

        {owner && connectedWallet && !ownerMatches && (
          <p className="error">
            Wrong connected wallet. Switch to the vault-owner AGW before setting the backend wallet.
          </p>
        )}

        <p className="note">
          Connect the vault-owner AGW. Paste the fresh backend wallet address below. Do not connect as the backend wallet here.
        </p>

        <input
          className="input"
          value={serverWallet}
          placeholder="Fresh backend wallet public address"
          onChange={(event) => {
            setServerWallet(event.target.value.trim());
            setError("");
          }}
        />

        <button className="primary-btn" disabled={busy || !ETH_TARGETS_READY || Boolean(owner && connectedWallet && !ownerMatches)} onClick={setSettlementServer}>
          {busy ? "Updating..." : "Set Backend Settlement Wallet"}
        </button>

        <button className="secondary-btn" disabled={busy} onClick={refreshVaultAdmin}>
          Refresh Vault State
        </button>

        {status && <p className="note">{status}</p>}
        {error && <p className="error">{error}</p>}

        <div className="rules-panel">
          <strong>Render env after this</strong>
          <span>ETH_SETTLEMENT_SIGNER = private key for the backend wallet</span>
          <span>ETH_VAULT_ADDRESS = this same upgraded vault address</span>
          <span>HIGH_STAKES_ENABLED = true</span>
        </div>

        <button className="secondary-btn" disabled={busy} onClick={onBack}>Back To Hub</button>
      </div>
    </section>
  );
}

function shortHash(value) {
  if (!value) return "";
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
