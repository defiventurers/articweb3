import { useEffect, useState } from "react";
import { ProfileScreen } from "../../screens/ProfileScreen.jsx";
import { createProfile } from "../../network/socketClient.js";
import { createKhasiFishflowRoom, getKhasiFishflowHistory, getKhasiFishflowState, getMyKhasiFishflowRooms, joinKhasiFishflowRoom, listKhasiFishflowRooms, submitKhasiFishflowAction } from "../../network/khasiFishflowSocketClient.js";
import { KhasiFishflowBoard } from "./KhasiFishflowBoard.jsx";
import { describeTurn, getLegalActions, resultDetail, resultTitle } from "./rules.js";

export function KhasiFishflowOnline({ profile, onProfileChange, onBack }) {
  const [room, setRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [history, setHistory] = useState([]);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => { if (profile) refresh(); }, [profile]);
  useEffect(() => {
    function packet(event) {
      const next = event.detail?.payload?.room;
      if (event.detail?.type === "kf_room_state" && next && (!room || next.roomCode === room.roomCode)) setRoom(next);
    }
    window.addEventListener("server-packet", packet);
    return () => window.removeEventListener("server-packet", packet);
  }, [room]);
  useEffect(() => {
    if (!profile || !room?.roomCode) return;
    const timer = window.setInterval(async () => {
      try { setRoom(await getKhasiFishflowState({ roomCode: room.roomCode, profile })); } catch {}
    }, 4000);
    return () => window.clearInterval(timer);
  }, [profile, room?.roomCode]);

  async function run(task) { try { setBusy(true); setMessage(""); return await task(); } catch (error) { setMessage(error.message || "Request failed."); return null; } finally { setBusy(false); } }
  async function login() { await createProfile({ address: profile.wallet, name: profile.name }); }
  async function refresh() { await run(async () => { await login(); const [open, mine, played] = await Promise.all([listKhasiFishflowRooms(), getMyKhasiFishflowRooms({ profile }), getKhasiFishflowHistory({ profile })]); setRooms(open); setMyRooms(mine); setHistory(played); }); }
  async function create(visibility, side) { const next = await run(async () => { await login(); return createKhasiFishflowRoom({ visibility, side, profile }); }); if (next) setRoom(next); }
  async function join(roomCode = code) { const clean = String(roomCode).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4); if (clean.length !== 4) return setMessage("Enter a four-character room code."); const next = await run(async () => { await login(); return joinKhasiFishflowRoom({ roomCode: clean, profile }); }); if (next) setRoom(next); }
  async function play(action) { const next = await run(() => submitKhasiFishflowAction({ roomCode: room.roomCode, profile, action })); if (next) setRoom(next); }

  if (!profile) return <ProfileScreen onComplete={onProfileChange} onBack={onBack} />;
  if (historyOpen) return <section className="kf-online" aria-label="Khasi Fishflow history"><header><button onClick={() => setHistoryOpen(false)}>← Lobby</button><h1>Khasi History</h1><button onClick={refresh}>Refresh</button></header><div className="kf-history">{!history.length && <p>No completed Khasi Fishflow matches.</p>}{history.map((entry) => <article key={entry.id}><strong>{entry.won ? "Highland Current Won" : "Current Lost"}</strong><span>Room {entry.roomCode}</span><small>{entry.rulesetVersion}</small></article>)}</div></section>;
  if (room) {
    const me = room.players.find((player) => player.wallet.toLowerCase() === profile.wallet.toLowerCase());
    const myTurn = room.status === "playing" && me?.side === room.gameState.currentPlayer;
    const legal = myTurn ? getLegalActions(room.gameState, me.side) : [];
    return <section className="kf-game kf-online-game" aria-label="Khasi Fishflow online match"><header><button onClick={() => { setRoom(null); refresh(); }}>← Lobby</button><div><p>ONLINE · {room.rulesetVersion}</p><h1>Room {room.roomCode}</h1></div><button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>Copy Code</button></header><main><div className="kf-banner"><strong>{room.gameState.winner ? resultTitle(room.gameState) : room.status === "waiting" ? "Waiting for a rival current" : myTurn ? describeTurn(room.gameState) : "Opponent is resolving a relay"}</strong><span>{room.gameState.winner ? resultDetail(room.gameState) : `You guide ${me?.side || "spectator"}`}</span></div><KhasiFishflowBoard state={room.gameState} legalActions={legal} onAction={play} interactive={myTurn && !busy} />{message && <p className="kf-message" role="alert">{message}</p>}</main></section>;
  }
  return <section className="kf-online" aria-label="Khasi Fishflow online lobby"><header><button onClick={onBack}>← Khasi Fishflow</button><h1>Highland Tables</h1><button onClick={() => setHistoryOpen(true)}>History</button></header><div className="kf-online-grid"><article><h2>Create as Blue</h2><button onClick={() => create("public", "blue")}>Public Blue Room</button><button onClick={() => create("private", "blue")}>Private Blue Room</button></article><article><h2>Create as Coral</h2><button onClick={() => create("public", "coral")}>Public Coral Room</button><button onClick={() => create("private", "coral")}>Private Coral Room</button></article><article><h2>Join by Code</h2><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={4} aria-label="Khasi Fishflow room code" placeholder="ABCD"/><button onClick={() => join()}>Join Room</button></article><article><h2>Open Currents</h2>{!rooms.length && <p>No public room is waiting.</p>}{rooms.map((item) => <button key={item.roomCode} onClick={() => join(item.roomCode)}>{item.roomCode} · Join</button>)}</article><article className="wide"><h2>Your Saved Currents</h2>{!myRooms.length && <p>No reconnectable room yet.</p>}{myRooms.map((item) => <button key={item.roomCode} onClick={async () => setRoom(await getKhasiFishflowState({ roomCode: item.roomCode, profile }))}>{item.roomCode} · {item.status}</button>)}</article></div>{message && <p className="kf-message">{message}</p>}<button onClick={refresh} disabled={busy}>{busy ? "Syncing…" : "Refresh"}</button></section>;
}
