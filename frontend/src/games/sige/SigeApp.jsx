/* Arctic Dominion design note: Sige uses a source-faithful crossed 5×5 lattice and tactile counter motifs across cover and play. */
import { useEffect, useRef, useState } from "react";
import { chooseSigeBotAction } from "./bot.js";
import { SigeBoard, SigeCowries, SigeDock, SplitFinishControl } from "./SigeBoard.jsx";
import { SigeOnline } from "./SigeOnline.jsx";
import {
  SIGE_RULESET,
  actionSummary,
  applyAction,
  createSigeState,
  createSplitFinishDrill,
  describeTurn,
  getLegalActions,
  resultDetail,
  resultTitle,
  rollLocalCowries,
  sideName
} from "./rules.js";

export function SigeApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice-aurora");
  const [state, setState] = useState(() => createSigeState());
  const [message, setMessage] = useState("");
  const botTimer = useRef(null);
  const humanSide = mode === "practice-ember" ? "ember" : "aurora";
  const botSide = humanSide === "aurora" ? "ember" : "aurora";
  const localOpen = ["hotseat", "drill"].includes(mode);

  useEffect(() => () => window.clearTimeout(botTimer.current), []);
  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (screen !== "game" || localOpen || state.winner || state.currentPlayer !== botSide) return;
    botTimer.current = window.setTimeout(() => {
      if (state.awaiting === "roll") {
        const result = rollLocalCowries(state, botSide);
        setState(result.state);
        setMessage(result.error || `${sideName(botSide)} cast ${result.state.lastRoll?.value || 0}.`);
      } else {
        const action = chooseSigeBotAction(state, botSide);
        if (!action) return;
        const result = applyAction(state, action, botSide);
        setState(result.state);
        setMessage(result.error || actionSummary(result.state.lastAction));
      }
    }, state.awaiting === "roll" ? 500 : 380);
  }, [botSide, localOpen, screen, state]);

  function startGame(nextMode) {
    setMode(nextMode);
    const next = nextMode === "drill" ? createSplitFinishDrill() : createSigeState({ mode: nextMode, starter: "aurora", seed: Date.now() });
    setState(next);
    setMessage(nextMode === "drill" ? "Parker's finish exception: divide the 8 only at the centre to finish both counters." : "");
    setScreen("game");
  }
  function canHumanAct() { return localOpen || state.currentPlayer === humanSide; }
  function castCowries() {
    if (!canHumanAct() || state.awaiting !== "roll") return;
    const result = rollLocalCowries(state, state.currentPlayer);
    setState(result.state);
    setMessage(result.error || `${sideName(state.currentPlayer)} cast ${result.state.lastRoll?.value || 0}.`);
  }
  function submitAction(action) {
    if (!canHumanAct()) return;
    const result = applyAction(state, action, state.currentPlayer);
    setState(result.state);
    setMessage(result.error || actionSummary(result.state.lastAction));
  }

  if (screen === "cover") return (
    <section className="sg-cover" aria-label="Sige cover">
      <button className="sg-back-pill" onClick={onExitToLibrary}>← All Games</button>
      <div className="sg-cover-art" aria-hidden="true">
        <div className="sg-cover-grid">{Array.from({ length: 25 }, (_, index) => <i key={index} className={[2, 10, 12, 14, 22].includes(index) ? "safe" : ""} />)}</div>
        <div className="sg-cover-orbit"><span className="aurora" /><span className="ember" /><span className="aurora" /><span className="ember" /></div>
        <div className="sg-cover-cowries"><i className="open" /><i /><i className="open" /><i /></div>
      </div>
      <div className="sg-cover-copy">
        <p>SIGA / SIGE · COLOMBO · PARKER 1909</p>
        <h1>SIGE</h1>
        <span>Two counters circle a protected five-by-five ice route, turn inward, chop rivals and land exactly in the centre.</span>
        <button onClick={() => setScreen("menu")}>Enter the protected route</button>
      </div>
    </section>
  );

  if (screen === "menu") return (
    <section className="sg-menu" aria-label="Sige menu">
      <button className="sg-back-pill" onClick={() => setScreen("cover")}>← Cover</button>
      <article className="sg-menu-card">
        <p className="sg-eyebrow">QUICK RACE · TWO COUNTERS · FOUR COWRIES</p>
        <h1>Sige</h1>
        <p>Enter with 1, race anticlockwise around the outer border, turn into the clockwise inner route and finish both counters exactly in the protected centre.</p>
        <div className="sg-menu-actions">
          <button className="primary" onClick={() => setScreen("online")}>Online Multiplayer</button>
          <button onClick={() => startGame("practice-aurora")}>Practice as Aurora</button>
          <button onClick={() => startGame("practice-ember")}>Practice as Ember</button>
          <button onClick={() => startGame("hotseat")}>Local Two Player</button>
          <button onClick={() => startGame("drill")}>Split Centre Drill</button>
          <button onClick={() => setScreen("rules")}>How to Play</button>
        </div>
        <div className="sg-source-note">Ruleset: {SIGE_RULESET.rulesetVersion}. This is Parker's Colombo two-player Sige, not the unrelated Arabian enclosure game also called Siga.</div>
      </article>
    </section>
  );

  if (screen === "online") return <SigeOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;
  if (screen === "rules") return <RulesScreen onBack={() => setScreen("menu")} onStart={() => startGame("practice-aurora")} />;

  const humanMayAct = canHumanAct() && !state.winner;
  const isBotThinking = !localOpen && state.currentPlayer === botSide && !state.winner;
  const legalActions = humanMayAct ? getLegalActions(state, state.currentPlayer) : [];
  const splitAction = legalActions.find((action) => action.type === "split-finish") || null;
  const passAction = legalActions.find((action) => action.type === "pass") || null;
  const pieceActions = legalActions.filter((action) => !["split-finish", "pass"].includes(action.type));
  const ariaLabel = mode === "drill" ? "Sige split centre drill" : "Sige game";

  return (
    <section className="sg-game" aria-label={ariaLabel}>
      <header className="sg-game-header"><button onClick={() => setScreen("menu")}>← Menu</button><div><p>PARKER 1909 · {SIGE_RULESET.rulesetVersion}</p><h1>Sige</h1></div><button onClick={() => startGame(mode)}>New Match</button></header>
      <main className="sg-game-layout">
        <SigeDock side="aurora" state={state} legalActions={pieceActions} onAction={submitAction} interactive={humanMayAct && !isBotThinking} />
        <div className="sg-game-centre">
          <SigeCowries roll={state.lastRoll} onRoll={castCowries} canRoll={humanMayAct && state.awaiting === "roll" && !isBotThinking} />
          <div className="sg-turn-banner" data-player={state.currentPlayer}><strong>{state.winner ? resultTitle(state) : isBotThinking ? `${sideName(state.currentPlayer)} is choosing…` : describeTurn(state)}</strong><span>{state.winner ? resultDetail(state) : `Chance ${state.turn} · 1 and 8 grant another cast`}</span></div>
          <SplitFinishControl action={splitAction} onAction={submitAction} interactive={humanMayAct && !isBotThinking} />
          {passAction && <button className="sg-pass" onClick={() => submitAction(passAction)}>No legal use — pass {passAction.value}</button>}
          <SigeBoard state={state} legalActions={pieceActions} onAction={submitAction} interactive={humanMayAct && !isBotThinking} />
          {message && <p className="sg-message" role="alert">{message}</p>}
          {state.winner && <div className="sg-result-actions"><button onClick={() => startGame(mode)}>Play Again</button><button onClick={() => setScreen("menu")}>Main Menu</button></div>}
        </div>
        <SigeDock side="ember" state={state} legalActions={pieceActions} onAction={submitAction} interactive={humanMayAct && !isBotThinking} />
      </main>
      <footer className="sg-game-footer"><span>Mode: {modeLabel(mode)}</span><span>4 cowries · 0 mouths = 8 · safe Katti · exact centre · split only at finish</span></footer>
    </section>
  );
}

function RulesScreen({ onBack, onStart }) {
  return (
    <section className="sg-rules" aria-label="Sige rules">
      <button className="sg-back-pill" onClick={onBack}>← Menu</button>
      <article>
        <p className="sg-eyebrow">HOW TO PLAY · PARKER 1909</p>
        <h1>Sige</h1>
        <div className="sg-rule-grid">
          <section><strong>1 · Cast four cowries</strong><p>One to four mouths up score their number. No mouths up scores 8. A 1 or 8 grants another cast after its move.</p></section>
          <section><strong>2 · Enter with 1</strong><p>A counter stays home until a 1 places it on your crossed starting Katti. A second 1 may place the other counter there too.</p></section>
          <section><strong>3 · Follow the spiral</strong><p>Move anticlockwise around the outer border, turn inward before your starting square, then follow the inner route clockwise toward the centre.</p></section>
          <section><strong>4 · Chop on landing</strong><p>Exact landing on a rival in an ordinary room sends it home and grants another cast. Crossed Katti squares and the centre are protected.</p></section>
          <section><strong>5 · Keep throws whole</strong><p>Every throw moves one counter by the full value. Throws are not added or divided during ordinary movement.</p></section>
          <section><strong>6 · Exact centre exception</strong><p>The centre needs an exact score. Only here may one throw be divided between both counters when the two required distances add to that score.</p></section>
        </div>
        <div className="sg-modern-policy"><strong>Digital occupancy policy</strong><span>Two friendly counters may share a protected Katti. Mixed sides may coexist on protected squares. Ordinary rooms hold one counter; pieces may pass occupied rooms, but landing resolves the destination.</span></div>
        <button className="sg-rules-start" onClick={onStart}>Guide Aurora Route</button>
      </article>
    </section>
  );
}

function modeLabel(mode) {
  if (mode === "hotseat") return "Local Two Player";
  if (mode === "drill") return "Split Centre Drill";
  return mode === "practice-ember" ? "Practice as Ember" : "Practice as Aurora";
}
