/* Arctic Dominion migration: display-only wallet boundary; game moves remain local until server validation exists. */
import { useChainGuard } from "../../hooks/useChainGuard.js";

export function ArcadeChainStatus() {
  const { address, isConnected, expectedNetworkName, isWrongChain, canUseMoneyActions } = useChainGuard();
  const identity = isConnected ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Wallet optional";
  const network = isConnected ? (isWrongChain ? "Switch to Abstract" : expectedNetworkName) : "Free Play";
  return <div className={`header-stats arcade-chain-status ${isWrongChain ? "wrong-chain" : ""}`} aria-label="Abstract compatibility status">
    <span><b>{isConnected ? "AGW" : "FREE"}</b>{identity}</span>
    <span><b>{isWrongChain ? "CHECK" : "READY"}</b>{network}</span>
    <span><b>{canUseMoneyActions ? "GATED" : "OFF"}</b>moves never transact</span>
  </div>;
}
