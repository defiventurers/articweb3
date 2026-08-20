import { useEffect, useRef, useState } from "react";
import { chooseFourWingBotAction } from "./bot.js";
import { FourWingBoard } from "./FourWingBoard.jsx";
import { FourWingIceHuntOnline } from "./FourWingIceHuntOnline.jsx";
import {
  FOUR_WING_ICE_HUNT_RULESET,
  applyAction,
  createFourWingIceHuntState,
  describeTurn,
  getCounts,
  getLegalActions,
  getPhase,
  resultDetail,
  resultTitle
} from "./rules.js";

export function FourWingIceHuntApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice-leopards");
  const [state, setState] = useState(() => createFourWingIceHuntState({ mode: "practice-leopards" }));
  const [selectedNode, setSelectedNode] = useState(null);
  const [message, setMessage] = useState("");
  const botTimer = useRef(null);

  const humanRole = mode === "practice-cattle" ? "cattle" : "leopards";
  const botRole = humanRole === "leopards" ? "cattle" : "leopards";

  useEffect(() => () => window.clearTimeout(botTimer.current), []);
  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (screen !== "game" || mode === "hotseat" || state.winner || state.currentPlayer !== botRole) return;
    botTimer.current = window.setTimeout(() => {
      const action = chooseFourWingBotAction(state, botRole);
      if (!action) return;
      const result = applyAction(state, action, botRole);
      setState(result.state);
      setSelectedNode(null);
      setMessage(result.error || "");
    }, state.cattlePlaced < 24 ? 360 : 620);
  }, [botRole, mode, screen, state]);

  function startGame(nextMode) {
    setMode(nextMode);
    setState(createFourWingIceHuntState({ mode: nextMode }));
    setSelectedNode(null);
    setMessage("");
    setScreen("game");
  }

  function resetGame() {
    setState(createFourWingIceHuntState({ mode }));
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

    if (phase !== "movement") {
      const place = legalActions.find((action) => action.type === "place" && action.nodeId === nodeId);
      if (place) return submitAction(place, player);
      setMessage(state.board[nodeId] ? "That intersection is occupied." : player === "cattle" && state.cattlePlaced === 0 ? "The first cattle piece must be safe from immediate capture." : "Choose an empty intersection.");
      return;
    }

    if (state.board[nodeId] === player) {
      setSelectedNode(selectedNode === nodeId ? null : nodeId);
      setMessage("");
      return;
    }

    if (!selectedNode) {
      setMessage(`Select one of your ${player === "leopards" ? "snow leopards" : "colony pieces"} first.`);
      return;
    }

    const action = legalActions.find((candidate) => candidate.from === selectedNode && candidate.to === nodeId);
    if (action) return submitAction(action, player);
    setMessage(player === "leopards" ? "Move one step, or jump exactly one cattle piece to the next empty point." : "Cattle move one step along a printed line and never capture.");
  }

  function submitAction(action, player) {
    const result = applyAction(state, action, player);
    setState(result.state);
    setSelectedNode(null);
    setMessage(result.error || "");
  }

  if (screen === "cover") {
    return (
      <section className="fwh-cover" aria-label="Four-Wing Ice Hunt cover">
        <button className="fwh-back-pill" onClick={onExitToLibrary}>← All Games</button>
        <div className="fwh-cover-compass" aria-hidden="true"><span /><span /><span /><span /><i>✦</i></div>
        <div className="fwh-cover-copy">
          <p>INSPIRED BY DIVIYAN KELIYA</p>
          <h1>FOUR-WING<br />ICE HUNT</h1>
          <span>Two predators. Twenty-four defenders. Four frozen wings.</span>
          <button onClick={() => setScreen("menu")}>Enter the hunt</button>
        </div>
      </section>
    );
  }

  if (screen === "menu") {
    return (
      <section className="fwh-menu" aria-label="Four-Wing Ice Hunt menu">
        <button className="fwh-back-pill" onClick={() => setScreen("cover")}>← Cover</button>
        <article className="fwh-menu-card">
          <p className="fwh-eyebrow">SRI LANKA · PARKER 1909 RULESET</p>
          <h1>Four-Wing Ice Hunt</h1>
          <p>Deploy twenty-four cattle pieces to imprison two mobile leopards. Leopards move immediately and capture one cattle piece by jumping to the next empty point.</p>
          <div className="fwh-menu-actions">
            <button className="primary" onClick={() => setScreen("online")}>Online Multiplayer</button>
            <button onClick={() => startGame("practice-leopards")}>Practice as Snow Leopards</button>
            <button onClick={() => startGame("practice-cattle")}>Practice as the Colony</button>
            <button onClick={() => startGame("hotseat")}>Local Two Player</button>
            <button onClick={() => setScreen("rules")}>How to Play</button>
          </div>
          <div className="fwh-source-note">Heritage mode follows Parker’s recorded opening sequence: first leopard, first safe cattle placement, second leopard, then one cattle placement after each leopard move. Cattle cannot move until all twenty-four are deployed.</div>
        </article>
      </section>
    );
  }

  if (screen === "online") return <FourWingIceHuntOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;
  if (screen === "rules") return <RulesScreen onBack={() => setScreen("menu")} onStart={() => startGame("practice-leopards")} />;

  const counts = getCounts(state);
  const currentName = state.currentPlayer === "leopards" ? "Snow Leopards" : "Colony";
  const isBotThinking = mode !== "hotseat" && state.currentPlayer === botRole && !state.winner;
  return (
    <section className="fwh-game" aria-label="Four-Wing Ice Hunt game">
      <header className="fwh-game-header">
        <button onClick={() => setScreen("menu")}>← Menu</button>
        <div><p>DIVIYAN KELIYA · {FOUR_WING_ICE_HUNT_RULESET.rulesetVersion}</p><h1>Four-Wing Ice Hunt</h1></div>
        <button onClick={resetGame}>New Match</button>
      </header>
      <main className="fwh-game-layout">
        <aside className="fwh-role-card leopards">
          <span className="fwh-role-icon">✦</span><strong>Snow Leopards</strong>
          <small>{counts.leopardsOnBoard} on board · {2 - state.leopardsPlaced} to place</small>
          <em>Capture all cattle</em>
        </aside>
        <div className="fwh-board-shell">
          <div className="fwh-turn-banner" data-player={state.currentPlayer}>
            <strong>{state.winner ? resultTitle(state) : isBotThinking ? `${currentName} are planning…` : describeTurn(state)}</strong>
            <span>{state.winner ? resultDetail(state) : `Turn ${state.turn} · ${getPhase(state)}`}</span>
          </div>
          <FourWingBoard state={state} selectedNode={selectedNode} onNode={handleNode} interactive={!isBotThinking && !state.winner} viewerRole={state.currentPlayer} />
          {message && <p className="fwh-game-message" role="alert">{message}</p>}
          {state.winner && <div className="fwh-result-actions"><button onClick={resetGame}>Play Again</button><button onClick={() => setScreen("menu")}>Main Menu</button></div>}
        </div>
        <aside className="fwh-role-card cattle">
          <span className="fwh-role-icon">●</span><strong>Ice Colony</strong>
          <small>{counts.cattleOnBoard} active · {counts.cattleInHand} to deploy</small>
          <em>{counts.cattleCaptured} captured · imprison both leopards</em>
        </aside>
      </main>
      <footer className="fwh-game-footer"><span>Mode: {modeLabel(mode)}</span><span>Captures are optional and single-jump only in this ruleset.</span></footer>
    </section>
  );
}

function RulesScreen({ onBack, onStart }) {
  return (
    <section className="fwh-rules" aria-label="Four-Wing Ice Hunt rules">
      <button className="fwh-back-pill" onClick={onBack}>← Menu</button>
      <article>
        <p className="fwh-eyebrow">HOW TO PLAY · FOUR-WING HUNT</p><h1>Seal every escape.</h1>
        <p className="fwh-rules-intro">Four-Wing Hunt is an asymmetric line-board strategy game: two snow leopards hunt through the ice while a colony of twenty-four penguin colonisers builds a moving trap.</p>
        <div className="fwh-rule-grid">
          <section><strong>1 · Set the hunt</strong><p>Place both snow leopards on the marked opposite outer-wing starts. Place eight penguin colonisers on the highlighted central intersections. Keep the remaining sixteen as the colony reserve.</p></section>
          <section><strong>2 · Deploy the reserve</strong><p>During deployment, the colony places one reserve penguin on any open intersection. The leopard player then takes one leopard turn. Continue until all twenty-four penguins have entered play; penguins do not make ordinary moves yet.</p></section>
          <section><strong>3 · Follow the ice lines</strong><p>Every piece stands on an intersection. A normal move goes exactly one step to an adjacent open intersection joined by a visible line. Nearby points are not connected unless a line links them.</p></section>
          <section><strong>4 · Hunt and capture</strong><p>A snow leopard captures by jumping a directly adjacent penguin along a legal line to the empty intersection immediately beyond it. Remove that penguin permanently. Penguins never jump or capture.</p></section>
          <section><strong>5 · Continue the chase</strong><p>If a leopard lands after a capture and can legally jump another penguin, it must continue with that same leopard. Each landing point must be open, and a leopard can never jump the other leopard.</p></section>
          <section><strong>6 · Win the four wings</strong><p>The snow leopards win immediately after capturing twelve or more penguins. The colony wins immediately when both leopards have no legal one-step move and no legal capture.</p></section>
        </div>
        <div className="fwh-modern-policy"><strong>Quick clarification</strong><span>Captured penguins never return to the board. A capture needs an empty landing point. Once a multi-capture begins, continuing legal jumps are mandatory. The digital edition records a draw only after three identical movement positions or 160 captureless movement turns.</span></div>
        <button className="fwh-rules-start" onClick={onStart}>Start as Snow Leopards</button>
      </article>
    </section>
  );
}

function modeLabel(mode) {
  if (mode === "hotseat") return "Local Two Player";
  return mode === "practice-cattle" ? "Practice as Colony" : "Practice as Snow Leopards";
}
