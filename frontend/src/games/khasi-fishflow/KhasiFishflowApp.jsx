import { useEffect, useRef, useState } from "react";
import { chooseKhasiFishflowBotAction } from "./bot.js";
import { KhasiFishflowBoard } from "./KhasiFishflowBoard.jsx";
import { KhasiFishflowOnline } from "./KhasiFishflowOnline.jsx";
import { KHASI_FISHFLOW_RULESET, actionSummary, applyAction, createKhasiFishflowState, createKhasiHandicapDrill, describeTurn, getLegalActions, resultDetail, resultTitle } from "./rules.js";

export function KhasiFishflowApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice-blue");
  const [state, setState] = useState(() => createKhasiFishflowState());
  const [message, setMessage] = useState("");
  const botTimer = useRef(null);
  const humanSide = mode === "practice-coral" ? "coral" : "blue";
  const botSide = humanSide === "blue" ? "coral" : "blue";
  const localOpen = ["hotseat", "drill"].includes(mode);

  useEffect(() => () => window.clearTimeout(botTimer.current), []);
  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (screen !== "game" || localOpen || state.winner || state.currentPlayer !== botSide) return;
    botTimer.current = window.setTimeout(() => {
      const action = chooseKhasiFishflowBotAction(state, botSide);
      if (!action) return;
      const result = applyAction(state, action, botSide);
      setState(result.state);
      setMessage(result.error || actionSummary(result.state.lastTurn, botSide));
    }, 520);
  }, [botSide, localOpen, screen, state]);

  function start(nextMode) {
    setMode(nextMode);
    const next = nextMode === "drill" ? createKhasiHandicapDrill() : createKhasiFishflowState({ mode: nextMode });
    setState(next);
    setMessage(nextMode === "drill" ? "Sow Blue pit 1. The relay enters Coral's partial pit and triggers the handicap toll." : "");
    setScreen("game");
  }
  function play(action) {
    const player = state.currentPlayer;
    const result = applyAction(state, action, player);
    setState(result.state);
    setMessage(result.error || actionSummary(result.state.lastTurn, player));
  }

  if (screen === "cover") return <section className="kf-cover" aria-label="Khasi Fishflow cover"><button className="kf-back" onClick={onExitToLibrary}>← All Games</button><div className="kf-cover-art" aria-hidden="true"><div className="kf-river">{Array.from({ length: 14 }, (_, i) => <i key={i} />)}</div><div className="kf-mountain">KHASI HIGHLANDS</div></div><div className="kf-cover-copy"><p>MAWKAR KATIYA · KHASI · CHERRAPUNJI</p><h1>KHASI<br />FISHFLOW</h1><span>Relay through fourteen ice pools, capture across the empty gap and survive shrinking rounds with living handicap marks.</span><button onClick={() => setScreen("menu")}>Follow the highland current</button></div></section>;

  if (screen === "menu") return <section className="kf-menu" aria-label="Khasi Fishflow menu"><button className="kf-back" onClick={() => setScreen("cover")}>← Cover</button><article><p>SECOND SOWING RELEASE · MULTI-ROUND</p><h1>Khasi Fishflow</h1><span>Five stones begin in every pit. Relay from the next occupied pit, capture opposite the stopping gap, then refill from captured inventory as pits freeze out.</span><div className="kf-actions"><button className="primary" onClick={() => setScreen("online")}>Online Multiplayer</button><button onClick={() => start("practice-blue")}>Practice as Blue</button><button onClick={() => start("practice-coral")}>Practice as Coral</button><button onClick={() => start("hotseat")}>Local Two Player</button><button onClick={() => start("drill")}>Handicap Current Drill</button><button onClick={() => setScreen("rules")}>How to Play</button></div><small>Ruleset: {KHASI_FISHFLOW_RULESET.rulesetVersion}. The unusual reserve, partial-pit and equal-count handicap clauses remain visible in the interface.</small></article></section>;

  if (screen === "online") return <KhasiFishflowOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;
  if (screen === "rules") return <Rules onBack={() => setScreen("menu")} onStart={() => start("practice-blue")} />;

  const canAct = !state.winner && (localOpen || state.currentPlayer === humanSide);
  const legalActions = canAct ? getLegalActions(state, state.currentPlayer) : [];
  return <section className="kf-game" aria-label={mode === "drill" ? "Khasi Fishflow handicap drill" : "Khasi Fishflow game"}><header><button onClick={() => setScreen("menu")}>← Menu</button><div><p>{KHASI_FISHFLOW_RULESET.rulesetVersion}</p><h1>Khasi Fishflow</h1></div><button onClick={() => start(mode)}>New Match</button></header><main><div className="kf-banner"><strong>{state.winner ? resultTitle(state) : describeTurn(state)}</strong><span>{state.winner ? resultDetail(state) : `Round ${state.round} · Turn ${state.turn}`}</span></div><KhasiFishflowBoard state={state} legalActions={legalActions} onAction={play} interactive={canAct} />{message && <p className="kf-message" role="alert">{message}</p>}{state.winner && <div className="kf-result"><button onClick={() => start(mode)}>Play Again</button><button onClick={() => setScreen("menu")}>Menu</button></div>}</main><footer><span>Mode: {modeLabel(mode)}</span><span>2×7 pits · 5 stones each · clockwise relay · opposite capture · inactive pits</span></footer></section>;
}

function Rules({ onBack, onStart }) {
  return <section className="kf-rules" aria-label="Khasi Fishflow rules"><button className="kf-back" onClick={onBack}>← Menu</button><article><p>HOW TO PLAY · DAS GUPTA 1923</p><h1>Mawkar Katiya</h1><div className="kf-rule-grid"><section><strong>1 · Choose your row</strong><span>Start from any non-empty active pit on your own row. A protected partial handicap pit may be unavailable to its owner.</span></section><section><strong>2 · Sow clockwise</strong><span>Drop one stone into every active pit along the fourteen-pit circuit.</span></section><section><strong>3 · Relay from the next pit</strong><span>When the hand empties, lift the contents of the immediately following occupied pit and continue.</span></section><section><strong>4 · Capture across the gap</strong><span>When the following pit is empty, stop and capture the stones directly opposite that empty pit.</span></section><section><strong>5 · Refill and freeze</strong><span>At round end, refill pits from the left with five stones. Unfilled pits become inactive; a remainder creates a partial pit.</span></section><section><strong>6 · Handicap marks</strong><span>Reserve and deficient counts create automatic equal-count captures. The stronger player also siphons stones entering the opponent's partial pit.</span></section></div><div className="kf-policy"><strong>Source boundary</strong><span>This queue follows the Khasi Cherrapunji account and does not import Pallanguzhi exact-four pickups or another mancala capture rule.</span></div><button onClick={onStart}>Guide Blue Current</button></article></section>;
}
function modeLabel(mode) { return mode === "hotseat" ? "Local Two Player" : mode === "drill" ? "Handicap Current Drill" : mode === "practice-coral" ? "Practice as Coral" : "Practice as Blue"; }
