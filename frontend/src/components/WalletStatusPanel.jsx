import { formatEther } from "viem";
import { useAccount, useBalance, useReadContract, useSwitchChain } from "wagmi";
import { appConfig, getHighStakesConfigIssue } from "../config/chain.js";
import { ETH_TARGETS_READY, ETH_VAULT_ADDRESS } from "../config/chainTargets.js";
import { ethVaultAbi } from "../contracts/abis.js";
import { useChainGuard } from "../hooks/useChainGuard.js";
import { addressUrl } from "../utils/explorer.js";

export function WalletStatusPanel({ compact = false }) {
  const { address, isConnected } = useAccount();
  const { switchChain, isPending: switchPending } = useSwitchChain();
  const { isWrongChain, connectedChainId, expectedChainId, expectedNetworkName } = useChainGuard();

  const nativeBalanceQuery = useBalance({
    address,
    query: { enabled: Boolean(address) }
  });

  const availableQuery = useReadContract({
    address: ETH_VAULT_ADDRESS,
    abi: ethVaultAbi,
    functionName: "availableBalance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && ETH_TARGETS_READY && !isWrongChain) }
  });

  const lockedQuery = useReadContract({
    address: ETH_VAULT_ADDRESS,
    abi: ethVaultAbi,
    functionName: "lockedBalance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && ETH_TARGETS_READY && !isWrongChain) }
  });

  const nativeBalance = nativeBalanceQuery.data?.value || 0n;
  const availableBalance = availableQuery.data || 0n;
  const lockedBalance = lockedQuery.data || 0n;
  const highStakesIssue = getHighStakesConfigIssue();
  const status = getStatus({ isConnected, isWrongChain, highStakesIssue });

  async function refresh() {
    await Promise.all([
      nativeBalanceQuery.refetch?.(),
      availableQuery.refetch?.(),
      lockedQuery.refetch?.()
    ]);
  }

  function switchToExpectedChain() {
    if (!switchChain) return;
    switchChain({ chainId: expectedChainId });
  }

  return (
    <aside className={`wallet-status-panel ${compact ? "compact" : ""}`} aria-label="Wallet and balance status">
      <div className="wallet-status-head">
        <div>
          <p className="wallet-status-kicker">Wallet Status</p>
          <h3>{status.label}</h3>
        </div>
        <span className={`wallet-status-chip ${status.tone}`}>{appConfig.isMainnet ? "MAINNET" : "TESTNET"}</span>
      </div>

      <div className="wallet-status-grid">
        <StatusRow label="Wallet" value={address ? compactAddress(address) : "Not connected"} title={address || ""} href={address ? addressUrl(address) : ""} />
        <StatusRow label="Network" value={isWrongChain ? `Wrong: ${connectedChainId || "unknown"}` : expectedNetworkName} />
        <StatusRow label="Wallet ETH" value={`${formatAmount(nativeBalance)} ETH`} />
        <StatusRow label="Available / withdrawable" value={ETH_TARGETS_READY && !isWrongChain ? `${formatAmount(availableBalance)} ETH` : "Vault not ready"} />
        <StatusRow label="Locked" value={ETH_TARGETS_READY && !isWrongChain ? `${formatAmount(lockedBalance)} ETH` : "Vault not ready"} />
        <StatusRow label="Locked Match" value={highStakesIssue ? "Blocked" : "Ready"} />
      </div>

      {status.message && <p className={`wallet-status-note ${status.tone}`}>{status.message}</p>}
      {highStakesIssue && <p className="wallet-status-note warning">{highStakesIssue}</p>}

      <div className="wallet-status-actions">
        {isWrongChain && (
          <button type="button" onClick={switchToExpectedChain} disabled={!switchChain || switchPending}>
            {switchPending ? "Switching..." : `Switch to ${expectedNetworkName}`}
          </button>
        )}
        <button type="button" onClick={refresh} disabled={!address}>
          Refresh Balances
        </button>
      </div>
    </aside>
  );
}

function StatusRow({ label, value, title = "", href = "" }) {
  const body = href ? <a href={href} target="_blank" rel="noreferrer">{value}</a> : value;
  return (
    <div className="wallet-status-row">
      <span>{label}</span>
      <strong title={title}>{body}</strong>
    </div>
  );
}

function getStatus({ isConnected, isWrongChain, highStakesIssue }) {
  if (!isConnected) return { label: "Not connected", tone: "warning", message: "Connect AGW before using profiles, deposits, or locked matches." };
  if (isWrongChain) return { label: "Wrong network", tone: "error", message: "Money actions are blocked until the wallet is on the configured Abstract network." };
  if (highStakesIssue) return { label: "Free play ready", tone: "warning", message: "Open Ice can still run. Locked Match Mode remains gated until config is ready." };
  return { label: "Ready", tone: "ready", message: "Wallet, network, and ETH vault config are ready." };
}

function compactAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatAmount(value) {
  try {
    const formatted = formatEther(value || 0n);
    const [whole, decimal = ""] = formatted.split(".");
    const cleanDecimal = decimal.slice(0, 5).replace(/0+$/, "");
    return cleanDecimal ? `${whole}.${cleanDecimal}` : whole;
  } catch {
    return "0";
  }
}
