import { useEffect, useMemo, useRef, useState } from "react";
import { chooseFishflowBotAction } from "./bot.js";
import { FishflowBoard } from "./FishflowBoard.jsx";
import { FishflowOnline } from "./FishflowOnline.jsx";
import {
  FISHFLOW_RULESET,
  applyAction,
  bestDailyPitIndexes,
  createDailyFishflowPuzzle,
  createFishflowState,
  describeTurn,
  getCounts,
  resultDetail,
  resultTitle,
  scoreTurn
} from "./rules.js";

export function FishflowApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice");
  const [state, setState] = useState(() => createFishflowState({ mode: "practice" }));
  const [message, setMessage] = useState("");
  const [dailyBase, setDailyBase] = useState(() => createDailyFishflowPuzzle());
  const [dailyResult, setDailyResult] = useState(null);
  const botTimer = useRef(null);

  const humanPlayer = "blue";
  const botPlayer = "coral";

  useEffect(() => () => window.clearTimeout(botTimer.current), []);
  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (screen !== "game" || mode !== "practice" || state.winner || state.currentPlayer !== botPlayer) return;
    botTimer.current = window.setTimeout(() => {
      const action = chooseFishflowBotAction(state, botPlayer);
      if (!action) return;
      const result = applyAction(state, action, botPlayer);
      setState(result.state);
      setMessage(result.error || turnSummary(result.state.lastTurn, "Coral Current"));
    }, 720);
  }, [mode, screen, state]);

  function startGame(nextMode) {
    setMode(nextMode);
    setState(createFishflowState({ mode: nextMode, starter: "blue" }));
    setMessage("");
    setScreen("game");
  }

  function submitPit(player, pitIndex) {
    if (state.winner) return;
    if (mode === "practice" && state.currentPlayer !== humanPlayer) return;
    if (player !== state.currentPlayer) return setMessage("Choose a pit on the active current's side.");
    const result = applyAction(state, { type: "sow", pitIndex }, player);
    setState(result.state);
    setMessage(result.error || turnSummary(result.state.lastTurn, player === "blue" ? "Blue Current" : "Coral Current"));
  }

  function resetGame() {
    setState(createFishflowState({ mode, starter: "blue" }));
    setMessage("");
  }

  function openDaily() {
    setDailyBase(createDailyFishflowPuzzle());
    setDailyResult(null);
    setScreen("daily");
  }

  function playDailyPit(player, pitIndex) {
    if (dailyResult || player !== dailyBase.currentPlayer) return;
    const action = { type: "sow", pitIndex };
    const score = scoreTurn(dailyBase, action, player);
    const result = applyAction(dailyBase, action, player);
    const bestPits = bestDailyPitIndexes(dailyBase);
    setDailyResult({ state: result.state, score, bestPits, chosen: pitIndex, optimal: bestPits.includes(pitIndex) });
  }

  if (screen === "cover") {
    return (
      <section className="fishflow-cover" aria-label="Fishflow cover">
        <button className="fishflow-back-pill" onClick={onExitToLibrary}>← All Games</button>
        <div className="fishflow-aurora" aria-hidden="true"><span /><span /><span /></div>
        <div className="fishflow-cover-board" aria-hidden="true">
          {Array.from({ length: 14 }, (_, index) => <i key={index}><b>{index % 3 === 0 ? "◆◆◆◆◆◆" : "◆◆◆◆"}</b></i>)}
        </div>
        <div className="fishflow-cover-copy">
          <p>TAMIL PALLANGUZHI · DURAI 1928</p>
          <h1>FISH<br />FLOW</h1>
          <span>Read the current. Trigger exact-four shoals. Carry your catch across shrinking rounds.</span>
          <button onClick={() => setScreen("menu")}>Follow the current</button>
        </div>
      </section>
    );
  }

  if (screen === "menu") {
    return (
      <section className="fishflow-menu" aria-label="Fishflow menu">
        <button className="fishflow-back-pill" onClick={() => setScreen("cover")}>← Cover</button>
        <article className="fishflow-menu-card">
          <p className="fishflow-eyebrow">PALLANGUZHI · NAMED DURAI 1928 VARIANT</p>
          <h1>Fishflow</h1>
          <p>Choose a pit, sow anticlockwise, relay through occupied pits and bank every exact group of four. The board contracts as each current loses fish between rounds.</p>
          <div className="fishflow-menu-actions">
            <button className="primary" onClick={() => startGame("practice")}>Practice vs Frost Current</button>
            <button onClick={() => startGame("hotseat")}>Local Two Player</button>
            <button onClick={openDaily}>Daily Flow Puzzle</button>
            <button onClick={() => setScreen("online")}>Online Multiplayer</button>
            <button onClick={() => setScreen("rules")}>How to Play</button>
          </div>
          <div className="fishflow-source-note">
            Heritage mode implements the complete 2×7, six-counter Pallanguzhi ruleset documented by H. G. Durai in 1928. It is not presented as a universal blend of every Pallanguzhi tradition.
          </div>
        </article>
      </section>
    );
  }

  if (screen === "rules") {
    return (
      <section className="fishflow-rules" aria-label="Fishflow rules">
        <button className="fishflow-back-pill" onClick={() => setScreen("menu")}>← Menu</button>
        <article>
          <p className="fishflow-eyebrow">HERITAGE RULES</p>
          <h1>How the current moves</h1>
          <div className="fishflow-rule-grid">
            <section><strong>1 · Choose</strong><p>Select any non-empty active pit on your own row.</p></section>
            <section><strong>2 · Sow</strong><p>Pick up every fish and sow one into each following active pit, anticlockwise.</p></section>
            <section><strong>3 · Exact four</strong><p>Whenever a pit reaches exactly four while sowing, bank those four immediately and keep sowing the fish still in hand.</p></section>
            <section><strong>4 · Relay</strong><p>When the final fish lands in an occupied pit, pick up that pit and continue from the next pit.</p></section>
            <section><strong>5 · Empty landing</strong><p>When the final fish lands in an empty pit, bank every fish in the next active pit and end the turn.</p></section>
            <section><strong>6 · Shrinking rounds</strong><p>When one side empties, sweep the opponent's remaining row. Refill from each player's left with six per pit; unfilled pits freeze.</p></section>
          </div>
          <div className="fishflow-modern-policy">
            <strong>Victory</strong>
            <span>The match ends when a player owns fewer than six fish and cannot refill even one pit for the next round.</span>
            <small>The Daily Flow score is a modern practice metric. It does not change heritage match scoring.</small>
          </div>
          <button className="fishflow-rules-start" onClick={() => startGame("practice")}>Start Practice</button>
        </article>
      </section>
    );
  }

  if (screen === "daily") {
    const puzzleState = dailyResult?.state || dailyBase;
    const playerLabel = dailyBase.currentPlayer === "blue" ? "Blue Current" : "Coral Current";
    return (
      <section className="fishflow-game fishflow-daily" aria-label="Fishflow daily puzzle">
        <header className="fishflow-game-header">
          <button onClick={() => setScreen("menu")}>← Menu</button>
          <div><p>MODERN DAILY FLOW · {new Date().toLocaleDateString()}</p><h1>Find the strongest current</h1></div>
          <button onClick={openDaily}>Reset</button>
        </header>
        <main className="fishflow-game-main">
          <div className="fishflow-turn-banner" data-player={dailyBase.currentPlayer}>
            <strong>{dailyResult ? dailyResult.optimal ? "Perfect current" : "A stronger route was available" : `${playerLabel}: choose one pit`}</strong>
            <span>{dailyResult ? `Turn score ${dailyResult.score}. Best pit${dailyResult.bestPits.length > 1 ? "s" : ""}: ${dailyResult.bestPits.map((pit) => pit + 1).join(", ")}.` : "The score rewards captured fish first, then exact-four pickups and relay depth."}</span>
          </div>
          <FishflowBoard state={puzzleState} onPit={playDailyPit} interactive={!dailyResult} interactivePlayer={dailyBase.currentPlayer} />
          {dailyResult && <div className="fishflow-result-actions"><button onClick={openDaily}>Replay Today's Flow</button><button onClick={() => setScreen("menu")}>Return to Menu</button></div>}
        </main>
      </section>
    );
  }

  if (screen === "online") {
    return <FishflowOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;
  }

  const counts = getCounts(state);
  const interactivePlayer = mode === "hotseat" ? state.currentPlayer : humanPlayer;
  const waitingForBot = mode === "practice" && state.currentPlayer === botPlayer && !state.winner;
  const lastPlayer = state.history.at(-1)?.player;

  return (
    <section className="fishflow-game" aria-label="Fishflow game">
      <header className="fishflow-game-header">
        <button onClick={() => setScreen("menu")}>← Menu</button>
        <div><p>{mode === "practice" ? "PRACTICE VS FROST CURRENT" : "LOCAL TWO PLAYER"} · {FISHFLOW_RULESET.rulesetVersion}</p><h1>Fishflow</h1></div>
        <button onClick={resetGame}>Restart</button>
      </header>
      <main className="fishflow-game-main">
        <div className="fishflow-score-row">
          <CurrentCard player="coral" counts={counts.coral} active={state.currentPlayer === "coral"} />
          <div className="fishflow-round-medallion"><small>ROUND</small><strong>{state.round}</strong><span>TURN {state.turn}</span></div>
          <CurrentCard player="blue" counts={counts.blue} active={state.currentPlayer === "blue"} />
        </div>
        <div className="fishflow-turn-banner" data-player={state.currentPlayer}>
          <strong>{waitingForBot ? "Frost Current is calculating the relay…" : describeTurn(state)}</strong>
          <span>{state.winner ? resultDetail(state) : `Starting current this round: ${state.roundStarter === "blue" ? "Blue" : "Coral"}. Active pits refill from each player's left.`}</span>
        </div>
        <FishflowBoard state={state} onPit={submitPit} interactive={!state.winner && !waitingForBot} interactivePlayer={interactivePlayer} />
        {message && <p className="fishflow-game-message" role="status">{message}</p>}
        {state.lastTurn && !message && <p className="fishflow-game-message">{turnSummary(state.lastTurn, lastPlayer === "blue" ? "Blue Current" : "Coral Current")}</p>}
        {state.winner && (
          <div className="fishflow-result-panel">
            <h2>{resultTitle(state)}</h2>
            <p>{resultDetail(state)}</p>
            <div className="fishflow-result-actions"><button onClick={resetGame}>Play Again</button><button onClick={() => setScreen("menu")}>Return to Menu</button></div>
          </div>
        )}
      </main>
      <footer className="fishflow-game-footer"><span>84 fish remain conserved across the board and stores.</span><span>Exact-four pickups, relay sowing and round refills are resolved by the same pure rules engine.</span></footer>
    </section>
  );
}

function CurrentCard({ player, counts, active }) {
  return (
    <article className={`fishflow-current-card ${player} ${active ? "active" : ""}`}>
      <span aria-hidden="true">{player === "blue" ? "◈" : "◇"}</span>
      <div><strong>{player === "blue" ? "Blue Current" : "Coral Current"}</strong><small>{counts.activePits} active pits · {counts.store} stored</small></div>
      <b>{counts.total}</b>
    </article>
  );
}

function turnSummary(summary, playerLabel) {
  if (!summary) return "";
  const parts = [`${playerLabel} sowed ${summary.seedsSown} fish`];
  if (summary.exactFourPickups) parts.push(`${summary.exactFourPickups} exact-four pickup${summary.exactFourPickups === 1 ? "" : "s"}`);
  if (summary.relays) parts.push(`${summary.relays} relay${summary.relays === 1 ? "" : "s"}`);
  parts.push(`${summary.captured} fish banked`);
  if (summary.roundEnded) parts.push(summary.roundAfter > summary.roundBefore ? `round ${summary.roundAfter} opened` : "match completed");
  return `${parts.join(" · ")}.`;
}
