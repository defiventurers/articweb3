import { appConfig } from "../config/chain.js";
import "../styles/closedBetaBanner.css";

export function ClosedBetaBanner() {
  const hidden = import.meta.env.VITE_HIDE_CLOSED_BETA_BANNER === "true";
  if (hidden) return null;

  const label = appConfig.isMainnet ? "Closed Beta · Guarded Mode" : "Closed Beta · Abstract Testnet";
  const detail = appConfig.isMainnet
    ? "Limited release. Use approved settings only."
    : "Practice environment. Testnet only. Use for product testing.";

  return (
    <aside className={`closed-beta-banner ${appConfig.isMainnet ? "mainnet" : "testnet"}`} aria-label="Closed beta notice">
      <strong>{label}</strong>
      <span>{detail}</span>
    </aside>
  );
}
