import { useEffect, useState } from "react";
import { ProfileScreen } from "../../screens/ProfileScreen.jsx";
import {
  createFishflowRoom,
  createProfile,
  getFishflowHistory,
  getFishflowState,
  getMyFishflowRooms,
  joinFishflowRoom,
  listFishflowRooms,
  submitFishflowAction
} from "../../network/socketClient.js";
import { FishflowBoard } from "./FishflowBoard.jsx";
import { describeTurn, getCounts, resultDetail, resultTitle } from "./rules.js";

export function FishflowOnline({ profile, onProfileChange, onBack }) {
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
      if (packet?.type !== "fish_room_state") return;
      const nextRoom = packet.payload?.room;
      if (!nextRoom) return;
      if (!room || nextRoom.roomCode === room.roomCode) {
        setRoom(nextRoom);
        setScreen("game");
        setMessage(nextRoom.status === "waiting" ? "Waiting for the second current…" : "");
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
        const nextRoom = await getFishflowState({ roomCode: room.roomCode, profile });
        if (!cancelled) {
          setRoom(nextRoom);
          setMessage("");
        }
      } catch (err) {
        if (!cancelled) setMessage(err.message || "Reconnecting to the current…");
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
        listFishflowRooms(),
        getMyFishflowRooms({ profile }),
        getFishflowHistory({ profile })
      ]);
      setRooms(publicRooms);
      setMyRooms(ownedRooms);
      setHistory(gameHistory);
    });
  }

  async function createRoom(visibility, current) {
    const nextRoom = await withBusy(async () => {
      await ensureLogin();
      return createFishflowRoom({ visibility, current, profile });
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
      return joinFishflowRoom({ roomCode: cleanCode, profile });
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
      return getFishflowState({ roomCode: code, profile });
    });
    if (nextRoom) {
      setRoom(nextRoom);
      setScreen("game");
    }
  }

  async function submitPit(player, pitIndex) {
    if (!room || room.status !== "playing" || busy) return;
    const me = room.players.find((item) => item.wallet.toLowerCase() === profile.wallet.toLowerCase());
    const current = me?.current || me?.role;
    if (current !== room.gameState.currentPlayer || player !== current) {
      return setMessage("It is not your turn.");
    }
    const nextRoom = await withBusy(() => submitFishflowAction({
      roomCode: room.roomCode,
      profile,
      action: { type: "sow", pitIndex }
    }));
    if (nextRoom) {
      setRoom(nextRoom);
      setMessage(turnSummary(nextRoom.gameState.lastTurn, currentLabel(current)));
    }
  }

  if (!profile) return <ProfileScreen onComplete={onProfileChange} onBack={onBack} />;

  if (screen === "history") {
    return (
      <section className="fishflow-online-shell" aria-label="Fishflow history">
        <header><button onClick={() => setScreen("lobby")}>← Online Lobby</button><h1>Flow History</h1><button onClick={refreshLobby}>Refresh</button></header>
        <div className="fishflow-online-history">
          {!history.length && <p>No completed Fishflow matches yet.</p>}
          {history.map((entry) => (
            <article key={entry.id}>
              <strong>{entry.won ? "Victory" : "Defeat"}</strong>
              <span>Room {entry.roomCode} · {currentLabel(entry.team)} · {entry.result?.rounds || entry.finalBoardState?.round || "?"} rounds</span>
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
    const myCurrent = me?.current || me?.role;
    const myTurn = room.status === "playing" && myCurrent === room.gameState.currentPlayer;
    const counts = getCounts(room.gameState);
    return (
      <section className="fishflow-game fishflow-online-game" aria-label="Fishflow online match">
        <header className="fishflow-game-header">
          <button onClick={() => { setScreen("lobby"); refreshLobby(); }}>← Lobby</button>
          <div><p>ONLINE · {room.rulesetVersion}</p><h1>Room {room.roomCode}</h1></div>
          <button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>Copy Code</button>
        </header>
        <main className="fishflow-game-main">
          <div className="fishflow-score-row">
            <OnlineCurrentCard room={room} current="coral" counts={counts.coral} />
            <div className="fishflow-round-medallion"><small>ROUND</small><strong>{room.gameState.round}</strong><span>TURN {room.gameState.turn}</span></div>
            <OnlineCurrentCard room={room} current="blue" counts={counts.blue} />
          </div>
          <div className="fishflow-turn-banner" data-player={room.gameState.currentPlayer}>
            <strong>{room.status === "waiting" ? "Waiting for a second current" : room.status === "finished" ? resultTitle(room.gameState) : myTurn ? describeTurn(room.gameState) : `${opponent?.name || "Opponent"} is reading the current`}</strong>
            <span>{room.status === "playing" ? `Round ${room.gameState.round} · You control ${currentLabel(myCurrent)}.` : room.status === "finished" ? resultDetail(room.gameState) : `Share room code ${room.roomCode}. Blue Current begins round one.`}</span>
          </div>
          <FishflowBoard state={room.gameState} onPit={submitPit} interactive={myTurn && !busy} interactivePlayer={myCurrent} />
          {message && <p className="fishflow-game-message" role="status">{message}</p>}
          {room.status === "finished" && <div className="fishflow-result-actions"><button onClick={() => { setScreen("lobby"); refreshLobby(); }}>Return to Lobby</button></div>}
        </main>
        <footer className="fishflow-game-footer"><span>{me ? `You control ${currentLabel(myCurrent)}` : "Spectating"}</span><span>{busy ? "Syncing authoritative state…" : "Every sow, relay, exact-four pickup and refill is resolved by the server."}</span></footer>
      </section>
    );
  }

  return (
    <section className="fishflow-online-shell" aria-label="Fishflow online lobby">
      <header><button onClick={onBack}>← Fishflow</button><h1>Online Currents</h1><button onClick={() => setScreen("history")}>History</button></header>
      <div className="fishflow-online-grid">
        <article><h2>Create as Blue Current</h2><p>Blue begins round one. Later rounds alternate the starting current automatically.</p><button disabled={busy} onClick={() => createRoom("public", "blue")}>Public Blue Room</button><button disabled={busy} onClick={() => createRoom("private", "blue")}>Private Blue Room</button></article>
        <article><h2>Create as Coral Current</h2><p>The joining player becomes Blue and opens the first round. You answer from the upper current.</p><button disabled={busy} onClick={() => createRoom("public", "coral")}>Public Coral Room</button><button disabled={busy} onClick={() => createRoom("private", "coral")}>Private Coral Room</button></article>
        <article><h2>Join by Code</h2><input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={4} placeholder="ABCD" aria-label="Fishflow room code" /><button disabled={busy} onClick={() => joinRoom()}>Join Room</button></article>
        <article><h2>Open Currents</h2>{!rooms.length && <p>No public Fishflow room is waiting.</p>}{rooms.map((item) => <button key={item.roomCode} onClick={() => joinRoom(item.roomCode)}>{item.roomCode} · Join as {currentLabel(oppositeCurrent(item.players[0]?.current || item.players[0]?.role))}</button>)}</article>
        <article className="wide"><h2>Your Reconnectable Matches</h2>{!myRooms.length && <p>No saved Fishflow match yet.</p>}{myRooms.map((item) => {
          const mine = item.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase());
          return <button key={item.roomCode} onClick={() => resumeRoom(item.roomCode)}>{item.roomCode} · {currentLabel(mine?.current || mine?.role)} · {item.status} · round {item.gameState?.round || 1}</button>;
        })}</article>
      </div>
      {message && <p className="fishflow-online-message" role="alert">{message}</p>}
      <button className="fishflow-online-refresh" disabled={busy} onClick={refreshLobby}>{busy ? "Syncing…" : "Refresh Currents"}</button>
    </section>
  );
}

function OnlineCurrentCard({ room, current, counts }) {
  const player = room.players.find((item) => (item.current || item.role) === current);
  return (
    <article className={`fishflow-current-card ${current} ${room.gameState.currentPlayer === current ? "active" : ""}`}>
      <span aria-hidden="true">{current === "blue" ? "◈" : "◇"}</span>
      <div><strong>{player?.name || "Waiting…"}</strong><small>{currentLabel(current)} · {counts.activePits} active pits</small></div>
      <b>{counts.total}</b>
    </article>
  );
}

function currentLabel(current) {
  return current === "coral" ? "Coral Current" : "Blue Current";
}

function oppositeCurrent(current) {
  return current === "coral" ? "blue" : "coral";
}

function turnSummary(summary, playerLabel) {
  if (!summary) return "";
  const parts = [`${playerLabel} sowed ${summary.seedsSown} fish`];
  if (summary.exactFourPickups) parts.push(`${summary.exactFourPickups} exact-four pickup${summary.exactFourPickups === 1 ? "" : "s"}`);
  if (summary.relays) parts.push(`${summary.relays} relay${summary.relays === 1 ? "" : "s"}`);
  parts.push(`${summary.captured} fish banked`);
  if (summary.roundEnded) parts.push(summary.roundAfter > summary.roundBefore ? `round ${summary.roundAfter} opened` : "match completed");
  return `${parts.join(" · ")}.`;
}
