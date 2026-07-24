import { useEffect, useRef, useState } from "react";
import { chooseSixteenIceWarriorsBotAction } from "./bot.js";
import { SixteenIceWarriorsBoard } from "./SixteenIceWarriorsBoard.jsx";
import { SixteenIceWarriorsOnline } from "./SixteenIceWarriorsOnline.jsx";
import {
  SIXTEEN_ICE_WARRIORS_RULESET,
  actionSummary,
  applyAction,
  createCaptureDrillState,
  createSixteenIceWarriorsState,
  describeTurn,
  getCounts,
  getLegalActions,
  resultDetail,
  resultTitle
} from "./rules.js";

export function SixteenIceWarriorsApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice-aurora");
  const [state, setState] = useState(() => createSixteenIceWarriorsState({ mode: "practice-aurora" }));
  const [selectedNode, setSelectedNode] = useState(null);
  const [message, setMessage] = useState("");
  const botTimer = useRef(null);

  const humanSide = mode === "practice-ember" ? "ember" : "aurora";
  const botSide = humanSide === "aurora" ? "ember" : "aurora";

  useEffect(() => () => window.clearTimeout(botTimer.current), []);
  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (screen !== "game" || ["hotseat", "drill"].includes(mode) || state.winner || state.currentPlayer !== botSide) return;
    botTimer.current = window.setTimeout(() => {
      const action = chooseSixteenIceWarriorsBotAction(state, botSide);
      if (!action) return;
      const result = applyAction(state, action, botSide);
      setState(result.state);
      setSelectedNode(result.state.chainFrom || null);
      setMessage(result.error || actionSummary(result.state.lastAction));
    }, state.chainFrom ? 360 : 620);
  }, [botSide, mode, screen, state]);

  function startGame(nextMode) {
    setMode(nextMode);
    const nextState = nextMode === "drill"
      ? createCaptureDrillState()
      : createSixteenIceWarriorsState({ mode: nextMode, starter: "aurora" });
    setState(nextState);
    setSelectedNode(nextState.chainFrom || null);
    setMessage(nextMode === "drill" ? "Aurora can chop twice. Complete the full capture chain." : "");
    setScreen("game");
  }

  function resetGame() {
    startGame(mode);
  }

  function canHumanAct() {
    return ["hotseat", "drill"].includes(mode) || state.currentPlayer === humanSide;
  }

  function handleNode(nodeId) {
    if (state.winner || !canHumanAct()) return;
    const side = state.currentPlayer;
    const legalActions = getLegalActions(state, side);

    if (state.chainFrom) {
      const capture = legalActions.find((action) => action.type === "capture" && action.to === nodeId);
      if (capture) return submitAction(capture, side);
      setMessage("Continue with the highlighted soldier or end the capture chain.");
      return;
    }

    if (state.board[nodeId] === side) {
      setSelectedNode(selectedNode === nodeId ? null : nodeId);
      setMessage("");
      return;
    }

    if (!selectedNode) {
      setMessage(`Select one of the ${side === "aurora" ? "Aurora" : "Ember"} soldiers first.`);
      return;
    }

    const action = legalActions.find((candidate) => candidate.from === selectedNode && candidate.to === nodeId);
    if (action) return submitAction(action, side);
    setMessage("Move one step, or jump one adjacent enemy to the next empty point on the same printed line.");
  }

  function submitAction(action, side = state.currentPlayer) {
    const result = applyAction(state, action, side);
    setState(result.state);
    setSelectedNode(result.state.chainFrom || null);
    setMessage(result.error || actionSummary(result.state.lastAction));
  }

  if (screen === "cover") {
    return (
      <section className="siw-cover" aria-label="Sixteen Ice Warriors cover">
        <button className="siw-back-pill" onClick={onExitToLibrary}>← All Games</button>
        <div className="siw-cover-board" aria-hidden="true">
          <span className="siw-banner top">AURORA</span>
          <span className="siw-banner bottom">EMBER</span>
          {Array.from({ length: 16 }, (_, index) => <i className="aurora" key={`a-${index}`} style={{ "--i": index }} />)}
          {Array.from({ length: 16 }, (_, index) => <i className="ember" key={`e-${index}`} style={{ "--i": index }} />)}
          <b>16</b>
        </div>
        <div className="siw-cover-copy">
          <p>HEWAKAM KELIYA · PARKER 1909</p>
          <h1>SIXTEEN<br />ICE WARRIORS</h1>
          <span>Two frozen legions. Thirty-two soldiers. Optional captures that can become devastating chains.</span>
          <button onClick={() => setScreen("menu")}>Enter the war table</button>
        </div>
      </section>
    );
  }

  if (screen === "menu") {
    return (
      <section className="siw-menu" aria-label="Sixteen Ice Warriors menu">
        <button className="siw-back-pill" onClick={() => setScreen("cover")}>← Cover</button>
        <article className="siw-menu-card">
          <p className="siw-eyebrow">SRI LANKA · HEWAKAM KELIYA · SIXTEEN SOLDIERS</p>
          <h1>Sixteen Ice Warriors</h1>
          <p>Each legion begins with sixteen soldiers in opposite formations. Move one step along a line, or jump an enemy soldier. A capturing soldier may keep jumping—or stop the chain.</p>
          <div className="siw-menu-actions">
            <button className="primary" onClick={() => setScreen("online")}>Online Multiplayer</button>
            <button onClick={() => startGame("practice-aurora")}>Practice as Aurora Legion</button>
            <button onClick={() => startGame("practice-ember")}>Practice as Ember Legion</button>
            <button onClick={() => startGame("hotseat")}>Local Two Player</button>
            <button onClick={() => startGame("drill")}>Chain Capture Drill</button>
            <button onClick={() => setScreen("rules")}>How to Play</button>
          </div>
          <div className="siw-source-note">Heritage mode follows Parker’s recorded war game: sixteen soldiers per side, movement in any direction along printed lines, optional captures, unlimited same-piece capture chains and victory by eliminating the opposing army.</div>
        </article>
      </section>
    );
  }

  if (screen === "online") return <SixteenIceWarriorsOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;
  if (screen === "rules") return <RulesScreen onBack={() => setScreen("menu")} onStart={() => startGame("practice-aurora")} />;

  const counts = getCounts(state);
  const currentName = state.currentPlayer === "aurora" ? "Aurora Legion" : "Ember Legion";
  const isBotThinking = !["hotseat", "drill"].includes(mode) && state.currentPlayer === botSide && !state.winner;
  const ariaLabel = mode === "drill" ? "Sixteen Ice Warriors capture drill" : "Sixteen Ice Warriors game";

  return (
    <section className="siw-game" aria-label={ariaLabel}>
      <header className="siw-game-header">
        <button onClick={() => setScreen("menu")}>← Menu</button>
        <div><p>HEWAKAM KELIYA · {SIXTEEN_ICE_WARRIORS_RULESET.rulesetVersion}</p><h1>Sixteen Ice Warriors</h1></div>
        <button onClick={resetGame}>New Match</button>
      </header>
      <main className="siw-game-layout">
        <RoleCard side="aurora" remaining={counts.auroraOnBoard} captures={counts.auroraCaptured} />
        <div className="siw-board-shell">
          <div className="siw-turn-banner" data-player={state.currentPlayer}>
            <strong>{state.winner ? resultTitle(state) : isBotThinking ? `${currentName} are calculating…` : describeTurn(state)}</strong>
            <span>{state.winner ? resultDetail(state) : `Turn ${state.turn}${state.chainFrom ? " · capture chain active" : ""}`}</span>
          </div>
          <SixteenIceWarriorsBoard state={state} selectedNode={selectedNode} onNode={handleNode} interactive={!isBotThinking && !state.winner} viewerSide={state.currentPlayer} />
          {!isBotThinking && !state.winner && state.chainFrom && <button className="siw-end-chain" onClick={() => submitAction({ type: "end-chain", from: state.chainFrom })}>End Capture Turn</button>}
          {message && <p className="siw-game-message" role="alert">{message}</p>}
          {state.winner && <div className="siw-result-actions"><button onClick={resetGame}>Play Again</button><button onClick={() => setScreen("menu")}>Main Menu</button></div>}
        </div>
        <RoleCard side="ember" remaining={counts.emberOnBoard} captures={counts.emberCaptured} />
      </main>
      <footer className="siw-game-footer"><span>Mode: {modeLabel(mode)}</span><span>Captures and continued jumps are optional. There is no promotion.</span></footer>
    </section>
  );
}

function RoleCard({ side, remaining, captures }) {
  return (
    <aside className={`siw-role-card ${side}`}>
      <span className="siw-role-icon">{side === "aurora" ? "✦" : "◆"}</span>
      <strong>{side === "aurora" ? "Aurora Legion" : "Ember Legion"}</strong>
      <small>{remaining} soldiers remain</small>
      <em>{captures} enemy soldiers chopped</em>
    </aside>
  );
}

function RulesScreen({ onBack, onStart }) {
  return (
    <section className="siw-rules" aria-label="Sixteen Ice Warriors rules">
      <button className="siw-back-pill" onClick={onBack}>← Menu</button>
      <article>
        <p className="siw-eyebrow">HOW TO PLAY</p><h1>Sixteen Ice Warriors</h1>
        <div className="siw-rule-grid">
          <section><strong>1 · Formation</strong><p>Each side starts with sixteen soldiers in its triangular room and the two nearest rows. The five-point transverse centre line begins empty.</p></section>
          <section><strong>2 · Step</strong><p>Move one soldier to an adjacent empty intersection along any printed straight or diagonal line.</p></section>
          <section><strong>3 · Capture</strong><p>Jump one adjacent enemy soldier to the empty point immediately beyond on the same line. Remove the jumped soldier.</p></section>
          <section><strong>4 · Chain</strong><p>After a capture, the same soldier may make another legal capture. Continue without limit, or deliberately end the chain.</p></section>
          <section><strong>Optional capture</strong><p>A capture is never compulsory. A player may choose an ordinary step even when a capture exists.</p></section>
          <section><strong>Victory</strong><p>Win by capturing all sixteen opposing soldiers. Pieces never promote.</p></section>
        </div>
        <div className="siw-modern-policy"><strong>Modern digital policy</strong><span>Aurora starts a single game. Threefold repetition, 160 captureless plies and a no-legal-move stalemate produce draws. These are platform policies, not Parker’s heritage rules.</span></div>
        <button className="siw-rules-start" onClick={onStart}>Command Aurora Legion</button>
      </article>
    </section>
  );
}

function modeLabel(mode) {
  if (mode === "hotseat") return "Local Two Player";
  if (mode === "drill") return "Chain Capture Drill";
  return mode === "practice-ember" ? "Practice as Ember" : "Practice as Aurora";
}
