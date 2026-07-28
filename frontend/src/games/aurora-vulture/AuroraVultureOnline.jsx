import { useEffect, useState } from "react";
import { ProfileScreen } from "../../screens/ProfileScreen.jsx";
import { createProfile } from "../../network/socketClient.js";
import {
  createAuroraVultureRoom,
  getAuroraVultureHistory,
  getAuroraVultureState,
  getMyAuroraVultureRooms,
  joinAuroraVultureRoom,
  listAuroraVultureRooms,
  submitAuroraVultureAction
} from "../../network/auroraVultureSocketClient.js";
import { AuroraVultureBoard, CrowDock, VultureDock } from "./AuroraVultureBoard.jsx";
import { describeTurn, getLegalActions, resultDetail, resultTitle } from "./rules.js";

export function AuroraVultureOnline({ profile, onProfileChange, onBack }) {
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
      if (packet?.type !== "av_room_state") return;
      const nextRoom = packet.payload?.room;
      if (!nextRoom || (room && nextRoom.roomCode !== room.roomCode)) return;
      setRoom(nextRoom);
      setScreen("game");
      setSelectedPieceId(null);
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
        const next = await getAuroraVultureState({ roomCode: room.roomCode, profile });
        if (!cancelled) setRoom(next);
      } catch (err) {
        if (!cancelled) setMessage(err.message || "Reconnecting to the aurora star…");
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
      const [open, mine, past] = await Promise.all([
        listAuroraVultureRooms(),
        getMyAuroraVultureRooms({ profile }),
        getAuroraVultureHistory({ profile })
      ]);
      setRooms(open);
      setMyRooms(mine);
      setHistory(past);
    });
  }

  function openRoom(next) {
    setRoom(next);
    setSelectedPieceId(null);
    setScreen("game");
  }

  async function createRoom(visibility, side) {
    const next = await withBusy(async () => {
      await login();
      return createAuroraVultureRoom({ visibility, side, profile });
    });
    if (next) openRoom(next);
  }

  async function joinRoom(code = roomCode) {
    const clean = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    if (clean.length !== 4) return setMessage("Enter a four-character room code.");
    const next = await withBusy(async () => {
      await login();
      return joinAuroraVultureRoom({ roomCode: clean, profile });
    });
    if (next) { setRoomCode(clean); openRoom(next); }
  }

  async function resume(code) {
    const next = await withBusy(async () => {
      await login();
      return getAuroraVultureState({ roomCode: code, profile });
    });
    if (next) openRoom(next);
  }

  async function submitAction(action) {
    const next = await withBusy(() => submitAuroraVultureAction({ roomCode: room.roomCode, profile, action }));
    if (next) openRoom(next);
  }

  if (!profile) return <ProfileScreen onComplete={onProfileChange} onBack={onBack} />;

  if (screen === "history") {
    return (
      <section className="av-online" aria-label="Aurora Vulture history">
        <header><button onClick={() => setScreen("lobby")}>← Lobby</button><h1>Aurora Hunt History</h1><button onClick={refreshLobby}>Refresh</button></header>
        <div className="av-history">
          {!history.length && <p>No completed Aurora Vulture matches yet.</p>}
          {history.map((entry) => (
            <article key={entry.id}>
              <strong>{entry.draw ? "Draw" : entry.won ? "Star Won" : "Hunt Lost"}</strong>
              <span>Room {entry.roomCode} · {sideName(entry.team)}</span>
              <small>{entry.rulesetVersion}</small>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (screen === "game" && room) {
    const me = room.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase());
    const opponent = room.players.find((player) => player.wallet.toLowerCase() !== profile.wallet.toLowerCase());
    const myTurn = room.status === "playing" && me?.role === room.gameState.currentPlayer;
    const legalActions = myTurn ? getLegalActions(room.gameState, me.role) : [];
    return (
      <section className="av-game av-online-game" aria-label="Aurora Vulture online match">
        <header className="av-game-header">
          <button onClick={() => { setScreen("lobby"); refreshLobby(); }}>← Lobby</button>
          <div><p>ONLINE · {room.rulesetVersion}</p><h1>Room {room.roomCode}</h1></div>
          <button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>Copy Code</button>
        </header>
        <main className="av-game-layout">
          <CrowDock state={room.gameState} />
          <div className="av-game-centre">
            <div className="av-turn-banner" data-player={room.gameState.currentPlayer}>
              <strong>{room.status === "waiting" ? "Waiting for a rival hunter" : room.status === "finished" ? resultTitle(room.gameState) : myTurn ? describeTurn(room.gameState) : `${opponent?.name || "Opponent"} is choosing`}</strong>
              <span>{room.status === "waiting" ? `Share code ${room.roomCode}` : room.status === "finished" ? resultDetail(room.gameState) : `You guide ${sideName(me?.role)}`}</span>
            </div>
            <AuroraVultureBoard
              state={room.gameState}
              legalActions={legalActions}
              selectedPieceId={selectedPieceId}
              onSelectPiece={setSelectedPieceId}
              onAction={submitAction}
              interactive={myTurn && !busy}
            />
            {message && <p className="av-message" role="alert">{message}</p>}
          </div>
          <VultureDock state={room.gameState} />
        </main>
        <footer className="av-game-footer"><span>{me ? `You guide ${sideName(me.role)}` : "Spectating"}</span><span>{busy ? "Syncing authoritative state…" : "Every placement, move and capture is server validated."}</span></footer>
      </section>
    );
  }

  return (
    <section className="av-online" aria-label="Aurora Vulture online lobby">
      <header><button onClick={onBack}>← Aurora Vulture</button><h1>Aurora Star Lobby</h1><button onClick={() => setScreen("history")}>History</button></header>
      <div className="av-online-grid">
        <article><h2>Create as Crows</h2><p>The crows always place first.</p><button disabled={busy} onClick={() => createRoom("public", "crows")}>Public Crow Room</button><button disabled={busy} onClick={() => createRoom("private", "crows")}>Private Crow Room</button></article>
        <article><h2>Create as Vulture</h2><p>The joining player takes the crows and opens the board.</p><button disabled={busy} onClick={() => createRoom("public", "vulture")}>Public Vulture Room</button><button disabled={busy} onClick={() => createRoom("private", "vulture")}>Private Vulture Room</button></article>
        <article><h2>Join by Code</h2><input aria-label="Aurora Vulture room code" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={4} placeholder="ABCD"/><button disabled={busy} onClick={() => joinRoom()}>Join Room</button></article>
        <article><h2>Open Stars</h2>{!rooms.length && <p>No public aurora hunt is waiting.</p>}{rooms.map((item) => <button key={item.roomCode} onClick={() => joinRoom(item.roomCode)}>{item.roomCode} · Join as {sideName(item.players[0]?.role === "crows" ? "vulture" : "crows")}</button>)}</article>
        <article className="wide"><h2>Your Reconnectable Hunts</h2>{!myRooms.length && <p>No saved Aurora Vulture room yet.</p>}{myRooms.map((item) => <button key={item.roomCode} onClick={() => resume(item.roomCode)}>{item.roomCode} · {item.status}</button>)}</article>
      </div>
      {message && <p className="av-message" role="alert">{message}</p>}
      <button className="av-refresh" disabled={busy} onClick={refreshLobby}>{busy ? "Syncing…" : "Refresh Lobby"}</button>
    </section>
  );
}

function sideName(side) {
  return side === "crows" ? "Aurora Crows" : "Glacier Vulture";
}
