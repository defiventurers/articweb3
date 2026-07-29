import { useEffect, useRef, useState } from "react";
import { chooseKhasiFishflowBotAction } from "./bot.js";
import { KhasiFishflowBoard } from "./KhasiFishflowBoard.jsx";
import { KhasiFishflowOnline } from "./KhasiFishflowOnline.jsx";
import {
  KHASI_FISHFLOW_RULESET,
  applyAction,
  createKhasiCaptureDrill,
  createKhasiFishflowState,
  describeTurn,
  getCounts,
  resultDetail,
  resultTitle
} from "./rules.js";

export function KhasiFishflowApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice");
  const [state, setState] = useState(() => createKhasiFishflowState({ mode: "practice" }));
  const [message, setMessage] = useState("");
  const botTimer = useRef(null);
  const human = "aurora";
  const bot = "ember";

  useEffect(() => () => window.clearTimeout(botTimer.current), []);
  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (screen !== "game" || mode !== "practice" || state.winner || state.currentPlayer !== bot) return;
    botTimer.current = window.setTimeout(() => {
      const action = chooseKhasiFishflowBotAction(state, bot);
      if (!action) return;
      const result = applyAction(state, action, bot);
      setState(result.state);
      setMessage(result.error || turnSummary(result.state.lastTurn, "Ember Current"));
    }, 620);
  }, [mode, screen, state]);

  function start(nextMode) {
    setMode(nextMode);
    const next = nextMode === "drill" ? createKhasiCaptureDrill() : createKhasiFishflowState({ mode: nextMode, starter: "aurora" });
    setState(next);
    setMessage(nextMode === "drill" ? "Choose Aurora pit 1. The relay crosses an empty landing and captures five opposite stones." : "");
    setScreen("game");
  }

  function submitPit(player, pitIndex) {
    if (state.winner || player !== state.currentPlayer) return;
    if (mode === "practice" && player !== human) return;
    const result = applyAction(state, { type: "sow", pitIndex }, player);
    setState(result.state);
    setMessage(result.error || turnSummary(result.state.lastTurn, player === "aurora" ? "Aurora Current" : "Ember Current"));
  }

  if (screen === "cover") return (
    <section className="kf-cover" aria-label="Khasi Fishflow cover">
      <button className="kf-back" onClick={onExitToLibrary}>← All Games</button>
      <div className="kf-cover-art" aria-hidden="true"><div className="kf-terraces">{Array.from({ length: 14 }, (_, index) => <i key={index}>◆◆◆◆◆</i>)}</div><span>❄</span><span>🐧</span></div>
      <div className="kf-cover-copy"><p>MAWKAR KATIYA · KHASI HILLS</p><h1>KHASI<br />FISHFLOW</h1><span>Relay five-stone currents, strike the opposite pit and survive a board that shrinks into a visible handicap.</span><button onClick={() => setScreen("menu")}>Enter the stone terraces</button></div>
    </section>
  );

  if (screen === "menu") return (
    <section className="kf-menu" aria-label="Khasi Fishflow menu"><button className="kf-back" onClick={() => setScreen("cover")}>← Cover</button><article><p>MAWKAR KATIYA · RECOVERED CORE</p><h1>Khasi Fishflow</h1><span>Five stones open every pit. Sow clockwise, relay from occupied landings, capture the opposite pit after an empty landing, then refill across shrinking rounds.</span><div><button className="primary" onClick={() => start("practice")}>Practice vs Ember</button><button onClick={() => start("hotseat")}>Local Two Player</button><button onClick={() => start("drill")}>Opposite Capture Drill</button><button onClick={() => setScreen("online")}>Online Multiplayer</button><button onClick={() => setScreen("rules")}>How to Play</button></div><small>The unusual surplus/deficit clauses in Das Gupta's account remain source-gated. This unranked queue ships only the recovered core and the documented inactive-pit refill handicap.</small></article></section>
  );

  if (screen === "online") return <KhasiFishflowOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;

  if (screen === "rules") return (
    <section className="kf-rules" aria-label="Khasi Fishflow rules"><button className="kf-back" onClick={() => setScreen("menu")}>← Menu</button><article><p>HOW TO PLAY · RECOVERED CORE</p><h1>Mawkar Katiya</h1><div><section><strong>1 · Open with five</strong><span>Two rows of seven pits begin with five stones in each pit.</span></section><section><strong>2 · Sow clockwise</strong><span>Choose a non-empty active pit on your row and sow one stone into each following active pit.</span></section><section><strong>3 · Relay</strong><span>If the last stone lands in a pit that already held stones, lift that pit and continue.</span></section><section><strong>4 · Opposite capture</strong><span>If the last stone lands in an empty pit, stop and capture the opposite pit. The landing stone remains.</span></section><section><strong>5 · Shrinking handicap</strong><span>At round end, refill from the left with five per pit. Any pit that cannot be filled becomes inactive.</span></section><section><strong>6 · Win the inventory</strong><span>A player who owns fewer than five stones cannot refill a pit and loses.</span></section></div><aside><strong>Source boundary</strong><span>The historical special surplus/deficit handicap clauses are not enabled until the original page is transcribed. This queue is free-play and unranked.</span></aside><button onClick={() => start("practice")}>Start Practice</button></article></section>
  );

  const counts = getCounts(state);
  const waitingForBot = mode === "practice" && state.currentPlayer === bot && !state.winner;
  const interactivePlayer = mode === "practice" ? human : state.currentPlayer;
  return (
    <section className="kf-game" aria-label={mode === "drill" ? "Khasi Fishflow opposite capture drill" : "Khasi Fishflow game"}>
      <header><button onClick={() => setScreen("menu")}>← Menu</button><div><p>{KHASI_FISHFLOW_RULESET.rulesetVersion}</p><h1>Khasi Fishflow</h1></div><button onClick={() => start(mode)}>Restart</button></header>
      <main><div className="kf-score"><Score player="ember" counts={counts.ember} active={state.currentPlayer === "ember"} /><div><small>ROUND</small><strong>{state.round}</strong><span>TURN {state.turn}</span></div><Score player="aurora" counts={counts.aurora} active={state.currentPlayer === "aurora"} /></div><div className="kf-banner"><strong>{state.winner ? resultTitle(state) : waitingForBot ? "Ember Current is reading the terrace…" : describeTurn(state)}</strong><span>{state.winner ? resultDetail(state) : `${counts.aurora.inactivePits} Aurora and ${counts.ember.inactivePits} Ember pits are inactive.`}</span></div><KhasiFishflowBoard state={state} onPit={submitPit} interactive={!state.winner && !waitingForBot} interactivePlayer={interactivePlayer} />{message && <p className="kf-message" role="status">{message}</p>}{state.winner && <div className="kf-result"><button onClick={() => start(mode)}>Play Again</button><button onClick={() => setScreen("menu")}>Menu</button></div>}</main>
      <footer><span>70 stones conserved across pits and stores.</span><span>Free play · no ranked handicap claims.</span></footer>
    </section>
  );
}

function Score({ player, counts, active }) {
  return <article className={`${player} ${active ? "active" : ""}`}><span>{player === "aurora" ? "❄" : "◆"}</span><div><strong>{player === "aurora" ? "Aurora" : "Ember"}</strong><small>{counts.activePits} active · {counts.store} stored</small></div><b>{counts.total}</b></article>;
}

function turnSummary(summary, label) {
  if (!summary) return "";
  const parts = [`${label} sowed ${summary.seedsSown} stones`];
  if (summary.relays) parts.push(`${summary.relays} relay${summary.relays === 1 ? "" : "s"}`);
  if (summary.captured) parts.push(`captured ${summary.captured} opposite stones`);
  if (summary.roundEnded) parts.push(summary.roundAfter > summary.roundBefore ? `round ${summary.roundAfter} opened` : "match completed");
  return `${parts.join(" · ")}.`;
}
