import { useEffect, useState } from "react";
import { ProfileScreen } from "../../screens/ProfileScreen.jsx";
import {
  createCrownRunRoom,
  createProfile,
  getCrownRunHistory,
  getCrownRunState,
  getMyCrownRunRooms,
  joinCrownRunRoom,
  listCrownRunRooms,
  rollCrownRunCowries,
  submitCrownRunAction
} from "../../network/socketClient.js";
import {
  CrownCowriePanel,
  CrownRunBoard,
  CrownRunDock,
  CrownThrowPool,
  sideLabel
} from "./CrownRunBoard.jsx";
import { actionSummary, describeTurn, getLegalActions, resultDetail, resultTitle } from "./rules.js";

export function CrownRunOnline({ profile, onProfileChange, onBack }) {
  const [screen, setScreen] = useState("lobby");
  const [room, setRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [history, setHistory] = useState([]);
  const [roomCode, setRoomCode] = useState("");
  const [selectedThrowId, setSelectedThrowId] = useState(null);
  const [pendingActions, setPendingActions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { if (profile) refreshLobby(); }, [profile]);
  useEffect(() => {
    const pool = room?.gameState?.throwPool || [];
    if (!pool.some((item) => item.id === selectedThrowId)) setSelectedThrowId(pool[0]?.id || null);
    setPendingActions([]);
  }, [room?.gameState?.throwPool, selectedThrowId]);

  useEffect(() => {
    function handlePacket(event) {
      const packet = event.detail;
      if (packet?.type !== "cr_room_state") return;
      const nextRoom = packet.payload?.room;
      if (!nextRoom) return;
      if (!room || nextRoom.roomCode === room.roomCode) {
        setRoom(nextRoom);
        setScreen("game");
        setMessage(nextRoom.status === "waiting" ? "Waiting for the opposing court…" : "");
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
        const nextRoom = await getCrownRunState({ roomCode: room.roomCode, profile });
        if (!cancelled) { setRoom(nextRoom); setMessage(""); }
      } catch (err) {
        if (!cancelled) setMessage(err.message || "Reconnecting to the royal track…");
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
        listCrownRunRooms(),
        getMyCrownRunRooms({ profile }),
        getCrownRunHistory({ profile })
      ]);
      setRooms(publicRooms);
      setMyRooms(ownedRooms);
      setHistory(gameHistory);
    });
  }

  async function createRoom(visibility, side) {
    const nextRoom = await withBusy(async () => {
      await ensureLogin();
      return createCrownRunRoom({ visibility, side, profile });
    });
    if (nextRoom) { setRoom(nextRoom); setScreen("game"); }
  }

  async function joinRoom(code = roomCode) {
    const cleanCode = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    if (cleanCode.length !== 4) return setMessage("Enter a four-character room code.");
    const nextRoom = await withBusy(async () => {
      await ensureLogin();
      return joinCrownRunRoom({ roomCode: cleanCode, profile });
    });
    if (nextRoom) { setRoom(nextRoom); setRoomCode(cleanCode); setScreen("game"); }
  }

  async function resumeRoom(code) {
    const nextRoom = await withBusy(async () => {
      await ensureLogin();
      return getCrownRunState({ roomCode: code, profile });
    });
    if (nextRoom) { setRoom(nextRoom); setScreen("game"); }
  }

  async function castCowries() {
    const nextRoom = await withBusy(() => rollCrownRunCowries({ roomCode: room.roomCode, profile }));
    if (nextRoom) {
      setRoom(nextRoom);
      setMessage(rollMessage(nextRoom.gameState));
    }
  }

  async function submitAction(action) {
    const nextRoom = await withBusy(() => submitCrownRunAction({ roomCode: room.roomCode, profile, action }));
    if (nextRoom) {
      setRoom(nextRoom);
      setPendingActions([]);
      setMessage(actionSummary(nextRoom.gameState.lastMove));
    }
  }

  function choosePiece(pieceId) {
    if (!room || room.status !== "playing" || busy || !selectedThrowId) return;
    const me = playerForWallet(room, profile.wallet);
    if (!me || me.side !== room.gameState.currentPlayer || room.gameState.awaiting !== "allocate") return setMessage("It is not your move.");
    const actions = getLegalActions(room.gameState, me.side).filter((action) => action.throwId === selectedThrowId && action.pieceId === pieceId);
    if (!actions.length) return setMessage("That stored throw cannot be applied to this piece.");
    if (actions.length === 1) return submitAction(actions[0]);
    setPendingActions(actions);
    setMessage("Choose whether to move or capture the rival sharing this room.");
  }

  if (!profile) return <ProfileScreen onComplete={onProfileChange} onBack={onBack} />;

  if (screen === "history") {
    return (
      <section className="cr-online-shell" aria-label="Crown Run history">
        <header><button onClick={() => setScreen("lobby")}>← Online Lobby</button><h1>Royal Track History</h1><button onClick={refreshLobby}>Refresh</button></header>
        <div className="cr-online-history">
          {!history.length && <p>No completed Crown Run matches yet.</p>}
          {history.map((entry) => (
            <article key={entry.id}>
              <strong>{entry.won ? "Crown secured" : "Court defeated"}</strong>
              <span>Room {entry.roomCode} · {sideLabel(entry.team)}</span>
              <small>{entry.rulesetVersion} · {entry.result?.kingResets?.[entry.team] || 0} crown resets · {entry.finishedAt ? new Date(entry.finishedAt).toLocaleString() : "Completed"}</small>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (screen === "game" && room) {
    const me = playerForWallet(room, profile.wallet);
    const opponent = room.players.find((player) => player.wallet.toLowerCase() !== profile.wallet.toLowerCase());
    const myTurn = room.status === "playing" && me?.side === room.gameState.currentPlayer;
    const interactive = myTurn && room.gameState.awaiting === "allocate" && !busy;
    const canRoll = myTurn && ["roll", "capture-roll"].includes(room.gameState.awaiting) && !busy;
    return (
      <section className="cr-game cr-online-game" aria-label="Crown Run online match">
        <header className="cr-game-header">
          <button onClick={() => { setScreen("lobby"); refreshLobby(); }}>← Lobby</button>
          <div><p>ONLINE · {room.rulesetVersion}</p><h1>Room {room.roomCode}</h1></div>
          <button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>Copy Code</button>
        </header>
        <main className="cr-game-layout">
          <CrownRunDock state={room.gameState} side="aurora" selectedThrowId={selectedThrowId} onPiece={choosePiece} interactive={interactive} interactiveSide={me?.side} />
          <div className="cr-board-shell">
            <CrownCowriePanel state={room.gameState} onRoll={castCowries} canRoll={canRoll} busy={busy} />
            <div className="cr-turn-banner" data-player={room.gameState.currentPlayer}>
              <strong>{room.status === "waiting" ? "Waiting for the opposing court" : room.status === "finished" ? resultTitle(room.gameState) : myTurn ? describeTurn(room.gameState) : `${opponent?.name || "Opponent"} is commanding ${sideLabel(room.gameState.currentPlayer)}`}</strong>
              <span>{room.status === "playing" ? `Turn ${room.gameState.turn}${room.gameState.captureLicense[room.gameState.currentPlayer] ? " · opposing home open" : " · capture required"}` : room.status === "finished" ? resultDetail(room.gameState) : `You chose ${sideLabel(me?.side)}. Share the room code.`}</span>
            </div>
            <CrownThrowPool throws={room.gameState.throwPool} selectedThrowId={selectedThrowId} onSelect={setSelectedThrowId} disabled={!interactive} />
            <CrownRunBoard state={room.gameState} selectedThrowId={selectedThrowId} onPiece={choosePiece} interactive={interactive} interactiveSide={me?.side} />
            {pendingActions.length > 0 && <div className="cr-action-choices">{pendingActions.map((action) => <button key={`${action.type}-${action.pieceId}`} disabled={busy} onClick={() => submitAction(action)}>{action.type === "capture-in-place" ? "Capture in this room" : `Move ${action.value} spaces${action.capturedPieceId ? " and capture" : ""}`}</button>)}</div>}
            {message && <p className="cr-game-message" role="status">{message}</p>}
            {room.status === "finished" && <div className="cr-result-panel"><h2>{resultTitle(room.gameState)}</h2><p>{resultDetail(room.gameState)}</p><div><button onClick={() => { setScreen("lobby"); refreshLobby(); }}>Return to Lobby</button></div></div>}
          </div>
          <CrownRunDock state={room.gameState} side="ember" selectedThrowId={selectedThrowId} onPiece={choosePiece} interactive={interactive} interactiveSide={me?.side} />
        </main>
        <footer className="cr-game-footer"><span>{me ? `You command ${sideLabel(me.side)}` : "Spectating"}</span><span>{busy ? "Syncing authoritative state…" : "Cowries, throw order, captures and crown resets are server-validated."}</span></footer>
      </section>
    );
  }

  return (
    <section className="cr-online-shell" aria-label="Crown Run online lobby">
      <header><button onClick={onBack}>← Crown Run</button><h1>Online Royal Track</h1><button onClick={() => setScreen("history")}>History</button></header>
      <div className="cr-online-grid">
        <article><h2>Create as Aurora</h2><p>Aurora takes the first captain turn. The joining player commands Ember.</p><button disabled={busy} onClick={() => createRoom("public", "aurora")}>Public Aurora Room</button><button disabled={busy} onClick={() => createRoom("private", "aurora")}>Private Aurora Room</button></article>
        <article><h2>Create as Ember</h2><p>The joining player takes Aurora and casts first.</p><button disabled={busy} onClick={() => createRoom("public", "ember")}>Public Ember Room</button><button disabled={busy} onClick={() => createRoom("private", "ember")}>Private Ember Room</button></article>
        <article><h2>Join by Code</h2><input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={4} placeholder="ABCD" aria-label="Crown Run room code" /><button disabled={busy} onClick={() => joinRoom()}>Join Room</button></article>
        <article><h2>Open Courts</h2>{!rooms.length && <p>No public royal track is waiting.</p>}{rooms.map((item) => <button key={item.roomCode} onClick={() => joinRoom(item.roomCode)}>{item.roomCode} · Join as {sideLabel(item.players[0]?.side === "aurora" ? "ember" : "aurora")}</button>)}</article>
        <article className="wide"><h2>Your Reconnectable Courts</h2>{!myRooms.length && <p>No saved Crown Run room yet.</p>}{myRooms.map((item) => <button key={item.roomCode} onClick={() => resumeRoom(item.roomCode)}>{item.roomCode} · {sideLabel(playerForWallet(item, profile.wallet)?.side)} · {item.status}</button>)}</article>
      </div>
      {message && <p className="cr-online-message" role="status">{message}</p>}
      <button className="cr-online-refresh" disabled={busy} onClick={refreshLobby}>{busy ? "Syncing…" : "Refresh Courts"}</button>
    </section>
  );
}

function playerForWallet(room, wallet) {
  return room?.players?.find((player) => player.wallet.toLowerCase() === String(wallet || "").toLowerCase()) || null;
}

function rollMessage(state) {
  const values = state.lastRollSequence?.map((item) => item.value) || [];
  const pass = [...(state.history || [])].reverse().find((item) => item.type === "pass");
  if (pass?.turn === state.turn - 1 && pass.reason?.includes("zero")) return "Zero forfeited the remaining sequence.";
  if (pass?.turn === state.turn - 1 && pass.reason === "no-da") return `${values.join(" · ")} contained no da, so the turn passed.`;
  return values.length ? `Stored ${values.join(" · ")}. Choose a value and a legal piece.` : "Cowries resolved.";
}
