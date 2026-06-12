import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import { abstractTestnet } from "viem/chains";
import { isAddress } from "viem";
import { ABSTRACT_TESTNET_USDC } from "../config/chainTargets.js";
import { GAME_ESCROW_ABI, GAME_ESCROW_BYTECODE } from "../contracts/gameEscrowArtifact.js";
import "../styles/vaultDeployer.css";

export function VaultDeployerScreen({ onBack }) {
  const { address, isConnected } = useAccount();
  const { data: agwClient } = useAbstractClient();
  const [gameServerAddress, setGameServerAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [vaultAddress, setVaultAddress] = useState("");
  const [error, setError] = useState("");

  const bytecodeReady = Boolean(GAME_ESCROW_BYTECODE && GAME_ESCROW_BYTECODE.startsWith("0x"));
  const selectedGameServer = gameServerAddress.trim() || address || "";
  const gameServerReady = isAddress(selectedGameServer);

  const envText = useMemo(() => {
    if (!vaultAddress) return "";
    return [
      `VITE_TOKEN_ADDRESS=${ABSTRACT_TESTNET_USDC}`,
      `VITE_VAULT_ADDRESS=${vaultAddress}`
    ].join("\n");
  }, [vaultAddress]);

  async function deployVault() {
    if (!isConnected || !address || !agwClient) {
      setError("Connect AGW first.");
      return;
    }

    if (!bytecodeReady) {
      setError("Contract bytecode missing. Run npm run build:frontend-artifact inside /contracts, then redeploy this frontend locally.");
      return;
    }

    if (!gameServerReady) {
      setError("Game server must be a valid address.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      setTxHash("");
      setVaultAddress("");

      const hash = await agwClient.deployContract({
        abi: GAME_ESCROW_ABI,
        bytecode: GAME_ESCROW_BYTECODE,
        chain: abstractTestnet,
        account: agwClient.account,
        args: [ABSTRACT_TESTNET_USDC, selectedGameServer]
      });

      setTxHash(hash);
      setError("Deployment submitted. Open the transaction in Abstract explorer and copy the created contract address after it confirms.");
    } catch (err) {
      setError(err.shortMessage || err.message || "Vault deployment failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copyEnv() {
    if (!envText) return;
    await navigator.clipboard.writeText(envText);
  }

  return (
    <section className="vault-deployer-page">
      <div className="vault-deployer-card">
        <h1>Deploy Vault</h1>

        <p className="vault-note">
          This deploys GameEscrow from your connected Abstract Global Wallet. No private key is used in the browser.
        </p>

        <div className="vault-row">
          <span>Connected AGW</span>
          <strong>{address || "Not connected"}</strong>
        </div>

        <div className="vault-row">
          <span>USDC</span>
          <strong>{ABSTRACT_TESTNET_USDC}</strong>
        </div>

        <label className="vault-label">
          Game server address
          <input
            value={gameServerAddress}
            placeholder={address || "0x..."}
            onChange={(event) => setGameServerAddress(event.target.value)}
          />
        </label>

        <p className="vault-note small">
          Leave blank to use your AGW as the first game server. Later we can move settlement authority to a backend signer.
        </p>

        {!bytecodeReady && (
          <p className="vault-error">
            Bytecode is not exported yet. Run: cd contracts && npm run build:frontend-artifact
          </p>
        )}

        <button className="vault-primary" disabled={busy || !isConnected || !bytecodeReady || !gameServerReady} onClick={deployVault}>
          {busy ? "Deploying..." : "Deploy Vault With AGW"}
        </button>

        {txHash && (
          <div className="vault-result">
            <span>Transaction hash</span>
            <strong>{txHash}</strong>
          </div>
        )}

        <label className="vault-label">
          Paste deployed vault address after confirmation
          <input
            value={vaultAddress}
            placeholder="0x..."
            onChange={(event) => setVaultAddress(event.target.value)}
          />
        </label>

        {envText && (
          <div className="vault-env-box">
            <pre>{envText}</pre>
            <button className="vault-secondary" onClick={copyEnv}>Copy Env Vars</button>
          </div>
        )}

        {error && <p className="vault-error">{error}</p>}

        <button className="vault-secondary" onClick={onBack}>Back</button>
      </div>
    </section>
  );
}
