import { appConfig } from "../config/chain.js";

export function NetworkBadge() {
  const label = appConfig.isMainnet ? "Abstract Mainnet" : "Abstract Testnet";
  const title = `${label} · Chain ${appConfig.chainId}`;

  return (
    <div className={`network-badge ${appConfig.isMainnet ? "mainnet" : "testnet"}`} title={title} aria-label={title}>
      <span className="network-badge-dot" />
      {label}
    </div>
  );
}
