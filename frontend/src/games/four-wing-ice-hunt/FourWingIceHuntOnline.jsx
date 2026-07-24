import { useEffect, useState } from "react";
import { ProfileScreen } from "../../screens/ProfileScreen.jsx";
import {
  createFourWingIceHuntRoom,
  createProfile,
  getFourWingIceHuntHistory,
  getFourWingIceHuntState,
  getMyFourWingIceHuntRooms,
  joinFourWingIceHuntRoom,
  listFourWingIceHuntRooms,
  submitFourWingIceHuntAction
} from "../../network/socketClient.js";
import { FourWingBoard } from "./FourWingBoard.jsx";
import { describeTurn, getCounts, getLegalActions, getPhase, resultDetail, resultTitle } from "./rules.js";

export function FourWingIceHuntOnline({ profile, onProfileChange, onBack }) {
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
      if (packet?.type !== "fwh_room_state") return;
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
        const nextRoom = await getFourWingIceHuntState({ roomCode: room.roomCode, profile });
        if (!cancelled) {
          setRoom(nextRoom);
          setMessage("");
        }
      } catch (err) {
        if (!cancelled) setMessage(err.message || "Reconnecting to the hunt…");
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
        listFourWingIceHuntRooms(),
        getMyFourWingIceHuntRooms({ profile }),
        getFourWingIceHuntHistory({ profile })
      ]);
      setRooms(publicRooms);
      setMyRooms(ownedRooms);
      setHistory(gameHistory);
    });
  }

  async function createRoom(visibility, role) {
    const nextRoom = await withBusy(async () => {
      await ensureLogin();
      return createFourWingIceHuntRoom({ visibility, role, profile });
    });
    if (nextRoom) { setRoom(nextRoom); setScreen("game"); }
  }

  async function joinRoom(code = roomCode) {
    const cleanCode = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    if (cleanCode.length !== 4) return setMessage("Enter a four-character room code.");
    const nextRoom = await withBusy(async () => {
      await ensureLogin();
      return joinFourWingIceHuntRoom({ roomCode: cleanCode, profile });
    });
    if (nextRoom) { setRoom(nextRoom); setRoomCode(cleanCode); setScreen("game"); }
  }

  async function resumeRoom(code) {
    const nextRoom = await withBusy(async () => {
      await ensureLogin();
      return getFourWingIceHuntState({ roomCode: code, profile });
    });
    if (nextRoom) { setRoom(nextRoom); setScreen("game"); }
  }

  async function submitAction(action) {
    const nextRoom = await withBusy(() => submitFourWingIceHuntAction({ roomCode: room.roomCode, profile, action }));
    if (nextRoom) { setRoom(nextRoom); setSelectedNode(null); }
  }

  function handleNode(nodeId) {
    if (!room || room.status !== "playing" || busy) return;
    const me = room.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase());
    const role = me?.role;
    if (!role || role !== room.gameState.currentPlayer) return setMessage("It is not your turn.");
    const legalActions = getLegalActions(room.gameState, role);
    const phase = getPhase(room.gameState, role);
    if (phase !== "movement") {
      const place = legalActions.find((action) => action.type === "place" && action.nodeId === nodeId);
      if (place) return submitAction(place);
      return setMessage(room.gameState.board[nodeId] ? "That intersection is occupied." : "That placement is not legal in Parker’s opening sequence.");
    }
    if (room.gameState.board[nodeId] === role) {
      setSelectedNode(selectedNode === nodeId ? null : nodeId);
      setMessage("");
      return;
    }
    if (!selectedNode) return setMessage("Select one of your pieces first.");
    const action = legalActions.find((candidate) => candidate.from === selectedNode && candidate.to === nodeId);
    if (action) return submitAction(action);
    setMessage(role === "leopards" ? "Choose an adjacent empty point or a legal jump landing." : "Cattle move one step along a printed line.");
  }

  if (!profile) return <ProfileScreen onComplete={onProfileChange} onBack={onBack} />;

  if (screen === "history") {
    return (
      <section className="fwh-online-shell" aria-label="Four-Wing Ice Hunt history">
        <header><button onClick={() => setScreen("lobby")}>← Online Lobby</button><h1>Hunt History</h1><button onClick={refreshLobby}>Refresh</button></header>
        <div className="fwh-online-history">
          {!history.length && <p>No completed Four-Wing Ice Hunt matches yet.</p>}
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
      <section className="fwh-game fwh-online-game" aria-label="Four-Wing Ice Hunt online match">
        <header className="fwh-game-header">
          <button onClick={() => { setScreen("lobby"); refreshLobby(); }}>← Lobby</button>
          <div><p>ONLINE · {room.rulesetVersion}</p><h1>Room {room.roomCode}</h1></div>
          <button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>Copy Code</button>
        </header>
        <main className="fwh-game-layout">
          <aside className="fwh-role-card leopards"><span className="fwh-role-icon">✦</span><strong>{room.players.find((p) => p.role === "leopards")?.name || "Waiting…"}</strong><small>Snow Leopards · {counts.cattleCaptured} captures</small><em>Capture all cattle</em></aside>
          <div className="fwh-board-shell">
            <div className="fwh-turn-banner" data-player={room.gameState.currentPlayer}>
              <strong>{room.status === "waiting" ? "Waiting for a rival" : room.status === "finished" ? resultTitle(room.gameState) : myTurn ? describeTurn(room.gameState) : `${opponent?.name || "Opponent"} is moving`}</strong>
              <span>{room.status === "playing" ? `Turn ${room.gameState.turn} · ${getPhase(room.gameState)}` : room.status === "finished" ? resultDetail(room.gameState) : `You chose ${roleLabel(me?.role)}. Share the room code.`}</span>
            </div>
            <FourWingBoard state={room.gameState} selectedNode={selectedNode} onNode={handleNode} interactive={myTurn && !busy} viewerRole={me?.role} />
            {message && <p className="fwh-game-message" role="alert">{message}</p>}
            {room.status === "finished" && <div className="fwh-result-actions"><button onClick={() => { setScreen("lobby"); refreshLobby(); }}>Return to Lobby</button></div>}
          </div>
          <aside className="fwh-role-card cattle"><span className="fwh-role-icon">●</span><strong>{room.players.find((p) => p.role === "cattle")?.name || "Waiting…"}</strong><small>Ice Colony · {counts.cattleInHand} to deploy</small><em>Imprison both leopards</em></aside>
        </main>
        <footer className="fwh-game-footer"><span>{me ? `You control ${roleLabel(me.role)}` : "Spectating"}</span><span>{busy ? "Syncing authoritative state…" : "Every placement, move and capture is validated by the server."}</span></footer>
      </section>
    );
  }

  return (
    <section className="fwh-online-shell" aria-label="Four-Wing Ice Hunt online lobby">
      <header><button onClick={onBack}>← Four-Wing Ice Hunt</button><h1>Online Hunt</h1><button onClick={() => setScreen("history")}>History</button></header>
      <div className="fwh-online-grid">
        <article><h2>Create as Snow Leopards</h2><p>You open the match and place the first leopard. The joining player controls all twenty-four cattle.</p><button disabled={busy} onClick={() => createRoom("public", "leopards")}>Public Leopard Room</button><button disabled={busy} onClick={() => createRoom("private", "leopards")}>Private Leopard Room</button></article>
        <article><h2>Create as the Colony</h2><p>The joining player opens as the leopards. Your first cattle placement must be safe from immediate capture.</p><button disabled={busy} onClick={() => createRoom("public", "cattle")}>Public Colony Room</button><button disabled={busy} onClick={() => createRoom("private", "cattle")}>Private Colony Room</button></article>
        <article><h2>Join by Code</h2><input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={4} placeholder="ABCD" aria-label="Four-Wing Ice Hunt room code" /><button disabled={busy} onClick={() => joinRoom()}>Join Room</button></article>
        <article><h2>Open Hunts</h2>{!rooms.length && <p>No public hunt is waiting.</p>}{rooms.map((item) => <button key={item.roomCode} onClick={() => joinRoom(item.roomCode)}>{item.roomCode} · Join as {roleLabel(item.players[0]?.role === "leopards" ? "cattle" : "leopards")}</button>)}</article>
        <article className="wide"><h2>Your Reconnectable Hunts</h2>{!myRooms.length && <p>No saved hunt yet.</p>}{myRooms.map((item) => <button key={item.roomCode} onClick={() => resumeRoom(item.roomCode)}>{item.roomCode} · {roleLabel(item.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase())?.role)} · {item.status}</button>)}</article>
      </div>
      {message && <p className="fwh-online-message" role="alert">{message}</p>}
      <button className="fwh-online-refresh" disabled={busy} onClick={refreshLobby}>{busy ? "Syncing…" : "Refresh Hunts"}</button>
    </section>
  );
}

function roleLabel(role) {
  return role === "cattle" ? "Ice Colony" : "Snow Leopards";
}
