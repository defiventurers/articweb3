import { useEffect, useMemo, useState } from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { useChainGuard } from "../hooks/useChainGuard.js";
import { createProfile } from "../network/socketClient.js";
import "../styles/profileScreen.css";

const PROFILE_STORAGE_KEY = "artic-profile-by-wallet-v1";
const CACHED_PROFILE_SAVE_TIMEOUT_MS = 6000;
const NEW_PROFILE_SAVE_TIMEOUT_MS = 12000;

export function ProfileScreen({ onComplete, onBack }) {
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [existingProfile, setExistingProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");

  const { login } = useLoginWithAbstract();
  const { address, isConnected } = useAccount();
  const { isWrongChain, expectedNetworkName, connectedChainId } = useChainGuard();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    if (!address || !isConnected) {
      setExistingProfile(null);
      return;
    }

    const storedProfile = readStoredProfile(address);
    if (!storedProfile) {
      setExistingProfile(null);
      return;
    }

    setExistingProfile(storedProfile);
    if (!nameTouched) setName(storedProfile.name);
    setNotice("Saved profile found. Continue to enter the lobby.");
  }, [address, isConnected, nameTouched]);

  useEffect(() => {
    if (!address || !isConnected || nameTouched || readStoredProfile(address)) return;

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
    if (isConnected) return;
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
      setExistingProfile(null);
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

      if (isWrongChain) {
        setError(`Switch to ${expectedNetworkName} before completing profile.`);
        return;
      }

      const cleanName = name.trim();
      const storedProfile = existingProfile || readStoredProfile(address);
      const canReuseStoredProfile = storedProfile && (!nameTouched || cleanName === storedProfile.name);
      const profileName = canReuseStoredProfile ? storedProfile.name : cleanName;

      if (profileName.length < 3) {
        setError("Name must be at least 3 characters.");
        return;
      }

      setBusy(true);

      try {
        const profile = await withProfileSaveTimeout(
          createProfile({
            address,
            name: profileName,
            signMessageAsync
          }),
          canReuseStoredProfile ? CACHED_PROFILE_SAVE_TIMEOUT_MS : NEW_PROFILE_SAVE_TIMEOUT_MS
        );
        const savedProfile = writeStoredProfile(profile);
        onComplete(savedProfile || profile);
      } catch (err) {
        const fallbackProfile = normalizeStoredProfile(
          canReuseStoredProfile
            ? { ...storedProfile, wallet: address }
            : { wallet: address, name: profileName, points: 0, gamesPlayed: 0, wins: 0, createdAt: Date.now() }
        );
        if (isTimeoutError(err) && fallbackProfile) {
          writeStoredProfile(fallbackProfile);
          setNotice("Lobby response timed out. Continuing with this profile.");
          onComplete(fallbackProfile);
          return;
        }
        setError(`${err.message || "Profile creation failed."} Try again.`);
      }
    } catch (err) {
      setError(err.message || "Profile creation failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleNameChange(event) {
    setNameTouched(true);
    setExistingProfile(null);
    setName(event.target.value);
  }

  const chainNotice = isConnected && isWrongChain ? `Wrong network: ${connectedChainId || "unknown"}. Switch to ${expectedNetworkName}.` : "";
  const statusMessage = error || chainNotice || (copied ? "Wallet copied." : busy ? "Creating profile..." : lookupBusy ? "Checking Abstract profile..." : notice);
  const statusClassName = [
    "profile-status",
    "profile-status-message",
    busy ? "profile-loading-message" : "",
    error || chainNotice ? "error" : ""
  ].filter(Boolean).join(" ");

  return (
    <section className="profile-page" aria-label="Create profile">
      <div className="profile-stage">
        <img className="profile-art" src="/assets/screens/profile.webp" alt="Create Profile" />

        <button
          className={`profile-hit profile-connect-hit profile-connect-hitbox ${isConnected ? "connected" : ""}`}
          aria-label={isConnected ? "AGW connected" : "Connect AGW"}
          onClick={handleConnect}
          disabled={busy || isConnected}
        />

        {isConnected && (
          <div className="profile-connect-disabled profile-wallet-status" aria-hidden="true">
            AGW CONNECTED
          </div>
        )}

        {isConnected && (
          <button
            className="profile-hit profile-disconnect-hit profile-disconnect-hitbox"
            aria-label="Disconnect wallet"
            onClick={handleDisconnect}
            disabled={busy}
            title="Disconnect wallet"
          >
            DISCONNECT
          </button>
        )}

        <div className="profile-wallet-display profile-wallet-address" title={address || ""}>
          {address ? compactAddress(address) : ""}
        </div>

        <button
          className="profile-hit profile-copy-hit profile-wallet-copy-hitbox"
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
          className="profile-hit profile-complete-hit profile-complete-hitbox"
          aria-label="Complete profile"
          disabled={busy || isWrongChain}
          onClick={handleComplete}
        />

        <button
          className="profile-hit profile-back-hit profile-back-hitbox"
          aria-label="Back"
          disabled={busy}
          onClick={onBack}
        />

        {statusMessage && (
          <div className={statusClassName} aria-live="polite">
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

function readStoredProfile(address) {
  if (typeof window === "undefined") return null;
  const wallet = walletKey(address);
  if (!wallet) return null;
  try {
    const profiles = JSON.parse(window.localStorage.getItem(PROFILE_STORAGE_KEY) || "{}");
    return normalizeStoredProfile(profiles[wallet]);
  } catch {
    return null;
  }
}

function writeStoredProfile(profile) {
  if (typeof window === "undefined") return normalizeStoredProfile(profile);
  const savedProfile = normalizeStoredProfile(profile);
  if (!savedProfile) return null;
  try {
    const profiles = JSON.parse(window.localStorage.getItem(PROFILE_STORAGE_KEY) || "{}");
    profiles[savedProfile.wallet] = savedProfile;
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
  } catch {}
  return savedProfile;
}

function normalizeStoredProfile(profile) {
  if (!profile || !profile.wallet || !profile.name) return null;
  const name = cleanProfileName(profile.name);
  if (name.length < 3) return null;
  return {
    wallet: walletKey(profile.wallet),
    name,
    points: Number(profile.points || 0),
    gamesPlayed: Number(profile.gamesPlayed || 0),
    wins: Number(profile.wins || 0),
    createdAt: Number(profile.createdAt || Date.now())
  };
}

function walletKey(address) {
  return String(address || "").toLowerCase();
}

function withProfileSaveTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error("Lobby server timed out.")), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

function isTimeoutError(err) {
  return /timed?\s*out|timeout/i.test(String(err?.message || err || ""));
}
