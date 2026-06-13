import { useMemo, useState } from "react";
import { formatEther } from "viem";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import { ETH_VAULT_ADDRESS } from "../config/chainTargets.js";
import { ethVaultAbi } from "../contracts/abis.js";
import { recordVaultActivity } from "../network/socketClient.js";
import { addressUrl, txUrl, shortHash, shortAddress } from "../utils/explorerLinks.js";
import { shortVerificationStatus, verifyDiceProofs } from "../utils/diceProofVerifier.js";

const TEAM_LABELS = { green: "Abster", red: "Retsba", blue: "Pengu", yellow: "Polly" };

export function ResultsScreen({ room, profile, onBackToLobby }) {
  const { data: abstractClient } = useAbstractClient();
  const [claimStatus, setClaimStatus] = useState("");
  const [claimError, setClaimError] = useState("");
  const [withdrawalTxHash, setWithdrawalTxHash] = useState("");
  const [withdrawalStatus, setWithdrawalStatus] = useState("");
  const [verifyReport, setVerifyReport] = useState(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const placements = room.placements?.length ? room.placements : fallbackPlacements(room);
  const payoutByWallet = new Map((room.payoutPlan || []).map((item) => [String(item.wallet || "").toLowerCase(), item]));
  const profileWallet = String(profile?.wallet || "").toLowerCase();
  const myPayout = profileWallet ? payoutByWallet.get(profileWallet) : null;
  const myPlayer = (room.players || []).find((player) => String(player.wallet || "").toLowerCase() === profileWallet);
  const myPayoutWei = BigInt(myPayout?.payoutWei || "0");
  const isEscrowTestRoom = room.roomMode === "high_stakes";
  const canClaim = isEscrowTestRoom && myPayoutWei > 0n && room.settlementStatus === "settled";
  const shareUrl = useMemo(() => `${window.location.origin}${window.location.pathname}?spectate=${room.roomCode}`, [room.roomCode]);
  const randomness = room.randomness || {};
  const diceProofs = randomness.diceProofs || [];

  async function claimPayout() {
    if (!abstractClient || !profile) { setClaimError("Connect the winning player wallet first."); return; }
    try {
      setBusy(true); setClaimError(""); setWithdrawalStatus("confirming"); setClaimStatus("Open AGW and confirm payout withdrawal.");
      const txHash = await abstractClient.writeContract({ address: ETH_VAULT_ADDRESS, abi: ethVaultAbi, functionName: "withdraw", args: [myPayoutWei] });
      setWithdrawalTxHash(txHash); setWithdrawalStatus("submitted");
      await recordVaultActivity({ profile, activity: { type: "withdraw", currency: "ETH", amountWei: myPayoutWei.toString(), roomCode: room.roomCode, matchId: room.matchId, contractMatchId: room.contractMatchId, txHash, status: "submitted", note: "Winner payout withdrawal" } });
      setClaimStatus(`Withdrawal submitted: ${shortHash(txHash)}`);
    } catch (err) { setWithdrawalStatus("failed"); setClaimError(err.shortMessage || err.message || "Payout withdrawal failed."); } finally { setBusy(false); }
  }
  async function shareMatch() { try { await navigator.clipboard.writeText(shareUrl); setClaimStatus("Spectator link copied."); } catch { setClaimStatus(shareUrl); } }
  async function verifyProofs() { setVerifyBusy(true); try { setVerifyReport(await verifyDiceProofs(randomness)); } finally { setVerifyBusy(false); } }

  return <section className="screen proof-screen"><div className="card proof-card"><h1>Match Complete</h1><p className="note">Room {room.roomCode} · {isEscrowTestRoom ? "Testnet Lock Lab" : "Open Ice"}</p><div className="proof-actions"><button className="primary-btn" onClick={shareMatch}>Share Match</button><button className="primary-btn" disabled={!canClaim || busy} onClick={claimPayout}>{busy ? "Claiming..." : "Claim / Withdraw Payout"}</button></div>{myPayout && <p className="note">Your payout: {formatEth(myPayout.payoutWei)} ETH · +{myPayout.points} points</p>}{claimStatus && <p className="note">{claimStatus}</p>}{claimError && <p className="error-text">{claimError}</p>}<div className="room-list proof-list">{placements.map((player, index) => { const payout = payoutByWallet.get(String(player.wallet || "").toLowerCase()); return <div className="room-row proof-row" key={player.wallet || `${player.team}-${index}`}><strong>#{player.position || index + 1} · {player.name || "Player"}</strong><span>{TEAM_LABELS[player.team] || player.team}</span><span>{shortAddress(player.wallet)}</span>{payout && <span>{formatEth(payout.payoutWei)} ETH · +{payout.points} pts</span>}</div>; })}</div>{isEscrowTestRoom && <div className="rules-panel proof-grid"><strong>Settlement Proof</strong><span>Status: {room.settlementStatus || "pending"}</span><span>Contract Match ID: {shortHash(room.contractMatchId)}</span><span>Proof Hash: {room.proofHash ? shortHash(room.proofHash) : "—"}</span>{ETH_VAULT_ADDRESS && <a href={addressUrl(ETH_VAULT_ADDRESS)} target="_blank" rel="noreferrer">View Vault Contract</a>}{room.settlementTxHash ? <a href={txUrl(room.settlementTxHash)} target="_blank" rel="noreferrer">View Settlement Tx: {shortHash(room.settlementTxHash)}</a> : <span>Settlement Tx: waiting</span>}{myPlayer?.entryTxHash ? <a href={txUrl(myPlayer.entryTxHash)} target="_blank" rel="noreferrer">View Entry Lock Tx: {shortHash(myPlayer.entryTxHash)}</a> : null}<span>Withdrawal Status: {withdrawalStatus || "—"}</span>{withdrawalTxHash ? <a href={txUrl(withdrawalTxHash)} target="_blank" rel="noreferrer">View Withdrawal Tx: {shortHash(withdrawalTxHash)}</a> : <span>Withdrawal Tx: —</span>}{room.settlementError && <span>Settlement Error: {room.settlementError}</span>}{!canClaim && myPayoutWei > 0n && room.settlementStatus !== "settled" && <span>Claim unlocks after settlement is confirmed.</span>}</div>}<div className="rules-panel proof-grid"><strong>Commit-Reveal Dice Proof</strong><span>Scheme: {randomness.scheme || "server-commit-reveal-v1"}</span><span>Seed Hash: {randomness.serverSeedHash ? shortHash(randomness.serverSeedHash) : "—"}</span><span>Seed Reveal: {randomness.serverSeedReveal ? shortHash(randomness.serverSeedReveal) : "Revealed after match finish"}</span><span>Dice Proofs: {diceProofs.length}</span><button className="primary-btn" disabled={verifyBusy || !diceProofs.length} onClick={verifyProofs}>{verifyBusy ? "Verifying..." : "Verify Dice Proofs"}</button>{verifyReport && <span className={`verify-pill ${verifyReport.status}`}>{shortVerificationStatus(verifyReport.status)} · {verifyReport.summary}</span>}{(verifyReport?.results || diceProofs.slice(-6).map((proof) => ({ proof, status: "waiting", reason: "Not verified yet." }))).slice(-8).map((item) => <span className={`verify-line ${item.status}`} key={item.proof.inputHash}>Turn {item.proof.turnNonce} · {TEAM_LABELS[item.proof.team] || item.proof.team} · {item.proof.dice?.join(" / ")} · {shortVerificationStatus(item.status)} · {item.reason || shortHash(item.proof.inputHash)}</span>)}</div><button className="primary-btn" onClick={onBackToLobby}>Back To Lobby</button></div></section>;
}

function formatEth(value) { try { return formatEther(BigInt(value || "0")); } catch { return "0"; } }
function fallbackPlacements(room) { return (room.players || []).map((player, index) => ({ ...player, position: index + 1 })); }
