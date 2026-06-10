import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { createProfile } from "../network/socketClient.js";

export function ProfileScreen({ onComplete, onBack }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { login } = useLoginWithAbstract();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  async function handleComplete() {
    try {
      setError("");

      if (!address || !isConnected) {
        setError("Connect AGW first.");
        return;
      }

      if (name.trim().length < 3) {
        setError("Name must be at least 3 characters.");
        return;
      }

      setBusy(true);

      const profile = await createProfile({
        address,
        name: name.trim(),
        signMessageAsync
      });

      onComplete(profile);
    } catch (err) {
      setError(err.message || "Profile creation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="screen">
      <div className="card">
        <h1>Create Profile</h1>

        <button className="primary-btn" onClick={login}>
          {isConnected ? "AGW Connected" : "Connect AGW"}
        </button>

        <p className="note">
          {address ? `Wallet: ${address}` : "Wallet not connected"}
        </p>

        <input
          className="text-input"
          placeholder="Enter player name"
          maxLength={20}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <p className="note">No deposit required to play.</p>

        <button className="primary-btn" disabled={busy} onClick={handleComplete}>
          {busy ? "Creating..." : "Complete Profile"}
        </button>

        <button className="secondary-btn" onClick={onBack}>
          Back
        </button>

        {error && <p className="error">{error}</p>}
      </div>
    </section>
  );
}
