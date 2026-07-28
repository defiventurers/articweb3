import { useEffect, useState } from "react";
import { ProfileScreen } from "../../screens/ProfileScreen.jsx";
import { createProfile } from "../../network/socketClient.js";
import {
  createTwoStonesRoom,
  getMyTwoStonesRooms,
  getTwoStonesHistory,
  getTwoStonesState,
  joinTwoStonesRoom,
  listTwoStonesRooms,
  submitTwoStonesAction
} from "../../network/twoStonesSocketClient.js";
import { StoneDock, TwoStonesBoard } from "./TwoStonesBoard.jsx";
import { describeTurn, getLegalActions, resultDetail, resultTitle } from "./rules.js";

export function TwoStonesOnline({ profile, onProfileChange, onBack }) {
  const [screen, setScreen] = useState("lobby");
  const [room, setRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [history, setHistory] = useState([]);
  const [roomCode, setRoomCode] = useState("");
  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { if (profile) refreshLobby(); }, [profile]);
  useEffect(() => {
    function handlePacket(event) {
      const packet = event.detail;
      if (packet?.type !== "ts_room_state") return;
      const nextRoom = packet.payload?.room;
      if (!nextRoom || (room && nextRoom.roomCode !== room.roomCode)) return;
      setRoom(nextRoom); setScreen("game"); setSelectedPieceId(null);
    }
    window.addEventListener("server-packet", handlePacket);
    return () => window.removeEventListener("server-packet", handlePacket);
  }, [room]);
  useEffect(() => {
    if (!profile || !room?.roomCode || screen !== "game") return;
    let cancelled = false;
    const sync = async () => {
      try {
        await createProfile({ address: profile.wallet, name: profile.name });
        const next = await getTwoStonesState({ roomCode: room.roomCode, profile });
        if (!cancelled) setRoom(next);
      } catch (err) { if (!cancelled) setMessage(err.message || "Reconnecting to the ice lock…"); }
    };
    const timer = window.setInterval(sync, 3500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [profile, room?.roomCode, screen]);

  async function withBusy(task) {
    try { setBusy(true); setMessage(""); return await task(); }
    catch (err) { setMessage(err.message || "Request failed."); return null; }
    finally { setBusy(false); }
  }
  async function login() { if (!profile) throw new Error("Create a profile first."); await createProfile({ address: profile.wallet, name: profile.name }); }
  async function refreshLobby() {
    await withBusy(async () => {
      await login();
      const [open, mine, past] = await Promise.all([listTwoStonesRooms(), getMyTwoStonesRooms({ profile }), getTwoStonesHistory({ profile })]);
      setRooms(open); setMyRooms(mine); setHistory(past);
    });
  }
  function openRoom(next) { setRoom(next); setSelectedPieceId(null); setScreen("game"); }
  async function createRoom(visibility, side) { const next = await withBusy(async () => { await login(); return createTwoStonesRoom({ visibility, side, profile }); }); if (next) openRoom(next); }
  async function joinRoom(code = roomCode) {
    const clean = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    if (clean.length !== 4) return setMessage("Enter a four-character room code.");
    const next = await withBusy(async () => { await login(); return joinTwoStonesRoom({ roomCode: clean, profile }); });
    if (next) { setRoomCode(clean); openRoom(next); }
  }
  async function resume(code) { const next = await withBusy(async () => { await login(); return getTwoStonesState({ roomCode: code, profile }); }); if (next) openRoom(next); }
  async function submitAction(action) { const next = await withBusy(() => submitTwoStonesAction({ roomCode: room.roomCode, profile, action })); if (next) openRoom(next); }

  if (!profile) return <ProfileScreen onComplete={onProfileChange} onBack={onBack} />;
  if (screen === "history") return <section className="ts-online" aria-label="Two Stones history"><header><button onClick={() => setScreen("lobby")}>← Lobby</button><h1>Instant Match History</h1><button onClick={refreshLobby}>Refresh</button></header><div className="ts-history">{!history.length && <p>No completed Two Stones matches yet.</p>}{history.map((entry) => <article key={entry.id}><strong>{entry.draw ? "Draw" : entry.won ? "Board Locked" : "Blocked"}</strong><span>Room {entry.roomCode} · {sideName(entry.team)}</span><small>{entry.rulesetVersion}</small></article>)}</div></section>;

  if (screen === "game" && room) {
    const me = room.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase());
    const opponent = room.players.find((player) => player.wallet.toLowerCase() !== profile.wallet.toLowerCase());
    const myTurn = room.status === "playing" && me?.role === room.gameState.currentPlayer;
    const legalActions = myTurn ? getLegalActions(room.gameState, me.role) : [];
    return <section className="ts-game ts-online-game" aria-label="Two Stones online match"><header><button onClick={() => { setScreen("lobby"); refreshLobby(); }}>← Lobby</button><div><p>ONLINE · {room.rulesetVersion}</p><h1>Room {room.roomCode}</h1></div><button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>Copy Code</button></header><main><StoneDock side="blue" state={room.gameState}/><div className="ts-centre"><div className="ts-turn-banner"><strong>{room.status === "waiting" ? "Waiting for a rival" : room.status === "finished" ? resultTitle(room.gameState) : myTurn ? describeTurn(room.gameState) : `${opponent?.name || "Opponent"} is choosing`}</strong><span>{room.status === "waiting" ? `Share code ${room.roomCode}` : room.status === "finished" ? resultDetail(room.gameState) : `You guide ${sideName(me?.role)}`}</span></div><TwoStonesBoard state={room.gameState} legalActions={legalActions} selectedPieceId={selectedPieceId} onSelectPiece={setSelectedPieceId} onAction={submitAction} interactive={myTurn && !busy}/>{message && <p className="ts-message" role="alert">{message}</p>}</div><StoneDock side="coral" state={room.gameState}/></main><footer><span>{me ? `You guide ${sideName(me.role)}` : "Spectating"}</span><span>{busy ? "Syncing authoritative state…" : "Every placement and slide is server validated."}</span></footer></section>;
  }

  return <section className="ts-online" aria-label="Two Stones online lobby"><header><button onClick={onBack}>← Two Stones</button><h1>Instant Match Lobby</h1><button onClick={() => setScreen("history")}>History</button></header><div className="ts-online-grid"><article><h2>Create as Aurora</h2><p>Aurora places first.</p><button disabled={busy} onClick={() => createRoom("public", "blue")}>Public Aurora Room</button><button disabled={busy} onClick={() => createRoom("private", "blue")}>Private Aurora Room</button></article><article><h2>Create as Coral</h2><p>The joining player takes Aurora and the first placement.</p><button disabled={busy} onClick={() => createRoom("public", "coral")}>Public Coral Room</button><button disabled={busy} onClick={() => createRoom("private", "coral")}>Private Coral Room</button></article><article><h2>Join by Code</h2><input aria-label="Two Stones room code" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={4} placeholder="ABCD"/><button disabled={busy} onClick={() => joinRoom()}>Join Room</button></article><article><h2>Open Locks</h2>{!rooms.length && <p>No public challenge is waiting.</p>}{rooms.map((item) => <button key={item.roomCode} onClick={() => joinRoom(item.roomCode)}>{item.roomCode} · Join</button>)}</article><article className="wide"><h2>Your Reconnectable Matches</h2>{!myRooms.length && <p>No saved Two Stones room yet.</p>}{myRooms.map((item) => <button key={item.roomCode} onClick={() => resume(item.roomCode)}>{item.roomCode} · {item.status}</button>)}</article></div>{message && <p className="ts-message" role="alert">{message}</p>}<button className="ts-refresh" disabled={busy} onClick={refreshLobby}>{busy ? "Syncing…" : "Refresh Lobby"}</button></section>;
}

function sideName(side) { return side === "coral" ? "Coral Stones" : "Aurora Stones"; }
