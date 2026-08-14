import { useEffect, useState } from "react";
import { ProfileScreen } from "../../screens/ProfileScreen.jsx";
import { createProfile } from "../../network/socketClient.js";
import {
  createCowrieKingdomsRoom,
  getCowrieKingdomsHistory,
  getCowrieKingdomsState,
  getMyCowrieKingdomsRooms,
  joinCowrieKingdomsRoom,
  listCowrieKingdomsRooms,
  rollCowrieKingdomsCowries,
  submitCowrieKingdomsAction
} from "../../network/cowrieKingdomsSocketClient.js";
import { CowrieKingdomsBoard, CowrieTray, KingdomDock, ThrowPool } from "./CowrieKingdomsBoard.jsx";
import { describeTurn, getLegalActions, resultDetail, resultTitle } from "./rules.js";

export function CowrieKingdomsOnline({ profile, onProfileChange, onBack }) {
  const [screen, setScreen] = useState("lobby");
  const [room, setRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [history, setHistory] = useState([]);
  const [roomCode, setRoomCode] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { if (profile) refreshLobby(); }, [profile]);
  useEffect(() => {
    if (!room?.gameState?.throwPool?.length) {
      setSelectedUnitId(null);
      return;
    }
    if (!room.gameState.throwPool.some((unit) => unit.id === selectedUnitId)) setSelectedUnitId(room.gameState.throwPool[0].id);
  }, [room?.gameState?.throwPool, selectedUnitId]);
  useEffect(() => {
    function handlePacket(event) {
      const packet = event.detail;
      if (packet?.type !== "ck_room_state") return;
      const nextRoom = packet.payload?.room;
      if (!nextRoom || (room && nextRoom.roomCode !== room.roomCode)) return;
      setRoom(nextRoom);
      setScreen("game");
      setMessage(nextRoom.status === "waiting" ? "Waiting for the rival kingdom…" : "");
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
        const nextRoom = await getCowrieKingdomsState({ roomCode: room.roomCode, profile });
        if (!cancelled) { setRoom(nextRoom); setMessage(""); }
      } catch (err) {
        if (!cancelled) setMessage(err.message || "Reconnecting to the spiral court…");
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
        listCowrieKingdomsRooms(), getMyCowrieKingdomsRooms({ profile }), getCowrieKingdomsHistory({ profile })
      ]);
      setRooms(publicRooms); setMyRooms(ownedRooms); setHistory(gameHistory);
    });
  }
  async function createRoom(visibility, side) {
    const nextRoom = await withBusy(async () => { await ensureLogin(); return createCowrieKingdomsRoom({ visibility, side, profile }); });
    if (nextRoom) openRoom(nextRoom);
  }
  async function joinRoom(code = roomCode) {
    const cleanCode = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    if (cleanCode.length !== 4) return setMessage("Enter a four-character room code.");
    const nextRoom = await withBusy(async () => { await ensureLogin(); return joinCowrieKingdomsRoom({ roomCode: cleanCode, profile }); });
    if (nextRoom) { setRoomCode(cleanCode); openRoom(nextRoom); }
  }
  async function resumeRoom(code) {
    const nextRoom = await withBusy(async () => { await ensureLogin(); return getCowrieKingdomsState({ roomCode: code, profile }); });
    if (nextRoom) openRoom(nextRoom);
  }
  function openRoom(nextRoom) {
    setRoom(nextRoom);
    setSelectedUnitId(nextRoom.gameState?.throwPool?.[0]?.id || null);
    setScreen("game");
  }
  async function castCowries() {
    const nextRoom = await withBusy(() => rollCowrieKingdomsCowries({ roomCode: room.roomCode, profile }));
    if (nextRoom) openRoom(nextRoom);
  }
  async function submitAction(action) {
    const nextRoom = await withBusy(() => submitCowrieKingdomsAction({ roomCode: room.roomCode, profile, action }));
    if (nextRoom) openRoom(nextRoom);
  }

  if (!profile) return <ProfileScreen onComplete={onProfileChange} onBack={onBack} />;

  if (screen === "history") return (
    <section className="ck-online-shell" aria-label="Cowrie Kingdoms history">
      <header><button onClick={() => setScreen("lobby")}>← Online Lobby</button><h1>Kingdom History</h1><button onClick={refreshLobby}>Refresh</button></header>
      <div className="ck-online-history">
        {!history.length && <p>No completed Ashta-Kashte duels yet.</p>}
        {history.map((entry) => <article key={entry.id}><strong>{entry.won ? "Centre Reached" : "Spiral Loss"}</strong><span>Room {entry.roomCode} · {sideName(entry.team)}</span><small>{entry.rulesetVersion} · {entry.finishedAt ? new Date(entry.finishedAt).toLocaleString() : "Completed"}</small></article>)}
      </div>
    </section>
  );

  if (screen === "game" && room) {
    const me = room.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase());
    const opponent = room.players.find((player) => player.wallet.toLowerCase() !== profile.wallet.toLowerCase());
    const myTurn = room.status === "playing" && me?.role === room.gameState.currentPlayer;
    const allLegalActions = myTurn ? getLegalActions(room.gameState, me.role) : [];
    const selectedUnit = room.gameState.throwPool.find((unit) => unit.id === selectedUnitId) || room.gameState.throwPool[0] || null;
    const selectedActions = selectedUnit ? allLegalActions.filter((action) => action.unitId === selectedUnit.id) : [];
    const passAction = selectedActions.find((action) => action.type === "pass-unit") || null;
    const playableActions = selectedActions.filter((action) => action.type !== "pass-unit");
    return (
      <section className="ck-game ck-online-game" aria-label="Cowrie Kingdoms online match">
        <header className="ck-game-header"><button onClick={() => { setScreen("lobby"); refreshLobby(); }}>← Lobby</button><div><p>ONLINE · {room.rulesetVersion}</p><h1>Room {room.roomCode}</h1></div><button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>Copy Code</button></header>
        <main className="ck-game-layout">
          <KingdomDock side="aurora" state={room.gameState} legalActions={playableActions} onAction={submitAction} interactive={myTurn && !busy} />
          <div className="ck-game-centre">
            <CowrieTray roll={room.gameState.lastRoll} onRoll={castCowries} canRoll={myTurn && room.gameState.awaiting === "roll"} busy={busy} />
            <ThrowPool units={room.gameState.throwPool} selectedUnitId={selectedUnit?.id || null} onSelect={setSelectedUnitId} passAction={passAction} onPass={submitAction} interactive={myTurn && !busy} />
            <div className="ck-turn-banner" data-player={room.gameState.currentPlayer}><strong>{room.status === "waiting" ? "Waiting for a rival kingdom" : room.status === "finished" ? resultTitle(room.gameState) : myTurn ? describeTurn(room.gameState) : `${opponent?.name || "Opponent"} is allocating cowries`}</strong><span>{room.status === "playing" ? `Chance ${room.gameState.turn} · You guide ${sideName(me?.role)}` : room.status === "finished" ? resultDetail(room.gameState) : `Share code ${room.roomCode}.`}</span></div>
            <CowrieKingdomsBoard state={room.gameState} legalActions={playableActions} onAction={submitAction} interactive={myTurn && !busy} />
            {message && <p className="ck-game-message" role="alert">{message}</p>}
            {room.status === "finished" && <div className="ck-result-actions"><button onClick={() => { setScreen("lobby"); refreshLobby(); }}>Return to Lobby</button></div>}
          </div>
          <KingdomDock side="ember" state={room.gameState} legalActions={playableActions} onAction={submitAction} interactive={myTurn && !busy} />
        </main>
        <footer className="ck-game-footer"><span>{me ? `You guide ${sideName(me.role)}` : "Spectating"}</span><span>{busy ? "Syncing authoritative state…" : "The server commits every cowrie cast and validates every allocation."}</span></footer>
      </section>
    );
  }

  return (
    <section className="ck-online-shell" aria-label="Cowrie Kingdoms online lobby">
      <header><button onClick={onBack}>← Cowrie Kingdoms</button><h1>Online Spiral Court</h1><button onClick={() => setScreen("history")}>History</button></header>
      <div className="ck-online-grid">
        <article><h2>Create as Aurora</h2><p>Aurora enters at the north cross and takes the first digital cast.</p><button disabled={busy} onClick={() => createRoom("public", "aurora")}>Public Aurora Room</button><button disabled={busy} onClick={() => createRoom("private", "aurora")}>Private Aurora Room</button></article>
        <article><h2>Create as Ember</h2><p>The joining player takes Aurora; you answer from the south cross.</p><button disabled={busy} onClick={() => createRoom("public", "ember")}>Public Ember Room</button><button disabled={busy} onClick={() => createRoom("private", "ember")}>Private Ember Room</button></article>
        <article><h2>Join by Code</h2><input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={4} placeholder="ABCD" aria-label="Cowrie Kingdoms room code" /><button disabled={busy} onClick={() => joinRoom()}>Join Room</button></article>
        <article><h2>Open Courts</h2>{!rooms.length && <p>No public Ashta-Kashte duel is waiting.</p>}{rooms.map((item) => <button key={item.roomCode} onClick={() => joinRoom(item.roomCode)}>{item.roomCode} · Join as {sideName(item.players[0]?.role === "aurora" ? "ember" : "aurora")}</button>)}</article>
        <article className="wide"><h2>Your Reconnectable Races</h2>{!myRooms.length && <p>No saved Cowrie Kingdoms room yet.</p>}{myRooms.map((item) => <button key={item.roomCode} onClick={() => resumeRoom(item.roomCode)}>{item.roomCode} · {sideName(item.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase())?.role)} · {item.status}</button>)}</article>
      </div>
      {message && <p className="ck-online-message" role="alert">{message}</p>}
      <button className="ck-online-refresh" disabled={busy} onClick={refreshLobby}>{busy ? "Syncing…" : "Refresh Courts"}</button>
    </section>
  );
}

function sideName(side) {
  return side === "ember" ? "Ember Kingdom" : "Aurora Kingdom";
}
