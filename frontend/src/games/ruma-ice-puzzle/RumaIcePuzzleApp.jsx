import { useMemo, useState } from "react";
import { RUMA_RULESET, applyRumaAction, createRumaState, getLegalActions, recommendedPit, resultDetail, resultTitle } from "./rules.js";

export function RumaIcePuzzleApp({ onExitToLibrary }) {
  const [screen, setScreen] = useState("cover");
  const [state, setState] = useState(() => createRumaState());
  const [message, setMessage] = useState("");
  const [hints, setHints] = useState(false);
  const legal = useMemo(() => new Set(getLegalActions(state).map((a) => a.pitIndex)), [state]);
  const hint = hints && state.status === "playing" ? recommendedPit(state) : null;

  function start() { setState(createRumaState()); setMessage(""); setScreen("game"); }
  function play(pitIndex) {
    const result = applyRumaAction(state, { type: "sow", pitIndex });
    setState(result.state);
    setMessage(result.error || `${result.state.lastMove.sowings} sowing${result.state.lastMove.sowings === 1 ? "" : "s"} · ${result.state.lastMove.wrapped} wrap${result.state.lastMove.wrapped === 1 ? "" : "s"}`);
  }

  if (screen === "cover") return <section className="rp-cover" aria-label="Ruma Ice Puzzle cover"><button onClick={onExitToLibrary}>← All Games</button><div><p>TCHUKA RUMA · SOLITAIRE SOWING</p><h1>RUMA<br/>ICE PUZZLE</h1><span>Guide eight counters through chained sowings and place every one inside the Ruma without freezing in an empty pit.</span><button onClick={() => setScreen("menu")}>Open the puzzle</button></div></section>;
  if (screen === "menu") return <section className="rp-menu" aria-label="Ruma Ice Puzzle menu"><button onClick={() => setScreen("cover")}>← Cover</button><article><p>SOLO · FOUR PITS · ONE RUMA</p><h1>Ruma Ice Puzzle</h1><p>Each ordinary pit begins with two counters. Sow toward the Ruma, wrap when necessary, and chain from every non-empty landing pit. Landing in an empty ordinary pit loses immediately.</p><div><button onClick={start}>Start Classic Puzzle</button><button onClick={() => { setHints(true); start(); }}>Guided Practice</button><button onClick={() => setScreen("rules")}>How to Play</button></div></article></section>;
  if (screen === "rules") return <section className="rp-rules" aria-label="Ruma Ice Puzzle rules"><button onClick={() => setScreen("menu")}>← Menu</button><article><h1>Tchuka Ruma</h1><p>Pick up every counter from one ordinary pit and sow rightward. Continue from the first pit after passing the Ruma. When the last counter lands in a non-empty ordinary pit, lift that pit and continue. A last counter in the Ruma ends the move safely. A last counter in an empty ordinary pit loses. Win by moving all eight counters into the Ruma.</p><button onClick={start}>Start Puzzle</button></article></section>;

  return <section className="rp-game" aria-label="Ruma Ice Puzzle game"><header><button onClick={() => setScreen("menu")}>← Menu</button><div><p>{RUMA_RULESET.rulesetVersion}</p><h1>Ruma Ice Puzzle</h1></div><button onClick={start}>Reset</button></header><main><div className="rp-board">{state.pits.map((count,index)=><button key={index} disabled={!legal.has(index)} className={hint === index ? "hint" : ""} onClick={()=>play(index)} aria-label={`Ice pit ${index+1} with ${count} counters${hint===index?", suggested move":""}`}><span>{count}</span><small>PIT {index+1}</small></button>)}<div className="rp-ruma" aria-label={`Ruma with ${state.ruma} counters`}><span>{state.ruma}</span><small>RUMA</small></div></div><div className="rp-status"><strong>{resultTitle(state)}</strong><span>{state.status === "playing" ? message || "Choose a non-empty pit." : resultDetail(state)}</span></div><div className="rp-actions"><button onClick={()=>setHints((value)=>!value)}>{hints ? "Hide hint" : "Show hint"}</button>{state.status !== "playing" && <button onClick={start}>Try Again</button>}</div></main></section>;
}
