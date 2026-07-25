import { useEffect, useState } from "react";
import { ProfileScreen } from "../../screens/ProfileScreen.jsx";
import {
  createProfile,
  createSkyTempleRunRoom,
  getMySkyTempleRunRooms,
  getSkyTempleRunHistory,
  getSkyTempleRunState,
  joinSkyTempleRunRoom,
  listSkyTempleRunRooms,
  rollSkyTempleRunCowries,
  submitSkyTempleRunAction
} from "../../network/socketClient.js";
import { CowrieTray, PilgrimDock, SkyTempleRunBoard } from "./SkyTempleRunBoard.jsx";
import { describeTurn, getLegalActions, resultDetail, resultTitle } from "./rules.js";

export function SkyTempleRunOnline({ profile, onProfileChange, onBack }) {
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
      if (packet?.type !== "str_room_state") return;
      const nextRoom = packet.payload?.room;
      if (!nextRoom || (room && nextRoom.roomCode !== room.roomCode)) return;
      setRoom(nextRoom);
      setScreen("game");
      setMessage(nextRoom.status === "waiting" ? "Waiting for a rival court…" : "");
    }
    window.addEventListener("server-packet", handlePacket);
    return () => window.removeEventListener("server-packet", handlePacket);
  }, [room]);

  useEffect(() => {
    if (!profile || !room?.roomCode || screen !== "game") return;
    let cancelled = false;
    const reconnect = async () => {
      try {
        await createProfile({ address: profile.wallet, name: profile.name });
        const nextRoom = await getSkyTempleRunState({ roomCode: room.roomCode, profile });
        if (!cancelled) { setRoom(nextRoom); setMessage(""); }
      } catch (err) {
        if (!cancelled) setMessage(err.message || "Reconnecting to the temple route…");
      }
    };
    reconnect();
    const timer = window.setInterval(reconnect, 4000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [profile, room?.roomCode, screen]);

  async function withBusy(task) {
    try { setBusy(true); setMessage(""); return await task(); }
    catch (err) { setMessage(err.message || "Request failed."); return null; }
    finally { setBusy(false); }
  }
  async function ensureLogin() {
    if (!profile) throw new Error("Create a profile first.");
    await createProfile({ address: profile.wallet, name: profile.name });
  }
  async function refreshLobby() {
    await withBusy(async () => {
      await ensureLogin();
      const [publicRooms, ownedRooms, gameHistory] = await Promise.all([
        listSkyTempleRunRooms(), getMySkyTempleRunRooms({ profile }), getSkyTempleRunHistory({ profile })
      ]);
      setRooms(publicRooms); setMyRooms(ownedRooms); setHistory(gameHistory);
    });
  }
  async function createRoom(visibility, side) {
    const nextRoom = await withBusy(async () => { await ensureLogin(); return createSkyTempleRunRoom({ visibility, side, profile }); });
    if (nextRoom) openRoom(nextRoom);
  }
  async function joinRoom(code = roomCode) {
    const cleanCode = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    if (cleanCode.length !== 4) return setMessage("Enter a four-character room code.");
    const nextRoom = await withBusy(async () => { await ensureLogin(); return joinSkyTempleRunRoom({ roomCode: cleanCode, profile }); });
    if (nextRoom) { setRoomCode(cleanCode); openRoom(nextRoom); }
  }
  async function resumeRoom(code) {
    const nextRoom = await withBusy(async () => { await ensureLogin(); return getSkyTempleRunState({ roomCode: code, profile }); });
    if (nextRoom) openRoom(nextRoom);
  }
  function openRoom(nextRoom) { setRoom(nextRoom); setScreen("game"); }
  async function castCowries() {
    const nextRoom = await withBusy(() => rollSkyTempleRunCowries({ roomCode: room.roomCode, profile }));
    if (nextRoom) openRoom(nextRoom);
  }
  async function submitAction(action) {
    const nextRoom = await withBusy(() => submitSkyTempleRunAction({ roomCode: room.roomCode, profile, action }));
    if (nextRoom) openRoom(nextRoom);
  }

  if (!profile) return <ProfileScreen onComplete={onProfileChange} onBack={onBack} />;

  if (screen === "history") return (
    <section className="str-online-shell" aria-label="Sky Temple Run history">
      <header><button onClick={() => setScreen("lobby")}>← Online Lobby</button><h1>Temple History</h1><button onClick={refreshLobby}>Refresh</button></header>
      <div className="str-online-history">
        {!history.length && <p>No completed Sky Temple races yet.</p>}
        {history.map((entry) => <article key={entry.id}><strong>{entry.won ? "Temple Reached" : "Route Loss"}</strong><span>Room {entry.roomCode} · {sideName(entry.team)}</span><small>{entry.rulesetVersion} · {entry.finishedAt ? new Date(entry.finishedAt).toLocaleString() : "Completed"}</small></article>)}
      </div>
    </section>
  );

  if (screen === "game" && room) {
    const me = room.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase());
    const opponent = room.players.find((player) => player.wallet.toLowerCase() !== profile.wallet.toLowerCase());
    const myTurn = room.status === "playing" && me?.role === room.gameState.currentPlayer;
    const legalActions = myTurn ? getLegalActions(room.gameState, me.role) : [];
    return (
      <section className="str-game str-online-game" aria-label="Sky Temple Run online match">
        <header className="str-game-header"><button onClick={() => { setScreen("lobby"); refreshLobby(); }}>← Lobby</button><div><p>ONLINE · {room.rulesetVersion}</p><h1>Room {room.roomCode}</h1></div><button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>Copy Code</button></header>
        <main className="str-game-layout">
          <PilgrimDock side="aurora" state={room.gameState} legalActions={legalActions} onAction={submitAction} interactive={myTurn && !busy} />
          <div className="str-game-centre">
            <CowrieTray roll={room.gameState.roll || room.gameState.lastRoll} onRoll={castCowries} canRoll={myTurn && room.gameState.awaiting === "roll"} busy={busy} />
            <div className="str-turn-banner" data-player={room.gameState.currentPlayer}><strong>{room.status === "waiting" ? "Waiting for a rival court" : room.status === "finished" ? resultTitle(room.gameState) : myTurn ? describeTurn(room.gameState) : `${opponent?.name || "Opponent"} is moving`}</strong><span>{room.status === "playing" ? `Turn ${room.gameState.turn} · You guide ${sideName(me?.role)}` : room.status === "finished" ? resultDetail(room.gameState) : `Share code ${room.roomCode}.`}</span></div>
            <SkyTempleRunBoard state={room.gameState} legalActions={legalActions} onAction={submitAction} interactive={myTurn && !busy} />
            {message && <p className="str-game-message" role="alert">{message}</p>}
            {room.status === "finished" && <div className="str-result-actions"><button onClick={() => { setScreen("lobby"); refreshLobby(); }}>Return to Lobby</button></div>}
          </div>
          <PilgrimDock side="ember" state={room.gameState} legalActions={legalActions} onAction={submitAction} interactive={myTurn && !busy} />
        </main>
        <footer className="str-game-footer"><span>{me ? `You guide ${sideName(me.role)}` : "Spectating"}</span><span>{busy ? "Syncing authoritative state…" : "The server commits every cowrie cast and validates the capture gate."}</span></footer>
      </section>
    );
  }

  return (
    <section className="str-online-shell" aria-label="Sky Temple Run online lobby">
      <header><button onClick={onBack}>← Sky Temple Run</button><h1>Online Temple Gate</h1><button onClick={() => setScreen("history")}>History</button></header>
      <div className="str-online-grid">
        <article><h2>Create as Aurora</h2><p>Aurora starts at A and takes the first digital turn.</p><button disabled={busy} onClick={() => createRoom("public", "aurora")}>Public Aurora Room</button><button disabled={busy} onClick={() => createRoom("private", "aurora")}>Private Aurora Room</button></article>
        <article><h2>Create as Ember</h2><p>The joining player takes Aurora; you answer from B.</p><button disabled={busy} onClick={() => createRoom("public", "ember")}>Public Ember Room</button><button disabled={busy} onClick={() => createRoom("private", "ember")}>Private Ember Room</button></article>
        <article><h2>Join by Code</h2><input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={4} placeholder="ABCD" aria-label="Sky Temple Run room code" /><button disabled={busy} onClick={() => joinRoom()}>Join Room</button></article>
        <article><h2>Open Routes</h2>{!rooms.length && <p>No public temple route is waiting.</p>}{rooms.map((item) => <button key={item.roomCode} onClick={() => joinRoom(item.roomCode)}>{item.roomCode} · Join as {sideName(item.players[0]?.role === "aurora" ? "ember" : "aurora")}</button>)}</article>
        <article className="wide"><h2>Your Reconnectable Races</h2>{!myRooms.length && <p>No saved Sky Temple room yet.</p>}{myRooms.map((item) => <button key={item.roomCode} onClick={() => resumeRoom(item.roomCode)}>{item.roomCode} · {sideName(item.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase())?.role)} · {item.status}</button>)}</article>
      </div>
      {message && <p className="str-online-message" role="alert">{message}</p>}
      <button className="str-online-refresh" disabled={busy} onClick={refreshLobby}>{busy ? "Syncing…" : "Refresh Routes"}</button>
    </section>
  );
}

function sideName(side) { return side === "ember" ? "Ember Pilgrims" : "Aurora Pilgrims"; }
