import { useEffect, useRef, useState } from "react";
import { IceRingsBoard, IceRingsScore } from "./IceRingsBoard.jsx";
import { IceRingsOnline } from "./IceRingsOnline.jsx";
import { chooseIceRingsBotAction } from "./bot.js";
import {
  ICE_RINGS_RULESET,
  actionSummary,
  applyAction,
  createIceRingsState,
  createRingBreakDrillState,
  describeTurn,
  getLegalActions,
  resultDetail,
  resultTitle
} from "./rules.js";

export function IceRingsApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice-aurora");
  const [state, setState] = useState(() => createIceRingsState({ mode: "practice-aurora" }));
  const [selectedFrom, setSelectedFrom] = useState(null);
  const [message, setMessage] = useState("");
  const botTimer = useRef(null);

  const humanSide = mode === "practice-ember" ? "ember" : "aurora";
  const botSide = humanSide === "aurora" ? "ember" : "aurora";
  const localOpen = ["hotseat", "drill"].includes(mode);

  useEffect(() => () => window.clearTimeout(botTimer.current), []);
  useEffect(() => {
    if (state.chainFrom) setSelectedFrom(state.chainFrom);
    else if (selectedFrom && !getLegalActions(state, state.currentPlayer).some((action) => action.from === selectedFrom)) setSelectedFrom(null);
  }, [state]);
  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (screen !== "game" || localOpen || state.winner || state.currentPlayer !== botSide) return;
    botTimer.current = window.setTimeout(() => {
      const action = chooseIceRingsBotAction(state, botSide);
      if (!action) return;
      const result = applyAction(state, action, botSide);
      setState(result.state);
      setSelectedFrom(result.state.chainFrom || null);
      setMessage(result.error || actionSummary(result.state.lastAction));
    }, state.chainFrom ? 360 : 520);
  }, [botSide, localOpen, screen, state]);

  function startGame(nextMode) {
    setMode(nextMode);
    const next = nextMode === "drill"
      ? createRingBreakDrillState()
      : createIceRingsState({ mode: nextMode, starter: "aurora" });
    setState(next);
    setSelectedFrom(next.chainFrom || null);
    setMessage(nextMode === "drill" ? "Aurora must jump inward, then continue through the empty centre line." : "");
    setScreen("game");
  }

  function canHumanAct() {
    return localOpen || state.currentPlayer === humanSide;
  }

  function handleNodeClick(nodeId, targetAction) {
    if (!canHumanAct() || state.winner) return;
    const legal = getLegalActions(state, state.currentPlayer);
    if (targetAction) {
      const result = applyAction(state, targetAction, state.currentPlayer);
      setState(result.state);
      setSelectedFrom(result.state.chainFrom || null);
      setMessage(result.error || actionSummary(result.state.lastAction));
      return;
    }
    if (legal.some((action) => action.from === nodeId)) setSelectedFrom(nodeId);
  }

  if (screen === "cover") {
    return (
      <section className="ir-cover" aria-label="Ice Rings cover">
        <button className="ir-back-pill" onClick={onExitToLibrary}>← All Games</button>
        <div className="ir-cover-art" aria-hidden="true">
          <div className="ir-cover-rings"><i /><i /><i /><b>✦</b></div>
          <div className="ir-cover-guards aurora"><span>✦</span><span>✦</span><span>✦</span></div>
          <div className="ir-cover-guards ember"><span>◆</span><span>◆</span><span>◆</span></div>
        </div>
        <div className="ir-cover-copy">
          <p>PRETWA · BIHAR · CIRCULAR WAR GAME</p>
          <h1>ICE<br />RINGS</h1>
          <span>Nine guards hold three frozen circles. Every available capture is compulsory, and one opening can become a devastating chain across the whole formation.</span>
          <button onClick={() => setScreen("menu")}>Enter the rings</button>
        </div>
      </section>
    );
  }

  if (screen === "menu") {
    return (
      <section className="ir-menu" aria-label="Ice Rings menu">
        <button className="ir-back-pill" onClick={() => setScreen("cover")}>← Cover</button>
        <article className="ir-menu-card">
          <p className="ir-eyebrow">PRETWA · THREE CONCENTRIC CIRCLES</p>
          <h1>Ice Rings</h1>
          <p>Move along the printed rings and spokes. When a jump is available, it must be taken; the same guard keeps jumping until its chain is exhausted.</p>
          <div className="ir-menu-actions">
            <button className="primary" onClick={() => setScreen("online")}>Online Multiplayer</button>
            <button onClick={() => startGame("practice-aurora")}>Practice as Aurora</button>
            <button onClick={() => startGame("practice-ember")}>Practice as Ember</button>
            <button onClick={() => startGame("hotseat")}>Local Two Player</button>
            <button onClick={() => startGame("drill")}>Ring Break Drill</button>
            <button onClick={() => setScreen("rules")}>How to Play</button>
          </div>
          <div className="ir-source-note">Murray records Pretwa as a Bihar game played by nine pieces per side on three concentric circles and six spokes. Capture compulsion and compulsory continuation are published here as an explicit tournament interpretation, not hidden as historical certainty.</div>
        </article>
      </section>
    );
  }

  if (screen === "online") return <IceRingsOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;
  if (screen === "rules") return <RulesScreen onBack={() => setScreen("menu")} onStart={() => startGame("practice-aurora")} />;

  const humanMayAct = canHumanAct() && !state.winner;
  const legalActions = humanMayAct ? getLegalActions(state, state.currentPlayer) : [];
  const isBotThinking = !localOpen && state.currentPlayer === botSide && !state.winner;
  const ariaLabel = mode === "drill" ? "Ice Rings capture drill" : "Ice Rings game";

  return (
    <section className="ir-game" aria-label={ariaLabel}>
      <header className="ir-game-header">
        <button onClick={() => setScreen("menu")}>← Menu</button>
        <div><p>PRETWA · {ICE_RINGS_RULESET.rulesetVersion}</p><h1>Ice Rings</h1></div>
        <button onClick={() => startGame(mode)}>New Match</button>
      </header>
      <main className="ir-game-layout">
        <IceRingsScore state={state} side="aurora" />
        <div className="ir-game-centre">
          <div className="ir-turn-banner" data-player={state.currentPlayer}>
            <strong>{state.winner ? resultTitle(state) : isBotThinking ? `${state.currentPlayer === "aurora" ? "Aurora" : "Ember"} is calculating the forced line…` : describeTurn(state)}</strong>
            <span>{state.winner ? resultDetail(state) : `Turn ${state.turn} · ${state.chainFrom ? `chain from ${state.chainFrom}` : selectedFrom ? `selected ${selectedFrom}` : "select a legal guard"}`}</span>
          </div>
          <IceRingsBoard state={state} legalActions={legalActions} selectedFrom={selectedFrom} onNodeClick={handleNodeClick} interactive={humanMayAct && !isBotThinking} />
          {message && <p className="ir-game-message" role="alert">{message}</p>}
          {state.winner && <div className="ir-result-actions"><button onClick={() => startGame(mode)}>Play Again</button><button onClick={() => setScreen("menu")}>Main Menu</button></div>}
        </div>
        <IceRingsScore state={state} side="ember" />
      </main>
      <footer className="ir-game-footer"><span>Mode: {modeLabel(mode)}</span><span>19 points · nine guards each · compulsory capture chains</span></footer>
    </section>
  );
}

function RulesScreen({ onBack, onStart }) {
  return (
    <section className="ir-rules" aria-label="Ice Rings rules">
      <button className="ir-back-pill" onClick={onBack}>← Menu</button>
      <article>
        <p className="ir-eyebrow">HOW TO PLAY</p><h1>Ice Rings</h1>
        <div className="ir-rule-grid">
          <section><strong>1 · Formation</strong><p>Each side begins with nine guards occupying three consecutive spokes. The centre is the only empty point.</p></section>
          <section><strong>2 · Step</strong><p>When no capture exists, move one guard to an adjacent empty point along a printed circle or spoke.</p></section>
          <section><strong>3 · Jump</strong><p>Jump one adjacent rival to the empty point immediately beyond on the same ring, spoke, or diameter through the centre.</p></section>
          <section><strong>4 · Forced chain</strong><p>In this tournament ruleset, captures are compulsory. After a jump, the same guard must continue while another capture remains.</p></section>
          <section><strong>5 · Victory</strong><p>Capture every opposing guard. Immobilizing the opponent also ends the digital match.</p></section>
          <section><strong>6 · Draw policy</strong><p>Threefold repetition or 100 captureless plies produces a modern digital draw.</p></section>
        </div>
        <div className="ir-modern-policy"><strong>Source boundary</strong><span>Murray fixes the graph, nine-piece formations, adjacent line movement and short-leap capture. The source passage permits multi-jumps but does not unambiguously state Pretwa-specific compulsion, so this release labels compulsory capture and continuation as its tournament interpretation.</span></div>
        <button className="ir-rules-start" onClick={onStart}>Command Aurora Rings</button>
      </article>
    </section>
  );
}

function modeLabel(mode) {
  if (mode === "hotseat") return "Local Two Player";
  if (mode === "drill") return "Ring Break Drill";
  return mode === "practice-ember" ? "Practice as Ember" : "Practice as Aurora";
}
