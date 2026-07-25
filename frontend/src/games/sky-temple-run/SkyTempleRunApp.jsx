import { useEffect, useRef, useState } from "react";
import { chooseSkyTempleRunBotAction } from "./bot.js";
import { CowrieTray, PilgrimDock, SkyTempleRunBoard } from "./SkyTempleRunBoard.jsx";
import { SkyTempleRunOnline } from "./SkyTempleRunOnline.jsx";
import {
  SKY_TEMPLE_RUN_RULESET,
  actionSummary,
  applyAction,
  createSkyTempleRunState,
  createTempleGateDrill,
  describeTurn,
  getLegalActions,
  resultDetail,
  resultTitle,
  rollLocalCowries
} from "./rules.js";

export function SkyTempleRunApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice-aurora");
  const [state, setState] = useState(() => createSkyTempleRunState({ mode: "practice-aurora" }));
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
        const rolled = rollLocalCowries(state, botSide);
        setState(rolled.state);
        setMessage(rolled.error || `${botSide === "aurora" ? "Aurora" : "Ember"} cast ${rolled.state.lastRoll?.value || 0}.`);
        return;
      }
      const action = chooseSkyTempleRunBotAction(state, botSide);
      if (!action) return;
      const result = applyAction(state, action, botSide);
      setState(result.state);
      setMessage(result.error || actionSummary(result.state.lastMove));
    }, state.awaiting === "roll" ? 520 : 420);
  }, [botSide, localOpen, screen, state]);

  function startGame(nextMode) {
    setMode(nextMode);
    const next = nextMode === "drill" ? createTempleGateDrill() : createSkyTempleRunState({ mode: nextMode, starter: "aurora", seed: Date.now() });
    setState(next);
    setMessage(nextMode === "drill" ? "Aurora pilgrim 1 can capture the Ember pilgrim and unlock the inner temple route." : "");
    setScreen("game");
  }

  function resetGame() { startGame(mode); }
  function canHumanAct() { return localOpen || state.currentPlayer === humanSide; }

  function castCowries() {
    if (!canHumanAct() || state.awaiting !== "roll") return;
    const result = rollLocalCowries(state, state.currentPlayer);
    setState(result.state);
    setMessage(result.error || `${state.currentPlayer === "aurora" ? "Aurora" : "Ember"} cast ${result.state.lastRoll?.value || 0}.`);
  }

  function submitAction(action) {
    if (!canHumanAct()) return;
    const result = applyAction(state, action, state.currentPlayer);
    setState(result.state);
    setMessage(result.error || actionSummary(result.state.lastMove));
  }

  if (screen === "cover") {
    return (
      <section className="str-cover" aria-label="Sky Temple Run cover">
        <button className="str-back-pill" onClick={onExitToLibrary}>← All Games</button>
        <div className="str-cover-art" aria-hidden="true">
          <div className="str-cover-mountain" />
          <div className="str-cover-temple"><i /><i /><i /><b>✦</b></div>
          <div className="str-cover-route"><span /><span /><span /><span /><span /><span /></div>
          <div className="str-cover-penguins"><i>♙</i><i>♟</i></div>
        </div>
        <div className="str-cover-copy">
          <p>VIMANAM · SOUTH INDIA</p>
          <h1>SKY<br />TEMPLE RUN</h1>
          <span>Six pilgrims race around a frozen square. Capture a rival to unlock the inner climb, then finish every journey by exact cast.</span>
          <button onClick={() => setScreen("menu")}>Enter the sky route</button>
        </div>
      </section>
    );
  }

  if (screen === "menu") {
    return (
      <section className="str-menu" aria-label="Sky Temple Run menu">
        <button className="str-back-pill" onClick={() => setScreen("cover")}>← Cover</button>
        <article className="str-menu-card">
          <p className="str-eyebrow">VIMANAM · CAPTURE-GATED COWRIE RACE</p>
          <h1>Sky Temple Run</h1>
          <p>Enter on 1 or 5, race opposite ways around the shared outer route, and make at least one capture before climbing the final inner path.</p>
          <div className="str-menu-actions">
            <button className="primary" onClick={() => setScreen("online")}>Online Multiplayer</button>
            <button onClick={() => startGame("practice-aurora")}>Practice as Aurora</button>
            <button onClick={() => startGame("practice-ember")}>Practice as Ember</button>
            <button onClick={() => startGame("hotseat")}>Local Two Player</button>
            <button onClick={() => startGame("drill")}>Temple Gate Drill</button>
            <button onClick={() => setScreen("rules")}>How to Play</button>
          </div>
          <div className="str-source-note">Heritage mode keeps Vimanam’s capture-gated inner route separate from Panchi. Named rest squares are safe; this digital version permits one pilgrim per physical square.</div>
        </article>
      </section>
    );
  }

  if (screen === "online") return <SkyTempleRunOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;
  if (screen === "rules") return <RulesScreen onBack={() => setScreen("menu")} onStart={() => startGame("practice-aurora")} />;

  const humanMayAct = canHumanAct() && !state.winner;
  const legalActions = humanMayAct ? getLegalActions(state, state.currentPlayer) : [];
  const isBotThinking = !localOpen && state.currentPlayer === botSide && !state.winner;
  const ariaLabel = mode === "drill" ? "Sky Temple Run gate drill" : "Sky Temple Run game";

  return (
    <section className="str-game" aria-label={ariaLabel}>
      <header className="str-game-header">
        <button onClick={() => setScreen("menu")}>← Menu</button>
        <div><p>VIMANAM · {SKY_TEMPLE_RUN_RULESET.rulesetVersion}</p><h1>Sky Temple Run</h1></div>
        <button onClick={resetGame}>New Match</button>
      </header>
      <main className="str-game-layout">
        <PilgrimDock side="aurora" state={state} legalActions={legalActions} onAction={submitAction} interactive={humanMayAct && !isBotThinking} />
        <div className="str-game-centre">
          <CowrieTray roll={state.roll || state.lastRoll} onRoll={castCowries} canRoll={humanMayAct && state.awaiting === "roll" && !isBotThinking} />
          <div className="str-turn-banner" data-player={state.currentPlayer}>
            <strong>{state.winner ? resultTitle(state) : isBotThinking ? `${state.currentPlayer === "aurora" ? "Aurora" : "Ember"} pilgrims are choosing…` : describeTurn(state)}</strong>
            <span>{state.winner ? resultDetail(state) : `Turn ${state.turn} · ${state.captureLicense[state.currentPlayer] ? "temple gate unlocked" : "capture required before inner route"}`}</span>
          </div>
          <SkyTempleRunBoard state={state} legalActions={legalActions} onAction={submitAction} interactive={humanMayAct && !isBotThinking} />
          {message && <p className="str-game-message" role="alert">{message}</p>}
          {state.winner && <div className="str-result-actions"><button onClick={resetGame}>Play Again</button><button onClick={() => setScreen("menu")}>Main Menu</button></div>}
        </div>
        <PilgrimDock side="ember" state={state} legalActions={legalActions} onAction={submitAction} interactive={humanMayAct && !isBotThinking} />
      </main>
      <footer className="str-game-footer"><span>Mode: {modeLabel(mode)}</span><span>Six cowries · zero scores 12 · one pilgrim per square · exact final rest</span></footer>
    </section>
  );
}

function RulesScreen({ onBack, onStart }) {
  return (
    <section className="str-rules" aria-label="Sky Temple Run rules">
      <button className="str-back-pill" onClick={onBack}>← Menu</button>
      <article>
        <p className="str-eyebrow">HOW TO PLAY</p><h1>Sky Temple Run</h1>
        <div className="str-rule-grid">
          <section><strong>1 · Cast</strong><p>Cast six cowries. Mouths up score 1–6; no mouths up scores 12. Results of 1, 5, 6 or 12 grant another turn.</p></section>
          <section><strong>2 · Enter</strong><p>A waiting pilgrim enters only on 1 or 5. Move one chosen pilgrim the complete value.</p></section>
          <section><strong>3 · Capture</strong><p>Land exactly on a rival in an unprotected corridor to send it home. A capture grants another turn.</p></section>
          <section><strong>4 · Gate</strong><p>Your court must capture at least one rival before any pilgrim may pass its gate into the final inner route.</p></section>
          <section><strong>5 · Safe rests</strong><p>Named anchor squares are protected. This version permits one pilgrim per physical square, so an occupied safe rest blocks landing.</p></section>
          <section><strong>6 · Victory</strong><p>Reach the final rest square by exact cast with all six pilgrims. The first court to finish every pilgrim wins.</p></section>
        </div>
        <div className="str-modern-policy"><strong>Version boundary</strong><span>The Vimanam capture gate is active only in this ruleset and does not alter the published Panchi rules. The expanded corridor points are a digital representation of the source’s named-square route.</span></div>
        <button className="str-rules-start" onClick={onStart}>Guide Aurora Pilgrims</button>
      </article>
    </section>
  );
}

function modeLabel(mode) {
  if (mode === "hotseat") return "Local Two Player";
  if (mode === "drill") return "Temple Gate Drill";
  return mode === "practice-ember" ? "Practice as Ember" : "Practice as Aurora";
}
