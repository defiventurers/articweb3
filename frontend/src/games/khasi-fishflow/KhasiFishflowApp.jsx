import { useEffect, useRef, useState } from "react";
import { chooseKhasiFishflowBotAction } from "./bot.js";
import { KhasiFishflowBoard, KhasiScore } from "./KhasiFishflowBoard.jsx";
import { KhasiFishflowOnline } from "./KhasiFishflowOnline.jsx";
import { KHASI_FISHFLOW_RULESET, actionSummary, applyAction, createKhasiCaptureDrill, createKhasiFishflowState, describeTurn, getLegalActions, resultDetail, resultTitle, sideName } from "./rules.js";

export function KhasiFishflowApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice-aurora");
  const [state, setState] = useState(() => createKhasiFishflowState({ mode: "practice-aurora" }));
  const [message, setMessage] = useState("");
  const botTimer = useRef(null);
  const humanSide = mode === "practice-ember" ? "ember" : "aurora";
  const botSide = humanSide === "aurora" ? "ember" : "aurora";
  const localOpen = mode === "hotseat" || mode === "drill";

  useEffect(() => () => clearTimeout(botTimer.current), []);
  useEffect(() => {
    clearTimeout(botTimer.current);
    if (screen !== "game" || localOpen || state.winner || state.currentPlayer !== botSide) return;
    botTimer.current = setTimeout(() => {
      const action = chooseKhasiFishflowBotAction(state, botSide);
      if (!action) return;
      const result = applyAction(state, action, botSide);
      setState(result.state);
      setMessage(result.error || actionSummary(result.state.lastMove));
    }, 520);
  }, [screen, state, botSide, localOpen]);

  function start(nextMode) {
    setMode(nextMode);
    const next = nextMode === "drill" ? createKhasiCaptureDrill() : createKhasiFishflowState({ mode: nextMode });
    setState(next);
    setMessage(nextMode === "drill" ? next.lastMove.summary : "");
    setScreen("game");
  }
  function play(action) {
    const result = applyAction(state, action, state.currentPlayer);
    setState(result.state);
    setMessage(result.error || actionSummary(result.state.lastMove));
  }

  if (screen === "cover") return <section className="kf-cover" aria-label="Khasi Fishflow cover"><button className="kf-back" onClick={onExitToLibrary}>← All Games</button><div className="kf-cover-art" aria-hidden="true"><div className="kf-cover-board">{Array.from({ length: 14 }, (_, i) => <i key={i}><b>{i % 2 ? 5 : 4}</b></i>)}</div><div className="kf-cover-mascots">🐧<span>↻</span>🐧</div></div><div className="kf-cover-copy"><p>MAWKAR KATIYA · KHASI HILLS</p><h1>KHASI<br />FISHFLOW</h1><span>Relay through fourteen pits, stop beside an empty house, capture across the river, then survive shrinking handicap rounds.</span><button onClick={() => setScreen("menu")}>Enter the river board</button></div></section>;

  if (screen === "menu") return <section className="kf-menu" aria-label="Khasi Fishflow menu"><button className="kf-back" onClick={() => setScreen("cover")}>← Cover</button><article><p className="kf-eyebrow">MAWKAR KATIYA · RELAY SOWING</p><h1>Khasi Fishflow</h1><p>Five stones open every pit. A relay lifts the next occupied pit, while a gap captures from the opposite row. Later rounds remove empty pits and add automatic handicap captures.</p><div className="kf-menu-actions"><button className="primary" onClick={() => setScreen("online")}>Online Multiplayer</button><button onClick={() => start("practice-aurora")}>Practice as Aurora</button><button onClick={() => start("practice-ember")}>Practice as Ember</button><button onClick={() => start("hotseat")}>Local Two Player</button><button onClick={() => start("drill")}>Opposite Capture Drill</button><button onClick={() => setScreen("rules")}>How to Play</button></div><div className="kf-source-note">Ruleset: {KHASI_FISHFLOW_RULESET.rulesetVersion}. Handicap timing and simultaneous trigger order are declared digital policies where the recovered description is terse.</div></article></section>;

  if (screen === "online") return <KhasiFishflowOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;
  if (screen === "rules") return <Rules onBack={() => setScreen("menu")} onStart={() => start("practice-aurora")} />;

  const humanCanAct = !state.winner && (localOpen || state.currentPlayer === humanSide);
  const legal = humanCanAct ? getLegalActions(state, state.currentPlayer) : [];
  const botThinking = !localOpen && state.currentPlayer === botSide && !state.winner;
  return <section className="kf-game" aria-label={mode === "drill" ? "Khasi Fishflow capture drill" : "Khasi Fishflow game"}><header><button onClick={() => setScreen("menu")}>← Menu</button><div><p>{KHASI_FISHFLOW_RULESET.rulesetVersion}</p><h1>Khasi Fishflow</h1></div><button onClick={() => start(mode)}>New Match</button></header><main><KhasiScore state={state} /><div className="kf-turn"><strong>{state.winner ? resultTitle(state) : botThinking ? `${sideName(botSide)} is reading the current…` : describeTurn(state)}</strong><span>{state.winner ? resultDetail(state) : `${legal.length} legal starting pit${legal.length === 1 ? "" : "s"}`}</span></div><KhasiFishflowBoard state={state} legalActions={legal} onAction={play} interactive={humanCanAct && !botThinking} />{message && <p className="kf-message" role="alert">{message}</p>}{state.winner && <div className="kf-results"><button onClick={() => start(mode)}>Play Again</button><button onClick={() => setScreen("menu")}>Main Menu</button></div>}</main><footer><span>Mode: {modeLabel(mode)}</span><span>70 stones · clockwise relay · inactive pits · handicap triggers</span></footer></section>;
}

function Rules({ onBack, onStart }) {
  return <section className="kf-rules" aria-label="Khasi Fishflow rules"><button className="kf-back" onClick={onBack}>← Menu</button><article><p className="kf-eyebrow">HOW TO PLAY</p><h1>Khasi Fishflow</h1><div className="kf-rule-grid"><section><strong>1 · Choose</strong><p>Select a non-empty active pit on your own row. Later-round partial handicap pits cannot be selected by their owner.</p></section><section><strong>2 · Relay</strong><p>Sow clockwise. When the hand empties, lift every stone from the next occupied pit and continue from the following pit.</p></section><section><strong>3 · Capture</strong><p>If the next pit is empty, stop and capture every stone from the pit directly opposite that empty pit.</p></section><section><strong>4 · New round</strong><p>Use captured stones to refill your row with five per pit from the left. Partial and empty pits create the handicap layout.</p></section><section><strong>5 · Handicap</strong><p>During the rival turn, a pit that reaches your handicap value is captured automatically. The full-row player taxes the rival partial pit.</p></section><section><strong>6 · Win</strong><p>Rounds continue until one player owns all seventy stones, including stones held outside the board as reserves.</p></section></div><div className="kf-policy"><strong>Digital timing</strong><span>Automatic handicap capture is checked after each individual sowed stone. Only the pit just changed is tested, producing deterministic online validation.</span></div><button onClick={onStart}>Guide Aurora Current</button></article></section>;
}

function modeLabel(mode) { if (mode === "hotseat") return "Local Two Player"; if (mode === "drill") return "Opposite Capture Drill"; return mode === "practice-ember" ? "Practice as Ember" : "Practice as Aurora"; }
