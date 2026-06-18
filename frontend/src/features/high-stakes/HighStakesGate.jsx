import { appConfig, getHighStakesConfigIssue } from "../../config/chain.js";
import { useChainGuard } from "../../hooks/useChainGuard.js";

export function HighStakesGate({ children, onBack }) {
  const issue = getHighStakesConfigIssue();
  const { isConnected, isWrongChain, connectedChainId, expectedChainId, expectedNetworkName } = useChainGuard();
  const smokeBypass = isSmokeProfileEnabled();

  let blockReason = issue;
  if (!blockReason && !smokeBypass && !isConnected) blockReason = "Connect your Abstract wallet before entering Locked Match Mode.";
  if (!blockReason && !smokeBypass && isWrongChain) blockReason = `Wrong network. Connected chain ${connectedChainId}; expected ${expectedNetworkName} (${expectedChainId}).`;

  if (!blockReason) return children;

  return (
    <section className="art-screen highstakes-screen" aria-label="Locked Match Mode unavailable">
      <div className="highstakes-shell">
        <div className="highstakes-config-panel" role="status">
          <p className="highstakes-config-kicker">Locked Match Mode</p>
          <h2>Unavailable</h2>
          <p>{blockReason}</p>
          <dl className="highstakes-config-list">
            <div><dt>Environment</dt><dd>{appConfig.chainEnv}</dd></div>
            <div><dt>Expected chain</dt><dd>{expectedChainId}</dd></div>
            <div><dt>High Stakes flag</dt><dd>{String(appConfig.features.highStakes)}</dd></div>
            <div><dt>ETH vault</dt><dd>{appConfig.contracts.ethVault}</dd></div>
          </dl>
          {onBack && <button type="button" className="highstakes-modal-cancel" onClick={onBack}>Back To Hub</button>}
        </div>
      </div>
    </section>
  );
}

function isSmokeProfileEnabled() {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("smokeProfile") === "1";
}
