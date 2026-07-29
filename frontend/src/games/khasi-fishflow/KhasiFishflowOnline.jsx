import { useEffect, useState } from "react";
import { ProfileScreen } from "../../screens/ProfileScreen.jsx";
import { createProfile } from "../../network/socketClient.js";
import { createKhasiFishflowRoom, getKhasiFishflowHistory, getKhasiFishflowState, getMyKhasiFishflowRooms, joinKhasiFishflowRoom, listKhasiFishflowRooms, submitKhasiFishflowAction } from "../../network/khasiFishflowSocketClient.js";
import { KhasiFishflowBoard, KhasiScore } from "./KhasiFishflowBoard.jsx";
import { actionSummary, describeTurn, getLegalActions, resultDetail, resultTitle, sideName } from "./rules.js";

export function KhasiFishflowOnline({ profile, onProfileChange, onBack }) {
  const [screen, setScreen] = useState("lobby");
  const [room, setRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [mine, setMine] = useState([]);
  const [history, setHistory] = useState([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { if (profile) refresh(); }, [profile]);
  useEffect(() => {
    function packet(event) {
      if (event.detail?.type !== "kf_room_state") return;
      const next = event.detail.payload?.room;
      if (!next || (room && next.roomCode !== room.roomCode)) return;
      setRoom(next); setScreen("game");
    }
    window.addEventListener("server-packet", packet);
    return () => window.removeEventListener("server-packet", packet);
  }, [room]);
  useEffect(() => {
    if (!profile || !room?.roomCode || screen !== "game") return;
    const timer = setInterval(async () => { try { setRoom(await getKhasiFishflowState({ roomCode: room.roomCode, profile })); } catch {} }, 4000);
    return () => clearInterval(timer);
  }, [profile, room?.roomCode, screen]);

  async function run(task) { try { setBusy(true); setMessage(""); return await task(); } catch (error) { setMessage(error.message || "Request failed."); return null; } finally { setBusy(false); } }
  async function login() { await createProfile({ address: profile.wallet, name: profile.name }); }
  async function refresh() { await run(async () => { await login(); const [open, owned, past] = await Promise.all([listKhasiFishflowRooms(), getMyKhasiFishflowRooms({ profile }), getKhasiFishflowHistory({ profile })]); setRooms(open); setMine(owned); setHistory(past); }); }
  async function create(visibility, side) { const next = await run(async () => { await login(); return createKhasiFishflowRoom({ visibility, side, profile }); }); if (next) { setRoom(next); setScreen("game"); } }
  async function join(roomCode = code) { const clean = String(roomCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4); if (clean.length !== 4) return setMessage("Enter a four-character room code."); const next = await run(async () => { await login(); return joinKhasiFishflowRoom({ roomCode: clean, profile }); }); if (next) { setRoom(next); setScreen("game"); } }
  async function resume(roomCode) { const next = await run(async () => { await login(); return getKhasiFishflowState({ roomCode, profile }); }); if (next) { setRoom(next); setScreen("game"); } }
  async function act(action) { const next = await run(() => submitKhasiFishflowAction({ roomCode: room.roomCode, profile, action })); if (next) { setRoom(next); setMessage(actionSummary(next.gameState.lastMove)); } }

  if (!profile) return <ProfileScreen onComplete={onProfileChange} onBack={onBack} />;
  if (screen === "history") return <section className="kf-online" aria-label="Khasi Fishflow history"><header><button onClick={() => setScreen("lobby")}>← Lobby</button><h1>River History</h1><button onClick={refresh}>Refresh</button></header><div className="kf-history">{!history.length && <p>No completed Mawkar Katiya match yet.</p>}{history.map((item) => <article key={item.id}><strong>{item.won ? "River victory" : "River loss"}</strong><span>Room {item.roomCode} · {item.team}</span><small>{item.rulesetVersion}</small></article>)}</div></section>;

  if (screen === "game" && room) {
    const me = room.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase());
    const myTurn = room.status === "playing" && me?.side === room.gameState.currentPlayer;
    const legal = myTurn ? getLegalActions(room.gameState, me.side) : [];
    const done = room.status === "finished" || room.gameState.winner;
    return <section className="kf-game kf-online-game" aria-label="Khasi Fishflow online match"><header><button onClick={() => { setScreen("lobby"); refresh(); }}>← Lobby</button><div><p>ONLINE · {room.rulesetVersion}</p><h1>Room {room.roomCode}</h1></div><button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>Copy Code</button></header><main><KhasiScore state={room.gameState} /><div className="kf-turn"><strong>{room.status === "waiting" ? "Waiting for a rival current" : done ? resultTitle(room.gameState) : myTurn ? describeTurn(room.gameState) : `${sideName(room.gameState.currentPlayer)} is sowing`}</strong><span>{done ? resultDetail(room.gameState) : `Round ${room.gameState.round} · You are ${sideName(me?.side)}`}</span></div><KhasiFishflowBoard state={room.gameState} legalActions={legal} onAction={act} interactive={myTurn && !busy} />{message && <p className="kf-message" role="alert">{message}</p>}</main><footer><span>{busy ? "Syncing authoritative state…" : "The server validates every relay and handicap trigger."}</span></footer></section>;
  }

  return <section className="kf-online" aria-label="Khasi Fishflow online lobby"><header><button onClick={onBack}>← Khasi Fishflow</button><h1>Online River Board</h1><button onClick={() => setScreen("history")}>History</button></header><div className="kf-online-grid"><article><h2>Create as Aurora</h2><button onClick={() => create("public", "aurora")}>Public Aurora</button><button onClick={() => create("private", "aurora")}>Private Aurora</button></article><article><h2>Create as Ember</h2><button onClick={() => create("public", "ember")}>Public Ember</button><button onClick={() => create("private", "ember")}>Private Ember</button></article><article><h2>Join by Code</h2><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={4} aria-label="Khasi Fishflow room code" placeholder="ABCD" /><button onClick={() => join()}>Join Room</button></article><article><h2>Open Boards</h2>{!rooms.length && <p>No public river board is waiting.</p>}{rooms.map((item) => <button key={item.roomCode} onClick={() => join(item.roomCode)}>{item.roomCode} · Round {item.gameState.round}</button>)}</article><article className="wide"><h2>Your Reconnectable Matches</h2>{!mine.length && <p>No saved Khasi Fishflow room yet.</p>}{mine.map((item) => <button key={item.roomCode} onClick={() => resume(item.roomCode)}>{item.roomCode} · {item.status}</button>)}</article></div>{message && <p className="kf-message" role="alert">{message}</p>}<button className="kf-refresh" disabled={busy} onClick={refresh}>{busy ? "Syncing…" : "Refresh Boards"}</button></section>;
}
