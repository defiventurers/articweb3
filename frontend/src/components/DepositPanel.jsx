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
import { useChainGuard } from "../hooks/useChainGuard.js";

export function DepositPanel({ variant = "panel" }) {
  const [currency, setCurrency] = useState("ETH");
  const [amount, setAmount] = useState("0.001");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const { address, isConnected } = useAccount();
  const { data: abstractClient } = useAbstractClient();
  const { isWrongChain, expectedNetworkName } = useChainGuard();

  const isEth = currency === "ETH";
  const decimals = isEth ? ETH_DECIMALS : TOKEN_DECIMALS;
  const parsedDepositAmount = parseSafeAmount(amount, decimals);
  const parsedWithdrawAmount = parseSafeAmount(variant === "art" ? amount : withdrawAmount, decimals);
  const enabled = Boolean(address && !isWrongChain && (isEth ? ETH_TARGETS_READY : CHAIN_TARGETS_READY));
  const canUseContracts = Boolean(isConnected && !isWrongChain && abstractClient && enabled);

  const nativeBalanceQuery = useBalance({ address, query: { enabled: Boolean(address && !isWrongChain) } });
  const tokenWalletQuery = useReadContract({ address: TOKEN_ADDRESS, abi: tokenAbi, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: Boolean(address && !isWrongChain && CHAIN_TARGETS_READY) } });
  const usdcAvailableQuery = useReadContract({ address: VAULT_ADDRESS, abi: vaultAbi, functionName: "availableBalance", args: address ? [address] : undefined, query: { enabled: Boolean(address && !isWrongChain && CHAIN_TARGETS_READY) } });
  const usdcLockedQuery = useReadContract({ address: VAULT_ADDRESS, abi: vaultAbi, functionName: "lockedBalance", args: address ? [address] : undefined, query: { enabled: Boolean(address && !isWrongChain && CHAIN_TARGETS_READY) } });
  const allowanceQuery = useReadContract({ address: TOKEN_ADDRESS, abi: tokenAbi, functionName: "allowance", args: address ? [address, VAULT_ADDRESS] : undefined, query: { enabled: Boolean(address && !isWrongChain && CHAIN_TARGETS_READY) } });
  const ethAvailableQuery = useReadContract({ address: ETH_VAULT_ADDRESS, abi: ethVaultAbi, functionName: "availableBalance", args: address ? [address] : undefined, query: { enabled: Boolean(address && !isWrongChain && ETH_TARGETS_READY) } });
  const ethLockedQuery = useReadContract({ address: ETH_VAULT_ADDRESS, abi: ethVaultAbi, functionName: "lockedBalance", args: address ? [address] : undefined, query: { enabled: Boolean(address && !isWrongChain && ETH_TARGETS_READY) } });

  const walletBalance = isEth ? nativeBalanceQuery.data?.value || 0n : tokenWalletQuery.data || 0n;
  const availableBalance = isEth ? ethAvailableQuery.data || 0n : usdcAvailableQuery.data || 0n;
  const lockedBalance = isEth ? ethLockedQuery.data || 0n : usdcLockedQuery.data || 0n;
  const allowance = allowanceQuery.data || 0n;
  const hasEnoughAllowance = isEth || (parsedDepositAmount > 0n && allowance >= parsedDepositAmount);
  const hasEnoughWalletBalance = parsedDepositAmount > 0n && walletBalance >= parsedDepositAmount;
  const isConfigured = isEth ? ETH_TARGETS_READY : CHAIN_TARGETS_READY;
  const canWithdraw = canUseContracts && parsedWithdrawAmount > 0n && availableBalance >= parsedWithdrawAmount;
  const disabledReason = getDisabledReason({ isConnected, isWrongChain, isConfigured, canUseContracts, hasEnoughAllowance, hasEnoughWalletBalance, parsedDepositAmount, expectedNetworkName, currency });

  function selectCurrency(nextCurrency) {
    setCurrency(nextCurrency);
    setMessage("");
    setWithdrawAmount("");
  }

  async function refresh() {
    await Promise.all([
      nativeBalanceQuery.refetch?.(), tokenWalletQuery.refetch(), usdcAvailableQuery.refetch(), usdcLockedQuery.refetch(), allowanceQuery.refetch(), ethAvailableQuery.refetch(), ethLockedQuery.refetch()
    ]);
  }

  async function approveToken() {
    if (isEth || !canUseContracts || parsedDepositAmount <= 0n) return;
    await runTransaction("Approval", async () => abstractClient.writeContract({ address: TOKEN_ADDRESS, abi: tokenAbi, functionName: "approve", args: [VAULT_ADDRESS, parsedDepositAmount] }));
  }

  async function deposit() {
    if (!canUseContracts || parsedDepositAmount <= 0n || !hasEnoughWalletBalance || !hasEnoughAllowance) return;
    if (isEth) {
      await runTransaction("ETH deposit", async () => abstractClient.writeContract({ address: ETH_VAULT_ADDRESS, abi: ethVaultAbi, functionName: "deposit", value: parsedDepositAmount }));
      return;
    }
    await runTransaction("USDC deposit", async () => abstractClient.writeContract({ address: VAULT_ADDRESS, abi: vaultAbi, functionName: "deposit", args: [parsedDepositAmount] }));
  }

  function fillMaxWithdraw() {
    setWithdrawAmount(formatInputAmount(availableBalance, decimals));
  }

  async function withdraw() {
    if (!canWithdraw) return;
    await runTransaction(`${currency} withdraw`, async () => abstractClient.writeContract({ address: isEth ? ETH_VAULT_ADDRESS : VAULT_ADDRESS, abi: isEth ? ethVaultAbi : vaultAbi, functionName: "withdraw", args: [parsedWithdrawAmount] }));
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

  if (variant === "art") {
    return (
      <>
        <div id="playerHubWalletBalance" className="playerhub-balance-value wallet-value">{formatAmount(walletBalance, decimals)} {currency}</div>
        <div id="playerHubAvailableBalance" className="playerhub-balance-value available-value">{formatAmount(availableBalance, decimals)} {currency}</div>
        <div id="playerHubLockedBalance" className="playerhub-balance-value locked-value">{formatAmount(lockedBalance, decimals)} {currency}</div>
        <input
          id="playerHubAmountInput"
          className="playerhub-amount-input"
          inputMode="decimal"
          autoComplete="off"
          aria-label={`Amount in ${currency}`}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />

        <button id="ethTabBtn" className={`screen-hitbox eth-tab-hitbox ${isEth ? "active" : ""}`} aria-label="ETH" onClick={() => selectCurrency("ETH")} />
        <button id="usdcTabBtn" className={`screen-hitbox usdc-tab-hitbox ${!isEth ? "active" : ""}`} aria-label="USDC" onClick={() => selectCurrency("USDC")} />
        <button id="refreshBalanceBtn" className="screen-hitbox refresh-hitbox" aria-label="Refresh" disabled={busy || isWrongChain} onClick={refresh} />
        <button id="depositBtn" className="screen-hitbox deposit-hitbox" aria-label={disabledReason || "Deposit"} disabled={!canUseContracts || busy || !hasEnoughAllowance || !hasEnoughWalletBalance} onClick={deposit} />
        <button id="withdrawBtn" className="screen-hitbox withdraw-hitbox" aria-label="Withdraw from available balance" disabled={!canUseContracts || busy || !canWithdraw} onClick={withdraw} />
        <div className={`ph-toast ${messageType === "error" ? "error" : ""}`}>{message || disabledReason}</div>
        {!isEth && parsedDepositAmount > 0n && !hasEnoughAllowance && <button className="ph-hit ph-approve" aria-label="Approve USDC" disabled={!canUseContracts || busy} onClick={approveToken}>Approve</button>}
      </>
    );
  }

  return (
    <div className="wallet-panel">
      <div className="wallet-panel-header"><strong>Game Balance</strong><span className={`wallet-status-pill ${isConfigured && !isWrongChain ? "ready" : ""}`}>{isConfigured && !isWrongChain ? `${currency} Ready` : "Open Ice Free"}</span></div>
      <div className="wallet-action-row"><button className={`wallet-btn ${isEth ? "primary" : ""}`} onClick={() => selectCurrency("ETH")}>ETH</button><button className={`wallet-btn ${!isEth ? "primary" : ""}`} onClick={() => selectCurrency("USDC")}>USDC</button></div>
      <div className="wallet-balance-grid"><div className="wallet-balance-box"><span>Wallet</span><strong>{formatAmount(walletBalance, decimals)} {currency}</strong></div><div className="wallet-balance-box"><span>Available / withdrawable</span><strong>{formatAmount(availableBalance, decimals)} {currency}</strong></div><div className="wallet-balance-box"><span>Locked</span><strong>{formatAmount(lockedBalance, decimals)} {currency}</strong></div></div>
      {!isConfigured ? <p className="wallet-info-note">{currency} vault is not deployed yet. Open Ice does not need crypto.</p> : <><label className="wallet-field-label">Deposit amount</label><input className="wallet-amount-input" placeholder="Deposit amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /><div className="wallet-action-row"><button className="wallet-btn" disabled={busy || isWrongChain} onClick={refresh}>Refresh</button>{!isEth && <button className="wallet-btn" disabled={!canUseContracts || busy || parsedDepositAmount <= 0n} onClick={approveToken}>Approve</button>}<button className="wallet-btn primary" disabled={!canUseContracts || busy || !hasEnoughAllowance || !hasEnoughWalletBalance} onClick={deposit}>Deposit</button></div><label className="wallet-field-label">Withdraw from available</label><div className="wallet-withdraw-row"><input className="wallet-amount-input" placeholder={`Up to ${formatInputAmount(availableBalance, decimals)} ${currency}`} inputMode="decimal" value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} /><button className="wallet-btn" disabled={busy || isWrongChain || availableBalance <= 0n} onClick={fillMaxWithdraw}>Max</button><button className="wallet-btn" disabled={busy || !canWithdraw} onClick={withdraw}>Withdraw</button></div>{disabledReason && <p className="wallet-info-note">{disabledReason}</p>}{!isEth && parsedDepositAmount > 0n && !hasEnoughAllowance && <p className="wallet-info-note">Approve this deposit amount before depositing USDC.</p>}{parsedWithdrawAmount > availableBalance && <p className="wallet-info-note">Withdraw amount is higher than your available balance.</p>}</>}
      {message && <p className={`wallet-message ${messageType === "error" ? "error" : ""}`}>{message}</p>}
    </div>
  );
}

function getDisabledReason({ isConnected, isWrongChain, isConfigured, hasEnoughAllowance, hasEnoughWalletBalance, parsedDepositAmount, expectedNetworkName, currency }) {
  if (!isConnected) return "Connect AGW from the profile screen first.";
  if (isWrongChain) return `Switch to ${expectedNetworkName} before using deposits or withdrawals.`;
  if (!isConfigured) return `${currency} vault is not configured for this environment.`;
  if (parsedDepositAmount <= 0n) return "Enter an amount greater than zero.";
  if (!hasEnoughWalletBalance) return `Not enough ${currency} in wallet.`;
  if (!hasEnoughAllowance) return `Approve ${currency} before depositing.`;
  return "";
}

function parseSafeAmount(value, decimals) { try { if (!value || Number(value) <= 0) return 0n; return parseUnits(value, decimals); } catch { return 0n; } }
function formatAmount(value, decimals) { const formatted = formatUnits(value || 0n, decimals); const [whole, decimal = ""] = formatted.split("."); const cleanDecimal = decimal.slice(0, decimals === 18 ? 5 : 2).replace(/0+$/, ""); return cleanDecimal ? `${whole}.${cleanDecimal}` : whole; }
function formatInputAmount(value, decimals) { const formatted = formatUnits(value || 0n, decimals); return formatted.includes(".") ? formatted.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "").replace(/\.$/, "") : formatted; }
function compactHash(hash) { if (!hash) return "transaction sent"; return `${hash.slice(0, 6)}...${hash.slice(-4)}`; }
