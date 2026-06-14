import { useEffect, useMemo, useState } from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { createProfile } from "../network/socketClient.js";
import "../styles/profileScreen.css";

const PROFILE_CALIBRATION_QUERY_KEY = "calibrateProfile";
const PROFILE_CALIBRATION_TARGETS = [
  "connect-hit",
  "connect-disabled",
  "disconnect-hit",
  "wallet-display",
  "copy-hit",
  "name-input",
  "complete-hit",
  "back-hit",
  "status-message"
];

export function ProfileScreen({ onComplete, onBack }) {
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const [calibrationOverrides, setCalibrationOverrides] = useState({});

  const calibrateProfile = useMemo(() => isProfileCalibrationEnabled(), []);

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

  function calibrationStyle(targetId) {
    return calibrateProfile ? calibrationOverrides[targetId] : undefined;
  }

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
    <section className={`profile-page ${calibrateProfile ? "is-calibrating" : ""}`} aria-label="Create profile">
      <div className="profile-stage">
        <img className="profile-art" src="/assets/screens/profile.png" alt="Create Profile" />

        <button
          className={`profile-hit profile-connect-hit ${isConnected ? "connected" : ""}`}
          data-calibrate="connect-hit"
          style={calibrationStyle("connect-hit")}
          aria-label={isConnected ? "AGW connected" : "Connect AGW"}
          onClick={handleConnect}
          disabled={busy || isConnected}
        />

        {isConnected && <div className="profile-connect-disabled" data-calibrate="connect-disabled" style={calibrationStyle("connect-disabled")} aria-hidden="true">AGW CONNECTED</div>}

        {isConnected && (
          <button
            className="profile-hit profile-disconnect-hit"
            data-calibrate="disconnect-hit"
            style={calibrationStyle("disconnect-hit")}
            aria-label="Disconnect wallet"
            onClick={handleDisconnect}
            disabled={busy}
            title="Disconnect wallet"
          >
            DISCONNECT
          </button>
        )}

        <div className="profile-wallet-display" data-calibrate="wallet-display" style={calibrationStyle("wallet-display")} title={address || ""}>
          {address ? compactAddress(address) : ""}
        </div>

        <button
          className="profile-hit profile-copy-hit"
          data-calibrate="copy-hit"
          style={calibrationStyle("copy-hit")}
          aria-label="Copy wallet address"
          onClick={handleCopyAddress}
          disabled={busy || !address}
        />

        <input
          className="profile-name-input"
          data-calibrate="name-input"
          style={calibrationStyle("name-input")}
          placeholder={lookupBusy ? "Checking Abstract profile..." : "Enter player name"}
          maxLength={20}
          value={name}
          onChange={handleNameChange}
          disabled={busy}
          aria-label="Player name"
        />

        <button
          className="profile-hit profile-complete-hit"
          data-calibrate="complete-hit"
          style={calibrationStyle("complete-hit")}
          aria-label="Complete profile"
          disabled={busy}
          onClick={handleComplete}
        />

        <button
          className="profile-hit profile-back-hit"
          data-calibrate="back-hit"
          style={calibrationStyle("back-hit")}
          aria-label="Back"
          disabled={busy}
          onClick={onBack}
        />

        {statusMessage && (
          <div className={`profile-status ${error ? "error" : ""}`} data-calibrate="status-message" style={calibrationStyle("status-message")} aria-live="polite">
            {statusMessage}
          </div>
        )}

        <ProfileCalibrator enabled={calibrateProfile} targetIds={PROFILE_CALIBRATION_TARGETS} overrides={calibrationOverrides} setOverrides={setCalibrationOverrides} />
      </div>
    </section>
  );
}

function ProfileCalibrator({ enabled, targetIds, overrides, setOverrides }) {
  const [selected, setSelected] = useState(targetIds[0] || "");
  const [draft, setDraft] = useState({ left: "", top: "", width: "", height: "", fontSize: "" });

  useEffect(() => {
    if (!enabled || !selected) return;
    const element = document.querySelector(`[data-calibrate="${selected}"]`);
    const stage = document.querySelector(".profile-stage");
    if (!element || !stage) return;

    const stageRect = stage.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const computed = window.getComputedStyle(element);
    const override = overrides[selected] || {};

    setDraft({
      left: override.left || toPercent(rect.left - stageRect.left, stageRect.width),
      top: override.top || toPercent(rect.top - stageRect.top, stageRect.height),
      width: override.width || toPercent(rect.width, stageRect.width),
      height: override.height || toPercent(rect.height, stageRect.height),
      fontSize: override.fontSize || computed.fontSize || ""
    });
  }, [enabled, selected]);

  if (!enabled) return null;

  function updateField(field, value) {
    const nextDraft = { ...draft, [field]: value };
    setDraft(nextDraft);
    setOverrides((current) => ({ ...current, [selected]: compactStyle(nextDraft) }));
  }

  function exportPositions() {
    const stage = document.querySelector(".profile-stage");
    if (!stage) return;
    const stageRect = stage.getBoundingClientRect();
    const result = {};
    document.querySelectorAll("[data-calibrate]").forEach((element) => {
      const key = element.getAttribute("data-calibrate");
      if (!key) return;
      const rect = element.getBoundingClientRect();
      const computed = window.getComputedStyle(element);
      result[key] = {
        left: toPercent(rect.left - stageRect.left, stageRect.width),
        top: toPercent(rect.top - stageRect.top, stageRect.height),
        width: toPercent(rect.width, stageRect.width),
        height: toPercent(rect.height, stageRect.height),
        fontSize: computed.fontSize
      };
    });
    const json = JSON.stringify(result, null, 2);
    console.log("Profile calibration positions", result);
    navigator.clipboard?.writeText(json).catch(() => {});
  }

  return (
    <div className="profile-calibrator">
      <strong>Profile Calibration</strong>
      <select value={selected} onChange={(event) => setSelected(event.target.value)}>
        {targetIds.map((targetId) => <option key={targetId} value={targetId}>{targetId}</option>)}
      </select>
      {["left", "top", "width", "height", "fontSize"].map((field) => (
        <label key={field}>
          <span>{field}</span>
          <input value={draft[field] || ""} onChange={(event) => updateField(field, event.target.value)} placeholder={field === "fontSize" ? "22px" : "0%"} />
        </label>
      ))}
      <button type="button" onClick={exportPositions}>EXPORT POSITIONS</button>
    </div>
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

function isProfileCalibrationEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(PROFILE_CALIBRATION_QUERY_KEY) === "1";
}

function toPercent(value, total) {
  if (!total) return "0%";
  return `${((value / total) * 100).toFixed(2)}%`;
}

function compactStyle(style) {
  return Object.fromEntries(Object.entries(style).filter(([, value]) => String(value || "").trim()));
}
