import { useState } from "react";
import { DepositPanel } from "../components/DepositPanel.jsx";
import { ETH_VAULT_ADDRESS } from "../config/chainTargets.js";
import { confirmEntryLock, createRoom, joinRoom } from "../network/socketClient.js";

const TIERS = [
  { code: "1", label: "Tier A" },
  { code: "4", label: "Tier B" },
  { code: "16", label: "Tier C" }
];

export function HighStakesScreen({ profile, onRoomReady, onBack }) {
  const [room, setRoom] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  async function makeRoom(tier) {
    await run(async () => {
      const created = await createRoom({ visibility: "public", roomMode: "high_stakes", entryTier: tier.code, profile });
      setRoom(created);
    });
  }

  async function enterRoom() {
    const code = clean(joinCode);
    if (code.length !== 4) return setError("Enter a 4-character room code.");
    await run(async () => {
      const joined = await joinRoom({ roomCode: code, profile });
      setRoom(joined);
    });
  }

  async function verifyLock() {
    if (!room) return;
    await run(async () => {
      const nextRoom = await confirmEntryLock({ roomCode: room.roomCode, profile, txHash: "manual" });
      onRoomReady(nextRoom);
    });
  }

  async function copyText(label, value) {
    try {
      await navigator.clipboard.writeText(value || "");
      setCopied(label);
      setTimeout(() => setCopied(""), 1200);
    } catch {
      setError("Copy failed.");
    }
  }

  async function run(action) {
    if (busy) return;
    try {
      setBusy(true);
      setError("");
      await action();
    } catch (err) {
      setError(err.message || "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="screen">
      <div className="card">
        <h1>Testnet Lock Lab</h1>
        <p className="note">{profile.name} · {profile.points} points</p>
        <DepositPanel />

        {!room && (
          <>
            <div className="rules-panel">
              <strong>Testnet room check</strong>
              <span>Create or join a room, complete the vault lock manually, then verify it here.</span>
              <span>Four confirmed real players are required. Bots are disabled.</span>
            </div>

            <h2>Create</h2>
            {TIERS.map((tier) => (
              <button className="primary-btn" key={tier.code} disabled={busy} onClick={() => makeRoom(tier)}>
                Create {tier.label}
              </button>
            ))}

            <h2>Join</h2>
            <input className="input" value={joinCode} placeholder="ROOM CODE" maxLength={4} onChange={(event) => setJoinCode(clean(event.target.value))} />
            <button className="primary-btn" disabled={busy} onClick={enterRoom}>Join Room</button>
          </>
        )}

        {room && (
          <>
            <div className="rules-panel">
              <strong>Room</strong>
              <span>{room.roomCode}</span>
              <strong>Vault</strong>
              <span>{ETH_VAULT_ADDRESS}</span>
              <strong>Contract match key</strong>
              <span>{room.contractMatchId}</span>
              <strong>Required testnet amount wei</strong>
              <span>{room.entryWei}</span>
            </div>

            <button className="secondary-btn" onClick={() => copyText("room", room.roomCode)}>{copied === "room" ? "Copied" : "Copy Room Code"}</button>
            <button className="secondary-btn" onClick={() => copyText("vault", ETH_VAULT_ADDRESS)}>{copied === "vault" ? "Copied" : "Copy Vault Address"}</button>
            <button className="secondary-btn" onClick={() => copyText("match", room.contractMatchId)}>{copied === "match" ? "Copied" : "Copy Match Key"}</button>
            <button className="secondary-btn" onClick={() => copyText("amount", room.entryWei)}>{copied === "amount" ? "Copied" : "Copy Amount"}</button>

            <p className="note">
              Manually call depositAndLock(matchId) on the upgraded ETH vault with the amount above as msg.value, then press Verify.
            </p>

            <button className="primary-btn" disabled={busy} onClick={verifyLock}>Verify Lock And Continue</button>
            <button className="secondary-btn" disabled={busy} onClick={() => setRoom(null)}>Choose Another Room</button>
          </>
        )}

        {error && <p className="error">{error}</p>}
        <button className="secondary-btn" disabled={busy} onClick={onBack}>Back To Hub</button>
      </div>
    </section>
  );
}

function clean(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}
