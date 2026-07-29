import { useEffect, useRef, useState } from "react";
import { SevenIceRingsBoard, SevenIceRingsScore, EndClaimControls } from "./SevenIceRingsBoard.jsx";
import { SevenIceRingsOnline } from "./SevenIceRingsOnline.jsx";
import { chooseSevenIceRingsBotAction } from "./bot.js";
import {
  SAT_GOL_VARIANTS,
  SEVEN_ICE_RINGS_RULESET,
  actionSummary,
  applyAction,
  createDistantCaptureDrill,
  createSevenIceRingsState,
  describeTurn,
  getLegalActions,
  resultDetail,
  resultTitle,
  sideName
} from "./rules.js";

export function SevenIceRingsApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice-open");
  const [state, setState] = useState(() => createSevenIceRingsState());
  const [message, setMessage] = useState("");
  const botTimer = useRef(null);
  const humanSide = mode.includes("ember") ? "ember" : "aurora";
  const botSide = humanSide === "aurora" ? "ember" : "aurora";
  const localOpen = ["hotseat-open", "hotseat-forced", "drill"].includes(mode);

  useEffect(() => () => window.clearTimeout(botTimer.current), []);
  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (screen !== "game" || localOpen || state.winner || state.draw || state.currentPlayer !== botSide) return;
    botTimer.current = window.setTimeout(() => {
      const action = chooseSevenIceRingsBotAction(state, botSide);
      if (!action) return;
      const result = applyAction(state, action, botSide);
      setState(result.state);
      setMessage(result.error || actionSummary(result.state.lastTurn));
    }, 520);
  }, [botSide, localOpen, screen, state]);

  function startGame(nextMode) {
    setMode(nextMode);
    const variant = nextMode.includes("forced") ? "forced" : "open";
    const next = nextMode === "drill" ? createDistantCaptureDrill() : createSevenIceRingsState({ mode: nextMode, variant });
    setState(next);
    setMessage(nextMode === "drill" ? "Choose Ring 1. Its last stone stops before an empty ring and captures the four stones beyond it." : "");
    setScreen("game");
  }
  function canHumanAct() { return localOpen || state.currentPlayer === humanSide; }
  function submitAction(action) {
    if (!canHumanAct()) return;
    const result = applyAction(state, action, state.currentPlayer);
    setState(result.state);
    setMessage(result.error || actionSummary(result.state.lastTurn));
  }

  if (screen === "cover") return (
    <section className="sir-cover" aria-label="Seven Ice Rings cover">
      <button className="sir-back" onClick={onExitToLibrary}>← All Games</button>
      <div className="sir-cover-art" aria-hidden="true">
        <div className="sir-cover-orbit">{Array.from({ length: 7 }, (_, index) => <i key={index}><span>{index + 1}</span></i>)}</div>
        <div className="sir-cover-mascots"><span>🐧</span><b>28</b><span>🐧</span></div>
      </div>
      <div className="sir-cover-copy"><p>SAT-GOL · GOSALPUR · DAS GUPTA 1924</p><h1>SEVEN<br />ICE RINGS</h1><span>Relay-sow shared stones anticlockwise, stop beside an empty ring and capture the distant circle beyond it.</span><button onClick={() => setScreen("menu")}>Enter the seven rings</button></div>
    </section>
  );

  if (screen === "menu") return (
    <section className="sir-menu" aria-label="Seven Ice Rings menu">
      <button className="sir-back" onClick={() => setScreen("cover")}>← Cover</button>
      <article><p className="sir-eyebrow">CIRCULAR RELAY SOWING · TWO PLAYERS</p><h1>Seven Ice Rings</h1><p>Seven shared circles begin with four stones each. Every hand relays from the next circle until an empty ring stops the move; the occupied ring beyond that gap is captured.</p>
        <div className="sir-menu-actions">
          <button className="primary" onClick={() => setScreen("online")}>Online Multiplayer</button>
          <button onClick={() => startGame("practice-open")}>Practice · Open Choice</button>
          <button onClick={() => startGame("practice-forced-ember")}>Practice · Forced Start</button>
          <button onClick={() => startGame("hotseat-open")}>Local · Open Choice</button>
          <button onClick={() => startGame("hotseat-forced")}>Local · Gosalpur Forced Start</button>
          <button onClick={() => startGame("drill")}>Distant Capture Drill</button>
          <button onClick={() => setScreen("rules")}>How to Play</button>
        </div>
        <div className="sir-source-note">Two labelled variants are shipped because the recorded forced-start rule makes play nearly predetermined, while the later open-choice interpretation allows strategy.</div>
      </article>
    </section>
  );

  if (screen === "online") return <SevenIceRingsOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;
  if (screen === "rules") return <RulesScreen onBack={() => setScreen("menu")} onStart={() => startGame("practice-open")} />;

  const humanMayAct = canHumanAct() && !state.winner && !state.draw;
  const isBotThinking = !localOpen && state.currentPlayer === botSide && !state.winner && !state.draw;
  const legalActions = humanMayAct ? getLegalActions(state, state.currentPlayer) : [];
  const done = Boolean(state.winner || state.draw);
  return (
    <section className="sir-game" aria-label={mode === "drill" ? "Seven Ice Rings distant capture drill" : "Seven Ice Rings game"}>
      <header><button onClick={() => setScreen("menu")}>← Menu</button><div><p>{state.rulesetVersion}</p><h1>Seven Ice Rings</h1></div><button onClick={() => startGame(mode)}>New Match</button></header>
      <main>
        <SevenIceRingsScore state={state} />
        <div className="sir-turn"><strong>{done ? resultTitle(state) : isBotThinking ? `${sideName(state.currentPlayer)} is tracing the relay…` : describeTurn(state)}</strong><span>{done ? resultDetail(state) : `${SAT_GOL_VARIANTS[state.variant].label} · ${state.captureQuietTurns} quiet turn${state.captureQuietTurns === 1 ? "" : "s"}`}</span></div>
        <EndClaimControls state={state} legalActions={legalActions} onAction={submitAction} interactive={humanMayAct && !isBotThinking} />
        <SevenIceRingsBoard state={state} legalActions={legalActions} onAction={submitAction} interactive={humanMayAct && !isBotThinking} />
        {message && <p className="sir-message" role="alert">{message}</p>}
        {done && <div className="sir-results"><button onClick={() => startGame(mode)}>Play Again</button><button onClick={() => setScreen("menu")}>Main Menu</button></div>}
      </main>
      <footer><span>Mode: {modeLabel(mode)}</span><span>7 shared rings · 4 stones each · anticlockwise relay · distant capture</span></footer>
    </section>
  );
}

function RulesScreen({ onBack, onStart }) {
  return <section className="sir-rules" aria-label="Seven Ice Rings rules"><button className="sir-back" onClick={onBack}>← Menu</button><article><p className="sir-eyebrow">HOW TO PLAY · SAT-GOL</p><h1>Seven Ice Rings</h1><div className="sir-rule-grid">
    <section><strong>1 · Shared opening</strong><p>Place four stones in each of seven circles. The circles belong to neither player; only captured stones are owned.</p></section>
    <section><strong>2 · Sow anticlockwise</strong><p>Lift every stone from the required or selected ring and place one into each following ring.</p></section>
    <section><strong>3 · Relay from the next ring</strong><p>When your hand empties, inspect the following ring. If it contains stones, lift them and continue sowing from the ring after it.</p></section>
    <section><strong>4 · Stop at a gap</strong><p>If the ring after your endpoint is empty, the move stops. Capture every stone in the ring immediately beyond that empty ring.</p></section>
    <section><strong>5 · Two start rules</strong><p>Forced Start uses the first non-empty ring after the previous endpoint. Open Choice lets the active player choose any non-empty ring. They never share a queue.</p></section>
    <section><strong>6 · Agree to finish</strong><p>After two captureless turns a player may claim that no useful capture remains. The opponent accepts to score, or sows to continue. Remaining board stones are not counted.</p></section>
  </div><div className="sir-policy"><strong>Digital closure policy</strong><span>The historical account ends by mutual agreement. The app models that agreement explicitly and rejects any relay that repeats forever, rather than inventing a hidden automatic winner.</span></div><button onClick={onStart}>Play Open Choice</button></article></section>;
}

function modeLabel(mode) {
  if (mode === "drill") return "Distant Capture Drill";
  if (mode === "hotseat-forced") return "Local Forced Start";
  if (mode === "hotseat-open") return "Local Open Choice";
  return mode.includes("forced") ? "Practice Forced Start" : "Practice Open Choice";
}
