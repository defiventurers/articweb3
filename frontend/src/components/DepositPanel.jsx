import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import { CHAIN_TARGETS_READY, TOKEN_ADDRESS, TOKEN_DECIMALS, VAULT_ADDRESS } from "../config/chainTargets.js";
import { tokenAbi, vaultAbi } from "../contracts/abis.js";

export function DepositPanel() {
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const { address, isConnected } = useAccount();
  const { data: abstractClient } = useAbstractClient();

  const enabled = Boolean(address && CHAIN_TARGETS_READY);
  const parsedAmount = parseSafeAmount(amount);

  const walletQuery = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled }
  });

  const balanceQuery = useReadContract({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "availableBalance",
    args: address ? [address] : undefined,
    query: { enabled }
  });

  const lockedQuery = useReadContract({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "lockedBalance",
    args: address ? [address] : undefined,
    query: { enabled }
  });

  const allowanceQuery = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: "allowance",
    args: address ? [address, VAULT_ADDRESS] : undefined,
    query: { enabled }
  });

  const walletBalance = walletQuery.data || 0n;
  const availableBalance = balanceQuery.data || 0n;
  const lockedBalance = lockedQuery.data || 0n;
  const allowance = allowanceQuery.data || 0n;
  const hasEnoughAllowance = parsedAmount > 0n && allowance >= parsedAmount;
  const hasEnoughWalletBalance = parsedAmount > 0n && walletBalance >= parsedAmount;
  const canUseContracts = Boolean(isConnected && abstractClient && enabled);

  async function refresh() {
    if (!enabled) return;
    await Promise.all([
      walletQuery.refetch(),
      balanceQuery.refetch(),
      lockedQuery.refetch(),
      allowanceQuery.refetch()
    ]);
  }

  async function approveToken() {
    if (!canUseContracts || parsedAmount <= 0n) return;
    await runTransaction("Approval", async () => {
      return abstractClient.writeContract({
        address: TOKEN_ADDRESS,
        abi: tokenAbi,
        functionName: "approve",
        args: [VAULT_ADDRESS, parsedAmount]
      });
    });
  }

  async function depositToken() {
    if (!canUseContracts || parsedAmount <= 0n || !hasEnoughAllowance) return;
    await runTransaction("Deposit", async () => {
      return abstractClient.writeContract({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "deposit",
        args: [parsedAmount]
      });
    });
  }

  async function withdrawToken() {
    if (!canUseContracts || parsedAmount <= 0n || availableBalance < parsedAmount) return;
    await runTransaction("Withdraw", async () => {
      return abstractClient.writeContract({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "withdraw",
        args: [parsedAmount]
      });
    });
  }

  async function runTransaction(label, action) {
    setBusy(true);
    setMessage("");
    setMessageType("info");

    try {
      const hash = await action();
      setMessage(`${label} submitted: ${compactHash(hash)}. Refresh after confirmation.`);
      await refresh();
    } catch (err) {
      setMessage(err.shortMessage || err.message || `${label} failed.`);
      setMessageType("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wallet-panel">
      <div className="wallet-panel-header">
        <strong>USDC Game Balance</strong>
        <span className={`wallet-status-pill ${CHAIN_TARGETS_READY ? "ready" : ""}`}>
          {CHAIN_TARGETS_READY ? "Testnet Ready" : "Open Ice Free"}
        </span>
      </div>

      <div className="wallet-balance-grid">
        <div className="wallet-balance-box">
          <span>Wallet</span>
          <strong>{formatAmount(walletBalance)} USDC</strong>
        </div>
        <div className="wallet-balance-box">
          <span>Available</span>
          <strong>{formatAmount(availableBalance)} USDC</strong>
        </div>
        <div className="wallet-balance-box">
          <span>Locked</span>
          <strong>{formatAmount(lockedBalance)} USDC</strong>
        </div>
      </div>

      {!CHAIN_TARGETS_READY ? (
        <p className="wallet-info-note">
          Deposits are not active yet. Open Ice does not need crypto — press Play Open Ice below to start.
        </p>
      ) : (
        <>
          {!isConnected && (
            <p className="wallet-info-note">Connect AGW from the profile screen before using deposits.</p>
          )}

          <input
            className="wallet-amount-input"
            placeholder="Amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />

          <div className="wallet-action-row">
            <button className="wallet-btn" disabled={!enabled || busy} onClick={refresh}>
              Refresh
            </button>
            <button className="wallet-btn" disabled={!canUseContracts || busy || parsedAmount <= 0n} onClick={approveToken}>
              Approve
            </button>
            <button className="wallet-btn primary" disabled={!canUseContracts || busy || !hasEnoughAllowance || !hasEnoughWalletBalance} onClick={depositToken}>
              Deposit
            </button>
            <button className="wallet-btn" disabled={!canUseContracts || busy || parsedAmount <= 0n || availableBalance < parsedAmount} onClick={withdrawToken}>
              Withdraw
            </button>
          </div>

          {parsedAmount > 0n && !hasEnoughAllowance && (
            <p className="wallet-info-note">Approve this amount before depositing.</p>
          )}
        </>
      )}

      {message && <p className={`wallet-message ${messageType === "error" ? "error" : ""}`}>{message}</p>}
    </div>
  );
}

function parseSafeAmount(value) {
  try {
    if (!value || Number(value) <= 0) return 0n;
    return parseUnits(value, TOKEN_DECIMALS);
  } catch {
    return 0n;
  }
}

function formatAmount(value) {
  const formatted = formatUnits(value || 0n, TOKEN_DECIMALS);
  const [whole, decimal = ""] = formatted.split(".");
  const cleanDecimal = decimal.slice(0, 2).replace(/0+$/, "");
  return cleanDecimal ? `${whole}.${cleanDecimal}` : whole;
}

function compactHash(hash) {
  if (!hash) return "transaction sent";
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}
