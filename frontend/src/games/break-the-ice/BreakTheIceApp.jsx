import { useEffect, useRef, useState } from "react";
import { chooseBreakTheIceBotAction } from "./bot.js";
import { BreakTheIceBoard, CowrieTray } from "./BreakTheIceBoard.jsx";
import { BreakTheIceOnline } from "./BreakTheIceOnline.jsx";
import {
  BREAK_THE_ICE_RULESET,
  applyAction,
  bestCowrieDrillPieces,
  createBreakTheIceState,
  createCowrieDrill,
  describeTurn,
  getPlayerSummary,
  resultDetail,
  resultTitle,
  rollLocalCowries,
  scoreAction
} from "./rules.js";

const HUMAN = "blue";
const BOT = "coral";

export function BreakTheIceApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice");
  const [state, setState] = useState(() => createBreakTheIceState({ mode: "practice" }));
  const [message, setMessage] = useState("");
  const [drillBase, setDrillBase] = useState(() => createCowrieDrill());
  const [drillResult, setDrillResult] = useState(null);
  const botTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(botTimer.current), []);

  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (screen !== "game" || mode !== "practice" || state.winner || state.currentPlayer !== BOT) return;
    botTimer.current = window.setTimeout(() => {
      if (state.awaiting === "roll") {
        const result = rollLocalCowries(state, BOT);
        setState(result.state);
        setMessage(result.error || rollSummary(result.state.lastRoll, result.state.lastMove));
        return;
      }
      const action = chooseBreakTheIceBotAction(state, BOT);
      if (!action) return;
      const result = applyAction(state, action, BOT);
      setState(result.state);
      setMessage(result.error || moveSummary(result.state.lastMove));
    }, state.awaiting === "roll" ? 640 : 760);
  }, [mode, screen, state]);

  function startGame(nextMode) {
    setMode(nextMode);
    setState(createBreakTheIceState({ mode: nextMode, starter: "blue", seed: Date.now() }));
    setMessage("");
    setScreen("game");
  }

  function resetGame() {
    setState(createBreakTheIceState({ mode, starter: "blue", seed: Date.now() }));
    setMessage("");
  }

  function castCowries() {
    if (state.winner || state.awaiting !== "roll" || (mode === "practice" && state.currentPlayer === BOT)) return;
    const result = rollLocalCowries(state, state.currentPlayer);
    setState(result.state);
    setMessage(result.error || rollSummary(result.state.lastRoll, result.state.lastMove));
  }

  function moveRunner(action) {
    if (state.winner || state.awaiting !== "move" || (mode === "practice" && state.currentPlayer === BOT)) return;
    const result = applyAction(state, action, state.currentPlayer);
    setState(result.state);
    setMessage(result.error || moveSummary(result.state.lastMove));
  }

  function openDrill() {
    setDrillBase(createCowrieDrill());
    setDrillResult(null);
    setScreen("drill");
  }

  function playDrill(action) {
    if (drillResult) return;
    const bestPieces = bestCowrieDrillPieces(drillBase);
    const score = scoreAction(drillBase, action);
    const result = applyAction(drillBase, action, "blue");
    setDrillResult({ state: result.state, score, bestPieces, chosen: action.pieceId, optimal: bestPieces.includes(action.pieceId) });
  }

  if (screen === "cover") {
    return (
      <section className="bti-cover" aria-label="Break the Ice cover">
        <button className="bti-back-pill" onClick={onExitToLibrary}>← All Games</button>
        <div className="bti-cover-route" aria-hidden="true"><span /><span /><span /><span /><b>✦</b></div>
        <div className="bti-cover-cowries" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <i key={index} className={index < 3 ? "open" : "closed"} />)}</div>
        <div className="bti-cover-copy">
          <p>MYSORE PANCHI · VASANTHA 2006</p>
          <h1>BREAK<br />THE ICE</h1>
          <span>Cast five cowries. Enter on one mouth up, circle the frozen kingdom, then escape with an exact throw.</span>
          <button onClick={() => setScreen("menu")}>Start the race</button>
        </div>
      </section>
    );
  }

  if (screen === "menu") {
    return (
      <section className="bti-menu" aria-label="Break the Ice menu">
        <button className="bti-back-pill" onClick={() => setScreen("cover")}>← Cover</button>
        <article className="bti-menu-card">
          <p className="bti-eyebrow">PANCHI · NAMED VASANTHA RULESET</p>
          <h1>Break the Ice</h1>
          <p>Race five penguins from opposite ends, climb into the marked square circuit, circle the kingdom, then exit along the inner ice path.</p>
          <div className="bti-menu-actions">
            <button className="primary" onClick={() => startGame("practice")}>Practice vs Glacier Guide</button>
            <button onClick={() => startGame("hotseat")}>Local Two Player</button>
            <button onClick={openDrill}>Daily Cowrie Drill</button>
            <button onClick={() => setScreen("online")}>Online Multiplayer</button>
            <button onClick={() => setScreen("rules")}>How to Play</button>
          </div>
          <div className="bti-source-note">This release follows the two-player Mysore Panchi route: five cowries, one-mouth entry, bonus throws on 0, 1 and 5 mouths-up, and a captured-rival requirement before using the inner finishing stem.</div>
        </article>
      </section>
    );
  }

  if (screen === "rules") {
    return (
      <section className="bti-rules" aria-label="Break the Ice rules">
        <button className="bti-back-pill" onClick={() => setScreen("menu")}>← Menu</button>
        <article>
          <p className="bti-eyebrow">HERITAGE RULES</p>
          <h1>How to break through</h1>
          <div className="bti-rule-grid">
            <section><strong>1 · Cast</strong><p>Throw five cowries. One to five mouths up move that many spaces; no mouths up moves ten spaces.</p></section>
            <section><strong>2 · Enter</strong><p>Only one mouth up may place one waiting runner on that player's marked outer starting square.</p></section>
            <section><strong>3 · Bonus</strong><p>Throws of 0, 1, or 5 mouths-up grant another cowrie throw after the move is resolved.</p></section>
            <section><strong>4 · Race</strong><p>Move one runner the complete value: along the bottom track, up the stem, around the square, then up the final inner path.</p></section>
            <section><strong>5 · Capture</strong><p>Exact landing on an unprotected rival sends that runner back off-board. Marked spaces protect their occupant.</p></section>
            <section><strong>6 · Finish</strong><p>Capture at least one rival before moving from D into the inner finishing stem toward L. A runner leaves only with the exact required value; finish all five to win.</p></section>
          </div>
          <div className="bti-modern-policy">
            <strong>Declared digital table policy</strong>
            <span>One runner may occupy a space. Friendly occupied spaces and enemy-occupied protected spaces block landing. Pieces may pass over occupied spaces.</span>
            <small>The original Panchi finishing-stem condition is enforced: a player must have captured at least one rival before entering the D-to-L inner route.</small>
          </div>
          <button className="bti-rules-start" onClick={() => startGame("practice")}>Start Practice</button>
        </article>
      </section>
    );
  }

  if (screen === "drill") {
    const drillState = drillResult?.state || drillBase;
    return (
      <section className="bti-game bti-drill" aria-label="Break the Ice daily drill">
        <header className="bti-game-header"><button onClick={() => setScreen("menu")}>← Menu</button><div><p>MODERN COWRIE DRILL</p><h1>Choose the strongest runner</h1></div><button onClick={openDrill}>Reset</button></header>
        <main className="bti-game-main">
          <CowrieTray roll={drillBase.roll} />
          <div className="bti-turn-banner" data-player="blue"><strong>{drillResult ? drillResult.optimal ? "Perfect route" : "A stronger runner was available" : "Blue rolled 5. Choose one runner."}</strong><span>{drillResult ? `Decision score ${drillResult.score}. Best runner${drillResult.bestPieces.length > 1 ? "s" : ""}: ${drillResult.bestPieces.map(pieceLabel).join(", ")}.` : "Finishing and captures outrank raw distance in this modern practice score."}</span></div>
          <BreakTheIceBoard state={drillState} onPiece={playDrill} interactive={!drillResult} interactivePlayer="blue" />
          {drillResult && <div className="bti-result-actions"><button onClick={openDrill}>Replay Drill</button><button onClick={() => setScreen("menu")}>Return to Menu</button></div>}
        </main>
      </section>
    );
  }

  if (screen === "online") return <BreakTheIceOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;

  const blue = getPlayerSummary(state, "blue");
  const coral = getPlayerSummary(state, "coral");
  const botThinking = mode === "practice" && state.currentPlayer === BOT && !state.winner;
  const canHumanRoll = state.awaiting === "roll" && !botThinking && !state.winner;
  const canHumanMove = state.awaiting === "move" && !botThinking && !state.winner;
  const interactivePlayer = mode === "hotseat" ? state.currentPlayer : HUMAN;

  return (
    <section className="bti-game" aria-label="Break the Ice game">
      <header className="bti-game-header"><button onClick={() => setScreen("menu")}>← Menu</button><div><p>{mode === "practice" ? "PRACTICE VS GLACIER GUIDE" : "LOCAL TWO PLAYER"} · {BREAK_THE_ICE_RULESET.rulesetVersion}</p><h1>Break the Ice</h1></div><button onClick={resetGame}>Restart</button></header>
      <main className="bti-game-main">
        <div className="bti-score-row"><RunnerScore player="coral" summary={coral} active={state.currentPlayer === "coral"} /><div className="bti-turn-medallion"><small>THROW</small><strong>{state.throwCount}</strong><span>TURN {state.turn}</span></div><RunnerScore player="blue" summary={blue} active={state.currentPlayer === "blue"} /></div>
        <CowrieTray roll={state.roll || state.lastRoll} onRoll={castCowries} canRoll={canHumanRoll} busy={botThinking && state.awaiting === "roll"} />
        <div className="bti-turn-banner" data-player={state.currentPlayer}><strong>{botThinking ? state.awaiting === "roll" ? "Glacier Guide is casting…" : "Glacier Guide is choosing a runner…" : describeTurn(state)}</strong><span>{state.winner ? resultDetail(state) : state.awaiting === "move" ? `${state.roll.mouthsUp ?? state.roll.value} mouths up · move ${state.roll.value}${state.roll.bonus ? " · another throw follows" : ""}.` : "Mouths-up cowries determine the complete movement value."}</span></div>
        <BreakTheIceBoard state={state} onPiece={moveRunner} interactive={canHumanMove} interactivePlayer={interactivePlayer} />
        {message && <p className="bti-game-message" role="status">{message}</p>}
        {state.winner && <div className="bti-result-panel"><h2>{resultTitle(state)}</h2><p>{resultDetail(state)}</p><div className="bti-result-actions"><button onClick={resetGame}>Race Again</button><button onClick={() => setScreen("menu")}>Return to Menu</button></div></div>}
      </main>
      <footer className="bti-game-footer"><span>Five cowries · bonus on 0, 1, and 5 · exact finish.</span><span>Single occupancy is a declared digital policy for this versioned ruleset.</span></footer>
    </section>
  );
}

function RunnerScore({ player, summary, active }) {
  return <article className={`bti-runner-score ${player} ${active ? "active" : ""}`}><span aria-hidden="true">{player === "blue" ? "◆" : "◇"}</span><div><strong>{player === "blue" ? "Blue Runners" : "Coral Runners"}</strong><small>{summary.track} racing · {summary.captures} captures</small></div><b>{summary.finished}/5</b></article>;
}

function pieceLabel(pieceId) {
  return `Runner ${pieceId.split("-")[1]}`;
}

function rollSummary(roll, pass) {
  if (!roll) return "";
  if (roll.mouthsUp === 0) return `${runnerLabel(roll.player)} rolled zero mouths up, moves 10, and earns another throw.`;
  if (pass?.reason === "no-legal-runner") return `${runnerLabel(roll.player)} rolled ${roll.value}, but no runner can move${roll.bonus ? "; the bonus throw remains" : ""}.`;
  return `${runnerLabel(roll.player)} rolled ${roll.value}${roll.bonus ? " and earns another throw" : ""}.`;
}

function moveSummary(move) {
  if (!move) return "";
  const parts = [`${runnerLabel(move.player)} moved ${pieceLabel(move.pieceId)} by ${move.value}`];
  if (move.type === "enter") parts.push("entered the board");
  if (move.capturedPieceId) parts.push(`sent ${pieceLabel(move.capturedPieceId)} home`);
  if (move.finished) parts.push("escaped beyond the final space");
  return `${parts.join(" · ")}.`;
}

function runnerLabel(player) {
  return player === "blue" ? "Blue Runners" : "Coral Runners";
}
