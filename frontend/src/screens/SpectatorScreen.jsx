import { useEffect, useMemo, useState } from "react";
import { formatEther } from "viem";
import { spectateRoom } from "../network/socketClient.js";
import { addressUrl, txUrl, shortHash, shortAddress } from "../utils/explorerLinks.js";
import { ETH_VAULT_ADDRESS } from "../config/chainTargets.js";

const TEAM_LABELS = { green: "Abster", red: "Retsba", blue: "Pengu", yellow: "Polly" };
const PIECE_LETTER = { king: "K", elephant: "E", horse: "H", ship: "S", pawn: "P" };

export function SpectatorScreen({ initialRoomCode = "", onBack }) {
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const payoutByWallet = useMemo(() => new Map((room?.payoutPlan || []).map((item) => [String(item.wallet || "").toLowerCase(), item])), [room]);
  const randomness = room?.randomness || {};
  const diceProofs = randomness.diceProofs || [];

  async function load(code = roomCode) {
    const cleaned = String(code || "").trim().toUpperCase();
    if (!cleaned) return;
    setLoading(true);
    setError("");
    try { const nextRoom = await spectateRoom({ roomCode: cleaned }); setRoom(nextRoom); setRoomCode(cleaned); }
    catch (err) { setError(err.message || "Could not load spectator room."); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (initialRoomCode) load(initialRoomCode); }, [initialRoomCode]);
  useEffect(() => { if (!room || room.status === "finished") return undefined; const timer = setInterval(() => load(room.roomCode), 3000); return () => clearInterval(timer); }, [room?.roomCode, room?.status]);

  return <section className="screen proof-screen"><div className="card proof-card"><h1>Spectator View</h1><p className="note">Enter a room code to watch a live or finished match read-only.</p><div className="proof-actions"><input className="wallet-amount-input" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="ROOM CODE" /><button className="primary-btn" disabled={loading} onClick={() => load()}>{loading ? "Loading..." : "Watch Room"}</button></div>{error && <p className="error-text">{error}</p>}{room && <><div className="rules-panel proof-grid"><strong>Room {room.roomCode}</strong><span>Status: {room.status}</span><span>Mode: {room.roomMode === "high_stakes" ? "High Stakes" : "Open Ice"}</span><span>Contract Match ID: {shortHash(room.contractMatchId)}</span><span>Proof Hash: {room.proofHash ? shortHash(room.proofHash) : "—"}</span>{room.settlementTxHash ? <a href={txUrl(room.settlementTxHash)} target="_blank" rel="noreferrer">Settlement Tx: {shortHash(room.settlementTxHash)}</a> : <span>Settlement Tx: —</span>}{ETH_VAULT_ADDRESS && <a href={addressUrl(ETH_VAULT_ADDRESS)} target="_blank" rel="noreferrer">Vault: {shortHash(ETH_VAULT_ADDRESS)}</a>}</div><div className="rules-panel proof-grid"><strong>Commit-Reveal Dice Proof</strong><span>Seed Hash: {randomness.serverSeedHash ? shortHash(randomness.serverSeedHash) : "—"}</span><span>Seed Reveal: {randomness.serverSeedReveal ? shortHash(randomness.serverSeedReveal) : "Hidden until match finish"}</span><span>Dice Proofs: {diceProofs.length}</span>{diceProofs.slice(-6).map((proof) => <span key={proof.inputHash}>Turn {proof.turnNonce} · {TEAM_LABELS[proof.team] || proof.team} · {proof.dice?.join(" / ")} · {shortHash(proof.inputHash)}</span>)}</div><div className="room-list proof-list">{(room.players || []).map((player) => { const payout = payoutByWallet.get(String(player.wallet || "").toLowerCase()); const placement = (room.placements || []).find((item) => String(item.wallet || "").toLowerCase() === String(player.wallet || "").toLowerCase()); return <div className="room-row proof-row" key={player.wallet}><strong>{placement ? `#${placement.position}` : "Player"} · {player.name || "Player"}</strong><span>{TEAM_LABELS[player.team] || player.team || "No team"}</span><span>{shortAddress(player.wallet)}</span>{player.entryTxHash ? <a href={txUrl(player.entryTxHash)} target="_blank" rel="noreferrer">Entry: {shortHash(player.entryTxHash)}</a> : <span>Entry: —</span>}{payout && <span>Payout: {formatEth(payout.payoutWei)} ETH · +{payout.points} pts</span>}</div>; })}</div>{room.gameState?.board && <ReadOnlyBoard board={room.gameState.board} />}</>}<button className="primary-btn" onClick={onBack}>Back</button></div></section>;
}

function ReadOnlyBoard({ board }) { return <div className="spectator-board-grid" aria-label="Read-only board">{board.flatMap((row, rowIndex) => row.map((piece, colIndex) => <div className="spectator-cell" key={`${rowIndex}-${colIndex}`}>{piece ? <span>{piece.team?.slice(0, 1)?.toUpperCase()}{PIECE_LETTER[piece.type] || "?"}</span> : null}</div>))}</div>; }
function formatEth(value) { try { return formatEther(BigInt(value || "0")); } catch { return "0"; } }
