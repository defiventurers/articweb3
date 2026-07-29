import { useEffect, useState } from "react";
import { ProfileScreen } from "../../screens/ProfileScreen.jsx";
import { createProfile } from "../../network/socketClient.js";
import {
  createSevenIceRingsRoom,
  getMySevenIceRingsRooms,
  getSevenIceRingsHistory,
  getSevenIceRingsState,
  joinSevenIceRingsRoom,
  listSevenIceRingsRooms,
  submitSevenIceRingsAction
} from "../../network/sevenIceRingsSocketClient.js";
import { EndClaimControls, SevenIceRingsBoard, SevenIceRingsScore } from "./SevenIceRingsBoard.jsx";
import { SAT_GOL_VARIANTS, actionSummary, describeTurn, getLegalActions, resultDetail, resultTitle, sideName } from "./rules.js";

export function SevenIceRingsOnline({ profile, onProfileChange, onBack }) {
  const [screen, setScreen] = useState("lobby");
  const [room, setRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [history, setHistory] = useState([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { if (profile) refresh(); }, [profile]);
  useEffect(() => {
    function packet(event) {
      if (event.detail?.type !== "sir_room_state") return;
      const next = event.detail.payload?.room;
      if (!next || (room && next.roomCode !== room.roomCode)) return;
      setRoom(next); setScreen("game");
    }
    window.addEventListener("server-packet", packet);
    return () => window.removeEventListener("server-packet", packet);
  }, [room]);
  useEffect(() => {
    if (!profile || !room?.roomCode || screen !== "game") return;
    const timer = window.setInterval(async () => {
      try { setRoom(await getSevenIceRingsState({ roomCode: room.roomCode, profile })); } catch {}
    }, 4000);
    return () => window.clearInterval(timer);
  }, [profile, room?.roomCode, screen]);

  async function run(task) {
    try { setBusy(true); setMessage(""); return await task(); }
    catch (error) { setMessage(error.message || "Request failed."); return null; }
    finally { setBusy(false); }
  }
  async function login() { await createProfile({ address: profile.wallet, name: profile.name }); }
  async function refresh() {
    await run(async () => { await login(); const [open, mine, past] = await Promise.all([listSevenIceRingsRooms(), getMySevenIceRingsRooms({ profile }), getSevenIceRingsHistory({ profile })]); setRooms(open); setMyRooms(mine); setHistory(past); });
  }
  async function create(visibility, side, variant) {
    const next = await run(async () => { await login(); return createSevenIceRingsRoom({ visibility, side, variant, profile }); });
    if (next) { setRoom(next); setScreen("game"); }
  }
  async function join(roomCode = code) {
    const clean = String(roomCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    if (clean.length !== 4) return setMessage("Enter a four-character room code.");
    const next = await run(async () => { await login(); return joinSevenIceRingsRoom({ roomCode: clean, profile }); });
    if (next) { setRoom(next); setScreen("game"); }
  }
  async function resume(roomCode) {
    const next = await run(async () => { await login(); return getSevenIceRingsState({ roomCode, profile }); });
    if (next) { setRoom(next); setScreen("game"); }
  }
  async function act(action) {
    const next = await run(() => submitSevenIceRingsAction({ roomCode: room.roomCode, profile, action }));
    if (next) { setRoom(next); setMessage(actionSummary(next.gameState.lastTurn)); }
  }

  if (!profile) return <ProfileScreen onComplete={onProfileChange} onBack={onBack} />;
  if (screen === "history") return <section className="sir-online" aria-label="Seven Ice Rings history"><header><button onClick={() => setScreen("lobby")}>← Lobby</button><h1>Ring History</h1><button onClick={refresh}>Refresh</button></header><div className="sir-history">{!history.length && <p>No completed Sat-gol match yet.</p>}{history.map((item) => <article key={item.id}><strong>{item.draw ? "Shared score" : item.won ? "Ring victory" : "Ring loss"}</strong><span>Room {item.roomCode} · {item.team}</span><small>{item.rulesetVersion}</small></article>)}</div></section>;

  if (screen === "game" && room) {
    const me = room.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase());
    const myTurn = room.status === "playing" && me?.side === room.gameState.currentPlayer;
    const legal = myTurn ? getLegalActions(room.gameState, me.side) : [];
    const done = room.status === "finished" || room.gameState.winner || room.gameState.draw;
    return <section className="sir-game sir-online-game" aria-label="Seven Ice Rings online match"><header><button onClick={() => { setScreen("lobby"); refresh(); }}>← Lobby</button><div><p>ONLINE · {room.rulesetVersion}</p><h1>Room {room.roomCode}</h1></div><button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>Copy Code</button></header><main><SevenIceRingsScore state={room.gameState} /><div className="sir-turn"><strong>{room.status === "waiting" ? "Waiting for a rival keeper" : done ? resultTitle(room.gameState) : myTurn ? describeTurn(room.gameState) : `${sideName(room.gameState.currentPlayer)} is sowing`}</strong><span>{done ? resultDetail(room.gameState) : `${SAT_GOL_VARIANTS[room.gameState.variant].label} · You are ${sideName(me?.side)}`}</span></div><EndClaimControls state={room.gameState} legalActions={legal} onAction={act} interactive={myTurn && !busy} /><SevenIceRingsBoard state={room.gameState} legalActions={legal} onAction={act} interactive={myTurn && !busy} />{message && <p className="sir-message" role="alert">{message}</p>}</main><footer><span>{busy ? "Syncing authoritative state…" : "The server validates every relay and score."}</span></footer></section>;
  }

  return <section className="sir-online" aria-label="Seven Ice Rings online lobby"><header><button onClick={onBack}>← Seven Ice Rings</button><h1>Online Ring Court</h1><button onClick={() => setScreen("history")}>History</button></header><div className="sir-online-grid">
    <article><h2>Open Choice</h2><p>Every turn begins from any non-empty ring.</p><button onClick={() => create("public", "aurora", "open")}>Public Aurora</button><button onClick={() => create("private", "aurora", "open")}>Private Aurora</button></article>
    <article><h2>Gosalpur Forced Start</h2><p>After the opening, the next start is forced by the previous endpoint.</p><button onClick={() => create("public", "aurora", "forced")}>Public Forced</button><button onClick={() => create("private", "ember", "forced")}>Private Ember</button></article>
    <article><h2>Join by Code</h2><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={4} aria-label="Seven Ice Rings room code" placeholder="ABCD" /><button onClick={() => join()}>Join Room</button></article>
    <article><h2>Open Tables</h2>{!rooms.length && <p>No public ring is waiting.</p>}{rooms.map((item) => <button key={item.roomCode} onClick={() => join(item.roomCode)}>{item.roomCode} · {SAT_GOL_VARIANTS[item.gameState.variant].label}</button>)}</article>
    <article className="wide"><h2>Your Reconnectable Rings</h2>{!myRooms.length && <p>No saved Sat-gol room yet.</p>}{myRooms.map((item) => <button key={item.roomCode} onClick={() => resume(item.roomCode)}>{item.roomCode} · {item.status} · {SAT_GOL_VARIANTS[item.gameState.variant].label}</button>)}</article>
  </div>{message && <p className="sir-message" role="alert">{message}</p>}<button className="sir-refresh" disabled={busy} onClick={refresh}>{busy ? "Syncing…" : "Refresh Rings"}</button></section>;
}
