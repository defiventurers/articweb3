import { useEffect, useMemo, useState } from "react";
import { appConfig, getHighStakesConfigIssue } from "../../config/chain.js";
import { useChainGuard } from "../../hooks/useChainGuard.js";

export function HighStakesGate({ children, onBack }) {
  const smokeBypass = isSmokeProfileEnabled();
  const staticIssue = getHighStakesConfigIssue();
  const launchStatusUrl = useMemo(() => deriveLaunchStatusUrl(), []);
  const [launchStatus, setLaunchStatus] = useState(null);
  const [launchError, setLaunchError] = useState("");
  const [launchLoading, setLaunchLoading] = useState(Boolean(launchStatusUrl));
  const { isConnected, isWrongChain, connectedChainId, expectedChainId, expectedNetworkName } = useChainGuard();

  useEffect(() => {
    if (!launchStatusUrl) {
      setLaunchLoading(false);
      setLaunchError("Backend launch status URL is not configured.");
      return;
    }

    let cancelled = false;
    async function loadLaunchStatus() {
      try {
        setLaunchLoading(true);
        setLaunchError("");
        const response = await fetch(launchStatusUrl, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.ok === false) throw new Error(payload.error || `Launch status returned ${response.status}.`);
        if (!cancelled) setLaunchStatus(payload);
      } catch (err) {
        if (!cancelled) {
          setLaunchStatus(null);
          setLaunchError(err.message || "Could not verify backend launch status.");
        }
      } finally {
        if (!cancelled) setLaunchLoading(false);
      }
    }

    loadLaunchStatus();
    return () => { cancelled = true; };
  }, [launchStatusUrl]);

  if (smokeBypass) return children;

  let blockReason = staticIssue;
  if (!blockReason && !isConnected) blockReason = "Connect your Abstract wallet before entering Locked Match Mode.";
  if (!blockReason && isWrongChain) blockReason = `Wrong network. Connected chain ${connectedChainId}; expected ${expectedNetworkName} (${expectedChainId}).`;
  if (!blockReason && launchLoading) blockReason = "Checking backend launch switch...";
  if (!blockReason && launchError) blockReason = `Could not verify backend launch switch: ${launchError}`;
  if (!blockReason && launchStatus && !launchStatus.highStakesAllowed) blockReason = launchStatus.highStakesBlockReason || "Locked Match Lab is switched off.";

  if (!blockReason) return children;

  return (
    <section className="art-screen highstakes-screen" aria-label="Locked Match Mode unavailable">
      <div className="highstakes-shell">
        <div className="highstakes-config-panel" role="status">
          <p className="highstakes-config-kicker">Launch Switch</p>
          <h2>Locked Match Lab Unavailable</h2>
          <p>{blockReason}</p>
          <dl className="highstakes-config-list">
            <div><dt>Environment</dt><dd>{appConfig.chainEnv}</dd></div>
            <div><dt>Expected chain</dt><dd>{expectedChainId}</dd></div>
            <div><dt>Locked mode flag</dt><dd>{String(appConfig.features.highStakes)}</dd></div>
            <div><dt>Backend switch</dt><dd>{launchStatus?.lockedMatchMode || launchStatus?.mode || (launchLoading ? "checking" : "unverified")}</dd></div>
            <div><dt>Backend allowed</dt><dd>{launchStatus ? String(Boolean(launchStatus.highStakesAllowed)) : "—"}</dd></div>
            <div><dt>Legal approval</dt><dd>{launchStatus ? String(Boolean(launchStatus.legalPublicMainnetApproved)) : "—"}</dd></div>
            <div><dt>ETH vault</dt><dd>{appConfig.contracts.ethVault}</dd></div>
          </dl>
          <p className="note">Free Play and spectator flows remain available. The backend is the only launch authority for Locked Match Lab.</p>
          {onBack && <button type="button" className="highstakes-modal-cancel" onClick={onBack}>Back To Hub</button>}
        </div>
      </div>
    </section>
  );
}

function deriveLaunchStatusUrl() {
  const raw = import.meta.env.VITE_BACKEND_HTTP_URL || import.meta.env.VITE_API_URL || import.meta.env.VITE_WS_URL || "";
  if (!raw) return "";
  let base = String(raw).trim();
  if (base.startsWith("wss://")) base = "https://" + base.slice(6);
  if (base.startsWith("ws://")) base = "http://" + base.slice(5);
  if (base.endsWith("/")) base = base.slice(0, -1);
  return `${base}/launch/status`;
}

function isSmokeProfileEnabled() {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("smokeProfile") === "1";
}
