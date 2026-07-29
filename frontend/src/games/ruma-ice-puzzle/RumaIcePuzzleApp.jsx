import { useState } from "react";
import { RUMA_RULESET, applyRumaAction, createRumaState, getLegalActions } from "./rules.js";

export function RumaIcePuzzleApp({ onExitToLibrary }) {
  const [screen, setScreen] = useState("cover");
  const [state, setState] = useState(() => createRumaState());
  const [undo, setUndo] = useState([]);
  const [message, setMessage] = useState("");

  function reset() { setState(createRumaState()); setUndo([]); setMessage(""); }
  function play(pitIndex) {
    const before = state;
    const result = applyRumaAction(state, { type: "sow", pitIndex });
    if (result.error) return setMessage(result.error);
    setUndo((items) => [...items, before]);
    setState(result.state);
    setMessage(result.state.status === "won" ? "All eight fish reached the Ruma." : result.state.status === "failed" ? "The relay stopped in an empty ordinary pit." : result.state.lastTurn.landedInRuma ? "Safe landing in the Ruma. Choose another non-empty pit." : "Relay resolved.");
  }
  function undoMove() { const previous = undo.at(-1); if (!previous) return; setState(previous); setUndo((items) => items.slice(0, -1)); setMessage(""); }

  if (screen === "cover") return <section className="ruma-cover"><button onClick={onExitToLibrary}>← All Games</button><div><p>TCHUKA RUMA · SOLO RELAY PUZZLE</p><h1>Ruma Ice Puzzle</h1><span>Route every fish into the glacier store without dying in an empty pit.</span><button onClick={() => setScreen("game")}>Open the puzzle</button></div></section>;

  const legal = new Set(getLegalActions(state).map((action) => action.pitIndex));
  return <section className="ruma-shell"><header><button onClick={() => setScreen("cover")}>← Cover</button><div><p>{RUMA_RULESET.rulesetVersion}</p><h1>Ruma Ice Puzzle</h1></div><button onClick={reset}>Reset</button></header><main><div className="ruma-board" role="grid" aria-label="Tchuka Ruma board"><div className="ruma-pits">{state.pits.map((count, pitIndex) => <button key={pitIndex} disabled={state.status !== "playing" || !legal.has(pitIndex)} onClick={() => play(pitIndex)}><small>PIT {pitIndex + 1}</small><strong>{count}</strong><span>{Array.from({ length: count }, (_, index) => <i key={index}>◆</i>)}</span></button>)}</div><aside><small>RUMA</small><strong>{state.ruma}</strong><span>{Array.from({ length: state.ruma }, (_, index) => <i key={index}>◆</i>)}</span></aside></div><div className={`ruma-status ${state.status}`}><strong>{state.status === "won" ? "Puzzle solved" : state.status === "failed" ? "Attempt failed" : "Choose a non-empty pit"}</strong><span>{message || "Sow rightward through the Ruma. Occupied ordinary landings relay; empty ordinary landings fail."}</span></div><div className="ruma-actions"><button disabled={!undo.length} onClick={undoMove}>Undo</button><button onClick={reset}>Try Again</button></div><article className="ruma-note"><strong>Provenance warning</strong><p>The rules are well documented as a modern relay-sowing solitaire, but the exact Indian living-tradition provenance is disputed. This build does not market it as unquestionably ancient.</p></article></main></section>;
}
