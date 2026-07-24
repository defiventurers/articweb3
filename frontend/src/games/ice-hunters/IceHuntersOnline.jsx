import { useEffect, useState } from "react";
import { ProfileScreen } from "../../screens/ProfileScreen.jsx";
import {
  createIceHuntersRoom,
  createProfile,
  getIceHuntersHistory,
  getIceHuntersState,
  getMyIceHuntersRooms,
  joinIceHuntersRoom,
  listIceHuntersRooms,
  submitIceHuntersAction
} from "../../network/socketClient.js";
import { IceHuntersBoard } from "./IceHuntersBoard.jsx";
import { describeTurn, getCounts, getLegalActions, getPhase, resultDetail, resultTitle } from "./rules.js";

export function IceHuntersOnline({ profile, onProfileChange, onBack }) {
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
    if (profile) refreshLobby();
  }, [profile]);

  useEffect(() => {
    function handlePacket(event) {
      const packet = event.detail;
      if (packet?.type !== "ih_room_state") return;
      const nextRoom = packet.payload?.room;
      if (!nextRoom) return;
      if (!room || nextRoom.roomCode === room.roomCode) {
        setRoom(nextRoom);
        setScreen("game");
        setSelectedNode(null);
        setMessage(nextRoom.status === "waiting" ? "Waiting for the rival role…" : "");
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
        const nextRoom = await getIceHuntersState({ roomCode: room.roomCode, profile });
        if (!cancelled) {
          setRoom(nextRoom);
          setMessage("");
        }
      } catch (err) {
        if (!cancelled) setMessage(err.message || "Reconnecting to the hunting ground…");
      }
    };
    reconnect();
    const timer = window.setInterval(reconnect, 4000);
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
        listIceHuntersRooms(),
        getMyIceHuntersRooms({ profile }),
        getIceHuntersHistory({ profile })
      ]);
      setRooms(publicRooms);
      setMyRooms(ownedRooms);
      setHistory(gameHistory);
    });
  }

  async function createRoom(visibility, role) {
    const nextRoom = await withBusy(async () => {
      await ensureLogin();
      return createIceHuntersRoom({ visibility, role, profile });
    });
    if (nextRoom) { setRoom(nextRoom); setScreen("game"); }
  }

  async function joinRoom(code = roomCode) {
    const cleanCode = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    if (cleanCode.length !== 4) return setMessage("Enter a four-character room code.");
    const nextRoom = await withBusy(async () => {
      await ensureLogin();
      return joinIceHuntersRoom({ roomCode: cleanCode, profile });
    });
    if (nextRoom) { setRoom(nextRoom); setRoomCode(cleanCode); setScreen("game"); }
  }

  async function resumeRoom(code) {
    const nextRoom = await withBusy(async () => {
      await ensureLogin();
      return getIceHuntersState({ roomCode: code, profile });
    });
    if (nextRoom) { setRoom(nextRoom); setScreen("game"); }
  }

  async function submitAction(action) {
    const nextRoom = await withBusy(() => submitIceHuntersAction({ roomCode: room.roomCode, profile, action }));
    if (nextRoom) {
      setRoom(nextRoom);
      setSelectedNode(null);
      setMessage(actionSummary(nextRoom.gameState.lastAction));
    }
  }

  function handleNode(nodeId) {
    if (!room || room.status !== "playing" || busy) return;
    const me = room.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase());
    const role = me?.role;
    if (!role || role !== room.gameState.currentPlayer) return setMessage("It is not your turn.");
    const legalActions = getLegalActions(room.gameState, role);
    const phase = getPhase(room.gameState, role);

    if (phase === "goat-deployment") {
      const place = legalActions.find((action) => action.type === "place" && action.nodeId === nodeId);
      if (place) return submitAction(place);
      return setMessage(room.gameState.board[nodeId] ? "That intersection is occupied." : "Deploy the next scout on an empty point.");
    }

    if (room.gameState.board[nodeId] === role) {
      setSelectedNode(selectedNode === nodeId ? null : nodeId);
      setMessage("");
      return;
    }
    if (!selectedNode) return setMessage("Select one of your pieces first.");
    const action = legalActions.find((candidate) => candidate.from === selectedNode && candidate.to === nodeId);
    if (action) return submitAction(action);
    setMessage(role === "tigers" ? "Choose an adjacent empty point or a legal jump landing." : "Scouts move one step along a printed line.");
  }

  if (!profile) return <ProfileScreen onComplete={onProfileChange} onBack={onBack} />;

  if (screen === "history") {
    return (
      <section className="ih-online-shell" aria-label="Ice Hunters history">
        <header><button onClick={() => setScreen("lobby")}>← Online Lobby</button><h1>Hunt History</h1><button onClick={refreshLobby}>Refresh</button></header>
        <div className="ih-online-history">
          {!history.length && <p>No completed Ice Hunters matches yet.</p>}
          {history.map((entry) => (
            <article key={entry.id}>
              <strong>{entry.result?.winner === "draw" ? "Draw" : entry.won ? "Victory" : "Defeat"}</strong>
              <span>Room {entry.roomCode} · {roleLabel(entry.team)}</span>
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
    const myTurn = room.status === "playing" && me?.role === room.gameState.currentPlayer;
    const counts = getCounts(room.gameState);
    return (
      <section className="ih-game ih-online-game" aria-label="Ice Hunters online match">
        <header className="ih-game-header">
          <button onClick={() => { setScreen("lobby"); refreshLobby(); }}>← Lobby</button>
          <div><p>ONLINE · {room.rulesetVersion}</p><h1>Room {room.roomCode}</h1></div>
          <button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>Copy Code</button>
        </header>
        <main className="ih-game-layout">
          <aside className="ih-role-card tigers"><span className="ih-role-icon">虎</span><strong>{room.players.find((p) => p.role === "tigers")?.name || "Waiting…"}</strong><small>Frost Hunters · {counts.goatsCaptured}/5 captures</small><em>{counts.tigerMoves} legal actions</em></aside>
          <div className="ih-board-shell">
            <div className="ih-turn-banner" data-player={room.gameState.currentPlayer}>
              <strong>{room.status === "waiting" ? "Waiting for a rival" : room.status === "finished" ? resultTitle(room.gameState) : myTurn ? describeTurn(room.gameState) : `${opponent?.name || "Opponent"} is moving`}</strong>
              <span>{room.status === "playing" ? `Turn ${room.gameState.turn} · ${phaseLabel(getPhase(room.gameState))}` : room.status === "finished" ? resultDetail(room.gameState) : `You chose ${roleLabel(me?.role)}. Share the room code.`}</span>
            </div>
            <IceHuntersBoard state={room.gameState} selectedNode={selectedNode} onNode={handleNode} interactive={myTurn && !busy} viewerRole={me?.role} />
            {message && <p className="ih-game-message" role="status">{message}</p>}
            {room.status === "finished" && <div className="ih-result-actions"><button onClick={() => { setScreen("lobby"); refreshLobby(); }}>Return to Lobby</button></div>}
          </div>
          <aside className="ih-role-card goats"><span className="ih-role-icon">●</span><strong>{room.players.find((p) => p.role === "goats")?.name || "Waiting…"}</strong><small>Penguin Colony · {counts.goatsInHand} to deploy</small><em>{counts.goatsOnBoard} scouts active</em></aside>
        </main>
        <footer className="ih-game-footer"><span>{me ? `You control ${roleLabel(me.role)}` : "Spectating"}</span><span>{busy ? "Syncing authoritative state…" : "Every placement, move and capture is validated by the server."}</span></footer>
      </section>
    );
  }

  return (
    <section className="ih-online-shell" aria-label="Ice Hunters online lobby">
      <header><button onClick={onBack}>← Ice Hunters</button><h1>Online Hunting Ground</h1><button onClick={() => setScreen("history")}>History</button></header>
      <div className="ih-online-grid">
        <article><h2>Create as Frost Hunters</h2><p>The joining player opens as the colony and deploys the first scout. You control all four corner hunters.</p><button disabled={busy} onClick={() => createRoom("public", "tigers")}>Public Hunter Room</button><button disabled={busy} onClick={() => createRoom("private", "tigers")}>Private Hunter Room</button></article>
        <article><h2>Create as Penguin Colony</h2><p>You take the first turn and deploy twenty scouts while the joining player controls all four hunters.</p><button disabled={busy} onClick={() => createRoom("public", "goats")}>Public Colony Room</button><button disabled={busy} onClick={() => createRoom("private", "goats")}>Private Colony Room</button></article>
        <article><h2>Join by Code</h2><input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={4} placeholder="ABCD" aria-label="Ice Hunters room code" /><button disabled={busy} onClick={() => joinRoom()}>Join Room</button></article>
        <article><h2>Open Hunts</h2>{!rooms.length && <p>No public hunt is waiting.</p>}{rooms.map((item) => <button key={item.roomCode} onClick={() => joinRoom(item.roomCode)}>{item.roomCode} · Join as {roleLabel(item.players[0]?.role === "tigers" ? "goats" : "tigers")}</button>)}</article>
        <article className="wide"><h2>Your Reconnectable Hunts</h2>{!myRooms.length && <p>No saved Ice Hunters match yet.</p>}{myRooms.map((item) => <button key={item.roomCode} onClick={() => resumeRoom(item.roomCode)}>{item.roomCode} · {roleLabel(item.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase())?.role)} · {item.status}</button>)}</article>
      </div>
      {message && <p className="ih-online-message" role="alert">{message}</p>}
      <button className="ih-online-refresh" disabled={busy} onClick={refreshLobby}>{busy ? "Syncing…" : "Refresh Hunts"}</button>
    </section>
  );
}

function roleLabel(role) {
  return role === "tigers" ? "Frost Hunters" : "Penguin Colony";
}

function phaseLabel(phase) {
  return phase === "goat-deployment" ? "colony deployment" : "movement";
}

function actionSummary(action) {
  if (!action) return "";
  if (action.type === "place") return `Penguin Colony deployed a scout on ${action.nodeId}.`;
  if (action.type === "capture") return `Frost Hunters captured the scout on ${action.over}.`;
  return `${roleLabel(action.player)} moved from ${action.from} to ${action.to}.`;
}
