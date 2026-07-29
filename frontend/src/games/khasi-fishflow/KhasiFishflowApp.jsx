import { useEffect, useRef, useState } from "react";
import { chooseKhasiFishflowBotAction } from "./bot.js";
import { KhasiFishflowBoard } from "./KhasiFishflowBoard.jsx";
import { KhasiFishflowOnline } from "./KhasiFishflowOnline.jsx";
import { KHASI_FISHFLOW_RULESET, applyAction, createKhasiFishflowState, describeTurn, getCounts, resultDetail, resultTitle } from "./rules.js";

export function KhasiFishflowApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice");
  const [handicap, setHandicap] = useState("none");
  const [state, setState] = useState(() => createKhasiFishflowState({ mode: "practice" }));
  const [message, setMessage] = useState("");
  const botTimer = useRef(null);
  const humanPlayer = "blue";
  const botPlayer = "coral";

  useEffect(() => () => window.clearTimeout(botTimer.current), []);
  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (screen !== "game" || mode !== "practice" || state.winner || state.currentPlayer !== botPlayer) return;
    botTimer.current = window.setTimeout(() => {
      const action = chooseKhasiFishflowBotAction(state, botPlayer);
      if (!action) return;
      const result = applyAction(state, action, botPlayer);
      setState(result.state);
      setMessage(result.error || turnSummary(result.state.lastTurn, "Coral Current"));
    }, 700);
  }, [mode, screen, state]);

  function startGame(nextMode) {
    setMode(nextMode);
    setState(createKhasiFishflowState({ mode: nextMode, starter: "blue", handicap }));
    setMessage("");
    setScreen("game");
  }

  function submitPit(player, pitIndex) {
    if (state.winner || (mode === "practice" && state.currentPlayer !== humanPlayer)) return;
    if (player !== state.currentPlayer) return setMessage("Choose a pit on the active current's side.");
    const result = applyAction(state, { type: "sow", pitIndex }, player);
    setState(result.state);
    setMessage(result.error || turnSummary(result.state.lastTurn, currentLabel(player)));
  }

  function resetGame() {
    setState(createKhasiFishflowState({ mode, starter: "blue", handicap }));
    setMessage("");
  }

  if (screen === "cover") return (
    <section className="fishflow-cover khasi-fishflow" aria-label="Khasi Fishflow cover">
      <button className="fishflow-back-pill" onClick={onExitToLibrary}>← All Games</button>
      <div className="fishflow-aurora" aria-hidden="true"><span /><span /><span /></div>
      <div className="fishflow-cover-board" aria-hidden="true">{Array.from({ length: 14 }, (_, index) => <i key={index}><b>{index % 2 ? "◆◆◆◆◆" : "◆◆◆"}</b></i>)}</div>
      <div className="fishflow-cover-copy"><p>KHASI HILLS · MAWKAR KATIYA</p><h1>KHASI<br />FISHFLOW</h1><span>Relay clockwise. Cut across the opposite pit. Survive a board that loses active fishing grounds.</span><button onClick={() => setScreen("menu")}>Enter the current</button></div>
    </section>
  );

  if (screen === "menu") return (
    <section className="fishflow-menu khasi-fishflow" aria-label="Khasi Fishflow menu">
      <button className="fishflow-back-pill" onClick={() => setScreen("cover")}>← Cover</button>
      <article className="fishflow-menu-card">
        <p className="fishflow-eyebrow">MAWKAR KATIYA · RESEARCH PLAYABLE RULESET</p>
        <h1>Khasi Fishflow</h1>
        <p>Two rows of seven pits begin with five fish each. Sow clockwise, relay from occupied landing pits, capture from the opposite pit after an empty landing, and refill shrinking rows between rounds.</p>
        <label className="khasi-handicap-control">Modern unranked handicap
          <select value={handicap} onChange={(event) => setHandicap(event.target.value)}>
            <option value="none">None</option><option value="blue-pit">Blue receives one pit</option><option value="coral-pit">Coral receives one pit</option>
          </select>
        </label>
        <div className="fishflow-menu-actions"><button className="primary" onClick={() => startGame("practice")}>Practice vs Frost Current</button><button onClick={() => startGame("hotseat")}>Local Two Player</button><button onClick={() => setScreen("online")}>Online Multiplayer</button><button onClick={() => setScreen("rules")}>How to Play</button></div>
        <div className="fishflow-source-note">The exact historical surplus/deficiency handicap clauses still require direct-page transcription from H. C. Das Gupta. This build exposes a separate modern pit-transfer handicap and is not eligible for ranked heritage play.</div>
      </article>
    </section>
  );

  if (screen === "rules") return (
    <section className="fishflow-rules khasi-fishflow" aria-label="Khasi Fishflow rules"><button className="fishflow-back-pill" onClick={() => setScreen("menu")}>← Menu</button><article><p className="fishflow-eyebrow">RESEARCH RULESET · {KHASI_FISHFLOW_RULESET.rulesetVersion}</p><h1>How the Khasi current moves</h1><div className="fishflow-rule-grid"><section><strong>1 · Choose</strong><p>Select a non-empty active pit on your row.</p></section><section><strong>2 · Sow clockwise</strong><p>Pick up every fish and place one into each following active pit.</p></section><section><strong>3 · Relay</strong><p>If the final fish lands in an occupied pit, pick up that pit and continue.</p></section><section><strong>4 · Opposite capture</strong><p>If the final fish lands in an empty pit, bank the fish in the active pit directly opposite.</p></section><section><strong>5 · Refill</strong><p>When one row empties, sweep, then refill from the left with five fish per pit. Unfilled pits become inactive.</p></section><section><strong>6 · Win</strong><p>Win when the opponent owns fewer than five fish and cannot refill one pit.</p></section></div><div className="fishflow-modern-policy"><strong>Evidence gate</strong><span>Opposite-only capture is frozen as a research implementation until the direct historical page is transcribed.</span><small>Modern handicaps are visibly separate from heritage rules.</small></div><button className="fishflow-rules-start" onClick={() => startGame("practice")}>Start Practice</button></article></section>
  );

  if (screen === "online") return <KhasiFishflowOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;

  const counts = getCounts(state);
  const interactivePlayer = mode === "hotseat" ? state.currentPlayer : humanPlayer;
  const waitingForBot = mode === "practice" && state.currentPlayer === botPlayer && !state.winner;
  return (
    <section className="fishflow-game khasi-fishflow" aria-label="Khasi Fishflow game">
      <header className="fishflow-game-header"><button onClick={() => setScreen("menu")}>← Menu</button><div><p>{mode === "practice" ? "PRACTICE" : "LOCAL TWO PLAYER"} · {state.rulesetVersion}</p><h1>Khasi Fishflow</h1></div><button onClick={resetGame}>Restart</button></header>
      <main className="fishflow-game-main"><div className="fishflow-score-row"><CurrentCard player="coral" counts={counts.coral} active={state.currentPlayer === "coral"} /><div className="fishflow-round-medallion"><small>ROUND</small><strong>{state.round}</strong><span>TURN {state.turn}</span></div><CurrentCard player="blue" counts={counts.blue} active={state.currentPlayer === "blue"} /></div><div className="fishflow-turn-banner" data-player={state.currentPlayer}><strong>{waitingForBot ? "Frost Current is tracing the relay…" : describeTurn(state)}</strong><span>{state.winner ? resultDetail(state) : `Clockwise sowing · ${state.handicap.type === "none" ? "No handicap" : `${currentLabel(state.handicap.beneficiary)} received one modern pit-transfer handicap`}.`}</span></div><KhasiFishflowBoard state={state} onPit={submitPit} interactive={!state.winner && !waitingForBot} interactivePlayer={interactivePlayer} />{message && <p className="fishflow-game-message" role="status">{message}</p>}{state.winner && <div className="fishflow-result-panel"><h2>{resultTitle(state)}</h2><p>{resultDetail(state)}</p><div className="fishflow-result-actions"><button onClick={resetGame}>Play Again</button><button onClick={() => setScreen("menu")}>Return to Menu</button></div></div>}</main>
      <footer className="fishflow-game-footer"><span>70 fish remain conserved.</span><span>Research ruleset: unranked until the handicap and capture clauses are source-closed.</span></footer>
    </section>
  );
}

function CurrentCard({ player, counts, active }) { return <article className={`fishflow-current-card ${player} ${active ? "active" : ""}`}><span aria-hidden="true">{player === "blue" ? "◈" : "◇"}</span><div><strong>{currentLabel(player)}</strong><small>{counts.activePits} active pits · {counts.store} stored</small></div><b>{counts.total}</b></article>; }
function currentLabel(player) { return player === "coral" ? "Coral Current" : "Blue Current"; }
function turnSummary(summary, label) { if (!summary) return ""; const parts = [`${label} sowed ${summary.seedsSown} fish`]; if (summary.relays) parts.push(`${summary.relays} relay${summary.relays === 1 ? "" : "s"}`); parts.push(`${summary.captured} fish captured`); if (summary.roundEnded) parts.push(summary.roundAfter > summary.roundBefore ? `round ${summary.roundAfter} opened` : "match completed"); return `${parts.join(" · ")}.`; }
