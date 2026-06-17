import { useEffect, useMemo, useState } from "react";
import { formatEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import { ETH_TARGETS_READY, ETH_VAULT_ADDRESS } from "../config/chainTargets.js";
import { ethVaultAbi } from "../contracts/abis.js";
import "../styles/highStakesRecovery.css";

export function ExpiredLockRecovery({ room, busy, onRecovered }) {
  const { address } = useAccount();
  const { data: abstractClient } = useAbstractClient();
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [recovering, setRecovering] = useState(false);
  const [message, setMessage] = useState("");

  const matchId = room?.contractMatchId;
  const enabled = Boolean(address && matchId && ETH_TARGETS_READY);

  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 15000);
    return () => clearInterval(timer);
  }, []);

  const lockedEntryQuery = useReadContract({
    address: ETH_VAULT_ADDRESS,
    abi: ethVaultAbi,
    functionName: "lockedEntry",
    args: enabled ? [matchId, address] : undefined,
    query: { enabled }
  });

  const lockDeadlineQuery = useReadContract({
    address: ETH_VAULT_ADDRESS,
    abi: ethVaultAbi,
    functionName: "lockDeadline",
    args: enabled ? [matchId, address] : undefined,
    query: { enabled }
  });

  const lockedEntry = lockedEntryQuery.data || 0n;
  const lockDeadline = lockDeadlineQuery.data || 0n;
  const hasLock = lockedEntry > 0n;
  const deadlineSeconds = Number(lockDeadline || 0n);
  const isExpired = hasLock && deadlineSeconds > 0 && now >= deadlineSeconds;
  const minutesLeft = useMemo(() => Math.max(0, Math.ceil((deadlineSeconds - now) / 60)), [deadlineSeconds, now]);

  async function recoverLock() {
    if (!abstractClient || !matchId || !isExpired) return;
    try {
      setRecovering(true);
      setMessage("Open AGW to recover your expired entry lock.");
      await abstractClient.writeContract({ address: ETH_VAULT_ADDRESS, abi: ethVaultAbi, functionName: "refundExpiredEntry", args: [matchId] });
      setMessage("Recovery submitted. Refreshing balances...");
      await Promise.all([lockedEntryQuery.refetch?.(), lockDeadlineQuery.refetch?.(), onRecovered?.()]);
      setMessage("Expired entry lock recovered to available balance.");
    } catch (err) {
      setMessage(err.shortMessage || err.message || "Could not recover expired lock.");
    } finally {
      setRecovering(false);
    }
  }

  if (!enabled || !hasLock) return null;

  return (
    <div className="highstakes-recovery-panel">
      <strong>Entry Lock Recovery</strong>
      <span>{formatEntry(lockedEntry)} ETH locked for this room.</span>
      {!isExpired && <span>Recovery unlocks in about {minutesLeft} minute{minutesLeft === 1 ? "" : "s"} if the room stays unfinished.</span>}
      {isExpired && <button type="button" className="highstakes-modal-primary" disabled={busy || recovering} onClick={recoverLock}>{recovering ? "Recovering..." : "Recover Expired Lock"}</button>}
      {message && <span>{message}</span>}
    </div>
  );
}

function formatEntry(value) {
  try {
    return trimEth(formatEther(value || 0n));
  } catch {
    return "0";
  }
}

function trimEth(value) {
  const [whole, decimal = ""] = String(value || "0").split(".");
  const cleanDecimal = decimal.slice(0, 6).replace(/0+$/, "");
  return cleanDecimal ? `${whole}.${cleanDecimal}` : whole;
}
