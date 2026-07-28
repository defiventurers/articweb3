import { useEffect, useRef, useState } from "react";
import { chooseAuroraVultureBotAction } from "./bot.js";
import { AuroraVultureBoard, CrowDock, VultureDock } from "./AuroraVultureBoard.jsx";
import { AuroraVultureOnline } from "./AuroraVultureOnline.jsx";
import {
  AURORA_VULTURE_RULESET,
  actionSummary,
  applyAction,
  createAuroraVultureState,
  createFourthCrowDrill,
  describeTurn,
  getLegalActions,
  resultDetail,
  resultTitle
} from "./rules.js";

export function AuroraVultureApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice-vulture");
  const [state, setState] = useState(() => createAuroraVultureState({ mode: "practice-vulture" }));
  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [message, setMessage] = useState("");
  const botTimer = useRef(null);

  const humanSide = mode === "practice-crows" ? "crows" : "vulture";
  const botSide = humanSide === "vulture" ? "crows" : "vulture";
  const localMode = mode === "hotseat" || mode === "drill";

  useEffect(() => () => window.clearTimeout(botTimer.current), []);
  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (screen !== "game" || localMode || state.winner || state.isDraw || state.currentPlayer !== botSide) return;
    botTimer.current = window.setTimeout(() => {
      const action = chooseAuroraVultureBotAction(state, botSide);
      if (!action) return;
      const result = applyAction(state, action, botSide);
      setState(result.state);
      setSelectedPieceId(null);
      setMessage(result.error || actionSummary(result.state.lastAction));
    }, state.phase === "deployment" ? 520 : 430);
  }, [botSide, localMode, screen, state]);

  function startGame(nextMode) {
    const next = nextMode === "drill"
      ? createFourthCrowDrill()
      : createAuroraVultureState({ mode: nextMode });
    setMode(nextMode);
    setState(next);
    setSelectedPieceId(null);
    setMessage(nextMode === "drill"
      ? "Three crows are already captured. Select the vulture, then make the one straight jump that ends the hunt."
      : "");
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

  if (screen === "cover") {
    return (
      <section className="av-cover" aria-label="Aurora Vulture cover">
        <button className="av-back" onClick={onExitToLibrary}>← All Games</button>
        <div className="av-cover-sky" aria-hidden="true"><i/><i/><i/><i/><i/></div>
        <div className="av-cover-star" aria-hidden="true">
          <svg viewBox="0 0 100 100"><polyline points="50,4 77,88 7,36 93,36 23,88 50,4" /></svg>
          <span className="v">V</span>
          {Array.from({ length: 7 }, (_, index) => <b key={index} style={{ "--crow-index": index }}>●</b>)}
        </div>
        <div className="av-cover-copy">
          <p>KAOOA · VULTURE AND CROWS · INDIA</p>
          <h1>AURORA<br/>VULTURE</h1>
          <span>One glacier hunter cuts through a seven-crow formation on a glowing ten-point star.</span>
          <button onClick={() => setScreen("menu")}>Enter the aurora star</button>
        </div>
      </section>
    );
  }

  if (screen === "menu") {
    return (
      <section className="av-menu" aria-label="Aurora Vulture menu">
        <button className="av-back" onClick={() => setScreen("cover")}>← Cover</button>
        <article>
          <p className="av-eyebrow">ASYMMETRIC PENTAGRAM HUNT</p>
          <h1>Aurora Vulture</h1>
          <p>The crows enter one at a time and try to close every route. The vulture moves from the second hunter turn and wins by making four single-jump captures.</p>
          <div className="av-menu-actions">
            <button className="primary" onClick={() => setScreen("online")}>Online Multiplayer</button>
            <button onClick={() => startGame("practice-vulture")}>Practice as Vulture</button>
            <button onClick={() => startGame("practice-crows")}>Practice as Crows</button>
            <button onClick={() => startGame("hotseat")}>Local Two Player</button>
            <button onClick={() => startGame("drill")}>Fourth-Crow Strike Drill</button>
            <button onClick={() => setScreen("rules")}>How to Play</button>
          </div>
          <div className="av-version-note"><strong>{AURORA_VULTURE_RULESET.rulesetVersion}</strong><span>Empty-board crow-first setup. Captures are optional and limited to one jump per vulture turn.</span></div>
        </article>
      </section>
    );
  }

  if (screen === "online") return <AuroraVultureOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;
  if (screen === "rules") return <RulesScreen onBack={() => setScreen("menu")} onStart={() => startGame("practice-vulture")} />;

  const humanMayAct = localMode || state.currentPlayer === humanSide;
  const botThinking = !localMode && state.currentPlayer === botSide && !state.winner && !state.isDraw;
  const legalActions = humanMayAct && !botThinking ? getLegalActions(state, state.currentPlayer) : [];
  const aria = mode === "drill" ? "Aurora Vulture fourth-crow strike drill" : "Aurora Vulture game";

  return (
    <section className="av-game" aria-label={aria}>
      <header className="av-game-header">
        <button onClick={() => setScreen("menu")}>← Menu</button>
        <div><p>KAOOA · {AURORA_VULTURE_RULESET.rulesetVersion}</p><h1>Aurora Vulture</h1></div>
        <button onClick={() => startGame(mode)}>Reset</button>
      </header>
      <main className="av-game-layout">
        <CrowDock state={state} />
        <div className="av-game-centre">
          <div className="av-turn-banner" data-player={state.currentPlayer}>
            <strong>{botThinking ? `${sideName(state.currentPlayer)} is choosing…` : describeTurn(state)}</strong>
            <span>{state.phase === "deployment" ? `${state.deployedCrows}/7 crows deployed` : `Movement ply ${state.movementPly}/${AURORA_VULTURE_RULESET.movementPlyLimit}`} · Vulture captures {state.capturedCrows}/4</span>
          </div>
          <AuroraVultureBoard
            state={state}
            legalActions={legalActions}
            selectedPieceId={selectedPieceId}
            onSelectPiece={setSelectedPieceId}
            onAction={submitAction}
            interactive={humanMayAct && !botThinking && !state.winner && !state.isDraw}
          />
          {message && <p className="av-message" role="alert">{message}</p>}
          {(state.winner || state.isDraw) && (
            <div className="av-result">
              <h2>{resultTitle(state)}</h2>
              <p>{resultDetail(state)}</p>
              <div><button onClick={() => startGame(mode)}>Play Again</button><button onClick={() => setScreen("menu")}>Main Menu</button></div>
            </div>
          )}
        </div>
        <VultureDock state={state} />
      </main>
      <footer className="av-game-footer"><span>Mode: {modeLabel(mode)}</span><span>Seven crows · one vulture · single jumps · four captures or total blockade</span></footer>
    </section>
  );
}

function RulesScreen({ onBack, onStart }) {
  return (
    <section className="av-rules" aria-label="Aurora Vulture rules">
      <button className="av-back" onClick={onBack}>← Menu</button>
      <article>
        <p className="av-eyebrow">HOW TO PLAY · KAOOA</p>
        <h1>Hunt on the aurora star</h1>
        <div className="av-rule-grid">
          <section><strong>1 · Crow enters first</strong><p>Begin with an empty board. Place one crow on any point, then place the vulture on any remaining point. Crows continue entering one per crow turn.</p></section>
          <section><strong>2 · Crows deploy before moving</strong><p>Until all seven defenders have entered, every crow turn is a placement. After deployment, a crow moves to one adjacent empty point along a printed segment.</p></section>
          <section><strong>3 · Vulture moves immediately</strong><p>After its initial placement, the vulture may move on every turn even while crows are still deploying.</p></section>
          <section><strong>4 · Straight jump capture</strong><p>The vulture may jump one adjacent crow to the empty point immediately beyond on the same straight star line. Remove the jumped crow. No capture chain follows.</p></section>
          <section><strong>5 · Two victory paths</strong><p>The vulture wins after four captures. The crows win when the vulture has neither an adjacent move nor a legal jump.</p></section>
          <section><strong>6 · Digital completion</strong><p>Threefold repetition or 80 movement plies produces a draw. These are explicit digital policies because surviving positions can cycle.</p></section>
        </div>
        <div className="av-policy"><strong>Rules boundary</strong><span>This release does not make captures compulsory and does not permit multiple jumps. The start sequence and jump limit are fixed in the displayed ruleset ID.</span></div>
        <button onClick={onStart}>Start as Glacier Vulture</button>
      </article>
    </section>
  );
}

function modeLabel(mode) {
  if (mode === "hotseat") return "Local Two Player";
  if (mode === "drill") return "Fourth-Crow Strike Drill";
  return mode === "practice-crows" ? "Practice as Crows" : "Practice as Vulture";
}

function sideName(side) {
  return side === "crows" ? "Aurora Crows" : "Glacier Vulture";
}
