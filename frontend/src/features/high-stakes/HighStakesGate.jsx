import { appConfig, getHighStakesConfigIssue } from "../../config/chain.js";
import { useChainGuard } from "../../hooks/useChainGuard.js";

export function HighStakesGate({ children, onBack }) {
  const smokeBypass = isSmokeProfileEnabled();
  const issue = getHighStakesConfigIssue();
  const { isConnected, isWrongChain, connectedChainId, expectedChainId, expectedNetworkName } = useChainGuard();

  if (smokeBypass) return children;

  let blockReason = issue;
  if (!blockReason && !isConnected) blockReason = "Connect your Abstract wallet before entering Locked Match Mode.";
  if (!blockReason && isWrongChain) blockReason = `Wrong network. Connected chain ${connectedChainId}; expected ${expectedNetworkName} (${expectedChainId}).`;

  if (!blockReason) return children;

  return (
    <section className="art-screen highstakes-screen" aria-label="Locked Match Mode unavailable">
      <div className="highstakes-shell">
        <div className="highstakes-config-panel" role="status">
          <p className="highstakes-config-kicker">Launch Controls</p>
          <h2>Locked Match Lab Unavailable</h2>
          <p>{blockReason}</p>
          <dl className="highstakes-config-list">
            <div><dt>Environment</dt><dd>{appConfig.chainEnv}</dd></div>
            <div><dt>Launch mode</dt><dd>{appConfig.launch.mode}</dd></div>
            <div><dt>Expected chain</dt><dd>{expectedChainId}</dd></div>
            <div><dt>Locked mode flag</dt><dd>{String(appConfig.features.highStakes)}</dd></div>
            <div><dt>Internal rehearsal</dt><dd>{String(appConfig.launch.internalMainnetRehearsalEnabled)}</dd></div>
            <div><dt>Closed beta mainnet</dt><dd>{String(appConfig.launch.closedBetaMainnetEnabled)}</dd></div>
            <div><dt>Public mainnet approved</dt><dd>{String(appConfig.launch.legalPublicMainnetApproved)}</dd></div>
            <div><dt>ETH vault</dt><dd>{appConfig.contracts.ethVault}</dd></div>
          </dl>
          <p className="note">Free Play and spectator flows remain available. Public mainnet value-mode stays blocked until legal/compliance approval is explicitly recorded.</p>
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
