import { useEffect, useMemo, useRef, useState } from "react";
import { chooseBotAction } from "./bot.js";
import { NineIceFortsOnline } from "./NineIceFortsOnline.jsx";
import {
  EDGES,
  NINE_ICE_FORTS_RULESET,
  NODES,
  applyAction,
  createNineIceFortsState,
  describeTurn,
  getLegalActions,
  getPlayerPhase
} from "./rules.js";

const BOT_PLAYER = "coral";

export function NineIceFortsApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("bot");
  const [state, setState] = useState(() => createNineIceFortsState({ mode: "bot" }));
  const [selectedNode, setSelectedNode] = useState(null);
  const [message, setMessage] = useState("");
  const botTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(botTimer.current), []);

  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (screen !== "game" || mode !== "bot" || state.winner || state.currentPlayer !== BOT_PLAYER) return;
    botTimer.current = window.setTimeout(() => {
      const action = chooseBotAction(state, BOT_PLAYER);
      if (!action) return;
      const result = applyAction(state, action, BOT_PLAYER);
      setState(result.state);
      setSelectedNode(null);
      setMessage(result.error || "");
    }, state.pendingRemoval ? 420 : 700);
  }, [screen, mode, state]);

  function startGame(nextMode) {
    setMode(nextMode);
    setState(createNineIceFortsState({ mode: nextMode }));
    setSelectedNode(null);
    setMessage("");
    setScreen("game");
  }

  function resetGame() {
    setState(createNineIceFortsState({ mode }));
    setSelectedNode(null);
    setMessage("");
  }

  function handleNode(nodeId) {
    if (state.winner || (mode === "bot" && state.currentPlayer === BOT_PLAYER)) return;
    const legalActions = getLegalActions(state);
    if (state.pendingRemoval) {
      const remove = legalActions.find((action) => action.type === "remove" && action.nodeId === nodeId);
      if (remove) submitAction(remove);
      else setMessage("Choose a removable rival scout. Fort-line pieces are protected while another rival scout is exposed.");
      return;
    }
    const phase = getPlayerPhase(state);
    if (phase === "placement") {
      const place = legalActions.find((action) => action.type === "place" && action.nodeId === nodeId);
      if (place) submitAction(place);
      else setMessage("That fort is already occupied.");
      return;
    }
    if (state.board[nodeId] === state.currentPlayer) {
      setSelectedNode(nodeId === selectedNode ? null : nodeId);
      setMessage("");
      return;
    }
    if (selectedNode) {
      const move = legalActions.find((action) => action.type === "move" && action.from === selectedNode && action.to === nodeId);
      if (move) submitAction(move);
      else setMessage(phase === "flying" ? "Choose any empty fort." : "That fort is not connected by a legal ice path.");
      return;
    }
    setMessage("Select one of your scouts first.");
  }

  function submitAction(action) {
    const result = applyAction(state, action);
    setState(result.state);
    setSelectedNode(null);
    setMessage(result.error || "");
  }

  if (screen === "cover") {
    return (
      <section className="nif-cover" aria-label="Nine Ice Forts cover">
        <button className="nif-back-pill" type="button" onClick={onExitToLibrary}>← All Games</button>
        <div className="nif-cover-emblem" aria-hidden="true"><MiniFortEmblem /></div>
        <div className="nif-cover-copy">
          <p>INSPIRED BY NAVAKANKARI</p>
          <h1>NINE ICE FORTS</h1>
          <span>Form the line. Break the formation. Trap the rival tribe.</span>
          <button type="button" onClick={() => setScreen("menu")}>Enter the forts</button>
        </div>
      </section>
    );
  }

  if (screen === "menu") {
    return (
      <section className="nif-menu" aria-label="Nine Ice Forts menu">
        <button className="nif-back-pill" type="button" onClick={() => setScreen("cover")}>← Cover</button>
        <div className="nif-menu-card">
          <p className="nif-eyebrow">NAVAKANKARI · RULESET 1.0.0</p>
          <h1>Nine Ice Forts</h1>
          <p className="nif-menu-intro">Place nine scouts, form lines of three, remove rivals and win by reducing or immobilising the opposing tribe.</p>
          <div className="nif-menu-actions">
            <button type="button" className="primary" onClick={() => setScreen("online")}>Online Multiplayer</button>
            <button type="button" onClick={() => startGame("bot")}>Practice vs Frost Bot</button>
            <button type="button" onClick={() => startGame("hotseat")}>Local Two Player</button>
            <button type="button" onClick={() => setScreen("rules")}>How to Play</button>
          </div>
          <div className="nif-ruleset-note">Heritage rules: standard nine-piece Navakankari presentation. Threefold repetition and the 100-ply no-capture limit are visibly modern digital draw policies.</div>
        </div>
      </section>
    );
  }

  if (screen === "online") {
    return <NineIceFortsOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;
  }

  if (screen === "rules") return <NineIceFortsRules onBack={() => setScreen("menu")} onStart={() => startGame("bot")} />;

  return (
    <section className="nif-game" aria-label="Nine Ice Forts game">
      <header className="nif-game-header">
        <button type="button" onClick={() => setScreen("menu")}>← Menu</button>
        <div><p>NAVAKANKARI · {NINE_ICE_FORTS_RULESET.rulesetVersion}</p><h1>Nine Ice Forts</h1></div>
        <button type="button" onClick={resetGame}>New Match</button>
      </header>
      <main className="nif-game-layout">
        <aside className="nif-player-panel blue"><span className="nif-player-token" /><strong>{mode === "bot" ? "You" : "Blue Tribe"}</strong><small>{state.piecesOnBoard.blue} on board · {9 - state.placed.blue} to place</small></aside>
        <div className="nif-board-shell">
          <div className="nif-turn-banner" data-player={state.currentPlayer}><strong>{state.winner ? resultTitle(state) : describeTurn(state)}</strong><span>{state.winner ? resultDetail(state) : `Turn ${state.turn} · ${getPlayerPhase(state)}`}</span></div>
          <NineIceFortsBoard state={state} selectedNode={selectedNode} onNode={handleNode} />
          {message && <p className="nif-game-message" role="alert">{message}</p>}
          {state.winner && <div className="nif-result-actions"><button type="button" onClick={resetGame}>Play Again</button><button type="button" onClick={() => setScreen("menu")}>Main Menu</button></div>}
        </div>
        <aside className="nif-player-panel coral"><span className="nif-player-token" /><strong>{mode === "bot" ? "Frost Bot" : "Coral Tribe"}</strong><small>{state.piecesOnBoard.coral} on board · {9 - state.placed.coral} to place</small></aside>
      </main>
      <footer className="nif-game-footer"><span>Mode: {mode === "bot" ? "Practice vs Bot" : "Local Two Player"}</span><span>Form a line of three to remove one rival scout.</span></footer>
    </section>
  );
}

export function NineIceFortsBoard({ state, selectedNode, onNode, interactive = true }) {
  const legalActions = useMemo(() => getLegalActions(state), [state]);
  const legalNodeIds = new Set(legalActions.flatMap((action) => action.type === "move" ? [action.to] : [action.nodeId]));
  const movableFrom = new Set(legalActions.filter((action) => action.type === "move").map((action) => action.from));
  return (
    <div className="nif-board" role="grid" aria-label="Nine Ice Forts board">
      <svg className="nif-board-lines" viewBox="0 0 100 100" aria-hidden="true">
        {EDGES.map(([from, to]) => { const a = NODES.find((node) => node.id === from); const b = NODES.find((node) => node.id === to); return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />; })}
      </svg>
      {NODES.map((node) => {
        const piece = state.board[node.id];
        const selected = selectedNode === node.id;
        const legal = interactive && (legalNodeIds.has(node.id) || movableFrom.has(node.id));
        return <button key={node.id} type="button" disabled={!interactive} className={`nif-node ${piece ? `piece-${piece}` : "empty"} ${selected ? "selected" : ""} ${legal ? "legal" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} onClick={() => onNode(node.id)} aria-label={`${node.id}${piece ? ` occupied by ${piece}` : " empty"}${selected ? " selected" : ""}`} role="gridcell">{piece && <span className="nif-piece"><i /></span>}</button>;
      })}
    </div>
  );
}

function NineIceFortsRules({ onBack, onStart }) {
  return (
    <section className="nif-rules" aria-label="Nine Ice Forts rules">
      <button className="nif-back-pill" type="button" onClick={onBack}>← Menu</button>
      <article><p className="nif-eyebrow">HOW TO PLAY</p><h1>Nine Ice Forts</h1><div className="nif-rule-grid">
        <section><strong>1 · Place</strong><p>Players alternate placing nine scouts on the 24 fort intersections.</p></section>
        <section><strong>2 · Form a line</strong><p>Three scouts on a printed line form a fort line and allow one opposing scout to be removed.</p></section>
        <section><strong>3 · Move</strong><p>After all scouts are placed, move one scout to an adjacent empty fort along a printed path.</p></section>
        <section><strong>4 · Fly</strong><p>When reduced to three scouts, that player may move to any empty fort.</p></section>
        <section><strong>Protection</strong><p>A scout inside a completed line cannot be removed while another opposing scout remains outside a line.</p></section>
        <section><strong>Victory</strong><p>Win by reducing the opponent to two scouts or leaving them with no legal move.</p></section>
      </div><div className="nif-modern-policy"><strong>Modern digital policy</strong><span>Threefold repetition and 100 plies without capture produce a draw. These are platform rules, not presented as heritage rules.</span></div><button className="nif-rules-start" type="button" onClick={onStart}>Start Practice Match</button></article>
    </section>
  );
}

function MiniFortEmblem() { return <svg viewBox="0 0 100 100"><rect x="8" y="8" width="84" height="84" /><rect x="23" y="23" width="54" height="54" /><rect x="37" y="37" width="26" height="26" /><line x1="50" y1="8" x2="50" y2="37" /><line x1="50" y1="63" x2="50" y2="92" /><line x1="8" y1="50" x2="37" y2="50" /><line x1="63" y1="50" x2="92" y2="50" /></svg>; }
function resultTitle(state) { if (state.winner === "draw") return "The match is a draw"; return `${state.winner === "blue" ? "Blue" : "Coral"} Tribe wins`; }
function resultDetail(state) { return { "reduced-opponent-to-two": "The rival tribe has fewer than three scouts.", "immobilised-opponent": "The rival tribe has no legal move.", "threefold-repetition": "The same position occurred three times.", "no-capture-limit": "The modern no-capture limit was reached." }[state.winReason] || "Match complete."; }
