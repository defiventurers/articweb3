import { useEffect, useRef, useState } from "react";
import { chooseCowrieKingdomsBotAction } from "./bot.js";
import { CowrieKingdomsBoard, CowrieTray, KingdomDock, ThrowPool } from "./CowrieKingdomsBoard.jsx";
import { CowrieKingdomsOnline } from "./CowrieKingdomsOnline.jsx";
import {
  COWRIE_KINGDOMS_RULESET,
  actionSummary,
  applyAction,
  createAshtaGraceDrill,
  createCowrieKingdomsState,
  describeTurn,
  getLegalActions,
  resultDetail,
  resultTitle,
  rollLocalCowries
} from "./rules.js";

export function CowrieKingdomsApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice-aurora");
  const [state, setState] = useState(() => createCowrieKingdomsState({ mode: "practice-aurora" }));
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [message, setMessage] = useState("");
  const botTimer = useRef(null);

  const humanSide = mode === "practice-ember" ? "ember" : "aurora";
  const botSide = humanSide === "aurora" ? "ember" : "aurora";
  const localOpen = ["hotseat", "drill"].includes(mode);

  useEffect(() => () => window.clearTimeout(botTimer.current), []);
  useEffect(() => {
    if (!state.throwPool.length) {
      setSelectedUnitId(null);
      return;
    }
    if (!state.throwPool.some((unit) => unit.id === selectedUnitId)) setSelectedUnitId(state.throwPool[0].id);
  }, [state.throwPool, selectedUnitId]);

  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (screen !== "game" || localOpen || state.winner || state.currentPlayer !== botSide) return;
    botTimer.current = window.setTimeout(() => {
      if (state.awaiting === "roll") {
        const result = rollLocalCowries(state, botSide);
        setState(result.state);
        setMessage(result.error || `${sideName(botSide)} cast ${result.state.lastRoll?.value || 0}.`);
        return;
      }
      const action = chooseCowrieKingdomsBotAction(state, botSide);
      if (!action) return;
      const result = applyAction(state, action, botSide);
      setState(result.state);
      setMessage(result.error || actionSummary(result.state.lastAction));
    }, state.awaiting === "roll" ? 520 : 390);
  }, [botSide, localOpen, screen, state]);

  function startGame(nextMode) {
    setMode(nextMode);
    const next = nextMode === "drill"
      ? createAshtaGraceDrill()
      : createCowrieKingdomsState({ mode: nextMode, starter: "aurora", seed: Date.now() });
    setState(next);
    setSelectedUnitId(next.throwPool[0]?.id || null);
    setMessage(nextMode === "drill"
      ? "Play the separate Grace entry first, then use Move 8 to capture the Ember runner."
      : "");
    setScreen("game");
  }

  function resetGame() {
    startGame(mode);
  }

  function canHumanAct() {
    return localOpen || state.currentPlayer === humanSide;
  }

  function castCowries() {
    if (!canHumanAct() || state.awaiting !== "roll") return;
    const result = rollLocalCowries(state, state.currentPlayer);
    setState(result.state);
    setSelectedUnitId(result.state.throwPool[0]?.id || null);
    setMessage(result.error || `${sideName(state.currentPlayer)} cast ${result.state.lastRoll?.value || 0}.`);
  }

  function submitAction(action) {
    if (!canHumanAct()) return;
    const result = applyAction(state, action, state.currentPlayer);
    setState(result.state);
    setMessage(result.error || actionSummary(result.state.lastAction));
  }

  if (screen === "cover") {
    return (
      <section className="ck-cover" aria-label="Cowrie Kingdoms cover">
        <button className="ck-back-pill" onClick={onExitToLibrary}>← All Games</button>
        <div className="ck-cover-art" aria-hidden="true">
          <div className="ck-cover-board">
            {Array.from({ length: 49 }, (_, index) => <i key={index} className={[3, 21, 24, 27, 45].includes(index) ? "safe" : ""} />)}
            <b>✦</b>
          </div>
          <div className="ck-cover-cowries"><i>◡</i><i>●</i><i>◡</i><i>●</i></div>
          <div className="ck-cover-runners"><span>♙</span><span>♟</span></div>
        </div>
        <div className="ck-cover-copy">
          <p>ASHTA-KASHTE · FALKENER 1892</p>
          <h1>COWRIE<br />KINGDOMS</h1>
          <span>Four runners spiral through a seven-by-seven ice court. Grace enters the board, pairs control key cells, and every path ends at the frozen centre.</span>
          <button onClick={() => setScreen("menu")}>Enter the kingdoms</button>
        </div>
      </section>
    );
  }

  if (screen === "menu") {
    return (
      <section className="ck-menu" aria-label="Cowrie Kingdoms menu">
        <button className="ck-back-pill" onClick={() => setScreen("cover")}>← Cover</button>
        <article className="ck-menu-card">
          <p className="ck-eyebrow">RELEASE ONE · ASHTA-KASHTE DUEL</p>
          <h1>Cowrie Kingdoms</h1>
          <p>This first family release uses Falkener’s documented seven-by-seven Ashta-Kashte rules. Other Ashta Chamma, Chowka Bara and Thaayam variants remain separate future rulesets.</p>
          <div className="ck-menu-actions">
            <button className="primary" onClick={() => setScreen("online")}>Online Multiplayer</button>
            <button onClick={() => startGame("practice-aurora")}>Practice as Aurora</button>
            <button onClick={() => startGame("practice-ember")}>Practice as Ember</button>
            <button onClick={() => startGame("hotseat")}>Local Two Player</button>
            <button onClick={() => startGame("drill")}>Ashta Grace Drill</button>
            <button onClick={() => setScreen("rules")}>How to Play</button>
          </div>
          <div className="ck-source-note">Ruleset: {COWRIE_KINGDOMS_RULESET.rulesetVersion}. Falkener records play for two to four people; this release ships a two-seat duel queue without blending another region’s route or capture gate.</div>
        </article>
      </section>
    );
  }

  if (screen === "online") {
    return <CowrieKingdomsOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;
  }

  if (screen === "rules") {
    return <RulesScreen onBack={() => setScreen("menu")} onStart={() => startGame("practice-aurora")} />;
  }

  const humanMayAct = canHumanAct() && !state.winner;
  const isBotThinking = !localOpen && state.currentPlayer === botSide && !state.winner;
  const allLegalActions = humanMayAct ? getLegalActions(state, state.currentPlayer) : [];
  const selectedUnit = state.throwPool.find((unit) => unit.id === selectedUnitId) || state.throwPool[0] || null;
  const selectedActions = selectedUnit ? allLegalActions.filter((action) => action.unitId === selectedUnit.id) : [];
  const passAction = selectedActions.find((action) => action.type === "pass-unit") || null;
  const playableActions = selectedActions.filter((action) => action.type !== "pass-unit");
  const ariaLabel = mode === "drill" ? "Cowrie Kingdoms Ashta grace drill" : "Cowrie Kingdoms game";

  return (
    <section className="ck-game" aria-label={ariaLabel}>
      <header className="ck-game-header">
        <button onClick={() => setScreen("menu")}>← Menu</button>
        <div>
          <p>ASHTA-KASHTE · {COWRIE_KINGDOMS_RULESET.rulesetVersion}</p>
          <h1>Cowrie Kingdoms</h1>
        </div>
        <button onClick={resetGame}>New Match</button>
      </header>
      <main className="ck-game-layout">
        <KingdomDock side="aurora" state={state} legalActions={playableActions} onAction={submitAction} interactive={humanMayAct && !isBotThinking} />
        <div className="ck-game-centre">
          <CowrieTray roll={state.lastRoll} onRoll={castCowries} canRoll={humanMayAct && state.awaiting === "roll" && !isBotThinking} />
          <ThrowPool
            units={state.throwPool}
            selectedUnitId={selectedUnit?.id || null}
            onSelect={setSelectedUnitId}
            passAction={passAction}
            onPass={submitAction}
            interactive={humanMayAct && !isBotThinking}
          />
          <div className="ck-turn-banner" data-player={state.currentPlayer}>
            <strong>{state.winner ? resultTitle(state) : isBotThinking ? `${sideName(state.currentPlayer)} is choosing…` : describeTurn(state)}</strong>
            <span>{state.winner ? resultDetail(state) : `Chance ${state.turn} · ${state.bonusRolls} bonus cast${state.bonusRolls === 1 ? "" : "s"} queued`}</span>
          </div>
          <CowrieKingdomsBoard state={state} legalActions={playableActions} onAction={submitAction} interactive={humanMayAct && !isBotThinking} />
          {message && <p className="ck-game-message" role="alert">{message}</p>}
          {state.winner && <div className="ck-result-actions"><button onClick={resetGame}>Play Again</button><button onClick={() => setScreen("menu")}>Main Menu</button></div>}
        </div>
        <KingdomDock side="ember" state={state} legalActions={playableActions} onAction={submitAction} interactive={humanMayAct && !isBotThinking} />
      </main>
      <footer className="ck-game-footer"><span>Mode: {modeLabel(mode)}</span><span>Four cowries · grace on 4 and 8 · optional pairs · protected crosses · exact centre</span></footer>
    </section>
  );
}

function RulesScreen({ onBack, onStart }) {
  return (
    <section className="ck-rules" aria-label="Cowrie Kingdoms rules">
      <button className="ck-back-pill" onClick={onBack}>← Menu</button>
      <article>
        <p className="ck-eyebrow">HOW TO PLAY · ASHTA-KASHTE</p>
        <h1>Cowrie Kingdoms</h1>
        <div className="ck-rule-grid">
          <section><strong>1 · Cast four cowries</strong><p>One to three mouths up score their number. Four mouths up score 4 and grace. No mouths up score Ashta: 8 plus a separate grace. Grace and captures grant another cast.</p></section>
          <section><strong>2 · Enter by grace</strong><p>A waiting runner enters on your marked edge square only through grace. The separate grace from an Ashta throw may be played independently from the stored 8.</p></section>
          <section><strong>3 · Follow the spiral</strong><p>Travel anticlockwise around the outer ring, turn into the left corner of the next ring, then follow the clockwise inner spiral toward the centre.</p></section>
          <section><strong>4 · Capture</strong><p>Land exactly on a rival on an unprotected cell to return it home and earn another cast. The five crossed cells are safe.</p></section>
          <section><strong>5 · Form a pair</strong><p>Land on one of your own runners to pair them. Move either runner separately or use the ×2 control to move both. A single cannot capture an opposing pair; a pair can capture one or two rivals.</p></section>
          <section><strong>6 · Pass or finish</strong><p>You may pass any stored throw. The centre requires an exact value, and the first kingdom to finish all four runners wins.</p></section>
        </div>
        <div className="ck-modern-policy"><strong>Version boundary</strong><span>The source-specific entry exception allows coexistence only on your starting cross. Friendly stacks are limited to two. No capture-gated home path, alternate cowrie table, or Thaayam-specific piece class is imported from another regional variant.</span></div>
        <button className="ck-rules-start" onClick={onStart}>Guide Aurora Kingdom</button>
      </article>
    </section>
  );
}

function modeLabel(mode) {
  if (mode === "hotseat") return "Local Two Player";
  if (mode === "drill") return "Ashta Grace Drill";
  return mode === "practice-ember" ? "Practice as Ember" : "Practice as Aurora";
}

function sideName(side) {
  return side === "ember" ? "Ember Kingdom" : "Aurora Kingdom";
}
