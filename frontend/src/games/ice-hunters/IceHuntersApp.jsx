import { useEffect, useRef, useState } from "react";
import { chooseIceHuntersBotAction } from "./bot.js";
import { IceHuntersBoard } from "./IceHuntersBoard.jsx";
import { IceHuntersOnline } from "./IceHuntersOnline.jsx";
import {
  ICE_HUNTERS_RULESET,
  applyAction,
  createIceHuntersState,
  describeTurn,
  getCounts,
  getLegalActions,
  getPhase,
  resultDetail,
  resultTitle
} from "./rules.js";

export function IceHuntersApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice-goats");
  const [state, setState] = useState(() => createIceHuntersState({ mode: "practice-goats" }));
  const [selectedNode, setSelectedNode] = useState(null);
  const [message, setMessage] = useState("");
  const botTimer = useRef(null);

  const humanRole = mode === "practice-tigers" ? "tigers" : "goats";
  const botRole = humanRole === "tigers" ? "goats" : "tigers";

  useEffect(() => () => window.clearTimeout(botTimer.current), []);
  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (screen !== "game" || mode === "hotseat" || state.winner || state.currentPlayer !== botRole) return;
    botTimer.current = window.setTimeout(() => {
      const action = chooseIceHuntersBotAction(state, botRole);
      if (!action) return;
      const result = applyAction(state, action, botRole);
      setState(result.state);
      setSelectedNode(null);
      setMessage(result.error || actionSummary(result.state.lastAction));
    }, getPhase(state, botRole) === "goat-deployment" ? 320 : 620);
  }, [botRole, mode, screen, state]);

  function startGame(nextMode) {
    setMode(nextMode);
    setState(createIceHuntersState({ mode: nextMode }));
    setSelectedNode(null);
    setMessage("");
    setScreen("game");
  }

  function resetGame() {
    setState(createIceHuntersState({ mode }));
    setSelectedNode(null);
    setMessage("");
  }

  function canHumanAct() {
    return mode === "hotseat" || state.currentPlayer === humanRole;
  }

  function handleNode(nodeId) {
    if (state.winner || !canHumanAct()) return;
    const player = state.currentPlayer;
    const legalActions = getLegalActions(state, player);
    const phase = getPhase(state, player);

    if (phase === "goat-deployment") {
      const place = legalActions.find((action) => action.type === "place" && action.nodeId === nodeId);
      if (place) return submitAction(place, player);
      setMessage(state.board[nodeId] ? "That intersection is occupied." : "Deploy the next colony scout on an empty point.");
      return;
    }

    if (state.board[nodeId] === player) {
      setSelectedNode(selectedNode === nodeId ? null : nodeId);
      setMessage("");
      return;
    }

    if (!selectedNode) {
      setMessage(`Select one of your ${player === "tigers" ? "Frost Hunters" : "colony scouts"} first.`);
      return;
    }

    const action = legalActions.find((candidate) => candidate.from === selectedNode && candidate.to === nodeId);
    if (action) return submitAction(action, player);
    setMessage(player === "tigers"
      ? "Move one step, or jump exactly one adjacent scout to the next empty point on the same line."
      : "Scouts move one step along a printed line after all twenty have been deployed.");
  }

  function submitAction(action, player) {
    const result = applyAction(state, action, player);
    setState(result.state);
    setSelectedNode(null);
    setMessage(result.error || actionSummary(result.state.lastAction));
  }

  if (screen === "cover") {
    return (
      <section className="ih-cover" aria-label="Ice Hunters cover">
        <button className="ih-back-pill" onClick={onExitToLibrary}>← All Games</button>
        <div className="ih-cover-board" aria-hidden="true">
          <span className="hunter h1" /><span className="hunter h2" /><span className="hunter h3" /><span className="hunter h4" />
          {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ "--i": index }} />)}
          <b>✦</b>
        </div>
        <div className="ih-cover-copy">
          <p>BAGH-CHAL · SOUTH ASIAN HUNT GAME</p>
          <h1>ICE<br />HUNTERS</h1>
          <span>Four corner hunters stalk a growing penguin colony. Capture five—or trap every hunter.</span>
          <button onClick={() => setScreen("menu")}>Enter the hunting ground</button>
        </div>
      </section>
    );
  }

  if (screen === "menu") {
    return (
      <section className="ih-menu" aria-label="Ice Hunters menu">
        <button className="ih-back-pill" onClick={() => setScreen("cover")}>← Cover</button>
        <article className="ih-menu-card">
          <p className="ih-eyebrow">BAGH-CHAL · STANDARD DIGITAL RULESET</p>
          <h1>Ice Hunters</h1>
          <p>Twenty colony scouts deploy one at a time while four corner hunters move immediately. Hunters win by capturing five scouts. The colony wins by blocking every hunter.</p>
          <div className="ih-menu-actions">
            <button className="primary" onClick={() => setScreen("online")}>Online Multiplayer</button>
            <button onClick={() => startGame("practice-goats")}>Practice as Penguin Colony</button>
            <button onClick={() => startGame("practice-tigers")}>Practice as Frost Hunters</button>
            <button onClick={() => startGame("hotseat")}>Local Two Player</button>
            <button onClick={() => setScreen("rules")}>How to Play</button>
          </div>
          <div className="ih-source-note">Heritage boundary: Bagh-Chal is a Nepalese South Asian tiger-and-goat game. This release keeps its standard four-tiger, twenty-goat structure and does not present it as an Indian-origin invention.</div>
        </article>
      </section>
    );
  }

  if (screen === "online") return <IceHuntersOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;
  if (screen === "rules") return <RulesScreen onBack={() => setScreen("menu")} onStart={() => startGame("practice-goats")} />;

  const counts = getCounts(state);
  const isBotThinking = mode !== "hotseat" && state.currentPlayer === botRole && !state.winner;
  return (
    <section className="ih-game" aria-label="Ice Hunters game">
      <header className="ih-game-header">
        <button onClick={() => setScreen("menu")}>← Menu</button>
        <div><p>BAGH-CHAL · {ICE_HUNTERS_RULESET.rulesetVersion}</p><h1>Ice Hunters</h1></div>
        <button onClick={resetGame}>New Match</button>
      </header>
      <main className="ih-game-layout">
        <aside className="ih-role-card tigers">
          <span className="ih-role-icon" aria-hidden="true">虎</span>
          <strong>Frost Hunters</strong>
          <small>{counts.tigersOnBoard} active · {counts.tigerMoves} legal actions</small>
          <em>{counts.goatsCaptured}/5 scouts captured</em>
        </aside>
        <div className="ih-board-shell">
          <div className="ih-turn-banner" data-player={state.currentPlayer}>
            <strong>{state.winner ? resultTitle(state) : isBotThinking ? `${roleLabel(state.currentPlayer)} are planning…` : describeTurn(state)}</strong>
            <span>{state.winner ? resultDetail(state) : `Turn ${state.turn} · ${phaseLabel(getPhase(state))}`}</span>
          </div>
          <IceHuntersBoard
            state={state}
            selectedNode={selectedNode}
            onNode={handleNode}
            interactive={!isBotThinking && !state.winner}
            viewerRole={state.currentPlayer}
          />
          {message && <p className="ih-game-message" role="status">{message}</p>}
          {state.winner && <div className="ih-result-actions"><button onClick={resetGame}>Play Again</button><button onClick={() => setScreen("menu")}>Main Menu</button></div>}
        </div>
        <aside className="ih-role-card goats">
          <span className="ih-role-icon" aria-hidden="true">●</span>
          <strong>Penguin Colony</strong>
          <small>{counts.goatsOnBoard} on board · {counts.goatsInHand} to deploy</small>
          <em>Trap all four hunters</em>
        </aside>
      </main>
      <footer className="ih-game-footer"><span>Mode: {modeLabel(mode)}</span><span>Hunter captures are optional and single-jump only.</span></footer>
    </section>
  );
}

function RulesScreen({ onBack, onStart }) {
  return (
    <section className="ih-rules" aria-label="Ice Hunters rules">
      <button className="ih-back-pill" onClick={onBack}>← Menu</button>
      <article>
        <p className="ih-eyebrow">HOW TO PLAY</p><h1>Ice Hunters</h1>
        <div className="ih-rule-grid">
          <section><strong>1 · Start</strong><p>Four hunters begin on the four corners. The colony begins with twenty scouts off-board and takes the first turn.</p></section>
          <section><strong>2 · Deploy</strong><p>Place one scout on any empty intersection. Hunters move after every placement. Scouts cannot move until all twenty have entered.</p></section>
          <section><strong>3 · Move</strong><p>Every piece moves one step to an adjacent empty intersection along a printed horizontal, vertical or diagonal line.</p></section>
          <section><strong>4 · Capture</strong><p>A hunter may jump one adjacent scout to the next empty point on the same line. Remove the jumped scout. Captures are optional and turns contain one jump.</p></section>
          <section><strong>Hunter victory</strong><p>Capture five scouts.</p></section>
          <section><strong>Colony victory</strong><p>Block all four hunters so none can move or capture.</p></section>
        </div>
        <div className="ih-modern-policy"><strong>Modern digital draw policy</strong><span>After all scouts are deployed, threefold repetition or 100 captureless movement plies produces a draw. These limits are platform policies, not heritage claims.</span></div>
        <button className="ih-rules-start" onClick={onStart}>Start as Penguin Colony</button>
      </article>
    </section>
  );
}

function actionSummary(action) {
  if (!action) return "";
  if (action.type === "place") return `Penguin Colony deployed a scout on ${action.nodeId}.`;
  if (action.type === "capture") return `Frost Hunters jumped from ${action.from} to ${action.to} and captured the scout on ${action.over}.`;
  return `${roleLabel(action.player)} moved from ${action.from} to ${action.to}.`;
}

function roleLabel(role) {
  return role === "tigers" ? "Frost Hunters" : "Penguin Colony";
}

function phaseLabel(phase) {
  return phase === "goat-deployment" ? "colony deployment" : "movement";
}

function modeLabel(mode) {
  if (mode === "hotseat") return "Local Two Player";
  return mode === "practice-tigers" ? "Practice as Frost Hunters" : "Practice as Penguin Colony";
}
