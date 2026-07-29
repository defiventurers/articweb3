import { useEffect, useState } from "react";
import { ProfileScreen } from "../../screens/ProfileScreen.jsx";
import { createProfile } from "../../network/socketClient.js";
import {
  createKhasiFishflowRoom,
  getKhasiFishflowHistory,
  getKhasiFishflowState,
  getMyKhasiFishflowRooms,
  joinKhasiFishflowRoom,
  listKhasiFishflowRooms,
  submitKhasiFishflowAction
} from "../../network/khasiFishflowSocketClient.js";
import { KhasiFishflowBoard } from "./KhasiFishflowBoard.jsx";
import { describeTurn, getCounts, resultDetail, resultTitle } from "./rules.js";

export function KhasiFishflowOnline({ profile, onProfileChange, onBack }) {
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
    function onPacket(event) {
      if (event.detail?.type !== "kf_room_state") return;
      const next = event.detail.payload?.room;
      if (!next || (room && next.roomCode !== room.roomCode)) return;
      setRoom(next); setScreen("game");
    }
    window.addEventListener("server-packet", onPacket);
    return () => window.removeEventListener("server-packet", onPacket);
  }, [room]);
  useEffect(() => {
    if (!profile || !room?.roomCode || screen !== "game") return;
    const timer = window.setInterval(async () => {
      try {
        await createProfile({ address: profile.wallet, name: profile.name });
        setRoom(await getKhasiFishflowState({ roomCode: room.roomCode, profile }));
      } catch (error) { setMessage(error.message || "Reconnecting…"); }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [profile, room?.roomCode, screen]);

  async function run(task) {
    try { setBusy(true); setMessage(""); return await task(); }
    catch (error) { setMessage(error.message || "Request failed."); return null; }
    finally { setBusy(false); }
  }
  async function login() {
    if (!profile) throw new Error("Create a profile first.");
    await createProfile({ address: profile.wallet, name: profile.name });
  }
  async function refreshLobby() {
    await run(async () => {
      await login();
      const [open, mine, past] = await Promise.all([listKhasiFishflowRooms(), getMyKhasiFishflowRooms({ profile }), getKhasiFishflowHistory({ profile })]);
      setRooms(open); setMyRooms(mine); setHistory(past);
    });
  }
  async function create(visibility, side) {
    const next = await run(async () => { await login(); return createKhasiFishflowRoom({ visibility, side, profile }); });
    if (next) { setRoom(next); setScreen("game"); }
  }
  async function join(code = roomCode) {
    const clean = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    if (clean.length !== 4) return setMessage("Enter a four-character room code.");
    const next = await run(async () => { await login(); return joinKhasiFishflowRoom({ roomCode: clean, profile }); });
    if (next) { setRoom(next); setRoomCode(clean); setScreen("game"); }
  }
  async function resume(code) {
    const next = await run(async () => { await login(); return getKhasiFishflowState({ roomCode: code, profile }); });
    if (next) { setRoom(next); setScreen("game"); }
  }
  async function sow(player, pitIndex) {
    if (!room || busy) return;
    const me = room.players.find((item) => item.wallet.toLowerCase() === profile.wallet.toLowerCase());
    if (me?.side !== room.gameState.currentPlayer || player !== me.side) return setMessage("It is not your turn.");
    const next = await run(() => submitKhasiFishflowAction({ roomCode: room.roomCode, profile, action: { type: "sow", pitIndex } }));
    if (next) setRoom(next);
  }

  if (!profile) return <ProfileScreen onComplete={onProfileChange} onBack={onBack} />;
  if (screen === "history") return <section className="kf-online" aria-label="Khasi Fishflow history"><header><button onClick={() => setScreen("lobby")}>← Lobby</button><h1>Terrace History</h1><button onClick={refreshLobby}>Refresh</button></header><div className="kf-history">{!history.length && <p>No completed matches yet.</p>}{history.map((entry) => <article key={entry.id}><strong>{entry.won ? "Victory" : "Defeat"}</strong><span>Room {entry.roomCode} · {label(entry.team)}</span><small>{entry.rulesetVersion}</small></article>)}</div></section>;

  if (screen === "game" && room) {
    const me = room.players.find((item) => item.wallet.toLowerCase() === profile.wallet.toLowerCase());
    const opponent = room.players.find((item) => item.wallet.toLowerCase() !== profile.wallet.toLowerCase());
    const myTurn = room.status === "playing" && me?.side === room.gameState.currentPlayer;
    const counts = getCounts(room.gameState);
    return <section className="kf-game kf-online-game" aria-label="Khasi Fishflow online match"><header><button onClick={() => { setScreen("lobby"); refreshLobby(); }}>← Lobby</button><div><p>ONLINE · {room.rulesetVersion}</p><h1>Room {room.roomCode}</h1></div><button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>Copy Code</button></header><main><div className="kf-score"><Score player="ember" counts={counts.ember} active={room.gameState.currentPlayer === "ember"} name={room.players.find((p) => p.side === "ember")?.name} /><div><small>ROUND</small><strong>{room.gameState.round}</strong><span>TURN {room.gameState.turn}</span></div><Score player="aurora" counts={counts.aurora} active={room.gameState.currentPlayer === "aurora"} name={room.players.find((p) => p.side === "aurora")?.name} /></div><div className="kf-banner"><strong>{room.status === "waiting" ? "Waiting for the second current" : room.status === "finished" ? resultTitle(room.gameState) : myTurn ? describeTurn(room.gameState) : `${opponent?.name || "Opponent"} is sowing`}</strong><span>{room.status === "finished" ? resultDetail(room.gameState) : `You control ${label(me?.side)}.`}</span></div><KhasiFishflowBoard state={room.gameState} onPit={sow} interactive={myTurn && !busy} interactivePlayer={me?.side} />{message && <p className="kf-message" role="alert">{message}</p>}</main><footer><span>Server-authoritative relay and round refill.</span><span>{busy ? "Syncing…" : "Free play only."}</span></footer></section>;
  }

  return <section className="kf-online" aria-label="Khasi Fishflow online lobby"><header><button onClick={onBack}>← Khasi Fishflow</button><h1>Online Stone Terraces</h1><button onClick={() => setScreen("history")}>History</button></header><div className="kf-online-grid"><article><h2>Create as Aurora</h2><button onClick={() => create("public", "aurora")}>Public Aurora Room</button><button onClick={() => create("private", "aurora")}>Private Aurora Room</button></article><article><h2>Create as Ember</h2><button onClick={() => create("public", "ember")}>Public Ember Room</button><button onClick={() => create("private", "ember")}>Private Ember Room</button></article><article><h2>Join by Code</h2><input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={4} aria-label="Khasi Fishflow room code" /><button onClick={() => join()}>Join Room</button></article><article><h2>Open Rooms</h2>{!rooms.length && <p>No room is waiting.</p>}{rooms.map((item) => <button key={item.roomCode} onClick={() => join(item.roomCode)}>{item.roomCode} · Join</button>)}</article><article className="wide"><h2>Your Reconnectable Matches</h2>{!myRooms.length && <p>No saved room yet.</p>}{myRooms.map((item) => <button key={item.roomCode} onClick={() => resume(item.roomCode)}>{item.roomCode} · {item.status} · round {item.gameState?.round || 1}</button>)}</article></div>{message && <p className="kf-message" role="alert">{message}</p>}<button className="kf-refresh" disabled={busy} onClick={refreshLobby}>{busy ? "Syncing…" : "Refresh Rooms"}</button></section>;
}

function label(side) { return side === "ember" ? "Ember Current" : "Aurora Current"; }
function Score({ player, counts, active, name }) { return <article className={`${player} ${active ? "active" : ""}`}><span>{player === "aurora" ? "❄" : "◆"}</span><div><strong>{name || label(player)}</strong><small>{counts.activePits} active · {counts.store} stored</small></div><b>{counts.total}</b></article>; }
