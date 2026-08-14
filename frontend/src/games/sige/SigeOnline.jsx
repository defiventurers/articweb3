import { useEffect, useState } from "react";
import { ProfileScreen } from "../../screens/ProfileScreen.jsx";
import { createProfile } from "../../network/socketClient.js";
import {
  createSigeRoom,
  getMySigeRooms,
  getSigeHistory,
  getSigeState,
  joinSigeRoom,
  listSigeRooms,
  rollSigeCowries,
  submitSigeAction
} from "../../network/sigeSocketClient.js";
import { SigeBoard, SigeCowries, SigeDock, SplitFinishControl } from "./SigeBoard.jsx";
import { describeTurn, getLegalActions, resultDetail, resultTitle, sideName } from "./rules.js";

export function SigeOnline({ profile, onProfileChange, onBack }) {
  const [screen, setScreen] = useState("lobby");
  const [room, setRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [history, setHistory] = useState([]);
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { if (profile) refreshLobby(); }, [profile]);
  useEffect(() => {
    function handlePacket(event) {
      const packet = event.detail;
      if (packet?.type !== "sg_room_state") return;
      const nextRoom = packet.payload?.room;
      if (!nextRoom || (room && nextRoom.roomCode !== room.roomCode)) return;
      setRoom(nextRoom);
      setScreen("game");
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
        const next = await getSigeState({ roomCode: room.roomCode, profile });
        if (!cancelled) { setRoom(next); setMessage(""); }
      } catch (err) {
        if (!cancelled) setMessage(err.message || "Reconnecting to the Sige board…");
      }
    };
    const timer = window.setInterval(sync, 3500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [profile, room?.roomCode, screen]);

  async function withBusy(task) {
    try { setBusy(true); setMessage(""); return await task(); }
    catch (err) { setMessage(err.message || "Request failed."); return null; }
    finally { setBusy(false); }
  }
  async function login() {
    if (!profile) throw new Error("Create a profile first.");
    await createProfile({ address: profile.wallet, name: profile.name });
  }
  async function refreshLobby() {
    await withBusy(async () => {
      await login();
      const [open, mine, past] = await Promise.all([listSigeRooms(), getMySigeRooms({ profile }), getSigeHistory({ profile })]);
      setRooms(open); setMyRooms(mine); setHistory(past);
    });
  }
  function openRoom(next) { setRoom(next); setScreen("game"); }
  async function createRoom(visibility, side) {
    const next = await withBusy(async () => { await login(); return createSigeRoom({ visibility, side, profile }); });
    if (next) openRoom(next);
  }
  async function joinRoom(code = roomCode) {
    const clean = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    if (clean.length !== 4) return setMessage("Enter a four-character room code.");
    const next = await withBusy(async () => { await login(); return joinSigeRoom({ roomCode: clean, profile }); });
    if (next) { setRoomCode(clean); openRoom(next); }
  }
  async function resume(code) {
    const next = await withBusy(async () => { await login(); return getSigeState({ roomCode: code, profile }); });
    if (next) openRoom(next);
  }
  async function cast() {
    const next = await withBusy(() => rollSigeCowries({ roomCode: room.roomCode, profile }));
    if (next) openRoom(next);
  }
  async function submit(action) {
    const next = await withBusy(() => submitSigeAction({ roomCode: room.roomCode, profile, action }));
    if (next) openRoom(next);
  }

  if (!profile) return <ProfileScreen onComplete={onProfileChange} onBack={onBack} />;

  if (screen === "history") return (
    <section className="sg-online" aria-label="Sige history">
      <header><button onClick={() => setScreen("lobby")}>← Lobby</button><h1>Sige Race History</h1><button onClick={refreshLobby}>Refresh</button></header>
      <div className="sg-history">
        {!history.length && <p>No completed Sige races yet.</p>}
        {history.map((entry) => <article key={entry.id}><strong>{entry.won ? "Centre Reached" : "Race Lost"}</strong><span>Room {entry.roomCode} · {sideName(entry.team)}</span><small>{entry.rulesetVersion}</small></article>)}
      </div>
    </section>
  );

  if (screen === "game" && room) {
    const me = room.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase());
    const opponent = room.players.find((player) => player.wallet.toLowerCase() !== profile.wallet.toLowerCase());
    const myTurn = room.status === "playing" && me?.role === room.gameState.currentPlayer;
    const legalActions = myTurn ? getLegalActions(room.gameState, me.role) : [];
    const splitAction = legalActions.find((action) => action.type === "split-finish") || null;
    const passAction = legalActions.find((action) => action.type === "pass") || null;
    const pieceActions = legalActions.filter((action) => !["split-finish", "pass"].includes(action.type));
    return (
      <section className="sg-game sg-online-game" aria-label="Sige online match">
        <header className="sg-game-header"><button onClick={() => { setScreen("lobby"); refreshLobby(); }}>← Lobby</button><div><p>ONLINE · {room.rulesetVersion}</p><h1>Room {room.roomCode}</h1></div><button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>Copy Code</button></header>
        <main className="sg-game-layout">
          <SigeDock side="aurora" state={room.gameState} legalActions={pieceActions} onAction={submit} interactive={myTurn && !busy} />
          <div className="sg-game-centre">
            <SigeCowries roll={room.gameState.lastRoll} onRoll={cast} canRoll={myTurn && room.gameState.awaiting === "roll"} busy={busy} />
            <div className="sg-turn-banner" data-player={room.gameState.currentPlayer}><strong>{room.status === "waiting" ? "Waiting for a rival route" : room.status === "finished" ? resultTitle(room.gameState) : myTurn ? describeTurn(room.gameState) : `${opponent?.name || "Opponent"} is choosing`}</strong><span>{room.status === "waiting" ? `Share code ${room.roomCode}` : room.status === "finished" ? resultDetail(room.gameState) : `You guide ${sideName(me?.role)}`}</span></div>
            <SplitFinishControl action={splitAction} onAction={submit} interactive={myTurn && !busy} />
            {passAction && <button className="sg-pass" disabled={busy} onClick={() => submit(passAction)}>No legal use — pass {passAction.value}</button>}
            <SigeBoard state={room.gameState} legalActions={pieceActions} onAction={submit} interactive={myTurn && !busy} />
            {message && <p className="sg-message" role="alert">{message}</p>}
          </div>
          <SigeDock side="ember" state={room.gameState} legalActions={pieceActions} onAction={submit} interactive={myTurn && !busy} />
        </main>
        <footer className="sg-game-footer"><span>{me ? `You guide ${sideName(me.role)}` : "Spectating"}</span><span>{busy ? "Syncing authoritative state…" : "The server owns every cowrie cast and validates every exact move."}</span></footer>
      </section>
    );
  }

  return (
    <section className="sg-online" aria-label="Sige online lobby">
      <header><button onClick={onBack}>← Sige</button><h1>Protected Route Lobby</h1><button onClick={() => setScreen("history")}>History</button></header>
      <div className="sg-online-grid">
        <article><h2>Create as Aurora</h2><p>Aurora enters at the north Katti and opens the digital race.</p><button disabled={busy} onClick={() => createRoom("public", "aurora")}>Public Aurora Room</button><button disabled={busy} onClick={() => createRoom("private", "aurora")}>Private Aurora Room</button></article>
        <article><h2>Create as Ember</h2><p>The joining player takes Aurora and casts first.</p><button disabled={busy} onClick={() => createRoom("public", "ember")}>Public Ember Room</button><button disabled={busy} onClick={() => createRoom("private", "ember")}>Private Ember Room</button></article>
        <article><h2>Join by Code</h2><input aria-label="Sige room code" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={4} placeholder="ABCD"/><button disabled={busy} onClick={() => joinRoom()}>Join Room</button></article>
        <article><h2>Open Routes</h2>{!rooms.length && <p>No public Sige race is waiting.</p>}{rooms.map((item) => <button key={item.roomCode} onClick={() => joinRoom(item.roomCode)}>{item.roomCode} · Join as {sideName(item.players[0]?.role === "aurora" ? "ember" : "aurora")}</button>)}</article>
        <article className="wide"><h2>Your Reconnectable Races</h2>{!myRooms.length && <p>No saved Sige room yet.</p>}{myRooms.map((item) => <button key={item.roomCode} onClick={() => resume(item.roomCode)}>{item.roomCode} · {item.status}</button>)}</article>
      </div>
      {message && <p className="sg-message" role="alert">{message}</p>}
      <button className="sg-refresh" disabled={busy} onClick={refreshLobby}>{busy ? "Syncing…" : "Refresh Lobby"}</button>
    </section>
  );
}
