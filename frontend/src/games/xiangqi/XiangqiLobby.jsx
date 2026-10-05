import React, { useEffect, useRef, useState } from "react";
import { Bot, BookOpen, Copy, Globe2, Users } from "lucide-react";
import { BOT_LEVELS } from "./engine.ts";
import { XiangqiClient, newXiangqiSeatToken, xiangqiInviteUrl, readXiangqiSeat, rememberXiangqiSeat, forgetXiangqiSeat } from "./onlineClient.js";

const SIDES = ["red", "black"];
const NAMES = { red: "Red / Shu", black: "Blue / Wei" };
const codeFromUrl = () => (new URLSearchParams(window.location.search).get("room") || "").trim().toUpperCase();

export function XiangqiLobby({ onExit, onRules, renderMatch }) {
  const [mode, setMode] = useState(() => codeFromUrl() ? "online" : "local");
  const [humanCount, setHumanCount] = useState(1);
  const [faction, setFaction] = useState("red");
  const [difficulty, setDifficulty] = useState("medium");
  const [local, setLocal] = useState(null);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [code, setCode] = useState(codeFromUrl);
  const [seat, setSeat] = useState(() => readXiangqiSeat(codeFromUrl()));
  const [room, setRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [showRoom, setShowRoom] = useState(false);
  const [connected, setConnected] = useState(false);
  const [synced, setSynced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [client] = useState(() => new XiangqiClient());
  const seatRef = useRef(seat); seatRef.current = seat;
  const admission = useRef("");
  const mounted = useRef(true);
  const busyRef = useRef(false);
  const updateRoom = next => {
    if (!mounted.current || next?.roomCode !== seatRef.current?.roomCode) return;
    setRoom(previous => !previous || next.revision > previous.revision ? next : next.revision === previous.revision ? { ...next, gameState: previous.gameState } : previous);
    setSynced(true);
  };
  useEffect(() => {
    mounted.current = true;
    client.onStatus = value => { if (mounted.current) { setConnected(value); if (!value) setSynced(false); } };
    client.onPacket = packet => {
      if (packet.type === "xq_room_state") updateRoom(packet.payload?.room);
      if (packet.type === "xq_notice" && packet.payload?.roomCode === seatRef.current?.roomCode) setMessage(packet.payload.message);
    };
    return () => { mounted.current = false; client.close(); };
  }, [client]);
  useEffect(() => {
    if (!seat) return;
    let cancelled = false, timer;
    const sync = async () => {
      try {
        const response = await client.request("xq_game_state", seat);
        if (!cancelled) { updateRoom(response.room); setError(""); }
      } catch (reason) { if (!cancelled) { setSynced(false); setError(reason.message); } }
      if (!cancelled) timer = setTimeout(sync, 5000);
    };
    void sync();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [client, seat]);

  async function run(action) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(""); setMessage("");
    try { await action(); } catch (reason) { if (mounted.current) setError(reason.message); }
    finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  }
  function enter(next, playerId, token) {
    const credentials = { roomCode: next.roomCode, playerId, token };
    rememberXiangqiSeat(credentials); seatRef.current = credentials;
    setSeat(credentials); setRoom(next); setSynced(true); setShowRoom(false); admission.current = "";
    window.history.replaceState(null, "", xiangqiInviteUrl(next.roomCode));
  }
  const create = () => run(async () => {
    if (!name.trim()) throw new Error("Enter a display name before creating a room.");
    const token = admission.current ||= newXiangqiSeatToken();
    const response = await client.request("xq_room_create", { name, humanCount, faction, difficulty, visibility, token });
    enter(response.room, response.playerId, token);
  });
  const join = roomCode => run(async () => {
    const normalized = roomCode.trim().toUpperCase();
    const saved = readXiangqiSeat(normalized);
    if (saved) {
      const response = await client.request("xq_game_state", saved);
      enter(response.room, saved.playerId, saved.token); return;
    }
    if (!name.trim()) throw new Error("Enter a display name before joining.");
    const token = admission.current ||= newXiangqiSeatToken();
    const response = await client.request("xq_room_join", { roomCode: normalized, name, token });
    enter(response.room, response.playerId, token);
  });
  const command = (type, payload = {}) => run(async () => {
    if (!seat) return;
    const response = await client.request(type, { ...seat, ...payload });
    if (response.room) updateRoom(response.room);
  });
  function clearRoom() {
    if (seat) forgetXiangqiSeat(seat.roomCode);
    seatRef.current = null; setSeat(null); setRoom(null); setSynced(false); setShowRoom(false);
    client.disconnect();
    const url = new URL(window.location.href); url.searchParams.delete("room");
    window.history.replaceState(null, "", url.toString());
  }
  const leave = () => run(async () => { await client.request("xq_room_leave", seat); clearRoom(); });
  const refresh = () => run(async () => { setRooms((await client.request("xq_room_list")).rooms); setMessage("Public rooms refreshed."); });
  const me = room?.players.find(player => player.id === seat?.playerId);
  const alerts = <>{error && <p className="xiangqi-lobby-error" role="alert">{error}</p>}{message && <p className="xiangqi-lobby-note" role="status">{message}</p>}</>;
  const canAct = connected && synced && !busy && room?.status === "playing" && me?.faction === room.gameState.turn && room.seats[me.faction]?.playerId === me.id;
  if (local) return renderMatch({ config: local, onSetup: () => setLocal(null), onExitToLibrary: onExit });
  if (room && ["playing", "finished"].includes(room.status) && !showRoom) {
    const notice = !connected || !synced ? "Reconnecting… your seat is reserved." : busy ? "Confirming your move…" : error || message || (canAct ? "Your turn." : `${NAMES[room.gameState.turn]} ${room.seats[room.gameState.turn].botActive ? "bot is thinking…" : "is playing."}`);
    return renderMatch({ config: { humans: room.players.map(player => player.faction), difficulty: room.difficulty }, onSetup: () => setShowRoom(true), onExitToLibrary: onExit,
      online: { room, canAct, notice, onAction: action => command("xq_game_action", { revision: room.revision, action }) } });
  }
  const heading = <header className="xiangqi-lobby-heading"><span>ARCTIC DOMINION · HERITAGE ARCADE</span><h1>Xiangqi <small>Polar Command</small></h1><p>Two kingdoms. Choose local players and bots, or invite a friend to an online room.</p></header>;
  if (seat) return <main className="xiangqi-app xiangqi-lobby"><section className="xiangqi-lobby-card">{heading}{alerts}<h2>Room {seat.roomCode}</h2><p className="xiangqi-lobby-note">{connected && synced ? "Connected" : "Reconnecting to your seat…"}</p>{room ? <>
    <div className="xiangqi-lobby-seats">{SIDES.map(side => { const player = room.players.find(entry => entry.id === room.seats[side].playerId); return <article key={side} className={side}><img src={`/assets/heritage-arcade/tokens/token-sanguo-${side === "red" ? "red" : "blue"}-general.webp`} alt="" /><div><h3>{NAMES[side]}</h3><strong>{room.seats[side].kind === "bot" ? `${BOT_LEVELS[room.difficulty].label} bot` : player?.name || "Open seat"}</strong><p>{player ? !player.connected ? "Disconnected · seat reserved" : player.ready ? "Ready" : "Not ready" : room.seats[side].kind === "bot" ? "Ready to play" : "Invite a friend"}</p></div></article>; })}</div>
    <div className="xiangqi-lobby-invite"><label>Invite link<input readOnly value={xiangqiInviteUrl(room.roomCode)} onFocus={event => event.target.select()} /></label><button type="button" onClick={() => run(async () => { await navigator.clipboard.writeText(xiangqiInviteUrl(room.roomCode)); setMessage("Invite link copied."); })}><Copy size={16} />Copy</button></div>
    <div className="xiangqi-lobby-actions">{room.status === "waiting" ? <><button disabled={busy || !synced} onClick={() => command("xq_room_ready", { ready: !me?.ready })}>{me?.ready ? "Not ready" : "I’m ready"}</button>{room.hostId === me?.id && <><button className="primary" disabled={busy || !synced || room.players.some(player => !player.ready || !player.connected) || SIDES.some(side => room.seats[side].kind === "open")} onClick={() => command("xq_room_start")}>Start match</button>{SIDES.some(side => room.seats[side].kind === "open") && <button disabled={busy || !synced || room.players.some(player => !player.ready || !player.connected)} onClick={() => command("xq_room_start", { fillWithBots: true })}>Fill empty seat with bot & start</button>}</>}</> : ["playing", "finished"].includes(room.status) && <button className="primary" onClick={() => setShowRoom(false)}>Return to board</button>}<button disabled={busy} onClick={leave}>{room.status === "playing" ? "Leave & hand seat to bot" : "Leave room"}</button></div>
    <p className="xiangqi-lobby-note">Return with this link in the same browser to reclaim your seat. After two minutes offline, a bot covers your turns.</p>
  </> : <button onClick={clearRoom}>Return to setup</button>}</section></main>;

  return <main className="xiangqi-app xiangqi-lobby"><section className="xiangqi-lobby-card">{heading}
    <div className="xiangqi-lobby-tabs" role="group" aria-label="Where to play"><button aria-pressed={mode === "local"} onClick={() => setMode("local")}><Users size={19} />On this device</button><button aria-pressed={mode === "online"} onClick={() => setMode("online")}><Globe2 size={19} />Online rooms</button></div>{alerts}
    <fieldset><legend>Human players</legend><div className="xiangqi-lobby-choices">{[1,2].map(count => <button key={count} aria-pressed={humanCount === count} onClick={() => setHumanCount(count)}><strong>{count} {count === 1 ? "player" : "players"}</strong><small>{count === 1 ? "1 bot" : "All human"}</small></button>)}</div></fieldset>
    <div className="xiangqi-lobby-fields"><label>Your kingdom<select value={faction} onChange={event => setFaction(event.target.value)}>{SIDES.map(side => <option key={side} value={side}>{NAMES[side]}</option>)}</select></label>{humanCount === 2 && mode === "local" && <label>Player 2 kingdom<select value={faction === "red" ? "black" : "red"} disabled><option value={faction === "red" ? "black" : "red"}>{NAMES[faction === "red" ? "black" : "red"]}</option></select></label>}</div>
    <fieldset><legend>Bot difficulty</legend><div className="xiangqi-lobby-difficulties">{Object.entries(BOT_LEVELS).map(([key,level]) => <button key={key} aria-pressed={difficulty === key} disabled={humanCount === 2 && mode === "local"} onClick={() => setDifficulty(key)}><Bot size={19} /><strong>{level.label}</strong><span>{level.description}</span></button>)}</div></fieldset>
    {mode === "local" ? <><p className="xiangqi-lobby-note">{humanCount === 1 ? "You command your kingdom; the bot commands the other. Red moves first." : "Both kingdoms are human-controlled. Take turns on this device. Red moves first."}</p><div className="xiangqi-lobby-actions"><button className="primary" onClick={() => setLocal({ humans: humanCount === 2 ? [faction, faction === "red" ? "black" : "red"] : [faction], difficulty })}>Start local match</button><button onClick={onExit}>All Games</button></div></> : <>
      <div className="xiangqi-lobby-fields"><label>Display name<input value={name} maxLength={24} placeholder="Your name" autoComplete="nickname" onChange={event => setName(event.target.value)} /></label><label>Room visibility<select value={visibility} onChange={event => setVisibility(event.target.value)}><option value="private">Private · invite code</option><option value="public">Public · lobby listing</option></select></label></div>
      <div className="xiangqi-lobby-actions"><button className="primary" disabled={busy} onClick={create}>Create room</button><button onClick={onExit}>All Games</button></div>
      <section className="xiangqi-lobby-join"><h2>Join a room</h2><form onSubmit={event => { event.preventDefault(); void join(code); }}><label>Room code<input value={code} maxLength={6} placeholder="ABC234" autoCapitalize="characters" autoComplete="off" onChange={event => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} /></label><button disabled={busy || code.length !== 6}>Join room</button></form><div className="xiangqi-lobby-list-heading"><h2>Public rooms</h2><button disabled={busy} onClick={refresh}>Refresh</button></div>{rooms.length ? <ul>{rooms.map(item => <li key={item.roomCode}><div><strong>{item.host}’s room</strong><small>{item.playerCount}/{item.humanCount} players · {item.roomCode}</small></div><button disabled={busy} onClick={() => join(item.roomCode)}>Join</button></li>)}</ul> : <p className="xiangqi-lobby-note">Refresh to find open rooms, or use a six-character invite code.</p>}</section>
    </>}
    <footer className="xiangqi-lobby-help"><button onClick={onRules}><BookOpen size={16} />Rules</button><span>9 × 10 · 32 pieces · palace and river tactics</span></footer>
  </section></main>;
}
