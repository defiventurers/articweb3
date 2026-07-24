import { useEffect, useMemo, useState } from "react";
import { ProfileScreen } from "../../screens/ProfileScreen.jsx";
import {
  createNineIceFortsRoom,
  createProfile,
  getMyNineIceFortsRooms,
  getNineIceFortsHistory,
  getNineIceFortsState,
  joinNineIceFortsRoom,
  listNineIceFortsRooms,
  submitNineIceFortsAction
} from "../../network/socketClient.js";
import { getLegalActions, getPlayerPhase } from "./rules.js";
import { NineIceFortsBoard } from "./NineIceFortsApp.jsx";

export function NineIceFortsOnline({ profile, onProfileChange, onBack }) {
  const [screen, setScreen] = useState("lobby");
  const [room, setRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [history, setHistory] = useState([]);
  const [roomCode, setRoomCode] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!profile) return;
    refreshLobby();
  }, [profile]);

  useEffect(() => {
    function handlePacket(event) {
      const packet = event.detail;
      if (packet?.type !== "nif_room_state") return;
      const nextRoom = packet.payload?.room;
      if (!nextRoom) return;
      if (!room || nextRoom.roomCode === room.roomCode) {
        setRoom(nextRoom);
        setScreen("game");
        setSelectedNode(null);
        setMessage(nextRoom.status === "waiting" ? "Waiting for a second player…" : "");
      }
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
        const nextRoom = await getNineIceFortsState({ roomCode: room.roomCode, profile });
        if (!cancelled) setRoom(nextRoom);
      } catch (err) {
        if (!cancelled) setMessage(err.message || "Reconnecting to the room…");
      }
    };
    const timer = window.setInterval(reconnect, 4000);
    reconnect();
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [profile, room?.roomCode, screen]);

  async function withBusy(task) {
    try {
      setBusy(true);
      setMessage("");
      return await task();
    } catch (err) {
      setMessage(err.message || "Request failed.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function ensureLogin() {
    if (!profile) throw new Error("Create a profile first.");
    await createProfile({ address: profile.wallet, name: profile.name });
  }

  async function refreshLobby() {
    await withBusy(async () => {
      await ensureLogin();
      const [publicRooms, ownedRooms, gameHistory] = await Promise.all([
        listNineIceFortsRooms(),
        getMyNineIceFortsRooms({ profile }),
        getNineIceFortsHistory({ profile })
      ]);
      setRooms(publicRooms);
      setMyRooms(ownedRooms);
      setHistory(gameHistory);
    });
  }

  async function createRoom(visibility) {
    const nextRoom = await withBusy(async () => {
      await ensureLogin();
      return createNineIceFortsRoom({ visibility, profile });
    });
    if (nextRoom) { setRoom(nextRoom); setScreen("game"); }
  }

  async function joinRoom(code = roomCode) {
    const cleanCode = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    if (cleanCode.length !== 4) return setMessage("Enter a four-character room code.");
    const nextRoom = await withBusy(async () => {
      await ensureLogin();
      return joinNineIceFortsRoom({ roomCode: cleanCode, profile });
    });
    if (nextRoom) { setRoom(nextRoom); setRoomCode(cleanCode); setScreen("game"); }
  }

  async function resumeRoom(code) {
    const nextRoom = await withBusy(async () => {
      await ensureLogin();
      return getNineIceFortsState({ roomCode: code, profile });
    });
    if (nextRoom) { setRoom(nextRoom); setScreen("game"); }
  }

  async function submitAction(action) {
    const nextRoom = await withBusy(() => submitNineIceFortsAction({ roomCode: room.roomCode, profile, action }));
    if (nextRoom) { setRoom(nextRoom); setSelectedNode(null); }
  }

  function handleNode(nodeId) {
    if (!room || room.status !== "playing") return;
    const seat = room.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase())?.seat;
    if (seat !== room.gameState.currentPlayer) return setMessage("It is not your turn.");
    const legalActions = getLegalActions(room.gameState, seat);
    if (room.gameState.pendingRemoval) {
      const action = legalActions.find((item) => item.type === "remove" && item.nodeId === nodeId);
      return action ? submitAction(action) : setMessage("Choose a removable rival scout.");
    }
    const phase = getPlayerPhase(room.gameState, seat);
    if (phase === "placement") {
      const action = legalActions.find((item) => item.type === "place" && item.nodeId === nodeId);
      return action ? submitAction(action) : setMessage("That fort is occupied.");
    }
    if (room.gameState.board[nodeId] === seat) {
      setSelectedNode(nodeId === selectedNode ? null : nodeId);
      setMessage("");
      return;
    }
    if (!selectedNode) return setMessage("Select one of your scouts first.");
    const action = legalActions.find((item) => item.type === "move" && item.from === selectedNode && item.to === nodeId);
    return action ? submitAction(action) : setMessage(phase === "flying" ? "Choose any empty fort." : "That fort is not connected by a legal ice path.");
  }

  if (!profile) {
    return <ProfileScreen onComplete={(nextProfile) => onProfileChange(nextProfile)} onBack={onBack} />;
  }

  if (screen === "history") {
    return (
      <section className="nif-online-shell" aria-label="Nine Ice Forts history">
        <header><button onClick={() => setScreen("lobby")}>← Online Lobby</button><h1>Match History</h1><button onClick={refreshLobby}>Refresh</button></header>
        <div className="nif-online-history">
          {!history.length && <p>No completed Nine Ice Forts matches yet.</p>}
          {history.map((entry) => (
            <article key={entry.id}>
              <strong>{entry.result?.winner === "draw" ? "Draw" : entry.won ? "Victory" : "Defeat"}</strong>
              <span>Room {entry.roomCode} · {entry.team} tribe</span>
              <small>{entry.rulesetVersion} · {entry.finishedAt ? new Date(entry.finishedAt).toLocaleString() : "Completed"}</small>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (screen === "game" && room) {
    const me = room.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase());
    const opponent = room.players.find((player) => player.wallet.toLowerCase() !== profile.wallet.toLowerCase());
    const myTurn = room.status === "playing" && me?.seat === room.gameState.currentPlayer;
    return (
      <section className="nif-game nif-online-game" aria-label="Nine Ice Forts online game">
        <header className="nif-game-header">
          <button onClick={() => { setScreen("lobby"); refreshLobby(); }}>← Lobby</button>
          <div><p>ONLINE · {room.rulesetVersion}</p><h1>Room {room.roomCode}</h1></div>
          <button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>Copy Code</button>
        </header>
        <main className="nif-game-layout">
          <aside className="nif-player-panel blue"><span className="nif-player-token" /><strong>{room.players.find((p) => p.seat === "blue")?.name || "Waiting…"}</strong><small>Blue Tribe</small></aside>
          <div className="nif-board-shell">
            <div className="nif-turn-banner" data-player={room.gameState.currentPlayer}>
              <strong>{room.status === "waiting" ? "Waiting for a rival" : room.status === "finished" ? resultTitle(room.gameState) : myTurn ? "Your turn" : `${opponent?.name || "Opponent"} is moving`}</strong>
              <span>{room.status === "playing" ? `Turn ${room.gameState.turn} · ${getPlayerPhase(room.gameState)}` : room.status === "finished" ? resultDetail(room.gameState) : "Share the room code or wait for a public challenger."}</span>
            </div>
            <NineIceFortsBoard state={room.gameState} selectedNode={selectedNode} onNode={handleNode} interactive={myTurn && !busy} />
            {message && <p className="nif-game-message" role="alert">{message}</p>}
            {room.status === "finished" && <div className="nif-result-actions"><button onClick={() => { setScreen("lobby"); refreshLobby(); }}>Return to Lobby</button></div>}
          </div>
          <aside className="nif-player-panel coral"><span className="nif-player-token" /><strong>{room.players.find((p) => p.seat === "coral")?.name || "Waiting…"}</strong><small>Coral Tribe</small></aside>
        </main>
        <footer className="nif-game-footer"><span>{me ? `You are ${me.seat}` : "Spectating"}</span><span>{busy ? "Syncing authoritative state…" : "Server validates every action."}</span></footer>
      </section>
    );
  }

  return (
    <section className="nif-online-shell" aria-label="Nine Ice Forts online lobby">
      <header><button onClick={onBack}>← Nine Ice Forts</button><h1>Online Ice Forts</h1><button onClick={() => setScreen("history")}>History</button></header>
      <div className="nif-online-grid">
        <article><h2>Create Room</h2><p>Blue seat is assigned to the creator. The match starts when Coral joins.</p><button disabled={busy} onClick={() => createRoom("public")}>Create Public Room</button><button disabled={busy} onClick={() => createRoom("private")}>Create Private Room</button></article>
        <article><h2>Join by Code</h2><input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} maxLength={4} placeholder="ABCD" aria-label="Nine Ice Forts room code" /><button disabled={busy} onClick={() => joinRoom()}>Join Room</button></article>
        <article><h2>Open Rooms</h2>{!rooms.length && <p>No public room is waiting.</p>}{rooms.map((item) => <button key={item.roomCode} onClick={() => joinRoom(item.roomCode)}>{item.roomCode} · {item.players[0]?.name || "Player"}</button>)}</article>
        <article><h2>Your Rooms</h2>{!myRooms.length && <p>No reconnectable room yet.</p>}{myRooms.map((item) => <button key={item.roomCode} onClick={() => resumeRoom(item.roomCode)}>{item.roomCode} · {item.status}</button>)}</article>
      </div>
      {message && <p className="nif-online-message" role="alert">{message}</p>}
      <button className="nif-online-refresh" disabled={busy} onClick={refreshLobby}>{busy ? "Syncing…" : "Refresh Rooms"}</button>
    </section>
  );
}

function resultTitle(state) {
  if (state.winner === "draw") return "The match is a draw";
  return `${state.winner === "blue" ? "Blue" : "Coral"} Tribe wins`;
}
function resultDetail(state) {
  return { "reduced-opponent-to-two": "The rival tribe has fewer than three scouts.", "immobilised-opponent": "The rival tribe has no legal move.", "threefold-repetition": "The same position occurred three times.", "no-capture-limit": "The modern no-capture limit was reached." }[state.winReason] || "Match complete.";
}
