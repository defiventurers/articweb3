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
  const { address, isConnected } = useAccount();
  const { data: abstractClient } = useAbstractClient();

  const enabled = Boolean(address && CHAIN_TARGETS_READY);
  const parsedAmount = parseSafeAmount(amount);

  const balanceQuery = useReadContract({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "availableBalance",
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

  const availableBalance = balanceQuery.data || 0n;
  const allowance = allowanceQuery.data || 0n;
  const hasEnoughAllowance = parsedAmount > 0n && allowance >= parsedAmount;

  async function refresh() {
    await Promise.all([balanceQuery.refetch(), allowanceQuery.refetch()]);
  }

  async function approveToken() {
    if (!abstractClient || parsedAmount <= 0n) return;
    setBusy(true);
    setMessage("");
    try {
      await abstractClient.writeContract({
        address: TOKEN_ADDRESS,
        abi: tokenAbi,
        functionName: "approve",
        args: [VAULT_ADDRESS, parsedAmount]
      });
      setMessage("Approval submitted. Refresh after it confirms.");
      await refresh();
    } catch (err) {
      setMessage(err.message || "Approval failed.");
    } finally {
      setBusy(false);
    }
  }

  async function depositToken() {
    if (!abstractClient || parsedAmount <= 0n) return;
    setBusy(true);
    setMessage("");
    try {
      await abstractClient.writeContract({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "deposit",
        args: [parsedAmount]
      });
      setMessage("Deposit submitted. Refresh after it confirms.");
      await refresh();
    } catch (err) {
      setMessage(err.message || "Deposit failed.");
    } finally {
      setBusy(false);
    }
  }

  async function withdrawToken() {
    if (!abstractClient || parsedAmount <= 0n) return;
    setBusy(true);
    setMessage("");
    try {
      await abstractClient.writeContract({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "withdraw",
        args: [parsedAmount]
      });
      setMessage("Withdraw submitted. Refresh after it confirms.");
      await refresh();
    } catch (err) {
      setMessage(err.message || "Withdraw failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="deposit-panel">
      <strong>USDC Game Balance</strong>
      <span>Available: {formatUnits(availableBalance, TOKEN_DECIMALS)} USDC</span>
      <span>Locked: 0.00 USDC</span>

      {!CHAIN_TARGETS_READY && (
        <span>Deploy the testnet contract and add VITE_TOKEN_ADDRESS plus VITE_VAULT_ADDRESS.</span>
      )}

      {CHAIN_TARGETS_READY && !isConnected && <span>Connect AGW first.</span>}

      <input
        className="text-input"
        placeholder="Amount"
        inputMode="decimal"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      />

      <button className="secondary-btn" disabled={!enabled || busy || parsedAmount <= 0n} onClick={refresh}>
        Refresh Balance
      </button>

      <button className="secondary-btn" disabled={!enabled || busy || parsedAmount <= 0n} onClick={approveToken}>
        Approve USDC
      </button>

      <button className="secondary-btn" disabled={!enabled || busy || !hasEnoughAllowance} onClick={depositToken}>
        Deposit USDC
      </button>

      <button className="secondary-btn" disabled={!enabled || busy || parsedAmount <= 0n || availableBalance < parsedAmount} onClick={withdrawToken}>
        Withdraw USDC
      </button>

      {message && <span>{message}</span>}
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
