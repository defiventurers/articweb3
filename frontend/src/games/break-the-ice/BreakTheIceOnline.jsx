import { useEffect, useState } from "react";
import { ProfileScreen } from "../../screens/ProfileScreen.jsx";
import {
  createBreakTheIceRoom,
  createProfile,
  getBreakTheIceHistory,
  getBreakTheIceState,
  getMyBreakTheIceRooms,
  joinBreakTheIceRoom,
  listBreakTheIceRooms,
  rollBreakTheIceCowries,
  submitBreakTheIceAction
} from "../../network/socketClient.js";
import { BreakTheIceBoard, CowrieTray } from "./BreakTheIceBoard.jsx";
import { describeTurn, getPlayerSummary, resultDetail, resultTitle } from "./rules.js";

export function BreakTheIceOnline({ profile, onProfileChange, onBack }) {
  const [screen, setScreen] = useState("lobby");
  const [room, setRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [history, setHistory] = useState([]);
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (profile) refreshLobby();
  }, [profile]);

  useEffect(() => {
    function handlePacket(event) {
      const packet = event.detail;
      if (packet?.type !== "bti_room_state") return;
      const nextRoom = packet.payload?.room;
      if (!nextRoom) return;
      if (!room || nextRoom.roomCode === room.roomCode) {
        setRoom(nextRoom);
        setScreen("game");
        setMessage(nextRoom.status === "waiting" ? "Waiting for the second racing tribe…" : "");
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
        const nextRoom = await getBreakTheIceState({ roomCode: room.roomCode, profile });
        if (!cancelled) {
          setRoom(nextRoom);
          setMessage("");
        }
      } catch (err) {
        if (!cancelled) setMessage(err.message || "Reconnecting to the race…");
      }
    };
    reconnect();
    const timer = window.setInterval(reconnect, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
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
        listBreakTheIceRooms(),
        getMyBreakTheIceRooms({ profile }),
        getBreakTheIceHistory({ profile })
      ]);
      setRooms(publicRooms);
      setMyRooms(ownedRooms);
      setHistory(gameHistory);
    });
  }

  async function createRoom(visibility, runner) {
    const nextRoom = await withBusy(async () => {
      await ensureLogin();
      return createBreakTheIceRoom({ visibility, runner, profile });
    });
    if (nextRoom) {
      setRoom(nextRoom);
      setScreen("game");
    }
  }

  async function joinRoom(code = roomCode) {
    const cleanCode = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    if (cleanCode.length !== 4) return setMessage("Enter a four-character room code.");
    const nextRoom = await withBusy(async () => {
      await ensureLogin();
      return joinBreakTheIceRoom({ roomCode: cleanCode, profile });
    });
    if (nextRoom) {
      setRoom(nextRoom);
      setRoomCode(cleanCode);
      setScreen("game");
    }
  }

  async function resumeRoom(code) {
    const nextRoom = await withBusy(async () => {
      await ensureLogin();
      return getBreakTheIceState({ roomCode: code, profile });
    });
    if (nextRoom) {
      setRoom(nextRoom);
      setScreen("game");
    }
  }

  async function castCowries() {
    if (!room || room.status !== "playing" || busy) return;
    const nextRoom = await withBusy(() => rollBreakTheIceCowries({ roomCode: room.roomCode, profile }));
    if (nextRoom) {
      setRoom(nextRoom);
      setMessage(rollSummary(nextRoom.gameState.lastRoll, nextRoom.gameState.lastMove));
    }
  }

  async function moveRunner(action) {
    if (!room || room.status !== "playing" || busy) return;
    const nextRoom = await withBusy(() => submitBreakTheIceAction({ roomCode: room.roomCode, profile, action }));
    if (nextRoom) {
      setRoom(nextRoom);
      setMessage(moveSummary(nextRoom.gameState.lastMove));
    }
  }

  if (!profile) return <ProfileScreen onComplete={onProfileChange} onBack={onBack} />;

  if (screen === "history") {
    return (
      <section className="bti-online-shell" aria-label="Break the Ice history">
        <header><button onClick={() => setScreen("lobby")}>← Online Lobby</button><h1>Race History</h1><button onClick={refreshLobby}>Refresh</button></header>
        <div className="bti-online-history">
          {!history.length && <p>No completed Break the Ice matches yet.</p>}
          {history.map((entry) => (
            <article key={entry.id}>
              <strong>{entry.won ? "Victory" : "Defeat"}</strong>
              <span>Room {entry.roomCode} · {runnerLabel(entry.team)} · {entry.result?.throws || entry.finalBoardState?.throwCount || "?"} throws</span>
              <small>{entry.rulesetVersion} · {entry.finishedAt ? new Date(entry.finishedAt).toLocaleString() : "Completed"}</small>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (screen === "game" && room) {
    const me = room.players.find((item) => item.wallet.toLowerCase() === profile.wallet.toLowerCase());
    const opponent = room.players.find((item) => item.wallet.toLowerCase() !== profile.wallet.toLowerCase());
    const myRunner = me?.runner || me?.role;
    const myTurn = room.status === "playing" && myRunner === room.gameState.currentPlayer;
    const canRoll = myTurn && room.gameState.awaiting === "roll" && !busy;
    const canMove = myTurn && room.gameState.awaiting === "move" && !busy;
    const blue = getPlayerSummary(room.gameState, "blue");
    const coral = getPlayerSummary(room.gameState, "coral");
    return (
      <section className="bti-game bti-online-game" aria-label="Break the Ice online match">
        <header className="bti-game-header">
          <button onClick={() => { setScreen("lobby"); refreshLobby(); }}>← Lobby</button>
          <div><p>ONLINE · {room.rulesetVersion}</p><h1>Room {room.roomCode}</h1></div>
          <button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>Copy Code</button>
        </header>
        <main className="bti-game-main">
          <div className="bti-score-row"><OnlineRunnerScore room={room} runner="coral" summary={coral} /><div className="bti-turn-medallion"><small>THROW</small><strong>{room.gameState.throwCount}</strong><span>TURN {room.gameState.turn}</span></div><OnlineRunnerScore room={room} runner="blue" summary={blue} /></div>
          <CowrieTray roll={room.gameState.roll || room.gameState.lastRoll} onRoll={castCowries} canRoll={canRoll} busy={busy} />
          <div className="bti-turn-banner" data-player={room.gameState.currentPlayer}>
            <strong>{room.status === "waiting" ? "Waiting for a rival tribe" : room.status === "finished" ? resultTitle(room.gameState) : myTurn ? describeTurn(room.gameState) : `${opponent?.name || "Opponent"} is racing`}</strong>
            <span>{room.status === "playing" ? `${runnerLabel(myRunner)} · ${room.gameState.awaiting === "move" ? `${room.gameState.roll.value} mouths up` : "waiting for the next cowrie cast"}.` : room.status === "finished" ? resultDetail(room.gameState) : `Share room code ${room.roomCode}. Blue Runners cast first.`}</span>
          </div>
          <BreakTheIceBoard state={room.gameState} onPiece={moveRunner} interactive={canMove} interactivePlayer={myRunner} />
          {message && <p className="bti-game-message" role="status">{message}</p>}
          {room.status === "finished" && <div className="bti-result-actions"><button onClick={() => { setScreen("lobby"); refreshLobby(); }}>Return to Lobby</button></div>}
        </main>
        <footer className="bti-game-footer"><span>{me ? `You control ${runnerLabel(myRunner)}` : "Spectating"}</span><span>{busy ? "Syncing authoritative state…" : "The server casts every cowrie and validates every exact route move."}</span></footer>
      </section>
    );
  }

  return (
    <section className="bti-online-shell" aria-label="Break the Ice online lobby">
      <header><button onClick={onBack}>← Break the Ice</button><h1>Online Ice Races</h1><button onClick={() => setScreen("history")}>History</button></header>
      <div className="bti-online-grid">
        <article><h2>Create as Blue Runners</h2><p>Blue casts first from the left marked start. The joining player races from the right.</p><button disabled={busy} onClick={() => createRoom("public", "blue")}>Public Blue Room</button><button disabled={busy} onClick={() => createRoom("private", "blue")}>Private Blue Room</button></article>
        <article><h2>Create as Coral Runners</h2><p>The joining player becomes Blue and opens the match. You race from the right marked start.</p><button disabled={busy} onClick={() => createRoom("public", "coral")}>Public Coral Room</button><button disabled={busy} onClick={() => createRoom("private", "coral")}>Private Coral Room</button></article>
        <article><h2>Join by Code</h2><input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={4} placeholder="ABCD" aria-label="Break the Ice room code" /><button disabled={busy} onClick={() => joinRoom()}>Join Room</button></article>
        <article><h2>Open Races</h2>{!rooms.length && <p>No public Break the Ice room is waiting.</p>}{rooms.map((item) => <button key={item.roomCode} onClick={() => joinRoom(item.roomCode)}>{item.roomCode} · Join as {runnerLabel(oppositeRunner(item.players[0]?.runner || item.players[0]?.role))}</button>)}</article>
        <article className="wide"><h2>Your Reconnectable Races</h2>{!myRooms.length && <p>No saved Break the Ice match yet.</p>}{myRooms.map((item) => {
          const mine = item.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase());
          const summary = getPlayerSummary(item.gameState, mine?.runner || mine?.role || "blue");
          return <button key={item.roomCode} onClick={() => resumeRoom(item.roomCode)}>{item.roomCode} · {runnerLabel(mine?.runner || mine?.role)} · {item.status} · {summary.finished}/5 out</button>;
        })}</article>
      </div>
      {message && <p className="bti-online-message" role="alert">{message}</p>}
      <button className="bti-online-refresh" disabled={busy} onClick={refreshLobby}>{busy ? "Syncing…" : "Refresh Races"}</button>
    </section>
  );
}

function OnlineRunnerScore({ room, runner, summary }) {
  const player = room.players.find((item) => (item.runner || item.role) === runner);
  return <article className={`bti-runner-score ${runner} ${room.gameState.currentPlayer === runner ? "active" : ""}`}><span aria-hidden="true">{runner === "blue" ? "◆" : "◇"}</span><div><strong>{player?.name || "Waiting…"}</strong><small>{runnerLabel(runner)} · {summary.captures} captures</small></div><b>{summary.finished}/5</b></article>;
}

function runnerLabel(runner) {
  return runner === "coral" ? "Coral Runners" : "Blue Runners";
}

function oppositeRunner(runner) {
  return runner === "coral" ? "blue" : "coral";
}

function pieceLabel(pieceId) {
  return `Runner ${String(pieceId || "").split("-")[1] || "?"}`;
}

function rollSummary(roll, pass) {
  if (!roll) return "";
  if (roll.value === 0) return `${runnerLabel(roll.player)} rolled zero mouths up and loses the throw.`;
  if (pass?.reason === "no-legal-runner") return `${runnerLabel(roll.player)} rolled ${roll.value}, but no runner can move${roll.bonus ? "; the bonus throw remains" : ""}.`;
  return `${runnerLabel(roll.player)} rolled ${roll.value}${roll.bonus ? " and earns another throw" : ""}.`;
}

function moveSummary(move) {
  if (!move) return "";
  const parts = [`${runnerLabel(move.player)} moved ${pieceLabel(move.pieceId)} by ${move.value}`];
  if (move.type === "enter") parts.push("entered the board");
  if (move.capturedPieceId) parts.push(`sent ${pieceLabel(move.capturedPieceId)} home`);
  if (move.finished) parts.push("escaped beyond the final space");
  return `${parts.join(" · ")}.`;
}
