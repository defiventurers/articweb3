/** Design reference: preserve the supplied Arctic heritage-console lobby and change the rules experience only. */
import { useEffect, useMemo, useRef, useState } from "react";
import { FourWingBoard } from "./components/FourWingBoard";
import { chooseFourWingBotAction } from "./game/fourWingBot";
import { LEOPARD_WIN_THRESHOLD, PENGUIN_TOTAL, applyAction, createFourWingState, describeTurn, getCounts, getLegalActions, resultDetail, resultTitle, type FourWingAction, type FourWingState, type Player } from "./game/fourWingRules";

type Screen = "menu" | "rules" | "game" | "online";
type Mode = "practice-leopards" | "practice-colony" | "local" | "online";
interface BrowserRoom { code: string; state: FourWingState; hostRole: Player; updatedAt: number; }

const CREST = "/manus-storage/four-wing-ice-hunt-crest_0bffb094.png";
const ROOM_PREFIX = "four-wing-hunt-room:";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [mode, setMode] = useState<Mode>("practice-leopards");
  const [state, setState] = useState<FourWingState>(() => createFourWingState());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [onlineRoom, setOnlineRoom] = useState<BrowserRoom | null>(null);
  const botTimer = useRef<number | null>(null);

  const humanRole: Player = mode === "practice-colony" ? "colony" : "leopards";
  const botRole: Player = humanRole === "leopards" ? "colony" : "leopards";
  const isBotThinking = screen === "game" && mode !== "local" && mode !== "online" && state.currentPlayer === botRole && !state.winner;
  const counts = useMemo(() => getCounts(state), [state]);

  useEffect(() => () => { if (botTimer.current) window.clearTimeout(botTimer.current); }, []);
  useEffect(() => {
    if (botTimer.current) window.clearTimeout(botTimer.current);
    if (!isBotThinking) return;
    botTimer.current = window.setTimeout(() => {
      const action = chooseFourWingBotAction(state, botRole);
      if (!action) return;
      commitAction(action, botRole);
    }, state.phase === "deployment" ? 420 : 620);
  }, [isBotThinking, state, botRole]);

  useEffect(() => {
    const listener = (event: StorageEvent) => {
      if (!onlineRoom || event.key !== `${ROOM_PREFIX}${onlineRoom.code}` || !event.newValue) return;
      const next = JSON.parse(event.newValue) as BrowserRoom;
      setOnlineRoom(next);
      setState(next.state);
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, [onlineRoom]);

  function resetGame(nextMode = mode) {
    setMode(nextMode);
    setState(createFourWingState());
    setSelectedNode(null);
    setMessage("");
  }

  function beginGame(nextMode: Mode) {
    resetGame(nextMode);
    setScreen("game");
  }

  function commitAction(action: FourWingAction, player = state.currentPlayer) {
    const result = applyAction(state, action, player);
    setState(result.state);
    setSelectedNode(null);
    setMessage(result.error ?? "");
    if (mode === "online" && onlineRoom && !result.error) {
      const next = { ...onlineRoom, state: result.state, updatedAt: Date.now() };
      localStorage.setItem(`${ROOM_PREFIX}${onlineRoom.code}`, JSON.stringify(next));
      setOnlineRoom(next);
    }
  }

  function handleNode(nodeId: string) {
    if (state.winner || isBotThinking) return;
    const isHumanTurn = mode === "local" || mode === "online" || state.currentPlayer === humanRole;
    if (!isHumanTurn) return;
    const legal = getLegalActions(state);
    const piece = state.board[nodeId];
    const place = legal.find((action) => action.type === "place" && action.nodeId === nodeId);
    if (place) return commitAction(place);
    if (piece === state.currentPlayer) {
      setSelectedNode((current) => current === nodeId ? null : nodeId);
      setMessage("");
      return;
    }
    if (!selectedNode) {
      setMessage(state.captureChainFrom ? "Continue with the highlighted snow leopard." : "Select one of your own pieces first.");
      return;
    }
    const action = legal.find((candidate) => candidate.type !== "place" && candidate.from === selectedNode && candidate.to === nodeId);
    if (action) return commitAction(action);
    setMessage(state.currentPlayer === "leopards" ? "Choose an adjacent open point or a legal capture landing." : "Colonisers move one step along a connected line.");
  }

  function createRoom(role: Player) {
    const code = Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
    const room = { code, state: createFourWingState(), hostRole: role, updatedAt: Date.now() } satisfies BrowserRoom;
    localStorage.setItem(`${ROOM_PREFIX}${code}`, JSON.stringify(room));
    setOnlineRoom(room);
    setRoomCode(code);
    setMode("online");
    setState(room.state);
    setScreen("game");
  }

  function joinRoom() {
    const code = roomCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    const stored = localStorage.getItem(`${ROOM_PREFIX}${code}`);
    if (!stored) { setMessage("No browser room was found for that code. Create a room first or open it in another tab."); return; }
    const room = JSON.parse(stored) as BrowserRoom;
    setOnlineRoom(room);
    setMode("online");
    setState(room.state);
    setScreen("game");
    setMessage("");
  }

  if (screen === "rules") return <RulesScreen onBack={() => setScreen("menu")} onStart={() => beginGame("practice-leopards")} />;
  if (screen === "online") return <OnlineScreen message={message} roomCode={roomCode} onCodeChange={setRoomCode} onBack={() => setScreen("menu")} onCreate={createRoom} onJoin={joinRoom} />;
  if (screen === "game") return (
    <section className="game-shell" aria-label="Four-Wing Hunt match">
      <header className="game-header">
        <button onClick={() => setScreen(mode === "online" ? "online" : "menu")}>← {mode === "online" ? "Lobby" : "Menu"}</button>
        <div><p>FOUR-WING HUNT · {modeLabel(mode)}</p><h1>Four-Wing Ice Hunt</h1></div>
        <button onClick={() => resetGame()}>New Match</button>
      </header>
      <main className="game-layout">
        <aside className="role-card leopards"><img src={CREST} alt="" /><strong>Snow Leopards</strong><small>{counts.leopardsOnBoard} hunters on the ice</small><em>Capture {LEOPARD_WIN_THRESHOLD} colonisers</em></aside>
        <div className="board-shell">
          <div className="turn-banner" data-player={state.currentPlayer}>
            <strong>{state.winner ? resultTitle(state) : isBotThinking ? "The opposing side is planning…" : describeTurn(state)}</strong>
            <span>{state.winner ? resultDetail(state) : `Turn ${state.turn} · ${state.phase === "deployment" ? `Deployment · ${counts.penguinsInReserve} reserve` : "Movement"}`}</span>
          </div>
          <FourWingBoard state={state} selectedNode={selectedNode} onNode={handleNode} interactive={!isBotThinking && !state.winner} />
          {message && <p className="game-message" role="alert">{message}</p>}
          {state.winner && <div className="result-actions"><button onClick={() => resetGame()}>Play Again</button><button onClick={() => setScreen("menu")}>Main Menu</button></div>}
        </div>
        <aside className="role-card colony"><img src={CREST} alt="" /><strong>Penguin Colony</strong><small>{counts.penguinsOnBoard} active · {counts.penguinsInReserve} reserve</small><em>{counts.penguinsCaptured} captured · trap both hunters</em></aside>
      </main>
      <footer className="game-footer"><span>{modeLabel(mode)}</span><span>{state.captureChainFrom ? "A capture continuation is mandatory." : "Movement follows connected ice lines only."}</span></footer>
    </section>
  );

  return (
    <section className="menu-shell" aria-label="Four-Wing Ice Hunt menu">
      <div className="menu-card">
        <div className="title-row"><img src={CREST} alt="" /><p className="eyebrow">FOUR-WING HUNT · STANDARD RULESET</p></div>
        <h1>Four-Wing Ice<br />Hunt</h1>
        <p className="menu-copy">Deploy twenty-four penguin colonisers to imprison two mobile snow leopards. Eight colonisers begin on the ice; the remaining sixteen arrive between leopard turns.</p>
        <div className="menu-actions">
          <button className="primary" onClick={() => setScreen("online")}>Online Multiplayer</button>
          <button onClick={() => beginGame("practice-leopards")}>Practice as Snow Leopards</button>
          <button onClick={() => beginGame("practice-colony")}>Practice as the Colony</button>
          <button onClick={() => beginGame("local")}>Local Two Player</button>
          <button onClick={() => setScreen("rules")}>How to Play</button>
        </div>
        <div className="source-note">Standard play: two leopards begin on opposite wings; eight colonisers hold the central pattern; sixteen reserves deploy one at a time between leopard turns. Leopards win at twelve captures. The colony wins by immobilising both hunters.</div>
      </div>
    </section>
  );
}

function OnlineScreen({ roomCode, message, onCodeChange, onBack, onCreate, onJoin }: { roomCode: string; message: string; onCodeChange: (value: string) => void; onBack: () => void; onCreate: (role: Player) => void; onJoin: () => void }) {
  return <section className="online-shell" aria-label="Online Four-Wing Hunt lobby">
    <header><button onClick={onBack}>← Four-Wing Ice Hunt</button><div><p className="eyebrow">BROWSER ROOM LOBBY</p><h1>Online Hunt</h1></div><span /></header>
    <main className="online-grid">
      <article><h2>Create as Snow Leopards</h2><p>Open a shareable browser room and command both snow leopards.</p><button onClick={() => onCreate("leopards")}>Create Leopard Room</button></article>
      <article><h2>Create as the Colony</h2><p>Open a room and defend the four wings with the penguin colony.</p><button onClick={() => onCreate("colony")}>Create Colony Room</button></article>
      <article className="join-card"><h2>Join by Code</h2><p>Use a four-character code created in another same-browser or same-device tab.</p><input value={roomCode} onChange={(event) => onCodeChange(event.target.value.toUpperCase())} placeholder="ABCD" maxLength={4} aria-label="Browser room code" /><button onClick={onJoin}>Join Room</button></article>
      <article className="online-note"><h2>Local-first multiplayer</h2><p>The rebuilt static game preserves the online lobby and room-code flow as a browser-room feature. For live remote matchmaking, connect this client to the existing authoritative game service.</p></article>
    </main>
    {message && <p className="online-message" role="alert">{message}</p>}
  </section>;
}

function RulesScreen({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  return <section className="rules-shell" aria-label="How to Play Four-Wing Hunt">
    <button className="back-pill" onClick={onBack}>← Menu</button>
    <article className="rules-card">
      <div className="title-row"><img src={CREST} alt="" /><p className="eyebrow">HOW TO PLAY · FOUR-WING HUNT</p></div>
      <h1>Seal every escape.</h1>
      <p className="rules-intro">Four-Wing Hunt is an asymmetric line-board strategy game: two snow leopards hunt through the ice while a colony of twenty-four penguins builds a moving trap.</p>
      <div className="rules-summary"><span><b>2</b> snow leopards</span><span><b>24</b> penguin colonisers</span><span><b>8 + 16</b> initial and reserve pieces</span><span><b>12+</b> captures to win</span></div>
      <div className="rule-grid">
        <section><strong>1 · Set the hunt</strong><p>Place both snow leopards on the marked opposite outer-wing starts. Place eight penguin colonisers on the highlighted central intersections. Keep the remaining sixteen as the colony reserve.</p></section>
        <section><strong>2 · Deploy the reserve</strong><p>During deployment, the colony places one reserve penguin on any open intersection. The leopard player then takes one leopard turn. Continue until all twenty-four penguins have entered play; penguins do not make ordinary moves yet.</p></section>
        <section><strong>3 · Follow the ice lines</strong><p>Every piece stands on an intersection. A normal move goes exactly one step to an adjacent open intersection joined by a visible line. Nearby points are not connected unless a line links them.</p></section>
        <section><strong>4 · Hunt and capture</strong><p>A snow leopard captures by jumping a directly adjacent penguin along a legal line to the empty intersection immediately beyond it. Remove that penguin permanently. Penguins never jump or capture.</p></section>
        <section><strong>5 · Continue the chase</strong><p>If a leopard lands after a capture and can legally jump another penguin, it must continue with that same leopard. Each landing point must be open, and a leopard can never jump the other leopard.</p></section>
        <section><strong>6 · Win the four wings</strong><p>The snow leopards win immediately after capturing {LEOPARD_WIN_THRESHOLD} or more penguins. The colony wins immediately when both leopards have no legal one-step move and no legal capture.</p></section>
      </div>
      <div className="rules-table"><div><b>Phase</b><span>Colony action</span><span>Leopard action</span></div><div><b>Deployment</b><span>Place one reserve penguin</span><span>Move or capture with one leopard</span></div><div><b>Movement</b><span>Move one penguin one connected step</span><span>Move one leopard or start a capture chain</span></div></div>
      <div className="clarification"><strong>Quick clarification</strong><p>Captured penguins never return to the board. A capture needs an empty landing point. Once a multi-capture begins, continuing legal jumps are mandatory. The digital edition records a draw only after three identical movement positions or 160 captureless movement turns.</p></div>
      <button className="rules-start" onClick={onStart}>Start as Snow Leopards</button>
    </article>
  </section>;
}

function modeLabel(mode: Mode) {
  if (mode === "local") return "Local Two Player";
  if (mode === "online") return "Browser Room";
  return mode === "practice-colony" ? "Practice as Colony" : "Practice as Snow Leopards";
}
