import { useEffect, useMemo, useState } from "react";
import { request } from "../network/socketClient.js";
import { fetchServerHealth, SERVER_HEALTH_URL } from "../utils/serverHealth.js";
import { verifyDiceProofs } from "../utils/diceProofVerifier.js";

export function DevQAScreen({ onBack }) {
  const [health, setHealth] = useState(null);
  const [spectatorEndpoint, setSpectatorEndpoint] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function runChecks() {
    setLoading(true);
    setError("");
    setSpectatorEndpoint(null);
    try {
      const nextHealth = await fetchServerHealth();
      setHealth(nextHealth);
      try {
        await request("spectate_room", { roomCode: "ZZZZ" });
        setSpectatorEndpoint(true);
      } catch (err) {
        setSpectatorEndpoint(String(err.message || "").includes("Room not found"));
      }
    } catch (err) {
      setError(err.message || "QA checks failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { runChecks(); }, []);

  const checks = useMemo(() => {
    const dbStoresReady = Boolean(health?.historyStore?.databaseReady && health?.profileStore?.databaseReady && health?.vaultActivityStore?.databaseReady && health?.roomStore?.databaseReady);
    return [
      { label: "Backend connected", pass: Boolean(health?.ok), detail: SERVER_HEALTH_URL },
      { label: "Database stores ready", pass: dbStoresReady, detail: "history + profile + activity + rooms" },
      { label: "Vault configured", pass: Boolean(health?.ethVaultConfigured), detail: health?.ethVaultConfigured ? "ETH vault is configured" : "Missing ETH vault env" },
      { label: "Settlement signer configured", pass: Boolean(health?.settlementSignerConfigured && health?.settlementSignerAddress && health?.settlementSignerAddress !== "invalid"), detail: health?.settlementSignerAddress || "missing" },
      { label: "Room persistence ready", pass: Boolean(health?.roomStore?.databaseReady), detail: statusText(health?.roomStore) },
      { label: "Profile persistence ready", pass: Boolean(health?.profileStore?.databaseReady), detail: statusText(health?.profileStore) },
      { label: "Activity persistence ready", pass: Boolean(health?.vaultActivityStore?.databaseReady), detail: statusText(health?.vaultActivityStore) },
      { label: "History persistence ready", pass: Boolean(health?.historyStore?.databaseReady), detail: statusText(health?.historyStore) },
      { label: "Spectator endpoint working", pass: Boolean(spectatorEndpoint), detail: spectatorEndpoint === null ? "checking" : spectatorEndpoint ? "responded correctly" : "not responding" },
      { label: "Dice verifier available", pass: Boolean(window.crypto?.subtle && verifyDiceProofs), detail: window.crypto?.subtle ? "browser crypto ready" : "crypto.subtle missing" }
    ];
  }, [health, spectatorEndpoint]);

  return (
    <section className="screen proof-screen">
      <div className="card proof-card">
        <h1>Dev QA Checklist</h1>
        <p className="note">Internal redeploy health checks. Use this before testing paid/testnet-lock flows.</p>
        <button className="primary-btn" disabled={loading} onClick={runChecks}>{loading ? "Running..." : "Run QA Checks"}</button>
        {error && <p className="error-text">{error}</p>}
        <div className="proof-list">
          {checks.map((check) => (
            <div className={`room-row proof-row verify-line ${check.pass ? "valid" : "invalid"}`} key={check.label}>
              <strong>{check.pass ? "PASS" : "FAIL"} · {check.label}</strong>
              <span>{check.detail}</span>
            </div>
          ))}
        </div>
        <button className="primary-btn" onClick={onBack}>Back To Hub</button>
      </div>
    </section>
  );
}

function statusText(store) {
  if (!store) return "not reported";
  if (store.databaseReady) return "ready";
  return store.databaseError || "not ready";
}
