import { useEffect, useState } from "react";
import { ProfileScreen } from "../../screens/ProfileScreen.jsx";
import {
  createFortyGlacierGuardsRoom,
  createProfile,
  getFortyGlacierGuardsHistory,
  getFortyGlacierGuardsState,
  getMyFortyGlacierGuardsRooms,
  joinFortyGlacierGuardsRoom,
  listFortyGlacierGuardsRooms,
  submitFortyGlacierGuardsAction
} from "../../network/socketClient.js";
import { FortyGlacierGuardsBoard } from "./FortyGlacierGuardsBoard.jsx";
import { describeTurn, getCounts, getLegalActions, resultDetail, resultTitle } from "./rules.js";

export function FortyGlacierGuardsOnline({ profile, onProfileChange, onBack }) {
  const [screen, setScreen] = useState("lobby");
  const [room, setRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [history, setHistory] = useState([]);
  const [roomCode, setRoomCode] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { if (profile) refreshLobby(); }, [profile]);

  useEffect(() => {
    function handlePacket(event) {
      const packet = event.detail;
      if (packet?.type !== "fgg_room_state") return;
      const nextRoom = packet.payload?.room;
      if (!nextRoom) return;
      if (!room || nextRoom.roomCode === room.roomCode) {
        setRoom(nextRoom);
        setScreen("game");
        setSelectedNode(nextRoom.gameState?.chainFrom || null);
        setMessage(nextRoom.status === "waiting" ? "Waiting for the rival guard line…" : "");
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
        const nextRoom = await getFortyGlacierGuardsState({ roomCode: room.roomCode, profile });
        if (!cancelled) {
          setRoom(nextRoom);
          setSelectedNode(nextRoom.gameState?.chainFrom || null);
          setMessage("");
        }
      } catch (err) {
        if (!cancelled) setMessage(err.message || "Reconnecting to the glacier grid…");
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
        listFortyGlacierGuardsRooms(),
        getMyFortyGlacierGuardsRooms({ profile }),
        getFortyGlacierGuardsHistory({ profile })
      ]);
      setRooms(publicRooms);
      setMyRooms(ownedRooms);
      setHistory(gameHistory);
    });
  }

  async function createRoom(visibility, role) {
    const nextRoom = await withBusy(async () => {
      await ensureLogin();
      return createFortyGlacierGuardsRoom({ visibility, role, profile });
    });
    if (nextRoom) { setRoom(nextRoom); setScreen("game"); }
  }

  async function joinRoom(code = roomCode) {
    const cleanCode = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    if (cleanCode.length !== 4) return setMessage("Enter a four-character room code.");
    const nextRoom = await withBusy(async () => {
      await ensureLogin();
      return joinFortyGlacierGuardsRoom({ roomCode: cleanCode, profile });
    });
    if (nextRoom) { setRoom(nextRoom); setRoomCode(cleanCode); setScreen("game"); }
  }

  async function resumeRoom(code) {
    const nextRoom = await withBusy(async () => {
      await ensureLogin();
      return getFortyGlacierGuardsState({ roomCode: code, profile });
    });
    if (nextRoom) { setRoom(nextRoom); setSelectedNode(nextRoom.gameState?.chainFrom || null); setScreen("game"); }
  }

  async function submitAction(action) {
    const nextRoom = await withBusy(() => submitFortyGlacierGuardsAction({ roomCode: room.roomCode, profile, action }));
    if (nextRoom) {
      setRoom(nextRoom);
      setSelectedNode(nextRoom.gameState?.chainFrom || null);
    }
  }

  function handleNode(nodeId) {
    if (!room || room.status !== "playing" || busy) return;
    const me = room.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase());
    const side = me?.role;
    if (!side || side !== room.gameState.currentPlayer) return setMessage("It is not your turn.");
    const legalActions = getLegalActions(room.gameState, side);
    if (room.gameState.chainFrom) {
      const capture = legalActions.find((action) => action.type === "capture" && action.to === nodeId);
      if (capture) return submitAction(capture);
      return setMessage("Continue with the highlighted guard or end the capture chain.");
    }
    if (room.gameState.board[nodeId] === side) {
      setSelectedNode(selectedNode === nodeId ? null : nodeId);
      setMessage("");
      return;
    }
    if (!selectedNode) return setMessage("Select one of your guards first.");
    const action = legalActions.find((candidate) => candidate.from === selectedNode && candidate.to === nodeId);
    if (action) return submitAction(action);
    setMessage("Choose an adjacent empty point or a legal orthogonal jump target.");
  }

  if (!profile) return <ProfileScreen onComplete={onProfileChange} onBack={onBack} />;

  if (screen === "history") {
    return (
      <section className="fgg-online-shell" aria-label="Forty Glacier Guards history">
        <header><button onClick={() => setScreen("lobby")}>← Online Lobby</button><h1>Glacier Grid History</h1><button onClick={refreshLobby}>Refresh</button></header>
        <div className="fgg-online-history">
          {!history.length && <p>No completed Forty Glacier Guards matches yet.</p>}
          {history.map((entry) => (
            <article key={entry.id}>
              <strong>{entry.result?.winner === "draw" ? "Draw" : entry.won ? "Victory" : "Defeat"}</strong>
              <span>Room {entry.roomCode} · {sideLabel(entry.team)}</span>
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
      <section className="fgg-game fgg-online-game" aria-label="Forty Glacier Guards online match">
        <header className="fgg-game-header">
          <button onClick={() => { setScreen("lobby"); refreshLobby(); }}>← Lobby</button>
          <div><p>ONLINE · {room.rulesetVersion}</p><h1>Room {room.roomCode}</h1></div>
          <button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>Copy Code</button>
        </header>
        <main className="fgg-game-layout">
          <RoleCard side="aurora" name={room.players.find((player) => player.role === "aurora")?.name || "Waiting…"} remaining={counts.auroraOnBoard} captured={counts.auroraCaptured} />
          <div className="fgg-board-shell">
            <div className="fgg-turn-banner" data-player={room.gameState.currentPlayer}>
              <strong>{room.status === "waiting" ? "Waiting for a rival" : room.status === "finished" ? resultTitle(room.gameState) : myTurn ? describeTurn(room.gameState) : `${opponent?.name || "Opponent"} is moving`}</strong>
              <span>{room.status === "playing" ? `Turn ${room.gameState.turn}${room.gameState.chainFrom ? " · capture chain active" : ""}` : room.status === "finished" ? resultDetail(room.gameState) : `You chose ${sideLabel(me?.role)}. Share the room code.`}</span>
            </div>
            <FortyGlacierGuardsBoard state={room.gameState} selectedNode={selectedNode} onNode={handleNode} interactive={myTurn && !busy} viewerSide={me?.role} />
            {myTurn && room.gameState.chainFrom && <button className="fgg-end-chain" disabled={busy} onClick={() => submitAction({ type: "end-chain", from: room.gameState.chainFrom })}>End Capture Turn</button>}
            {message && <p className="fgg-game-message" role="alert">{message}</p>}
            {room.status === "finished" && <div className="fgg-result-actions"><button onClick={() => { setScreen("lobby"); refreshLobby(); }}>Return to Lobby</button></div>}
          </div>
          <RoleCard side="ember" name={room.players.find((player) => player.role === "ember")?.name || "Waiting…"} remaining={counts.emberOnBoard} captured={counts.emberCaptured} />
        </main>
        <footer className="fgg-game-footer"><span>{me ? `You command ${sideLabel(me.role)}` : "Spectating"}</span><span>{busy ? "Syncing authoritative state…" : "Every step, jump and chain decision is validated by the server."}</span></footer>
      </section>
    );
  }

  return (
    <section className="fgg-online-shell" aria-label="Forty Glacier Guards online lobby">
      <header><button onClick={onBack}>← Forty Glacier Guards</button><h1>Online Glacier Grid</h1><button onClick={() => setScreen("history")}>History</button></header>
      <div className="fgg-online-grid">
        <article><h2>Create as Aurora</h2><p>Aurora takes the declared digital first turn from the lower formation.</p><button disabled={busy} onClick={() => createRoom("public", "aurora")}>Public Aurora Room</button><button disabled={busy} onClick={() => createRoom("private", "aurora")}>Private Aurora Room</button></article>
        <article><h2>Create as Ember</h2><p>The joining player takes Aurora and opens the central point.</p><button disabled={busy} onClick={() => createRoom("public", "ember")}>Public Ember Room</button><button disabled={busy} onClick={() => createRoom("private", "ember")}>Private Ember Room</button></article>
        <article><h2>Join by Code</h2><input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={4} placeholder="ABCD" aria-label="Forty Glacier Guards room code" /><button disabled={busy} onClick={() => joinRoom()}>Join Room</button></article>
        <article><h2>Open Battles</h2>{!rooms.length && <p>No public grid is waiting.</p>}{rooms.map((item) => <button key={item.roomCode} onClick={() => joinRoom(item.roomCode)}>{item.roomCode} · Join as {sideLabel(item.players[0]?.role === "aurora" ? "ember" : "aurora")}</button>)}</article>
        <article className="wide"><h2>Your Reconnectable Battles</h2>{!myRooms.length && <p>No saved grid yet.</p>}{myRooms.map((item) => <button key={item.roomCode} onClick={() => resumeRoom(item.roomCode)}>{item.roomCode} · {sideLabel(item.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase())?.role)} · {item.status}</button>)}</article>
      </div>
      {message && <p className="fgg-online-message" role="alert">{message}</p>}
      <button className="fgg-online-refresh" disabled={busy} onClick={refreshLobby}>{busy ? "Syncing…" : "Refresh Battles"}</button>
    </section>
  );
}

function RoleCard({ side, name, remaining, captured }) {
  return <aside className={`fgg-role-card ${side}`}><span className="fgg-role-icon">{side === "aurora" ? "✦" : "◆"}</span><strong>{name}</strong><small>{sideLabel(side)} · {remaining} guards remain</small><em>{captured} enemy guards captured</em></aside>;
}

function sideLabel(side) {
  return side === "ember" ? "Ember Guard" : "Aurora Guard";
}
