import { useEffect, useState } from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { createProfile } from "../network/socketClient.js";
import "../styles/profileScreen.css";

export function ProfileScreen({ onComplete, onBack }) {
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");

  const { login } = useLoginWithAbstract();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    if (!address || !isConnected || nameTouched) return;

    let cancelled = false;
    setLookupBusy(true);
    fetchAbstractUsername(address)
      .then((username) => {
        if (cancelled || !username || nameTouched) return;
        setName(username);
        setNotice("Abstract username found.");
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLookupBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address, isConnected, nameTouched]);

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
      setName("");
      setNameTouched(false);
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

  function handleNameChange(event) {
    setNameTouched(true);
    setName(event.target.value);
  }

  const statusMessage = error || (copied ? "Wallet copied." : busy ? "Creating profile..." : lookupBusy ? "Checking Abstract profile..." : notice);

  return (
    <section className="profile-page" aria-label="Create profile">
      <div className="profile-stage">
        <img className="profile-art" src="/assets/screens/profile.png" alt="Create Profile" />

        <button
          className={`profile-hit profile-connect-hit ${isConnected ? "connected" : ""}`}
          aria-label={isConnected ? "AGW connected" : "Connect AGW"}
          onClick={handleConnect}
          disabled={busy || isConnected}
        />

        {isConnected && <div className="profile-connect-disabled" aria-hidden="true">AGW CONNECTED</div>}

        {isConnected && (
          <button
            className="profile-hit profile-disconnect-hit"
            aria-label="Disconnect wallet"
            onClick={handleDisconnect}
            disabled={busy}
            title="Disconnect wallet"
          >
            DISCONNECT
          </button>
        )}

        <div className="profile-wallet-display" title={address || ""}>
          {address ? compactAddress(address) : ""}
        </div>

        <button
          className="profile-hit profile-copy-hit"
          aria-label="Copy wallet address"
          onClick={handleCopyAddress}
          disabled={busy || !address}
        />

        <input
          className="profile-name-input"
          placeholder={lookupBusy ? "Checking Abstract profile..." : "Enter player name"}
          maxLength={20}
          value={name}
          onChange={handleNameChange}
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

        {statusMessage && (
          <div className={`profile-status ${error ? "error" : ""}`} aria-live="polite">
            {statusMessage}
          </div>
        )}
      </div>
    </section>
  );
}

async function fetchAbstractUsername(address) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  const wallet = String(address || "").toLowerCase();
  const configuredUrl = import.meta.env.VITE_ABSTRACT_PROFILE_LOOKUP_URL;
  const urls = [
    configuredUrl ? configuredUrl.replace("{address}", wallet) : "",
    `https://portal.abs.xyz/api/profile/${wallet}`,
    `https://portal.abs.xyz/api/users/${wallet}`,
    `https://portal.abs.xyz/api/user/${wallet}`
  ].filter(Boolean);

  try {
    for (const url of urls) {
      try {
        const response = await fetch(url, { signal: controller.signal, credentials: "omit" });
        if (!response.ok) continue;
        const data = await response.json();
        const username = findUsername(data);
        if (username) return username;
      } catch {}
    }
  } finally {
    clearTimeout(timeout);
  }

  return "";
}

function findUsername(value) {
  if (!value || typeof value !== "object") return "";
  const direct = value.username || value.handle || value.displayName || value.name;
  if (typeof direct === "string" && isValidProfileName(direct)) return cleanProfileName(direct);
  for (const item of Object.values(value)) {
    if (item && typeof item === "object") {
      const found = findUsername(item);
      if (found) return found;
    }
  }
  return "";
}

function isValidProfileName(value) {
  const name = cleanProfileName(value);
  return name.length >= 3 && name.length <= 20 && !/^0x[a-f0-9]{8,}$/i.test(name);
}

function cleanProfileName(value) {
  return String(value || "").replace(/^@/, "").trim().slice(0, 20);
}

function compactAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
