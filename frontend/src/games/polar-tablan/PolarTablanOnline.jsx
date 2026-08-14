import { useEffect, useState } from "react";
import { ProfileScreen } from "../../screens/ProfileScreen.jsx";
import { createProfile } from "../../network/socketClient.js";
import { createPolarTablanRoom, getMyPolarTablanRooms, getPolarTablanHistory, getPolarTablanState, joinPolarTablanRoom, listPolarTablanRooms, rollPolarTablanSticks, submitPolarTablanAction } from "../../network/polarTablanSocketClient.js";
import { ConvoyPanel, PolarTablanBoard, StickTray } from "./PolarTablanBoard.jsx";
import { describeTurn, getLegalActions, resultDetail, resultTitle } from "./rules.js";

export function PolarTablanOnline({ profile, onProfileChange, onBack }) {
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
      if (event.detail?.type !== "pt_room_state") return;
      const next = event.detail.payload?.room;
      if (!next || (room && next.roomCode !== room.roomCode)) return;
      setRoom(next); setScreen("game");
    }
    window.addEventListener("server-packet", packet);
    return () => window.removeEventListener("server-packet", packet);
  }, [room]);
  useEffect(() => {
    if (!profile || !room?.roomCode || screen !== "game") return;
    let cancelled = false;
    const sync = async () => { try { await createProfile({ address: profile.wallet, name: profile.name }); const next = await getPolarTablanState({ roomCode: room.roomCode, profile }); if (!cancelled) setRoom(next); } catch (error) { if (!cancelled) setMessage(error.message || "Reconnecting to the polar route…"); } };
    const timer = window.setInterval(sync, 4000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [profile, room?.roomCode, screen]);

  async function task(fn) { try { setBusy(true); setMessage(""); return await fn(); } catch (error) { setMessage(error.message || "Request failed."); return null; } finally { setBusy(false); } }
  async function login() { if (!profile) throw new Error("Create a profile first."); await createProfile({ address: profile.wallet, name: profile.name }); }
  async function refresh() { await task(async () => { await login(); const [open, saved, past] = await Promise.all([listPolarTablanRooms(), getMyPolarTablanRooms({ profile }), getPolarTablanHistory({ profile })]); setRooms(open); setMine(saved); setHistory(past); }); }
  function open(next) { setRoom(next); setScreen("game"); }
  async function create(visibility, side) { const next = await task(async () => { await login(); return createPolarTablanRoom({ visibility, side, profile }); }); if (next) open(next); }
  async function join(value = code) { const clean = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,4); if (clean.length !== 4) return setMessage("Enter a four-character room code."); const next = await task(async () => { await login(); return joinPolarTablanRoom({ roomCode: clean, profile }); }); if (next) { setCode(clean); open(next); } }
  async function resume(roomCode) { const next = await task(async () => { await login(); return getPolarTablanState({ roomCode, profile }); }); if (next) open(next); }
  async function roll() { const next = await task(() => rollPolarTablanSticks({ roomCode: room.roomCode, profile })); if (next) open(next); }
  async function move(action) { const next = await task(() => submitPolarTablanAction({ roomCode: room.roomCode, profile, action })); if (next) open(next); }

  if (!profile) return <ProfileScreen onComplete={onProfileChange} onBack={onBack} />;
  if (screen === "history") return <section className="pt-online" aria-label="Polar Tablan history"><header><button onClick={() => setScreen("lobby")}>← Lobby</button><h1>Finish Row History</h1><button onClick={refresh}>Refresh</button></header><div className="pt-history">{!history.length && <p>No completed Polar Tablan races yet.</p>}{history.map((entry) => <article key={entry.id}><strong>{entry.won ? "Finish Row Won" : "Race Lost"}</strong><span>Room {entry.roomCode} · {sideName(entry.team)}</span><small>{entry.rulesetVersion}</small></article>)}</div></section>;

  if (screen === "game" && room) {
    const me = room.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase());
    const opponent = room.players.find((player) => player.wallet.toLowerCase() !== profile.wallet.toLowerCase());
    const myTurn = room.status === "playing" && me?.role === room.gameState.currentPlayer;
    const actions = myTurn && room.gameState.awaiting === "allocate" ? getLegalActions(room.gameState, me.role) : [];
    return <section className="pt-game pt-online-game" aria-label="Polar Tablan online match"><header className="pt-game-header"><button onClick={() => { setScreen("lobby"); refresh(); }}>← Lobby</button><div><p>ONLINE · {room.rulesetVersion}</p><h1>Room {room.roomCode}</h1></div><button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>Copy Code</button></header><main><ConvoyPanel side="ember" state={room.gameState}/><div className="pt-centre"><StickTray roll={room.gameState.lastRoll} onRoll={roll} canRoll={myTurn && room.gameState.awaiting === "roll"} busy={busy}/><div className="pt-turn-banner"><strong>{room.status === "waiting" ? "Waiting for a rival convoy" : room.status === "finished" ? resultTitle(room.gameState) : myTurn ? describeTurn(room.gameState) : `${opponent?.name || "Opponent"} is moving`}</strong><span>{room.status === "waiting" ? `Share code ${room.roomCode}` : room.status === "finished" ? resultDetail(room.gameState) : `You guide ${sideName(me?.role)}`}</span></div><PolarTablanBoard state={room.gameState} legalActions={actions} onAction={move} interactive={myTurn && !busy}/>{message && <p className="pt-message" role="alert">{message}</p>}</div><ConvoyPanel side="aurora" state={room.gameState}/></main><footer><span>{me ? `You guide ${sideName(me.role)}` : "Spectating"}</span><span>{busy ? "Syncing authoritative state…" : "The server owns every stick cast and movement validation."}</span></footer></section>;
  }

  return <section className="pt-online" aria-label="Polar Tablan online lobby"><header><button onClick={onBack}>← Polar Tablan</button><h1>Polar Route Lobby</h1><button onClick={() => setScreen("history")}>History</button></header><div className="pt-online-grid"><article><h2>Create as Aurora</h2><p>Aurora starts from the lower home row.</p><button disabled={busy} onClick={() => create("public", "aurora")}>Public Aurora Room</button><button disabled={busy} onClick={() => create("private", "aurora")}>Private Aurora Room</button></article><article><h2>Create as Ember</h2><p>The joining player takes Aurora and the opening cast.</p><button disabled={busy} onClick={() => create("public", "ember")}>Public Ember Room</button><button disabled={busy} onClick={() => create("private", "ember")}>Private Ember Room</button></article><article><h2>Join by Code</h2><input aria-label="Polar Tablan room code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={4} placeholder="ABCD"/><button disabled={busy} onClick={() => join()}>Join Room</button></article><article><h2>Open Routes</h2>{!rooms.length && <p>No public route is waiting.</p>}{rooms.map((item) => <button key={item.roomCode} onClick={() => join(item.roomCode)}>{item.roomCode} · Join</button>)}</article><article className="wide"><h2>Your Reconnectable Races</h2>{!mine.length && <p>No saved Polar Tablan room yet.</p>}{mine.map((item) => <button key={item.roomCode} onClick={() => resume(item.roomCode)}>{item.roomCode} · {item.status}</button>)}</article></div>{message && <p className="pt-message" role="alert">{message}</p>}<button className="pt-refresh" disabled={busy} onClick={refresh}>{busy ? "Syncing…" : "Refresh Routes"}</button></section>;
}

function sideName(side) { return side === "ember" ? "Ember Convoy" : "Aurora Convoy"; }
