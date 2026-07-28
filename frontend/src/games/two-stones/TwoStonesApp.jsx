import { useEffect, useRef, useState } from "react";
import { chooseTwoStonesBotAction } from "./bot.js";
import { StoneDock, TwoStonesBoard } from "./TwoStonesBoard.jsx";
import { TwoStonesOnline } from "./TwoStonesOnline.jsx";
import {
  TWO_STONES_RULESET,
  actionSummary,
  applyAction,
  createLockDrill,
  createTwoStonesState,
  describeTurn,
  getLegalActions,
  resultDetail,
  resultTitle,
  solvedSummary
} from "./rules.js";

export function TwoStonesApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice-blue");
  const [state, setState] = useState(() => createTwoStonesState({ mode: "practice-blue" }));
  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [message, setMessage] = useState("");
  const botTimer = useRef(null);
  const solved = solvedSummary();
  const humanSide = mode === "practice-coral" ? "coral" : "blue";
  const botSide = humanSide === "blue" ? "coral" : "blue";
  const localMode = mode === "hotseat" || mode === "drill";

  useEffect(() => () => window.clearTimeout(botTimer.current), []);
  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (screen !== "game" || localMode || state.winner || state.isDraw || state.currentPlayer !== botSide) return;
    botTimer.current = window.setTimeout(() => {
      const action = chooseTwoStonesBotAction(state, botSide);
      if (!action) return;
      const result = applyAction(state, action, botSide);
      setState(result.state);
      setSelectedPieceId(null);
      setMessage(result.error || actionSummary(result.state.lastAction));
    }, 480);
  }, [botSide, localMode, screen, state]);

  function startGame(nextMode) {
    const next = nextMode === "drill" ? createLockDrill() : createTwoStonesState({ mode: nextMode, starter: "blue" });
    setMode(nextMode);
    setState(next);
    setSelectedPieceId(null);
    setMessage(nextMode === "drill" ? "One move locks Coral. Find the winning Aurora slide." : "");
    setScreen("game");
  }

  function submitAction(action) {
    const canAct = localMode || state.currentPlayer === humanSide;
    if (!canAct || state.winner || state.isDraw) return;
    const result = applyAction(state, action, state.currentPlayer);
    setState(result.state);
    setSelectedPieceId(null);
    setMessage(result.error || actionSummary(result.state.lastAction));
  }

  if (screen === "cover") return (
    <section className="ts-cover" aria-label="Two Stones cover">
      <button className="ts-back" onClick={onExitToLibrary}>← All Games</button>
      <div className="ts-cover-art" aria-hidden="true">
        <div className="ts-mini-board"><i className="nw"/><i className="ne"/><i className="c"/><i className="sw"/><i className="se"/><span className="l1"/><span className="l2"/><span className="l3"/><span className="l4"/><span className="l5"/><span className="l6"/><span className="l7"/></div>
        <b className="stone a">●</b><b className="stone b">●</b><b className="stone c1">●</b><b className="stone d">●</b>
      </div>
      <div className="ts-cover-copy"><p>DO-GUTI · PUNJAB · DAS GUPTA 1926</p><h1>TWO<br/>STONES</h1><span>Four stones. Five points. One open side. Win by leaving the rival with nowhere to slide.</span><button onClick={() => setScreen("menu")}>Enter the ice lock</button></div>
    </section>
  );

  if (screen === "menu") return (
    <section className="ts-menu" aria-label="Two Stones menu">
      <button className="ts-back" onClick={() => setScreen("cover")}>← Cover</button>
      <article><p className="ts-eyebrow">MICRO BLOCKADE · INSTANT CHALLENGE</p><h1>Two Stones</h1><p>Alternate placements, then slide along the seven printed links. There is no capture. The first player to immobilise the opponent wins.</p>
        <div className="ts-menu-actions"><button className="primary" onClick={() => setScreen("online")}>Online Instant Match</button><button onClick={() => startGame("practice-blue")}>Practice as Aurora</button><button onClick={() => startGame("practice-coral")}>Practice as Coral</button><button onClick={() => startGame("hotseat")}>Local Two Player</button><button onClick={() => startGame("drill")}>One-Move Lock Drill</button><button onClick={() => setScreen("rules")}>How to Play</button></div>
        <div className="ts-solved-note"><strong>Solved before ranked release</strong><span>{solved.reachableStates} reachable positions: {solved.win} wins, {solved.loss} losses and {solved.draw} draws from the player-to-move view. The empty-board opening is a draw under perfect play, so this release has no ranked economy.</span></div>
      </article>
    </section>
  );

  if (screen === "online") return <TwoStonesOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;
  if (screen === "rules") return <RulesScreen onBack={() => setScreen("menu")} onStart={() => startGame("practice-blue")} />;

  const humanMayAct = localMode || state.currentPlayer === humanSide;
  const botThinking = !localMode && state.currentPlayer === botSide && !state.winner && !state.isDraw;
  const legalActions = humanMayAct && !botThinking ? getLegalActions(state, state.currentPlayer) : [];
  const aria = mode === "drill" ? "Two Stones one-move lock drill" : "Two Stones game";
  return (
    <section className="ts-game" aria-label={aria}>
      <header><button onClick={() => setScreen("menu")}>← Menu</button><div><p>{TWO_STONES_RULESET.rulesetVersion}</p><h1>Two Stones</h1></div><button onClick={() => startGame(mode)}>Reset</button></header>
      <main><StoneDock side="blue" state={state}/><div className="ts-centre"><div className="ts-turn-banner"><strong>{botThinking ? "Frost Solver is choosing…" : describeTurn(state)}</strong><span>{state.phase === "placement" ? "Placement phase" : `Movement ${state.movementPly}/${TWO_STONES_RULESET.movementPlyLimit}`}</span></div><TwoStonesBoard state={state} legalActions={legalActions} selectedPieceId={selectedPieceId} onSelectPiece={setSelectedPieceId} onAction={submitAction} interactive={humanMayAct && !botThinking && !state.winner && !state.isDraw}/>{message && <p className="ts-message" role="alert">{message}</p>}{(state.winner || state.isDraw) && <div className="ts-result"><h2>{resultTitle(state)}</h2><p>{resultDetail(state)}</p><button onClick={() => startGame(mode)}>Play Again</button></div>}</div><StoneDock side="coral" state={state}/></main>
      <footer><span>Mode: {modeLabel(mode)}</span><span>No capture · threefold repetition and 40-movement-ply digital draw policy</span></footer>
    </section>
  );
}

function RulesScreen({ onBack, onStart }) {
  return <section className="ts-rules" aria-label="Two Stones rules"><button className="ts-back" onClick={onBack}>← Menu</button><article><p className="ts-eyebrow">HOW TO PLAY · DO-GUTI</p><h1>Lock the last gap</h1><div className="ts-rule-grid"><section><strong>1 · Place two each</strong><p>Players alternate placing one stone on any empty point until all four stones are on the graph.</p></section><section><strong>2 · Slide on a line</strong><p>Move one of your stones to the single empty point only when a printed line connects the two points.</p></section><section><strong>3 · No capture</strong><p>Stones are never removed or jumped. Every move changes which point remains open.</p></section><section><strong>4 · Immobilise</strong><p>After your action, check the opponent. If neither opposing stone can reach the empty point, you win immediately.</p></section></div><div className="ts-policy"><strong>Digital draw policy</strong><span>The historical source does not provide a repetition rule. Online play declares a draw after threefold repetition or 40 movement plies. This policy is versioned and does not change the blockade victory rule.</span></div><button onClick={onStart}>Start Practice</button></article></section>;
}

function modeLabel(mode) {
  if (mode === "hotseat") return "Local Two Player";
  if (mode === "drill") return "One-Move Lock Drill";
  return mode === "practice-coral" ? "Practice as Coral" : "Practice as Aurora";
}
