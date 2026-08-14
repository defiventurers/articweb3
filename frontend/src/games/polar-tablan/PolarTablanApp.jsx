import { useEffect, useRef, useState } from "react";
import { choosePolarTablanBotAction } from "./bot.js";
import { ConvoyPanel, PolarTablanBoard, StickTray } from "./PolarTablanBoard.jsx";
import { PolarTablanOnline } from "./PolarTablanOnline.jsx";
import { POLAR_TABLAN_RULESET, actionSummary, applyAction, createFinishRowDrill, createPolarTablanState, describeTurn, getLegalActions, resultDetail, resultTitle, rollLocalSticks } from "./rules.js";

export function PolarTablanApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice-aurora");
  const [state, setState] = useState(() => createPolarTablanState({ mode: "practice-aurora" }));
  const [message, setMessage] = useState("");
  const botTimer = useRef(null);
  const humanSide = mode === "practice-ember" ? "ember" : "aurora";
  const botSide = humanSide === "aurora" ? "ember" : "aurora";
  const localOpen = mode === "hotseat" || mode === "drill";

  useEffect(() => () => window.clearTimeout(botTimer.current), []);
  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (screen !== "game" || localOpen || state.winner || state.currentPlayer !== botSide) return;
    botTimer.current = window.setTimeout(() => {
      if (state.awaiting === "roll") {
        const result = rollLocalSticks(state, botSide);
        setState(result.state);
        setMessage(result.error || `${sideName(botSide)} cast ${result.state.lastRoll?.value || 0}.`);
      } else {
        const action = choosePolarTablanBotAction(state, botSide);
        if (!action) return;
        const result = applyAction(state, action, botSide);
        setState(result.state);
        setMessage(result.error || actionSummary(result.state.lastAction));
      }
    }, state.awaiting === "roll" ? 520 : 430);
  }, [botSide, localOpen, screen, state]);

  function startGame(nextMode) {
    setMode(nextMode);
    const next = nextMode === "drill" ? createFinishRowDrill() : createPolarTablanState({ mode: nextMode, starter: "aurora", seed: Date.now() });
    setState(next);
    setMessage(nextMode === "drill" ? "Use the full 8 to displace Ember's home runner and lock Aurora into the finishing row." : "");
    setScreen("game");
  }
  function humanMayAct() { return !state.winner && (localOpen || state.currentPlayer === humanSide); }
  function cast() {
    if (!humanMayAct() || state.awaiting !== "roll") return;
    const result = rollLocalSticks(state, state.currentPlayer);
    setState(result.state);
    setMessage(result.error || `${sideName(state.currentPlayer)} cast ${result.state.lastRoll?.value || 0}.`);
  }
  function move(action) {
    if (!humanMayAct()) return;
    const result = applyAction(state, action, state.currentPlayer);
    setState(result.state);
    setMessage(result.error || actionSummary(result.state.lastAction));
  }

  if (screen === "cover") return <section className="pt-cover" aria-label="Polar Tablan cover"><button className="pt-back" onClick={onExitToLibrary}>← All Games</button><div className="pt-cover-board" aria-hidden="true">{Array.from({ length: 48 }, (_, index) => <i key={index} />)}<span className="aurora">🐧</span><span className="ember">❄</span></div><div className="pt-cover-copy"><p>TAABLA / TABLAN · BELL RULESET</p><h1>POLAR<br/>TABLAN</h1><span>Twelve runners weave through four long ice lanes. Use the full score or split it, displace rivals, and freeze the strongest finish row.</span><button onClick={() => setScreen("menu")}>Enter the polar route</button></div></section>;

  if (screen === "menu") return <section className="pt-menu" aria-label="Polar Tablan menu"><button className="pt-back" onClick={() => setScreen("cover")}>← Cover</button><article><p className="pt-eyebrow">LONG RACE · 4 × 12 · BELL TABLE</p><h1>Polar Tablan</h1><p>Cast four marked sticks. Only 2, 8 and 12 move. Every scoring throw repeats after its required movement, and each score may be used by one runner or split equally between two.</p><div className="pt-menu-actions"><button className="primary" onClick={() => setScreen("online")}>Online Multiplayer</button><button onClick={() => startGame("practice-aurora")}>Practice as Aurora</button><button onClick={() => startGame("practice-ember")}>Practice as Ember</button><button onClick={() => startGame("hotseat")}>Local Two Player</button><button onClick={() => startGame("drill")}>Finish Row Drill</button><button onClick={() => setScreen("rules")}>How to Play</button></div><small>Ruleset: {POLAR_TABLAN_RULESET.rulesetVersion}. Bell's optional ordered finish-row rule is not enabled in this open-finish queue.</small></article></section>;

  if (screen === "online") return <PolarTablanOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;
  if (screen === "rules") return <Rules onBack={() => setScreen("menu")} onStart={() => startGame("practice-aurora")} />;

  const myTurn = humanMayAct();
  const botThinking = !localOpen && state.currentPlayer === botSide && !state.winner;
  const actions = myTurn && state.awaiting === "allocate" ? getLegalActions(state, state.currentPlayer) : [];
  return <section className="pt-game" aria-label={mode === "drill" ? "Polar Tablan finish row drill" : "Polar Tablan game"}><header className="pt-game-header"><button onClick={() => setScreen("menu")}>← Menu</button><div><p>TAABLA · {POLAR_TABLAN_RULESET.rulesetVersion}</p><h1>Polar Tablan</h1></div><button onClick={() => startGame(mode)}>New Match</button></header><main><ConvoyPanel side="ember" state={state}/><div className="pt-centre"><StickTray roll={state.lastRoll} onRoll={cast} canRoll={myTurn && state.awaiting === "roll" && !botThinking}/><div className="pt-turn-banner" data-side={state.currentPlayer}><strong>{state.winner ? resultTitle(state) : botThinking ? `${sideName(state.currentPlayer)} is choosing…` : describeTurn(state)}</strong><span>{state.winner ? resultDetail(state) : `Turn ${state.turn} · ${state.bonusRolls ? "repeat throw queued" : "movement is mandatory when legal"}`}</span></div><PolarTablanBoard state={state} legalActions={actions} onAction={move} interactive={myTurn && !botThinking}/>{message && <p className="pt-message" role="alert">{message}</p>}{state.winner && <div className="pt-results"><button onClick={() => startGame(mode)}>Play Again</button><button onClick={() => setScreen("menu")}>Menu</button></div>}</div><ConvoyPanel side="aurora" state={state}/></main><footer><span>Mode: {modeLabel(mode)}</span><span>Scores: 1 plain = 2 · 4 plain = 8 · 0 plain = 12</span></footer></section>;
}

function Rules({ onBack, onStart }) {
  return <section className="pt-rules" aria-label="Polar Tablan rules"><button className="pt-back" onClick={onBack}>← Menu</button><article><p className="pt-eyebrow">HOW TO PLAY · BELL RULESET</p><h1>Polar Tablan</h1><div className="pt-rule-grid"><section><strong>1 · Start full</strong><p>Each convoy begins with twelve runners, one in every square of its home row. Aurora starts this digital queue.</p></section><section><strong>2 · Cast four sticks</strong><p>One plain side scores 2; four plain sides score 8; no plain sides score 12. Two or three plain sides score nothing and end the turn.</p></section><section><strong>3 · First move requires 2</strong><p>An untouched runner may first move only on a 2: one runner moves two, or two runners move one each.</p></section><section><strong>4 · Full or split</strong><p>Use 8 as one move of eight or two moves of four. Use 12 as one move of twelve or two moves of six. Split moves must use two different runners.</p></section><section><strong>5 · Capture and lock</strong><p>Exact landings capture on the two middle rows and when displacing a home runner in the opponent's row. A runner entering the rival home row locks permanently and cannot be captured.</p></section><section><strong>6 · Score the finish row</strong><p>The race ends when one convoy locks every surviving runner. The convoy occupying more enemy home squares wins; the first finisher breaks an equal score.</p></section></div><div className="pt-policy"><strong>Visible source boundary</strong><span>The optional rule requiring finish-row squares to be occupied in a fixed sequence is disabled. Thabla Ata archaeological boards are not treated as this Bell ruleset.</span></div><button onClick={onStart}>Guide Aurora Convoy</button></article></section>;
}
function modeLabel(mode) { return mode === "hotseat" ? "Local Two Player" : mode === "drill" ? "Finish Row Drill" : mode === "practice-ember" ? "Practice as Ember" : "Practice as Aurora"; }
function sideName(side) { return side === "ember" ? "Ember Convoy" : "Aurora Convoy"; }
