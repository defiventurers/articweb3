import { useState } from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { createProfile } from "../network/socketClient.js";
import "../styles/profileScreen.css";

export function ProfileScreen({ onComplete, onBack }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");

  const { login } = useLoginWithAbstract();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  async function handleConnect() {
    try {
      setError("");
      setNotice("");
      await login();
    } catch (err) {
      setError(err.message || "Could not connect AGW.");
    }
  }

  function handleDisconnect() {
    try {
      setError("");
      setCopied(false);
      disconnect();
      setNotice("Wallet disconnected.");
    } catch (err) {
      setError(err.message || "Could not disconnect wallet.");
    }
  }

  async function handleCopyAddress() {
    if (!address) {
      setError("Connect AGW first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setNotice("");
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setError("Could not copy wallet address.");
    }
  }

  async function handleComplete() {
    try {
      setError("");
      setCopied(false);
      setNotice("");

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
    <section className="profile-page" aria-label="Create profile">
      <div className="profile-stage">
        <img className="profile-art" src="/assets/screens/profile.png" alt="Create Profile" />

        <button
          className="profile-hit profile-connect-hit"
          aria-label="Connect AGW"
          onClick={handleConnect}
          disabled={busy || isConnected}
        />

        <button
          className="profile-hit profile-disconnect-hit"
          aria-label="Disconnect wallet"
          onClick={handleDisconnect}
          disabled={busy || !isConnected}
          title="Disconnect wallet"
        />

        <div className="profile-wallet-display">
          {address ? compactAddress(address) : "Wallet not connected"}
        </div>

        <button
          className="profile-hit profile-copy-hit"
          aria-label="Copy wallet address"
          onClick={handleCopyAddress}
          disabled={busy || !address}
        />

        <input
          className="profile-name-input"
          placeholder="Enter player name"
          maxLength={20}
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={busy}
          aria-label="Player name"
        />

        <button
          className="profile-hit profile-complete-hit"
          aria-label="Complete profile"
          disabled={busy}
          onClick={handleComplete}
        />

        <button
          className="profile-hit profile-back-hit"
          aria-label="Back"
          disabled={busy}
          onClick={onBack}
        />

        {(error || busy || copied || notice) && (
          <div className={`profile-status ${error ? "error" : ""}`} aria-live="polite">
            {error || (copied ? "Wallet copied." : busy ? "Creating profile..." : notice)}
          </div>
        )}
      </div>
    </section>
  );
}

function compactAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
