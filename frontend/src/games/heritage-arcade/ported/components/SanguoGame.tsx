import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Bot, Copy, Globe, Users } from "lucide-react";
import SanguoBoard from "./SanguoBoard";
import { initialSanguoState, sanguoFactions, type SanguoFaction, type SanguoState } from "../game/sanguoRules";
import { applySanguoAction, BOT_LEVELS, type BotDifficulty, type SanguoAction } from "../game/sanguoBot";
import { SanguoClient, forgetSeat, inviteUrl, newSeatToken, readSeat, rememberSeat, type OnlineAction, type RoomSummary, type SanguoRoom, type SeatCredentials } from "../game/sanguoClient";
import "../styles/sanguo-play.css";

const names = { red: "Red · Retsba / Shu", green: "Green · Abster / Wu", blue: "Blue · Pengu / Wei" };
const portraits = { red: "retsba", green: "abster", blue: "pengu" };
type LocalMatch = { state: SanguoState; humans: SanguoFaction[]; difficulty: BotDifficulty; bannermen: boolean; history: SanguoState[] };
const roomFromUrl = () => (new URLSearchParams(window.location.search).get("room") || "").trim().toUpperCase();

export default function SanguoGame({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<"local" | "online">(() => roomFromUrl() ? "online" : "local");
  const [humanCount, setHumanCount] = useState(1);
  const [faction, setFaction] = useState<SanguoFaction>("red");
  const [secondFaction, setSecondFaction] = useState<SanguoFaction>("green");
  const [difficulty, setDifficulty] = useState<BotDifficulty>("medium");
  const [bannermen, setBannermen] = useState(() => new URLSearchParams(window.location.search).has("banners"));
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [code, setCode] = useState(roomFromUrl);
  const [local, setLocal] = useState<LocalMatch | null>(null);
  const [room, setRoom] = useState<SanguoRoom | null>(null);
  const [seat, setSeat] = useState<SeatCredentials | null>(() => readSeat(roomFromUrl()));
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [connected, setConnected] = useState(false);
  const [synced, setSynced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState<"new" | "leave" | "resign" | null>(null);
  const [showRoom, setShowRoom] = useState(false);
  const [botRetry, setBotRetry] = useState(0);
  const [client] = useState(() => new SanguoClient());
  const seatRef = useRef(seat); seatRef.current = seat;
  const joiningToken = useRef("");
  const mounted = useRef(true);
  const lastBotState = useRef<SanguoState | null>(null);
  const updateRoom = (next: SanguoRoom) => {
    if (!mounted.current || next.roomCode !== seatRef.current?.roomCode) return;
    setRoom(previous => !previous || previous.roomCode !== next.roomCode || next.revision >= previous.revision ? next : previous);
    setSynced(true);
  };

  useEffect(() => {
    mounted.current = true;
    client.onStatus = online => { if (!mounted.current) return; setConnected(online); if (!online) setSynced(false); };
    client.onPacket = packet => {
      if (packet.type === "sg_room_state" && packet.payload?.room) { updateRoom(packet.payload.room); setMessage(""); }
      if (packet.type === "sg_notice" && packet.payload?.roomCode === seatRef.current?.roomCode) setMessage(packet.payload.message);
    };
    return () => { mounted.current = false; client.close(); };
  }, [client]);

  // Re-authenticate the seat after reload or a dropped connection. No wallet required.
  useEffect(() => {
    if (!seat) return;
    let cancelled = false, timer: ReturnType<typeof setTimeout>;
    const sync = async () => {
      try {
        const response = await client.request<{ room: SanguoRoom }>("sg_game_state", seat);
        if (!cancelled) { updateRoom(response.room); setError(""); }
      } catch (reason) { if (!cancelled) { setSynced(false); setError((reason as Error).message); } }
      if (!cancelled) timer = setTimeout(sync, 5000);
    };
    void sync();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [seat, client]);

  useEffect(() => {
    if (!local || local.state.winner || local.state.draw) { setThinking(false); return; }
    const actor = local.state.pending?.victor || local.state.turn;
    if (local.humans.includes(actor)) { setThinking(false); return; }
    let cancelled = false;
    let worker: Worker;
    try { worker = new Worker(new URL("../game/sanguoBot.worker.ts", import.meta.url), { type: "module" }); }
    catch { setThinking(false); setError("This browser could not start the bot. Try reloading the game."); return; }
    const position = local.state; lastBotState.current = position;
    setThinking(true);
    const timeout = setTimeout(() => { if (!cancelled) { worker.terminate(); setThinking(false); setError("The bot took too long. Retry its move."); } }, 15000);
    const start = setTimeout(() => worker.postMessage({ id: position.moveNumber, state: position, difficulty: local.difficulty }), 450);
    worker.onmessage = ({ data }) => {
      if (cancelled) return;
      clearTimeout(timeout);
      if (data.error || !data.action) { setError(data.error || "The bot could not move. Retry its turn."); setThinking(false); return; }
      setLocal(current => {
        if (!current || current.state !== position) return current;
        const next = applySanguoAction(current.state, data.action);
        return next ? { ...current, state: next } : current;
      });
      setThinking(false);
    };
    worker.onerror = () => { clearTimeout(timeout); if (!cancelled) { setThinking(false); setError("Could not start the bot. Retry its turn."); } };
    return () => { cancelled = true; clearTimeout(start); clearTimeout(timeout); worker.terminate(); };
  }, [local?.state, local?.difficulty, botRetry]);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { await action(); } catch (reason) { if (mounted.current) setError((reason as Error).message); }
    finally { if (mounted.current) setBusy(false); }
  };
  const enterRoom = (next: SanguoRoom, playerId: string, token: string) => {
    const credentials = { roomCode: next.roomCode, playerId, token };
    rememberSeat(credentials); seatRef.current = credentials; setSeat(credentials); setRoom(next); setSynced(true);
    setShowRoom(false); joiningToken.current = "";
    window.history.replaceState(null, "", inviteUrl(next.roomCode));
  };
  const join = (roomCode: string) => run(async () => {
    const normalized = roomCode.trim().toUpperCase();
    const saved = readSeat(normalized);
    if (saved) {
      const response = await client.request<{ room: SanguoRoom }>("sg_game_state", saved);
      enterRoom(response.room, saved.playerId, saved.token); return;
    }
    if (!name.trim()) throw new Error("Enter a display name before joining.");
    const token = joiningToken.current ||= newSeatToken();
    const response = await client.request<{ room: SanguoRoom; playerId: string }>("sg_room_join", { name, roomCode: normalized, token });
    enterRoom(response.room, response.playerId, token);
  });
  const create = () => run(async () => {
    if (!name.trim()) throw new Error("Enter a display name before creating a room.");
    const token = joiningToken.current ||= newSeatToken();
    const response = await client.request<{ room: SanguoRoom; playerId: string }>("sg_room_create", { name, humanCount, faction, difficulty, bannermen, visibility, token });
    enterRoom(response.room, response.playerId, token);
  });
  const refresh = () => run(async () => { setRooms((await client.request<{ rooms: RoomSummary[] }>("sg_room_list")).rooms); setMessage("Public rooms refreshed."); });
  const roomCommand = (type: string, payload: object = {}) => run(async () => {
    if (!seat) return;
    const response = await client.request<{ room: SanguoRoom }>(type, { ...seat, ...payload });
    if (response.room) updateRoom(response.room);
  });
  const submit = (action: OnlineAction) => {
    if (!connected || !synced || !room) return;
    void roomCommand("sg_game_action", { revision: room.revision, action });
  };
  const clearRoom = () => {
    if (seat) forgetSeat(seat.roomCode);
    seatRef.current = null; setSeat(null); setRoom(null); setSynced(false); setShowRoom(false);
    client.disconnect();
    window.history.replaceState(null, "", "?game=heritage-arcade&table=sanguo");
  };
  const leave = () => run(async () => { if (seat) await client.request("sg_room_leave", seat); clearRoom(); });
  const startLocal = () => {
    const humans = humanCount === 3 ? [...sanguoFactions] : humanCount === 2 ? [faction, secondFaction === faction ? sanguoFactions.find(f => f !== faction)! : secondFaction] : [faction];
    setLocal({ state: initialSanguoState(bannermen), humans, difficulty, bannermen, history: [] }); setError("");
  };
  const playLocal = (action: SanguoAction) => setLocal(current => {
    if (!current || !current.humans.includes(current.state.pending?.victor || current.state.turn)) return current;
    const next = applySanguoAction(current.state, action);
    if (!next) return current;
    return { ...current, state: next, history: [...current.history.slice(-49), current.state] };
  });
  const undo = () => { setError(""); setLocal(current => current?.history.length ? { ...current, state: current.history.at(-1)!, history: current.history.slice(0, -1) } : current); };
  const me = room?.players.find(p => p.id === seat?.playerId);
  const onlineGame = room && room.status !== "waiting" && room.status !== "cancelled" && !showRoom;
  const game = onlineGame ? room.gameState : local?.state;
  const notice = onlineGame
    ? !connected || !synced ? "Reconnecting… your seat is reserved." : busy ? "Confirming your move…" : game?.winner || game?.draw ? game.note : me?.faction === (game?.pending?.victor || game?.turn) ? "Your turn." : `${names[(game?.pending?.victor || game?.turn)!]} ${room.seats[(game?.pending?.victor || game?.turn)!].botActive ? "bot is thinking…" : "is playing."}`
    : thinking ? `${names[game?.turn || "red"]} · ${BOT_LEVELS[local?.difficulty || difficulty].label} bot is thinking…` : game?.note || "";
  const alerts = <>{error && <div className="sg-error" role="alert">{error}{local && lastBotState.current === local.state && !thinking && <button type="button" onClick={() => { setError(""); setBotRetry(v => v + 1); }}>Retry bot</button>}</div>}{message && <p className="sg-message" role="status">{message}</p>}</>;
  const confirmation = confirm && <SanguoConfirmation onCancel={() => setConfirm(null)}>
    <div><h2 id="sg-confirm-title">{confirm === "resign" ? "Resign your kingdom?" : confirm === "new" ? "Return to game setup?" : "Leave this room?"}</h2><p>{confirm === "resign" ? "Your army leaves the board and the remaining kingdoms continue." : confirm === "new" ? "Your current local game will end." : "You will give up your place in this room."}</p><div className="sg-actions"><button autoFocus type="button" onClick={() => setConfirm(null)}>Keep playing</button><button type="button" onClick={() => { const action = confirm; setConfirm(null); if (action === "new") { setLocal(null); setError(""); } else if (action === "resign") submit({ type: "resign" }); else void leave(); }}>{confirm === "resign" ? "Resign" : "Continue"}</button></div></div>
  </SanguoConfirmation>;

  if (game && (local || onlineGame)) {
    const labels = Object.fromEntries(sanguoFactions.map(f => [f, onlineGame ? room.seats[f].kind === "bot" ? `${BOT_LEVELS[room.difficulty].label} bot` : `${room.players.find(p => p.faction === f)?.name || "Player"}${room.seats[f].botActive ? " · bot covering" : ""}` : local!.humans.includes(f) ? `Player ${local!.humans.indexOf(f) + 1}` : `${BOT_LEVELS[local!.difficulty].label} bot`])) as Record<SanguoFaction, string>;
    return <div className="sg-experience">{alerts}{confirmation}
      {onlineGame && <div className="sg-room-strip"><span>Room <b>{room.roomCode}</b> · You: {me ? names[me.faction] : "Spectating"}</span><button type="button" onClick={() => setShowRoom(true)}>Room details</button>{!game.winner && !game.draw && me && !game.defeated.includes(me.faction) && <button type="button" disabled={busy || !synced} onClick={() => setConfirm("resign")}>Resign</button>}</div>}
      <SanguoBoard state={game} onBack={() => onlineGame ? setShowRoom(true) : setConfirm("new")} bannermenEnabled={onlineGame ? room.bannermen : local!.bannermen}
        canAct={onlineGame ? connected && synced && !busy && me?.faction === (game.pending?.victor || game.turn) : local!.humans.includes(game.pending?.victor || game.turn) && !thinking}
        onMove={(pieceId, to) => onlineGame ? submit({ type: "move", pieceId, to }) : playLocal({ type: "move", pieceId, to })}
        onResolve={() => onlineGame ? submit({ type: "resolve" }) : playLocal({ type: "resolve" })}
        onUndo={undo} canUndo={!onlineGame && Boolean(local?.history.length)} onNewGame={() => setConfirm("new")} online={Boolean(onlineGame)} seatLabels={labels} notice={notice} />
    </div>;
  }

  if (seat) return <main className="sg-experience sg-lobby">{confirmation}<header className="sg-title"><h1>Sanguo Qi · Room {seat.roomCode}</h1><p>{connected && synced ? "Connected" : "Reconnecting to your seat…"}</p></header>{alerts}
    {room ? <><section className="sg-card"><div className="sg-section-title"><h2>{room.status === "waiting" ? "Gather your kingdoms" : room.status === "finished" ? "Match complete" : "Your match"}</h2><span>{room.visibility === "private" ? "Private room" : "Public room"}</span></div>
      <div className="sg-seats">{sanguoFactions.map(f => { const player = room.players.find(p => p.id === room.seats[f].playerId); return <div className={`sg-seat ${f}`} key={f}><img src={`/assets/heritage-arcade/board/ppba-${portraits[f]}-token.png`} alt="" /><h3>{names[f]}</h3><b>{room.seats[f].kind === "bot" ? `${BOT_LEVELS[room.difficulty].label} bot` : player?.name || "Open seat"}</b><p>{player ? !player.connected ? "Disconnected · seat reserved" : player.ready ? "Ready" : "Not ready" : room.seats[f].kind === "bot" ? "Ready to play" : "Invite a player"}</p></div>; })}</div>
      <p>{room.bannermen ? "54 pieces · includes Bannermen" : "48 pieces · standard armies"}. Bots use {BOT_LEVELS[room.difficulty].label.toLowerCase()} difficulty.</p>
      <div className="sg-invite"><label htmlFor="sg-invite">Invite link</label><input id="sg-invite" readOnly value={inviteUrl(room.roomCode)} onFocus={event => event.target.select()} /><button type="button" onClick={() => run(async () => { await navigator.clipboard.writeText(inviteUrl(room.roomCode)); setMessage("Invite link copied."); })}><Copy size={18} /> Copy</button></div>
      <div className="sg-actions">{room.status === "waiting" ? <><button type="button" disabled={busy || !synced} onClick={() => roomCommand("sg_room_ready", { ready: !me?.ready })}>{me?.ready ? "Not ready" : "I’m ready"}</button>{room.hostId === me?.id && <><button className="sg-primary" type="button" disabled={busy || !synced || room.players.some(p => !p.ready || !p.connected) || Object.values(room.seats).some(s => s.kind === "open")} onClick={() => roomCommand("sg_room_start")}>Start match</button>{Object.values(room.seats).some(s => s.kind === "open") && <button type="button" disabled={busy || !synced || room.players.some(p => !p.ready || !p.connected)} onClick={() => roomCommand("sg_room_start", { fillWithBots: true })}>Fill empty seats with bots & start</button>}</>}</> : room.status !== "cancelled" && <button className="sg-primary" type="button" onClick={() => setShowRoom(false)}>Return to board</button>}
      <button type="button" disabled={busy} onClick={() => room.status === "playing" && me && !room.gameState.defeated.includes(me.faction) ? setConfirm("resign") : setConfirm("leave")}>{room.status === "playing" && me && !room.gameState.defeated.includes(me.faction) ? "Resign" : "Leave room"}</button></div>
      <p className="sg-muted">If you lose connection, return using this link in the same browser. After two minutes, a bot covers your turns until you reconnect.</p>
    </section></> : <section className="sg-card"><p>Restoring your room…</p><button type="button" onClick={clearRoom}>Return to lobby</button></section>}
  </main>;

  const controls = <><fieldset><legend>Human players</legend><div className="sg-choice-row">{[1, 2, 3].map(n => <button type="button" key={n} aria-pressed={humanCount === n} className={humanCount === n ? "selected" : ""} onClick={() => setHumanCount(n)}>{n} {n === 1 ? "player" : "players"}<small>{n === 3 ? "All human" : `${3 - n} ${3 - n === 1 ? "bot" : "bots"}`}</small></button>)}</div></fieldset>
    <div className="sg-fields"><label>Your kingdom<select value={faction} onChange={event => { const next = event.target.value as SanguoFaction; setFaction(next); if (next === secondFaction) setSecondFaction(sanguoFactions.find(f => f !== next)!); }}>{sanguoFactions.map(f => <option key={f} value={f}>{names[f]}</option>)}</select></label>{mode === "local" && humanCount === 2 && <label>Player 2’s kingdom<select value={secondFaction} onChange={event => setSecondFaction(event.target.value as SanguoFaction)}>{sanguoFactions.filter(f => f !== faction).map(f => <option key={f} value={f}>{names[f]}</option>)}</select></label>}</div>
    <fieldset><legend>Bot difficulty</legend><div className="sg-difficulties">{Object.entries(BOT_LEVELS).map(([key, level]) => <button key={key} type="button" aria-pressed={difficulty === key} disabled={humanCount === 3 && mode === "local"} onClick={() => setDifficulty(key as BotDifficulty)} className={difficulty === key ? "selected" : ""}><Bot size={20} /><strong>{level.label}</strong><span>{level.description}</span></button>)}</div></fieldset>
    <label className="sg-checkbox"><input type="checkbox" checked={bannermen} onChange={event => setBannermen(event.target.checked)} /> Add the optional Bannermen · 54 pieces</label></>;

  return <main className="sg-experience sg-setup"><button className="sg-back" type="button" onClick={onBack}><ArrowLeft size={18} /> Heritage Arcade</button><header className="sg-title"><span>ARCTIC DOMINION</span><h1>Sanguo Qi</h1><p>Choose your kingdom. Every match has three armies.</p></header>{alerts}
    <div className="sg-tabs" role="group" aria-label="Where to play"><button type="button" aria-pressed={mode === "local"} className={mode === "local" ? "selected" : ""} onClick={() => setMode("local")}><Users size={20} /> On this device</button><button type="button" aria-pressed={mode === "online"} className={mode === "online" ? "selected" : ""} onClick={() => { setMode("online"); setHumanCount(3); }}><Globe size={20} /> Online rooms</button></div>
    {mode === "local" ? <section className="sg-card">{controls}<button className="sg-primary sg-start" type="button" onClick={startLocal}>Start {humanCount === 1 ? "solo" : `${humanCount}-player`} game</button><p className="sg-muted">{humanCount > 1 ? "Human players take turns on this device." : "You control your kingdom; bots control the other two."}</p></section> : <>
      <label className="sg-name">Display name<input maxLength={24} value={name} onChange={event => setName(event.target.value)} placeholder="Your name at the table" autoComplete="nickname" /></label>
      <div className="sg-online-grid"><section className="sg-card"><h2>Create a room</h2>{controls}<label>Who can find your room?<select value={visibility} onChange={event => setVisibility(event.target.value)}><option value="private">Friends with the invite link or code</option><option value="public">Everyone in the public lobby</option></select></label><button className="sg-primary sg-start" type="button" disabled={busy} onClick={create}>Create room</button></section>
      <section className="sg-card"><h2>Join your friends</h2><form className="sg-join" onSubmit={event => { event.preventDefault(); void join(code); }}><label>Room code<input value={code} maxLength={6} onChange={event => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="ABC234" autoCapitalize="characters" autoComplete="off" /></label><button type="submit" disabled={busy || code.length !== 6}>Join room</button></form><div className="sg-section-title"><h2>Public rooms</h2><button type="button" disabled={busy} onClick={refresh}>Refresh</button></div>{rooms.length ? <ul className="sg-public-rooms">{rooms.map(r => <li key={r.roomCode}><div><b>{r.host}’s room</b><span>{r.playerCount}/{r.humanCount} players · {r.bannermen ? "Bannermen" : "Standard"} · {r.roomCode}</span></div><button type="button" disabled={busy} onClick={() => join(r.roomCode)}>Join</button></li>)}</ul> : <p className="sg-muted">Refresh to find open rooms, or create a public room for others to join.</p>}</section></div>
    </>}
    <details className="sg-rules-summary"><summary>Rules used at this table</summary><p>Red → Green → Blue. Xiangqi movement uses the approved three-sector river connections. You cannot expose your General or capture a General directly. Checkmate or stalemate is followed by a separate “Resolve army” action; the victor takes control of the surviving army.</p><p>Arctic completion rules: three occurrences of the same position or 120 moves without a capture or Soldier move end in a draw. Resignation removes that kingdom’s army. These draw and resignation rules are modern completion rules.</p></details>
  </main>;
}

function SanguoConfirmation({ children, onCancel }: { children: ReactNode; onCancel: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); return () => dialog.current?.close(); }, []);
  return <dialog ref={dialog} className="sg-confirm" aria-labelledby="sg-confirm-title" onCancel={event => { event.preventDefault(); onCancel(); }}>{children}</dialog>;
}
