import { useState } from "react";
import { useAccount } from "wagmi";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import { isAddress } from "viem";
import { abstractChain, appConfig } from "../config/chain.js";
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
  const bytecodeReady = Boolean(ETH_GAME_ESCROW_BYTECODE && ETH_GAME_ESCROW_BYTECODE.startsWith("0x"));
  const artifactSafetyReady = hasFunction("maxEntryAmount") && hasFunction("refundExpiredEntry") && hasFunction("setDepositsPaused") && hasFunction("setSettlementPaused");
  const ready = bytecodeReady && artifactSafetyReady;
  const gameServerReady = isAddress(selectedGameServer);
  const envText = vaultAddress ? `VITE_ETH_VAULT_ADDRESS=${vaultAddress}` : "";

  async function deployEthVault() {
    if (!isConnected || !address || !agwClient) return setError("Connect AGW first.");
    if (!bytecodeReady) return setError("Bytecode missing. Run the contract artifact workflow first.");
    if (!artifactSafetyReady) return setError("Escrow artifact is stale. Run: contracts → build:frontend-artifact, then commit the generated artifact.");
    if (!gameServerReady) return setError("Game server must be a valid address.");

    try {
      setBusy(true);
      setError("");
      setTxHash("");
      setVaultAddress("");

      const hash = await agwClient.deployContract({
        abi: ETH_GAME_ESCROW_ABI,
        bytecode: ETH_GAME_ESCROW_BYTECODE,
        chain: abstractChain,
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
        <p className="vault-note">This deploys the native ETH escrow from your connected AGW on {appConfig.isMainnet ? "Abstract Mainnet" : "Abstract Testnet"}.</p>

        <div className="vault-row">
          <span>Connected AGW</span>
          <strong>{address || "Not connected"}</strong>
        </div>

        <div className="vault-row">
          <span>Artifact safety</span>
          <strong>{artifactSafetyReady ? "Hardened escrow artifact ready" : "Stale artifact blocked"}</strong>
        </div>

        <label className="vault-label">
          Game server address
          <input value={gameServerAddress} placeholder={address || "0x..."} onChange={(event) => setGameServerAddress(event.target.value)} />
        </label>

        {!bytecodeReady && <p className="vault-error">Bytecode missing. Run the contract artifact workflow first.</p>}
        {!artifactSafetyReady && <p className="vault-error">Stale escrow artifact. Do not deploy this vault. Regenerate and commit frontend/src/contracts/ethGameEscrowArtifact.js after compiling the hardened contract.</p>}

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

function hasFunction(name) {
  return ETH_GAME_ESCROW_ABI.some((item) => item?.type === "function" && item?.name === name);
}
