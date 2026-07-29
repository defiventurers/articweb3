import { useMemo, useState } from "react";
import { RumaIcePuzzleBoard } from "./RumaIcePuzzleBoard.jsx";
import {
  CLASSIC_SETUP,
  RUMA_RULESET,
  applyChoice,
  createDailyRumaState,
  createFinalDropLesson,
  createRumaState,
  describeRumaTurn,
  getRumaHint,
  rumaMessage
} from "./rules.js";

export function RumaIcePuzzleApp({ onExitToLibrary }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("classic");
  const [state, setState] = useState(() => createRumaState());
  const [undoStack, setUndoStack] = useState([]);
  const [message, setMessage] = useState("");
  const [hintPit, setHintPit] = useState(null);
  const best = useMemo(() => readBest(state.setupId), [state.setupId, state.status]);

  function start(nextMode) {
    const next = nextMode === "daily"
      ? createDailyRumaState()
      : nextMode === "lesson"
        ? createFinalDropLesson()
        : createRumaState({ setup: CLASSIC_SETUP, mode: "classic", setupId: "classic-2222" });
    setMode(nextMode);
    setState(next);
    setUndoStack([]);
    setMessage(nextMode === "lesson" ? "One counter remains. Choose Pit 4 to land it in the Ruma." : "");
    setHintPit(null);
    setScreen("game");
  }

  function choosePit(pitIndex) {
    if (state.status !== "playing") return;
    const result = applyChoice(state, pitIndex);
    if (result.error) return setMessage(result.error);
    setUndoStack((items) => [...items, state]);
    setState(result.state);
    setHintPit(null);
    setMessage(rumaMessage(result.state.lastTurn));
    if (result.state.status === "won") saveBest(result.state.setupId, result.state.moveCount);
  }

  function undo() {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setState(previous);
    setUndoStack((items) => items.slice(0, -1));
    setHintPit(null);
    setMessage("Last pit choice undone.");
  }

  function showHint() {
    const hint = getRumaHint(state);
    if (!hint) {
      setHintPit(null);
      setMessage("No winning continuation remains. Undo or restart.");
      return;
    }
    setHintPit(hint.pitIndex);
    setMessage(`Try Pit ${hint.pitIndex + 1}. A solution remains in ${hint.remainingChoices} choice${hint.remainingChoices === 1 ? "" : "s"}.`);
  }

  if (screen === "cover") return (
    <section className="rp-cover" aria-label="Ruma Ice Puzzle cover">
      <button className="rp-back" onClick={onExitToLibrary}>← All Games</button>
      <div className="rp-cover-art" aria-hidden="true"><div>{[2,2,2,2].map((count, index) => <i key={index}><small>{index + 1}</small><span>{"◆".repeat(count)}</span></i>)}</div><b>RUMA<br /><strong>0/8</strong></b><em>🐧</em></div>
      <div className="rp-cover-copy"><p>TCHUKA RUMA · MODERN SOLITAIRE</p><h1>RUMA<br />ICE PUZZLE</h1><span>Choose, sow, relay and pause at the Ruma. One empty-pit landing freezes the attempt.</span><button onClick={() => setScreen("menu")}>Enter the Ruma</button></div>
    </section>
  );

  if (screen === "menu") return (
    <section className="rp-menu" aria-label="Ruma Ice Puzzle menu"><button className="rp-back" onClick={() => setScreen("cover")}>← Cover</button><article><p>SOLO SOWING · EIGHT COUNTERS</p><h1>Ruma Ice Puzzle</h1><span>Route all eight counters from four ordinary pits into the Ruma without ending a relay in an empty ordinary pit.</span><div><button className="primary" onClick={() => start("classic")}>Classic 2–2–2–2 Puzzle</button><button onClick={() => start("daily")}>Daily Ruma Challenge</button><button onClick={() => start("lesson")}>Final Drop Lesson</button><button onClick={() => setScreen("rules")}>How to Play</button></div><small>This is presented as a documented modern puzzle associated with India in later literature. Its secure living-tradition and ancient provenance are disputed.</small></article></section>
  );

  if (screen === "rules") return (
    <section className="rp-rules" aria-label="Ruma Ice Puzzle rules"><button className="rp-back" onClick={() => setScreen("menu")}>← Menu</button><article><p>HOW TO PLAY · {RUMA_RULESET.rulesetVersion}</p><h1>Fill the Ruma</h1><div><section><strong>1 · Choose a pit</strong><span>Pick up every counter from one non-empty ordinary pit. Never lift counters out of the Ruma.</span></section><section><strong>2 · Sow rightward</strong><span>Move through Pits 1–4 and the Ruma, one counter per place, wrapping from the Ruma to Pit 1.</span></section><section><strong>3 · Relay</strong><span>If the last counter enters an ordinary pit that already held counters, lift the whole pit and keep sowing automatically.</span></section><section><strong>4 · Pause at Ruma</strong><span>If the last counter lands in the Ruma, choose any non-empty ordinary pit to continue the attempt.</span></section><section><strong>5 · Avoid empty endings</strong><span>If the last counter lands in an ordinary pit that was empty before the drop, the attempt fails.</span></section><section><strong>6 · Win all eight</strong><span>Move every counter into the Ruma. Undo, hints and move-count scoring are modern puzzle aids.</span></section></div><aside><strong>Provenance label</strong><span>The rules are well documented as a modern solitaire, but this exact form is not marketed as unquestionably ancient or ethnically Indian.</span></aside><button onClick={() => start("classic")}>Start Classic Puzzle</button></article></section>
  );

  return (
    <section className="rp-game" aria-label={mode === "lesson" ? "Ruma Ice Puzzle final drop lesson" : "Ruma Ice Puzzle game"}>
      <header><button onClick={() => setScreen("menu")}>← Menu</button><div><p>{RUMA_RULESET.rulesetVersion}</p><h1>Ruma Ice Puzzle</h1></div><button onClick={() => start(mode)}>Restart</button></header>
      <main>
        <div className="rp-status"><article><small>CHOICES</small><strong>{state.moveCount}</strong></article><div><strong>{describeRumaTurn(state)}</strong><span>{state.status === "playing" ? `${state.ruma} of 8 counters secured.` : state.status === "won" ? `Solved in ${state.moveCount} choices${best ? ` · best ${Math.min(best, state.moveCount)}` : ""}.` : "Use undo or restart to continue."}</span></div><article><small>RELAYS</small><strong>{state.relayCount}</strong></article></div>
        <RumaIcePuzzleBoard state={state} onPit={choosePit} interactive={state.status === "playing"} hintPit={hintPit} />
        <div className="rp-controls"><button disabled={!undoStack.length} onClick={undo}>Undo</button><button disabled={state.status !== "playing"} onClick={showHint}>Hint</button><button onClick={() => start(mode)}>Reset</button></div>
        {message && <p className="rp-message" role="status">{message}</p>}
        {state.status === "won" && <div className="rp-result"><h2>Ruma complete</h2><p>Every counter is secured in the snow store.</p><button onClick={() => start(mode)}>Play Again</button><button onClick={() => setScreen("menu")}>Puzzle Menu</button></div>}
        {state.status === "failed" && <div className="rp-result failed"><h2>Empty-pit freeze</h2><p>The last counter ended in an empty ordinary pit.</p><button onClick={undo}>Undo Last Choice</button><button onClick={() => start(mode)}>Restart</button></div>}
      </main>
      <footer><span>Four ordinary pits · one Ruma · eight counters.</span><span>Solo puzzle · local scoring only.</span></footer>
    </section>
  );
}

function readBest(setupId) {
  try { return Number(window.localStorage.getItem(`ruma-best:${setupId}`) || 0) || null; }
  catch { return null; }
}
function saveBest(setupId, moves) {
  try {
    const key = `ruma-best:${setupId}`;
    const current = Number(window.localStorage.getItem(key) || 0);
    if (!current || moves < current) window.localStorage.setItem(key, String(moves));
  } catch { /* local score storage is optional */ }
}
