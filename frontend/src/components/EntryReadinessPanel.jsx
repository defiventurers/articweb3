import { formatUnits } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { appConfig } from "../config/chain.js";
import { ETH_DECIMALS, ETH_TARGETS_READY, ETH_VAULT_ADDRESS } from "../config/chainTargets.js";
import { ethVaultAbi } from "../contracts/abis.js";
import { useChainGuard } from "../hooks/useChainGuard.js";

const ENTRY_WEI = 1000000000000000n;
const panelStyle = { position: "absolute", left: "3.6%", bottom: "5.5%", width: "31%", maxWidth: "390px", padding: "0.7rem", borderRadius: "16px", background: "rgba(3, 18, 34, 0.72)", border: "1px solid rgba(147, 217, 255, 0.24)", color: "#e7f8ff", zIndex: 6, backdropFilter: "blur(8px)" };
const gridStyle = { display: "grid", gap: "0.45rem", marginTop: "0.5rem" };
const rowStyle = { display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem", alignItems: "center", fontSize: "0.76rem" };
const pillBase = { padding: "0.18rem 0.45rem", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.18)", fontSize: "0.68rem", whiteSpace: "nowrap" };
const linkRow = { display: "flex", gap: "0.45rem", flexWrap: "wrap", marginTop: "0.55rem" };

export function EntryReadinessPanel() {
  const { address, isConnected } = useAccount();
  const { isWrongChain, expectedNetworkName } = useChainGuard();
  const nativeBalanceQuery = useBalance({ address, query: { enabled: Boolean(address && !isWrongChain) } });
  const availableQuery = useReadContract({ address: ETH_VAULT_ADDRESS, abi: ethVaultAbi, functionName: "availableBalance", args: address ? [address] : undefined, query: { enabled: Boolean(address && !isWrongChain && ETH_TARGETS_READY) } });
  const lockedQuery = useReadContract({ address: ETH_VAULT_ADDRESS, abi: ethVaultAbi, functionName: "lockedBalance", args: address ? [address] : undefined, query: { enabled: Boolean(address && !isWrongChain && ETH_TARGETS_READY) } });

  const walletWei = nativeBalanceQuery.data?.value || 0n;
  const availableWei = availableQuery.data || 0n;
  const lockedWei = lockedQuery.data || 0n;
  const walletReady = walletWei >= ENTRY_WEI;
  const vaultReady = availableWei >= ENTRY_WEI;
  const overallReady = isConnected && !isWrongChain && ETH_TARGETS_READY && walletReady && vaultReady;

  return (
    <aside style={panelStyle} aria-label="Funding and entry readiness">
      <strong style={{ fontSize: "0.82rem" }}>Entry Readiness</strong>
      <p style={{ margin: "0.2rem 0 0", fontSize: "0.68rem", opacity: 0.78 }}>Testnet lock lab checks before a Locked Match.</p>
      <div style={gridStyle}>
        <ReadinessRow label="Wallet connected" ready={isConnected} value={isConnected ? "Yes" : "No"} />
        <ReadinessRow label="Network" ready={!isWrongChain} value={isWrongChain ? expectedNetworkName : appConfig.isTestnet ? "Abstract Testnet" : "Abstract Mainnet"} />
        <ReadinessRow label="ETH vault" ready={ETH_TARGETS_READY} value={ETH_TARGETS_READY ? compactAddress(ETH_VAULT_ADDRESS) : "Missing"} />
        <ReadinessRow label="Wallet ETH" ready={walletReady} value={formatEth(walletWei)} />
        <ReadinessRow label="Vault available" ready={vaultReady} value={formatEth(availableWei)} />
        <ReadinessRow label="Vault locked" ready={true} value={formatEth(lockedWei)} />
        <ReadinessRow label="Small lock ready" ready={overallReady} value={overallReady ? "Ready" : "Not ready"} />
      </div>
      <div style={linkRow}>
        {address && <a className="secondary-btn" href={addressUrl(address)} target="_blank" rel="noreferrer">Wallet Explorer</a>}
        {ETH_TARGETS_READY && <a className="secondary-btn" href={addressUrl(ETH_VAULT_ADDRESS)} target="_blank" rel="noreferrer">Vault Explorer</a>}
      </div>
      <p style={{ margin: "0.45rem 0 0", fontSize: "0.66rem", opacity: 0.78 }}>Need test ETH? Fund your AGW on Abstract testnet, then deposit to vault before locking a match.</p>
    </aside>
  );
}

function ReadinessRow({ label, ready, value }) {
  return (
    <div style={rowStyle}>
      <span>{label}</span>
      <span style={{ ...pillBase, background: ready ? "rgba(52, 211, 153, 0.14)" : "rgba(251, 191, 36, 0.13)" }}>{value}</span>
    </div>
  );
}

function formatEth(value) {
  const formatted = formatUnits(value || 0n, ETH_DECIMALS);
  const [whole, decimal = ""] = formatted.split(".");
  const cleanDecimal = decimal.slice(0, 5).replace(/0+$/, "");
  return (cleanDecimal ? `${whole}.${cleanDecimal}` : whole) + " ETH";
}

function compactAddress(value) {
  const text = String(value || "");
  return text.length > 12 ? `${text.slice(0, 6)}...${text.slice(-4)}` : text;
}

function addressUrl(value) {
  const explorer = import.meta.env.VITE_ABSTRACT_EXPLORER_URL || import.meta.env.VITE_ABSTRACT_EXPLORER || appConfig.explorerUrl;
  return String(explorer).replace(/\/$/, "") + "/address/" + value;
}
