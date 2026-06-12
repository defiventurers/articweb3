import { useState } from "react";
import { formatEther } from "viem";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import { DepositPanel } from "../components/DepositPanel.jsx";
import { ETH_VAULT_ADDRESS } from "../config/chainTargets.js";
import { ethVaultAbi } from "../contracts/abis.js";
import { confirmEntryLock, createRoom, joinRoom } from "../network/socketClient.js";

const TIERS = [
  { code: "1", label: "Tier A" },
  { code: "4", label: "Tier B" },
  { code: "16", label: "Tier C" }
];

export function HighStakesScreen({ profile, onRoomReady, onBack }) {
  const { data: abstractClient } = useAbstractClient();
  const [room, setRoom] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

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

  async function confirmWithWallet() {
    if (!room) return;
    if (!abstractClient) return setError("Wallet client is not ready. Reconnect AGW and try again.");
    await run(async () => {
      const value = BigInt(room.entryWei || "0");
      if (!room.contractMatchId || value <= 0n) throw new Error("Room data is not ready.");
      setStatus("Open AGW and confirm the testnet lock.");
      const txHash = await abstractClient.writeContract({
        address: ETH_VAULT_ADDRESS,
        abi: ethVaultAbi,
        functionName: "depositAndLock",
        args: [room.contractMatchId],
        value
      });
      setStatus("Confirming on server...");
      const nextRoom = await waitForLock(txHash);
      onRoomReady(nextRoom);
    });
  }

  async function waitForLock(txHash) {
    let lastError;
    for (let attempt = 0; attempt < 18; attempt += 1) {
      try {
        return await confirmEntryLock({ roomCode: room.roomCode, profile, txHash });
      } catch (err) {
        lastError = err;
        await delay(2500);
      }
    }
    throw lastError || new Error("Server could not verify yet. Wait a few seconds and try again.");
  }

  async function run(action) {
    if (busy) return;
    try {
      setBusy(true);
      setError("");
      await action();
    } catch (err) {
      setError(err.shortMessage || err.message || "Request failed.");
    } finally {
      setBusy(false);
      setStatus("");
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
              <span>Create or join a room, then confirm once in AGW.</span>
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
              <strong>Required testnet ETH</strong>
              <span>{formatEther(BigInt(room.entryWei || "0"))} ETH</span>
            </div>

            <p className="note">Press the button below. AGW will open and ask you to confirm one testnet transaction.</p>
            <button className="primary-btn" disabled={busy} onClick={confirmWithWallet}>
              {busy ? "Working..." : "Confirm Testnet Lock"}
            </button>
            <button className="secondary-btn" disabled={busy} onClick={() => setRoom(null)}>Choose Another Room</button>
          </>
        )}

        {status && <p className="note">{status}</p>}
        {error && <p className="error">{error}</p>}
        <button className="secondary-btn" disabled={busy} onClick={onBack}>Back To Hub</button>
      </div>
    </section>
  );
}

function clean(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
