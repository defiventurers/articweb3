import { useState } from "react";
import { useAccount } from "wagmi";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import { abstractTestnet } from "viem/chains";
import { isAddress } from "viem";
import { ETH_GAME_ESCROW_ABI, ETH_GAME_ESCROW_BYTECODE } from "../contracts/ethGameEscrowArtifact.js";
import "../styles/vaultDeployer.css";

export function EthVaultDeployerScreen({ onBack }) {
  const { address, isConnected } = useAccount();
  const { data: agwClient } = useAbstractClient();
  const [gameServerAddress, setGameServerAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [vaultAddress, setVaultAddress] = useState("");
  const [error, setError] = useState("");

  const selectedGameServer = gameServerAddress.trim() || address || "";
  const ready = Boolean(ETH_GAME_ESCROW_BYTECODE && ETH_GAME_ESCROW_BYTECODE.startsWith("0x"));
  const gameServerReady = isAddress(selectedGameServer);
  const envText = vaultAddress ? `VITE_ETH_VAULT_ADDRESS=${vaultAddress}` : "";

  async function deployEthVault() {
    if (!isConnected || !address || !agwClient) return setError("Connect AGW first.");
    if (!ready) return setError("Bytecode missing. Build the frontend artifact first.");
    if (!gameServerReady) return setError("Game server must be a valid address.");

    try {
      setBusy(true);
      setError("");
      setTxHash("");
      setVaultAddress("");

      const hash = await agwClient.deployContract({
        abi: ETH_GAME_ESCROW_ABI,
        bytecode: ETH_GAME_ESCROW_BYTECODE,
        chain: abstractTestnet,
        account: agwClient.account,
        args: [selectedGameServer]
      });

      setTxHash(hash);
      setError("Submitted. After confirmation, paste the created contract address below.");
    } catch (err) {
      setError(err.shortMessage || err.message || "Deploy failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copyEnv() {
    if (envText) await navigator.clipboard.writeText(envText);
  }

  return (
    <section className="vault-deployer-page">
      <div className="vault-deployer-card">
        <h1>Deploy ETH Vault</h1>
        <p className="vault-note">This deploys the native ETH escrow from your connected AGW.</p>

        <div className="vault-row">
          <span>Connected AGW</span>
          <strong>{address || "Not connected"}</strong>
        </div>

        <label className="vault-label">
          Game server address
          <input value={gameServerAddress} placeholder={address || "0x..."} onChange={(event) => setGameServerAddress(event.target.value)} />
        </label>

        {!ready && <p className="vault-error">Run: cd contracts && npm run build:frontend-artifact</p>}

        <button className="vault-primary" disabled={busy || !isConnected || !ready || !gameServerReady} onClick={deployEthVault}>
          {busy ? "Deploying..." : "Deploy ETH Vault"}
        </button>

        {txHash && (
          <div className="vault-result">
            <span>Transaction hash</span>
            <strong>{txHash}</strong>
          </div>
        )}

        <label className="vault-label">
          Paste deployed ETH vault address
          <input value={vaultAddress} placeholder="0x..." onChange={(event) => setVaultAddress(event.target.value)} />
        </label>

        {envText && (
          <div className="vault-env-box">
            <pre>{envText}</pre>
            <button className="vault-secondary" onClick={copyEnv}>Copy Env Var</button>
          </div>
        )}

        {error && <p className="vault-error">{error}</p>}
        <button className="vault-secondary" onClick={onBack}>Back</button>
      </div>
    </section>
  );
}
