import { useMemo, useState } from "react";
import {
  RUMA_PUZZLES,
  RUMA_RULESET,
  applyRumaAction,
  createRumaState,
  getLegalActions,
  getRumaHint,
  getRumaProgress,
  resultDetail,
  resultTitle,
  solveRumaState,
  summarizeRumaMove
} from "./rules.js";

const BEST_SCORE_KEY = "articweb3:ruma-best-scores";

export function RumaIcePuzzleApp({ onExitToLibrary }) {
  const [screen, setScreen] = useState("cover");
  const [state, setState] = useState(() => createRumaState());
  const [undoStack, setUndoStack] = useState([]);
  const [message, setMessage] = useState("");
  const [hintPit, setHintPit] = useState(null);
  const [bestScores, setBestScores] = useState(loadBestScores);

  const legalIndexes = useMemo(
    () => new Set(getLegalActions(state).map((action) => action.pitIndex)),
    [state]
  );
  const progress = getRumaProgress(state);
  const remainingSolution = useMemo(
    () => state.status === "playing" ? solveRumaState(state) : null,
    [state]
  );

  function startPuzzle(puzzleId) {
    setState(createRumaState({ puzzleId }));
    setUndoStack([]);
    setMessage("");
    setHintPit(null);
    setScreen("game");
  }

  function resetPuzzle() {
    startPuzzle(state.puzzleId);
  }

  function playPit(pitIndex) {
    if (!legalIndexes.has(pitIndex) || state.status !== "playing") return;
    const result = applyRumaAction(state, { type: "sow", pitIndex });
    if (result.error) {
      setMessage(result.error);
      return;
    }

    setUndoStack((items) => [...items, state]);
    setState(result.state);
    setHintPit(null);

    if (result.state.status === "won") {
      const nextBest = recordBestScore(bestScores, result.state.puzzleId, result.state.moveCount);
      setBestScores(nextBest);
      setMessage(resultDetail(result.state));
      return;
    }
    if (result.state.status === "failed") {
      setMessage(resultDetail(result.state));
      return;
    }

    const continuation = solveRumaState(result.state);
    setMessage(
      continuation
        ? summarizeRumaMove(result.state.lastTurn)
        : "The board still moves, but no winning continuation remains. Undo this choice."
    );
  }

  function undoMove() {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setState(previous);
    setUndoStack((items) => items.slice(0, -1));
    setHintPit(null);
    setMessage("Last choice rewound.");
  }

  function showHint() {
    const hint = getRumaHint(state);
    if (!hint) {
      setHintPit(null);
      setMessage("No winning continuation remains. Undo or restart the puzzle.");
      return;
    }
    setHintPit(hint.action.pitIndex);
    setMessage(`Try pit ${hint.action.pitIndex + 1}. A shortest solution remains ${hint.remainingMoves} move${hint.remainingMoves === 1 ? "" : "s"} long.`);
  }

  if (screen === "cover") {
    return (
      <section className="ruma-cover" aria-label="Ruma Ice Puzzle cover">
        <button className="ruma-back-pill" onClick={onExitToLibrary}>← All Games</button>
        <div className="ruma-cover-current" aria-hidden="true">
          <span className="ruma-cover-pit">2</span><i>→</i><span className="ruma-cover-pit">2</span><i>→</i>
          <span className="ruma-cover-pit">2</span><i>→</i><span className="ruma-cover-pit">2</span><i>→</i>
          <span className="ruma-cover-store">RUMA</span>
        </div>
        <div className="ruma-cover-copy">
          <p>TCHUKA RUMA · SOLO RELAY SOWING</p>
          <h1>RUMA<br />ICE PUZZLE</h1>
          <span>Route every fish into the Ruma without letting the final fish die in an empty ordinary pit.</span>
          <button onClick={() => setScreen("menu")}>Enter the Ruma</button>
        </div>
      </section>
    );
  }

  if (screen === "menu") {
    return (
      <section className="ruma-menu" aria-label="Ruma Ice Puzzle menu">
        <header>
          <button className="ruma-back-pill" onClick={() => setScreen("cover")}>← Cover</button>
          <div><p>SOLO · SOLITAIRE SOWING</p><h1>Choose a current</h1></div>
          <button className="ruma-back-pill" onClick={() => setScreen("rules")}>How to Play</button>
        </header>
        <main>
          <section className="ruma-puzzle-grid" aria-label="Ruma puzzle selection">
            {RUMA_PUZZLES.map((puzzle, index) => (
              <article key={puzzle.id} className={puzzle.category === "modern-challenge" ? "modern" : "teaching"}>
                <div className="ruma-puzzle-mark">{index + 1}</div>
                <p>{puzzle.category === "modern-challenge" ? "MODERN CHALLENGE" : "SELECTED TEACHING SETUP"}</p>
                <h2>{puzzle.name}</h2>
                <div className="ruma-opening" aria-label={`${puzzle.name} opening ${puzzle.opening.join(", ")}`}>
                  {puzzle.opening.map((count, pitIndex) => <span key={pitIndex}>{count}</span>)}<b>R</b>
                </div>
                <span>{puzzle.description}</span>
                <footer>
                  <small>PAR {puzzle.par}</small>
                  <small>{bestScores[puzzle.id] ? `BEST ${bestScores[puzzle.id]}` : "UNSOLVED"}</small>
                </footer>
                <button onClick={() => startPuzzle(puzzle.id)}>Play {puzzle.name}</button>
              </article>
            ))}
          </section>
          <aside className="ruma-menu-note">
            <strong>Historical boundary</strong>
            <span>The relay rules are documented. The exact living-tradition provenance is disputed, and the uneven challenge openings are explicitly modern.</span>
          </aside>
        </main>
      </section>
    );
  }

  if (screen === "rules") {
    return (
      <section className="ruma-rules" aria-label="Ruma Ice Puzzle rules">
        <header>
          <button className="ruma-back-pill" onClick={() => setScreen("menu")}>← Menu</button>
          <div><p>{RUMA_RULESET.rulesetVersion}</p><h1>How the relay works</h1></div>
          <button className="ruma-back-pill" onClick={() => startPuzzle("teaching-current")}>Start Teaching</button>
        </header>
        <main>
          <div className="ruma-rule-grid">
            <article><b>1</b><strong>Choose</strong><span>Pick any non-empty ordinary pit. The Ruma is a store and can never be chosen.</span></article>
            <article><b>2</b><strong>Sow right</strong><span>Drop one fish into each following position, including the Ruma, then wrap to pit one.</span></article>
            <article><b>3</b><strong>Relay</strong><span>If the final fish lands in an occupied ordinary pit, pick up that whole pit and continue automatically.</span></article>
            <article><b>4</b><strong>Choose again</strong><span>If the final fish lands in the Ruma, the relay pauses safely. Choose another non-empty ordinary pit.</span></article>
            <article><b>5</b><strong>Avoid failure</strong><span>If the final fish lands in an ordinary pit that was empty before landing, the attempt fails.</span></article>
            <article><b>6</b><strong>Restore</strong><span>Win when all eight fish are inside the Ruma and every ordinary pit is empty.</span></article>
          </div>
          <section className="ruma-rules-policy">
            <div><strong>Engine</strong><span>Solitaire relay sowing</span></div>
            <div><strong>Players</strong><span>Solo</span></div>
            <div><strong>Undo</strong><span>Modern practice aid</span></div>
            <div><strong>Hints and par</strong><span>Modern puzzle tools</span></div>
          </section>
          <article className="ruma-provenance"><strong>Provenance warning</strong><p>Tchuka Ruma is well documented in later puzzle literature, but its exact Indian living-tradition provenance is not secure. This release does not market the ruleset as unquestionably ancient.</p></article>
        </main>
      </section>
    );
  }

  const best = bestScores[state.puzzleId] || null;
  const statusMessage = message || (state.status === "playing"
    ? remainingSolution
      ? "Choose a non-empty pit. The game resolves every relay automatically."
      : "No winning continuation remains. Undo or restart."
    : resultDetail(state));

  return (
    <section className="ruma-shell" aria-label="Ruma Ice Puzzle game">
      <header className="ruma-game-header">
        <button className="ruma-back-pill" onClick={() => setScreen("menu")}>← Puzzles</button>
        <div><p>{state.puzzleCategory === "modern-challenge" ? "MODERN CHALLENGE" : "SELECTED TEACHING SETUP"} · {RUMA_RULESET.rulesetVersion}</p><h1>{state.puzzleName}</h1></div>
        <button className="ruma-back-pill" onClick={resetPuzzle}>Restart</button>
      </header>

      <main className="ruma-game-main">
        <section className="ruma-score-row" aria-label="Puzzle score">
          <article><small>MOVES</small><strong>{state.moveCount}</strong></article>
          <article><small>PAR</small><strong>{state.par}</strong></article>
          <article><small>BEST</small><strong>{best || "—"}</strong></article>
          <article><small>IN RUMA</small><strong>{state.ruma}/8</strong></article>
        </section>
        <section className="ruma-progress" aria-label={`${progress.percent}% of fish stored`}><span style={{ width: `${progress.percent}%` }} /><small>{progress.remaining} fish remain outside the Ruma</small></section>
        <RumaBoard state={state} legalIndexes={legalIndexes} hintPit={hintPit} onPit={playPit} />
        <section className={`ruma-status ${state.status}`} role="status">
          <div><strong>{resultTitle(state)}</strong><span>{statusMessage}</span></div>
          {state.lastTurn && <small>{summarizeRumaMove(state.lastTurn)}</small>}
        </section>
        <div className="ruma-actions">
          <button disabled={!undoStack.length} onClick={undoMove}>Undo</button>
          <button disabled={state.status !== "playing"} onClick={showHint}>Hint</button>
          <button onClick={resetPuzzle}>Try Again</button>
        </div>
        <section className="ruma-history" aria-label="Move history">
          <header><strong>Decision log</strong><span>{state.history.length ? `${state.history.length} choice${state.history.length === 1 ? "" : "s"}` : "No choices yet"}</span></header>
          <div>
            {!state.history.length && <p>Your pit choices appear here. Automatic relay drops do not count as extra moves.</p>}
            {[...state.history].reverse().slice(0, 6).map((entry) => (
              <article key={entry.move}><b>{entry.move}</b><span>Pit {entry.action.pitIndex + 1}</span><small>{entry.summary.relays ? `${entry.summary.relays} relay${entry.summary.relays === 1 ? "" : "s"}` : entry.summary.landedInRuma ? "Ruma landing" : "Direct sow"}</small></article>
            ))}
          </div>
        </section>
      </main>
    </section>
  );
}

function RumaBoard({ state, legalIndexes, hintPit, onPit }) {
  return (
    <section className="ruma-board" role="grid" aria-label="Tchuka Ruma board">
      <div className="ruma-flow-label" aria-hidden="true"><span>RIGHTWARD RELAY</span><b>→ → → →</b></div>
      <div className="ruma-pits" role="row">
        {state.pits.map((count, pitIndex) => {
          const legal = state.status === "playing" && legalIndexes.has(pitIndex);
          const hinted = hintPit === pitIndex;
          return (
            <button key={pitIndex} type="button" role="gridcell" disabled={!legal} className={`${legal ? "legal" : ""} ${hinted ? "hinted" : ""}`} onClick={() => onPit(pitIndex)} aria-label={`Pit ${pitIndex + 1} with ${count} fish${legal ? ", legal" : ""}${hinted ? ", hinted" : ""}`}>
              <small>PIT {pitIndex + 1}</small><strong>{count}</strong>
              <span className="ruma-fish-cluster" aria-hidden="true">{Array.from({ length: count }, (_, index) => <i key={index}>◆</i>)}</span>
              {hinted && <em>TRY THIS</em>}
            </button>
          );
        })}
      </div>
      <aside className="ruma-store" role="gridcell" aria-label={`Ruma store with ${state.ruma} fish`}>
        <small>RUMA</small><strong>{state.ruma}</strong>
        <span className="ruma-fish-cluster" aria-hidden="true">{Array.from({ length: state.ruma }, (_, index) => <i key={index}>◆</i>)}</span>
        <em>STORE ONLY</em>
      </aside>
    </section>
  );
}

function loadBestScores() {
  try {
    return JSON.parse(window.localStorage.getItem(BEST_SCORE_KEY) || "{}");
  } catch {
    return {};
  }
}

function recordBestScore(scores, puzzleId, moves) {
  const previous = Number(scores[puzzleId] || 0);
  const next = previous && previous <= moves ? scores : { ...scores, [puzzleId]: moves };
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, JSON.stringify(next));
  } catch {
    // Local persistence is optional; gameplay remains functional without it.
  }
  return next;
}
