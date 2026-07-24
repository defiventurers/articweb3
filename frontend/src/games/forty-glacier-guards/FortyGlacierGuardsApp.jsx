import { useEffect, useRef, useState } from "react";
import { chooseFortyGlacierGuardsBotAction } from "./bot.js";
import { FortyGlacierGuardsBoard } from "./FortyGlacierGuardsBoard.jsx";
import { FortyGlacierGuardsOnline } from "./FortyGlacierGuardsOnline.jsx";
import {
  FORTY_GLACIER_GUARDS_RULESET,
  actionSummary,
  applyAction,
  createBreakthroughDrillState,
  createFortyGlacierGuardsState,
  describeTurn,
  getCounts,
  getLegalActions,
  resultDetail,
  resultTitle
} from "./rules.js";

export function FortyGlacierGuardsApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice-aurora");
  const [state, setState] = useState(() => createFortyGlacierGuardsState({ mode: "practice-aurora" }));
  const [selectedNode, setSelectedNode] = useState(null);
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
      const action = chooseFortyGlacierGuardsBotAction(state, botSide);
      if (!action) return;
      const result = applyAction(state, action, botSide);
      setState(result.state);
      setSelectedNode(result.state.chainFrom || null);
      setMessage(result.error || actionSummary(result.state.lastAction));
    }, state.chainFrom ? 320 : 540);
  }, [botSide, localOpen, screen, state]);

  function startGame(nextMode) {
    setMode(nextMode);
    const nextState = nextMode === "drill"
      ? createBreakthroughDrillState()
      : createFortyGlacierGuardsState({ mode: nextMode, starter: "aurora" });
    setState(nextState);
    setSelectedNode(nextState.chainFrom || null);
    setMessage(nextMode === "drill" ? "Aurora guard g42 can break through two Ember guards in one chain." : "");
    setScreen("game");
  }

  function resetGame() { startGame(mode); }
  function canHumanAct() { return localOpen || state.currentPlayer === humanSide; }

  function handleNode(nodeId) {
    if (state.winner || !canHumanAct()) return;
    const side = state.currentPlayer;
    const legalActions = getLegalActions(state, side);

    if (state.chainFrom) {
      const capture = legalActions.find((action) => action.type === "capture" && action.to === nodeId);
      if (capture) return submitAction(capture, side);
      setMessage("Continue with the highlighted guard or end the capture chain.");
      return;
    }

    if (state.board[nodeId] === side) {
      setSelectedNode(selectedNode === nodeId ? null : nodeId);
      setMessage("");
      return;
    }

    if (!selectedNode) {
      setMessage(`Select one of the ${side === "aurora" ? "Aurora" : "Ember"} guards first.`);
      return;
    }

    const action = legalActions.find((candidate) => candidate.from === selectedNode && candidate.to === nodeId);
    if (action) return submitAction(action, side);
    setMessage("Move one point horizontally or vertically, or jump one adjacent enemy to the empty point beyond.");
  }

  function submitAction(action, side = state.currentPlayer) {
    const result = applyAction(state, action, side);
    setState(result.state);
    setSelectedNode(result.state.chainFrom || null);
    setMessage(result.error || actionSummary(result.state.lastAction));
  }

  if (screen === "cover") {
    return (
      <section className="fgg-cover" aria-label="Forty Glacier Guards cover">
        <button className="fgg-back-pill" onClick={onExitToLibrary}>← All Games</button>
        <div className="fgg-cover-grid" aria-hidden="true">
          <div className="fgg-cover-lines" />
          {Array.from({ length: 40 }, (_, index) => <i className="ember" key={`e-${index}`} style={{ "--i": index }} />)}
          {Array.from({ length: 40 }, (_, index) => <i className="aurora" key={`a-${index}`} style={{ "--i": index }} />)}
          <b>40 × 40</b>
        </div>
        <div className="fgg-cover-copy">
          <p>CHALLIS-GUTIA · DATTA 1939</p>
          <h1>FORTY<br />GLACIER GUARDS</h1>
          <span>Eighty guards begin around one empty centre. Every opening unlocks a dense war of steps, jumps and optional capture chains.</span>
          <button onClick={() => setScreen("menu")}>Enter the glacier grid</button>
        </div>
      </section>
    );
  }

  if (screen === "menu") {
    return (
      <section className="fgg-menu" aria-label="Forty Glacier Guards menu">
        <button className="fgg-back-pill" onClick={() => setScreen("cover")}>← Cover</button>
        <article className="fgg-menu-card">
          <p className="fgg-eyebrow">INDIA · CHALLIS-GUTIA · FORTY-PIECE VARIANT</p>
          <h1>Forty Glacier Guards</h1>
          <p>Each side commands forty guards on a 9×9 orthogonal intersection grid. Step to an adjacent empty point or jump an enemy. After a capture, the same guard may continue—or deliberately stop.</p>
          <div className="fgg-menu-actions">
            <button className="primary" onClick={() => setScreen("online")}>Online Multiplayer</button>
            <button onClick={() => startGame("practice-aurora")}>Practice as Aurora Guard</button>
            <button onClick={() => startGame("practice-ember")}>Practice as Ember Guard</button>
            <button onClick={() => startGame("hotseat")}>Local Two Player</button>
            <button onClick={() => startGame("drill")}>Breakthrough Chain Drill</button>
            <button onClick={() => setScreen("rules")}>How to Play</button>
          </div>
          <div className="fgg-source-note">Heritage mode uses Datta’s forty-per-side, 9×9 orthogonal form. The separate Titagarh form with 3×3-block diagonals and flexible piece counts is not mixed into this ruleset.</div>
        </article>
      </section>
    );
  }

  if (screen === "online") return <FortyGlacierGuardsOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;
  if (screen === "rules") return <RulesScreen onBack={() => setScreen("menu")} onStart={() => startGame("practice-aurora")} />;

  const counts = getCounts(state);
  const currentName = state.currentPlayer === "aurora" ? "Aurora Guard" : "Ember Guard";
  const isBotThinking = !localOpen && state.currentPlayer === botSide && !state.winner;
  const ariaLabel = mode === "drill" ? "Forty Glacier Guards capture drill" : "Forty Glacier Guards game";

  return (
    <section className="fgg-game" aria-label={ariaLabel}>
      <header className="fgg-game-header">
        <button onClick={() => setScreen("menu")}>← Menu</button>
        <div><p>CHALLIS-GUTIA · {FORTY_GLACIER_GUARDS_RULESET.rulesetVersion}</p><h1>Forty Glacier Guards</h1></div>
        <button onClick={resetGame}>New Match</button>
      </header>
      <main className="fgg-game-layout">
        <RoleCard side="aurora" remaining={counts.auroraOnBoard} captures={counts.auroraCaptured} />
        <div className="fgg-board-shell">
          <div className="fgg-turn-banner" data-player={state.currentPlayer}>
            <strong>{state.winner ? resultTitle(state) : isBotThinking ? `${currentName} are calculating…` : describeTurn(state)}</strong>
            <span>{state.winner ? resultDetail(state) : `Turn ${state.turn}${state.chainFrom ? " · capture chain active" : ""}`}</span>
          </div>
          <FortyGlacierGuardsBoard state={state} selectedNode={selectedNode} onNode={handleNode} interactive={!isBotThinking && !state.winner} viewerSide={state.currentPlayer} />
          {!isBotThinking && !state.winner && state.chainFrom && <button className="fgg-end-chain" onClick={() => submitAction({ type: "end-chain", from: state.chainFrom })}>End Capture Turn</button>}
          {message && <p className="fgg-game-message" role="alert">{message}</p>}
          {state.winner && <div className="fgg-result-actions"><button onClick={resetGame}>Play Again</button><button onClick={() => setScreen("menu")}>Main Menu</button></div>}
        </div>
        <RoleCard side="ember" remaining={counts.emberOnBoard} captures={counts.emberCaptured} />
      </main>
      <footer className="fgg-game-footer"><span>Mode: {modeLabel(mode)}</span><span>Orthogonal Datta board · optional capture · optional continuation · no promotion</span></footer>
    </section>
  );
}

function RoleCard({ side, remaining, captures }) {
  return (
    <aside className={`fgg-role-card ${side}`}>
      <span className="fgg-role-icon">{side === "aurora" ? "✦" : "◆"}</span>
      <strong>{side === "aurora" ? "Aurora Guard" : "Ember Guard"}</strong>
      <small>{remaining} guards remain</small>
      <em>{captures} enemy guards captured</em>
    </aside>
  );
}

function RulesScreen({ onBack, onStart }) {
  return (
    <section className="fgg-rules" aria-label="Forty Glacier Guards rules">
      <button className="fgg-back-pill" onClick={onBack}>← Menu</button>
      <article>
        <p className="fgg-eyebrow">HOW TO PLAY</p><h1>Forty Glacier Guards</h1>
        <div className="fgg-rule-grid">
          <section><strong>1 · Formation</strong><p>Each side fills four complete rows plus its right half of the central line. The exact centre is the only empty point.</p></section>
          <section><strong>2 · Step</strong><p>Move one guard to an adjacent empty intersection along one horizontal or vertical printed line.</p></section>
          <section><strong>3 · Capture</strong><p>Jump one adjacent enemy guard to the empty point immediately beyond on the same straight line. Remove the jumped guard.</p></section>
          <section><strong>4 · Chain</strong><p>After a capture, the same guard may make another legal jump. Continue, or use End Capture Turn.</p></section>
          <section><strong>Variant boundary</strong><p>This is the orthogonal forty-piece form. Titagarh diagonals and reduced piece counts belong to another version.</p></section>
          <section><strong>Victory</strong><p>Capture all forty opposing guards. Guards never promote.</p></section>
        </div>
        <div className="fgg-modern-policy"><strong>Declared policy</strong><span>Datta’s short account leaves capture compulsion and chain compulsion unclear. This version permits a normal step when a capture exists and permits ending a chain. Threefold repetition, 240 captureless plies and immobilization draws are modern platform rules.</span></div>
        <button className="fgg-rules-start" onClick={onStart}>Command Aurora Guard</button>
      </article>
    </section>
  );
}

function modeLabel(mode) {
  if (mode === "hotseat") return "Local Two Player";
  if (mode === "drill") return "Breakthrough Chain Drill";
  return mode === "practice-ember" ? "Practice as Ember" : "Practice as Aurora";
}
