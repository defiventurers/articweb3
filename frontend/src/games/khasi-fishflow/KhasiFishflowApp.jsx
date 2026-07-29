import { useEffect, useRef, useState } from "react";
import { chooseKhasiBotAction } from "./bot.js";
import { KHASI_FISHFLOW_RULESET, actionSummary, applyAction, createKhasiFishflowState, getCounts, getLegalActions, resultDetail, resultTitle } from "./rules.js";

export function KhasiFishflowApp({ onExitToLibrary }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice-aurora");
  const [state, setState] = useState(() => createKhasiFishflowState());
  const [message, setMessage] = useState("");
  const botTimer = useRef(null);
  const human = mode === "practice-ember" ? "ember" : "aurora";
  const bot = human === "aurora" ? "ember" : "aurora";
  const local = mode === "hotseat";

  useEffect(() => () => clearTimeout(botTimer.current), []);
  useEffect(() => {
    clearTimeout(botTimer.current);
    if (screen !== "game" || local || state.winner || state.currentPlayer !== bot) return;
    botTimer.current = setTimeout(() => {
      const action = chooseKhasiBotAction(state, bot);
      if (!action) return;
      const result = applyAction(state, action, bot);
      setState(result.state);
      setMessage(result.error || actionSummary(result.state));
    }, 500);
  }, [bot, local, screen, state]);

  function start(nextMode) {
    setMode(nextMode);
    setState(createKhasiFishflowState({ mode: nextMode, starter: "aurora" }));
    setMessage("");
    setScreen("game");
  }
  function play(action) {
    const result = applyAction(state, action, state.currentPlayer);
    setState(result.state);
    setMessage(result.error || actionSummary(result.state));
  }

  if (screen === "cover") return <section className="kf-cover" aria-label="Khasi Fishflow cover"><button onClick={onExitToLibrary}>← All Games</button><div><p>MAWKAR KATIYA · KHASI HILLS</p><h1>KHASI<br/>FISHFLOW</h1><span>Relay through fourteen ice pools, capture across an empty gap and survive shrinking handicap rounds.</span><button onClick={() => setScreen("menu")}>Enter the pools</button></div></section>;
  if (screen === "menu") return <section className="kf-menu" aria-label="Khasi Fishflow menu"><button onClick={() => setScreen("cover")}>← Cover</button><article><p>MAWKAR KATIYA · 2×7 RELAY SOWING</p><h1>Khasi Fishflow</h1><p>Five stones begin in every pit. Relay from the next occupied pit; when the next pit is empty, capture the opposite pit. Later rounds introduce inactive pits and traditional handicap targets.</p><div><button onClick={() => start("practice-aurora")}>Practice as Aurora</button><button onClick={() => start("practice-ember")}>Practice as Ember</button><button onClick={() => start("hotseat")}>Local Two Player</button><button onClick={() => setScreen("rules")}>How to Play</button></div></article></section>;
  if (screen === "rules") return <section className="kf-rules" aria-label="Khasi Fishflow rules"><button onClick={() => setScreen("menu")}>← Menu</button><article><h1>Mawkar Katiya</h1><p>Choose a non-empty pit on your row. Sow clockwise. When your hand empties, lift the following occupied pit and continue. When the following pit is empty, capture the stones in the opposite pit. At round end, refill five stones per pit from the left; incomplete and empty pits create the Khasi handicap structure.</p><button onClick={() => start("practice-aurora")}>Start Practice</button></article></section>;

  const legal = (!state.winner && (local || state.currentPlayer === human)) ? getLegalActions(state) : [];
  const legalKeys = new Set(legal.map((a) => `${state.currentPlayer}:${a.pitIndex}`));
  const counts = getCounts(state);
  return <section className="kf-game" aria-label="Khasi Fishflow game"><header><button onClick={() => setScreen("menu")}>← Menu</button><div><p>{KHASI_FISHFLOW_RULESET.rulesetVersion}</p><h1>Khasi Fishflow</h1></div><button onClick={() => start(mode)}>New Match</button></header><main><aside><strong>Aurora</strong><span>{counts.aurora.store} captured</span><span>{counts.aurora.active} active pits</span></aside><div className="kf-board"><div className="kf-row ember">{state.rows.ember.map((count,index)=><button key={index} disabled={!legalKeys.has(`ember:${index}`)} onClick={()=>play({type:"sow",pitIndex:index})} aria-label={`Ember pit ${index+1} with ${count} stones`}>{count}<small>{index>=state.activePits.ember?"frozen":""}</small></button>)}</div><div className="kf-flow">CLOCKWISE RELAY · ROUND {state.round}</div><div className="kf-row aurora">{state.rows.aurora.map((count,index)=><button key={index} disabled={!legalKeys.has(`aurora:${index}`)} onClick={()=>play({type:"sow",pitIndex:index})} aria-label={`Aurora pit ${index+1} with ${count} stones`}>{count}<small>{index>=state.activePits.aurora?"frozen":""}</small></button>)}</div><div className="kf-status"><strong>{state.winner ? resultTitle(state) : `${state.currentPlayer === "aurora" ? "Aurora" : "Ember"} chooses a pit`}</strong><span>{state.winner ? resultDetail(state) : message || "Relay until the following pit is empty."}</span></div></div><aside><strong>Ember</strong><span>{counts.ember.store} captured</span><span>{counts.ember.active} active pits</span></aside></main></section>;
}
