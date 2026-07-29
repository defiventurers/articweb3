import { useEffect, useMemo, useState } from "react";
import { RUMA_RULESET, applyRumaMove, createRumaState, getHint, getLegalActions, moveSummary, resultDetail, resultTitle, undoRumaMove } from "./rules.js";

export function RumaIcePuzzleApp({ onExitToLibrary }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("classic");
  const [state, setState] = useState(() => createRumaState());
  const [message, setMessage] = useState("");
  const [hint, setHint] = useState(null);
  const [best, setBest] = useState(() => Number(localStorage.getItem("ruma-best") || 0));
  const legal = useMemo(() => getLegalActions(state), [state]);

  useEffect(() => {
    if (state.status !== "won") return;
    if (!best || state.moveCount < best) {
      setBest(state.moveCount);
      localStorage.setItem("ruma-best", String(state.moveCount));
    }
  }, [best, state.moveCount, state.status]);

  function start(nextMode = "classic") {
    setMode(nextMode);
    setState(createRumaState({ mode: nextMode }));
    setHint(null);
    setMessage(nextMode === "guided" ? "Use Hint to reveal only the next winning pit—not the full solution." : "");
    setScreen("game");
  }
  function play(action) {
    const result = applyRumaMove(state, action);
    setState(result.state);
    setHint(null);
    setMessage(result.error || moveSummary(result.state.lastMove));
  }
  function undo() {
    const result = undoRumaMove(state);
    setState(result.state);
    setHint(null);
    setMessage(result.error || "Previous choice restored.");
  }
  function revealHint() {
    const next = getHint(state);
    setHint(next);
    setMessage(next ? `A winning line begins at pit ${next.pitIndex + 1}. ${next.remainingMoves} choices remain.` : "No winning continuation remains. Undo or reset.");
  }

  if (screen === "cover") return <section className="rp-cover" aria-label="Ruma Ice Puzzle cover"><button className="rp-back" onClick={onExitToLibrary}>← All Games</button><div className="rp-cover-board" aria-hidden="true"><div className="rp-ice-pits">{[2,2,2,2].map((n,i)=><i key={i}><b>{n}</b></i>)}<i className="ruma"><b>R</b></i></div><div className="rp-aurora">RUMA</div></div><div className="rp-cover-copy"><p>SOLITAIRE RELAY SOWING · EIGHT STONES</p><h1>RUMA<br />ICE PUZZLE</h1><span>Choose a frozen pit, follow every forced relay and guide all eight stones into the Ruma without ending in an empty chamber.</span><button onClick={() => setScreen("menu")}>Enter the Ruma</button></div></section>;

  if (screen === "menu") return <section className="rp-menu" aria-label="Ruma Ice Puzzle menu"><button className="rp-back" onClick={() => setScreen("cover")}>← Cover</button><article><p>ONE ROW · FOUR PITS · ONE RUMA</p><h1>Ruma Ice Puzzle</h1><span>The opening 2–2–2–2 position has a unique six-choice solution under the classic wrapping and chaining rules.</span><div className="rp-actions"><button className="primary" onClick={() => start("classic")}>Classic Puzzle</button><button onClick={() => start("guided")}>Guided Academy</button><button onClick={() => setScreen("rules")}>How to Play</button></div><small>Personal best: {best ? `${best} choices` : "not solved yet"}</small></article></section>;

  if (screen === "rules") return <Rules onBack={() => setScreen("menu")} onStart={() => start("guided")} />;

  return <section className="rp-game" aria-label="Ruma Ice Puzzle game"><header><button onClick={() => setScreen("menu")}>← Menu</button><div><p>{RUMA_RULESET.rulesetVersion}</p><h1>Ruma Ice Puzzle</h1></div><button onClick={() => start(mode)}>Reset</button></header><main><div className={`rp-status ${state.status}`}><strong>{resultTitle(state)}</strong><span>{resultDetail(state)}</span></div><div className="rp-board" role="grid" aria-label="Four ordinary pits and the Ruma store"><div className="rp-flow" aria-hidden="true">→ → → → ↻</div>{state.pits.map((count,pitIndex)=>{const action=legal.find((item)=>item.pitIndex===pitIndex);const highlighted=hint?.pitIndex===pitIndex;return <button key={pitIndex} role="gridcell" aria-label={`Pit ${pitIndex+1} with ${count} stones${action?", legal choice":""}${highlighted?", hinted":""}`} className={`rp-pit ${action?"legal":""} ${highlighted?"hinted":""}`} disabled={!action} onClick={()=>action&&play(action)}><span aria-hidden="true">{Array.from({length:count},(_,i)=><i key={i}/>)}</span><strong>{count}</strong><small>PIT {pitIndex+1}</small></button>})}<div role="gridcell" aria-label={`Ruma store with ${state.ruma} stones`} className="rp-pit ruma"><span aria-hidden="true">{Array.from({length:state.ruma},(_,i)=><i key={i}/>)}</span><strong>{state.ruma}</strong><small>RUMA</small></div></div><div className="rp-controls"><button onClick={undo} disabled={!state.history.length}>Undo</button><button onClick={revealHint} disabled={state.status!=="playing"}>Hint</button><span>Choices {state.moveCount} · Relays {state.sowCount} · Best {best||"—"}</span></div>{message&&<p className="rp-message" role="alert">{message}</p>}{state.status!=="playing"&&<div className="rp-result"><button onClick={()=>start(mode)}>Try Again</button><button onClick={()=>setScreen("menu")}>Menu</button></div>}</main><footer><span>Mode: {mode === "guided" ? "Guided Academy" : "Classic Puzzle"}</span><span>Rules stable · provenance disputed · no Ruma pickup</span></footer></section>;
}

function Rules({ onBack, onStart }) {
  return <section className="rp-rules" aria-label="Ruma Ice Puzzle rules"><button className="rp-back" onClick={onBack}>← Menu</button><article><p>HOW TO PLAY · CLASSIC TCHUKA RUMA</p><h1>Ruma Ice Puzzle</h1><div className="rp-rule-grid"><section><strong>1 · Begin 2–2–2–2</strong><span>Place two stones in each of four ordinary pits. The Ruma store begins empty.</span></section><section><strong>2 · Sow rightward</strong><span>Choose a non-empty ordinary pit and distribute its stones one by one to the right.</span></section><section><strong>3 · Wrap after Ruma</strong><span>When stones remain after reaching the Ruma, continue from the far-left ordinary pit.</span></section><section><strong>4 · Chain occupied endings</strong><span>If the last stone lands in an ordinary pit that was already occupied, lift that pit and continue immediately.</span></section><section><strong>5 · Ruma ends safely</strong><span>If the last stone lands in the Ruma, the move ends and the next choice may begin from any non-empty pit.</span></section><section><strong>6 · Empty endings lose</strong><span>If the last stone lands in an ordinary pit that was empty before the deposit, the attempt fails. Move all eight stones into Ruma to win.</span></section></div><div className="rp-warning"><strong>Provenance warning</strong><span>The rules are well documented in twentieth-century mathematical literature, but claims that this exact solitaire represents a securely attested living Indian tradition are disputed. The game is presented as a documented historical puzzle, not as a definitive community attribution.</span></div><button onClick={onStart}>Start Guided Academy</button></article></section>;
}
