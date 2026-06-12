import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import {
  CHAIN_TARGETS_READY,
  ETH_DECIMALS,
  ETH_TARGETS_READY,
  ETH_VAULT_ADDRESS,
  TOKEN_ADDRESS,
  TOKEN_DECIMALS,
  VAULT_ADDRESS
} from "../config/chainTargets.js";
import { ethVaultAbi, tokenAbi, vaultAbi } from "../contracts/abis.js";

export function DepositPanel() {
  const [currency, setCurrency] = useState("ETH");
  const [amount, setAmount] = useState("0.001");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const { address, isConnected } = useAccount();
  const { data: abstractClient } = useAbstractClient();

  const isEth = currency === "ETH";
  const decimals = isEth ? ETH_DECIMALS : TOKEN_DECIMALS;
  const parsedAmount = parseSafeAmount(amount, decimals);
  const enabled = Boolean(address && (isEth ? ETH_TARGETS_READY : CHAIN_TARGETS_READY));
  const canUseContracts = Boolean(isConnected && abstractClient && enabled);

  const nativeBalanceQuery = useBalance({
    address,
    query: { enabled: Boolean(address) }
  });

  const tokenWalletQuery = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && CHAIN_TARGETS_READY) }
  });

  const usdcAvailableQuery = useReadContract({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "availableBalance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && CHAIN_TARGETS_READY) }
  });

  const usdcLockedQuery = useReadContract({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "lockedBalance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && CHAIN_TARGETS_READY) }
  });

  const allowanceQuery = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: "allowance",
    args: address ? [address, VAULT_ADDRESS] : undefined,
    query: { enabled: Boolean(address && CHAIN_TARGETS_READY) }
  });

  const ethAvailableQuery = useReadContract({
    address: ETH_VAULT_ADDRESS,
    abi: ethVaultAbi,
    functionName: "availableBalance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && ETH_TARGETS_READY) }
  });

  const ethLockedQuery = useReadContract({
    address: ETH_VAULT_ADDRESS,
    abi: ethVaultAbi,
    functionName: "lockedBalance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && ETH_TARGETS_READY) }
  });

  const walletBalance = isEth ? nativeBalanceQuery.data?.value || 0n : tokenWalletQuery.data || 0n;
  const availableBalance = isEth ? ethAvailableQuery.data || 0n : usdcAvailableQuery.data || 0n;
  const lockedBalance = isEth ? ethLockedQuery.data || 0n : usdcLockedQuery.data || 0n;
  const allowance = allowanceQuery.data || 0n;
  const hasEnoughAllowance = isEth || (parsedAmount > 0n && allowance >= parsedAmount);
  const hasEnoughWalletBalance = parsedAmount > 0n && walletBalance >= parsedAmount;
  const isConfigured = isEth ? ETH_TARGETS_READY : CHAIN_TARGETS_READY;

  async function refresh() {
    await Promise.all([
      nativeBalanceQuery.refetch?.(),
      tokenWalletQuery.refetch(),
      usdcAvailableQuery.refetch(),
      usdcLockedQuery.refetch(),
      allowanceQuery.refetch(),
      ethAvailableQuery.refetch(),
      ethLockedQuery.refetch()
    ]);
  }

  async function approveToken() {
    if (isEth || !canUseContracts || parsedAmount <= 0n) return;
    await runTransaction("Approval", async () => {
      return abstractClient.writeContract({
        address: TOKEN_ADDRESS,
        abi: tokenAbi,
        functionName: "approve",
        args: [VAULT_ADDRESS, parsedAmount]
      });
    });
  }

  async function deposit() {
    if (!canUseContracts || parsedAmount <= 0n || !hasEnoughWalletBalance || !hasEnoughAllowance) return;

    if (isEth) {
      await runTransaction("ETH deposit", async () => {
        return abstractClient.writeContract({
          address: ETH_VAULT_ADDRESS,
          abi: ethVaultAbi,
          functionName: "deposit",
          value: parsedAmount
        });
      });
      return;
    }

    await runTransaction("USDC deposit", async () => {
      return abstractClient.writeContract({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "deposit",
        args: [parsedAmount]
      });
    });
  }

  async function withdraw() {
    if (!canUseContracts || parsedAmount <= 0n || availableBalance < parsedAmount) return;

    await runTransaction(`${currency} withdraw`, async () => {
      return abstractClient.writeContract({
        address: isEth ? ETH_VAULT_ADDRESS : VAULT_ADDRESS,
        abi: isEth ? ethVaultAbi : vaultAbi,
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
        <strong>Game Balance</strong>
        <span className={`wallet-status-pill ${isConfigured ? "ready" : ""}`}>
          {isConfigured ? `${currency} Ready` : "Open Ice Free"}
        </span>
      </div>

      <div className="wallet-action-row">
        <button className={`wallet-btn ${isEth ? "primary" : ""}`} onClick={() => setCurrency("ETH")}>
          ETH
        </button>
        <button className={`wallet-btn ${!isEth ? "primary" : ""}`} onClick={() => setCurrency("USDC")}>
          USDC
        </button>
      </div>

      <div className="wallet-balance-grid">
        <div className="wallet-balance-box">
          <span>Wallet</span>
          <strong>{formatAmount(walletBalance, decimals)} {currency}</strong>
        </div>
        <div className="wallet-balance-box">
          <span>Available</span>
          <strong>{formatAmount(availableBalance, decimals)} {currency}</strong>
        </div>
        <div className="wallet-balance-box">
          <span>Locked</span>
          <strong>{formatAmount(lockedBalance, decimals)} {currency}</strong>
        </div>
      </div>

      {!isConfigured ? (
        <p className="wallet-info-note">
          {currency} vault is not deployed yet. Open Ice does not need crypto.
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
            <button className="wallet-btn" disabled={busy} onClick={refresh}>
              Refresh
            </button>
            {!isEth && (
              <button className="wallet-btn" disabled={!canUseContracts || busy || parsedAmount <= 0n} onClick={approveToken}>
                Approve
              </button>
            )}
            <button className="wallet-btn primary" disabled={!canUseContracts || busy || !hasEnoughAllowance || !hasEnoughWalletBalance} onClick={deposit}>
              Deposit
            </button>
            <button className="wallet-btn" disabled={!canUseContracts || busy || parsedAmount <= 0n || availableBalance < parsedAmount} onClick={withdraw}>
              Withdraw
            </button>
          </div>

          {!isEth && parsedAmount > 0n && !hasEnoughAllowance && (
            <p className="wallet-info-note">Approve this amount before depositing USDC.</p>
          )}
        </>
      )}

      {message && <p className={`wallet-message ${messageType === "error" ? "error" : ""}`}>{message}</p>}
    </div>
  );
}

function parseSafeAmount(value, decimals) {
  try {
    if (!value || Number(value) <= 0) return 0n;
    return parseUnits(value, decimals);
  } catch {
    return 0n;
  }
}

function formatAmount(value, decimals) {
  const formatted = formatUnits(value || 0n, decimals);
  const [whole, decimal = ""] = formatted.split(".");
  const cleanDecimal = decimal.slice(0, decimals === 18 ? 5 : 2).replace(/0+$/, "");
  return cleanDecimal ? `${whole}.${cleanDecimal}` : whole;
}

function compactHash(hash) {
  if (!hash) return "transaction sent";
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}
