import { useEffect, useRef, useState } from "react";
import { chooseGlacierTrailBotAction } from "./bot.js";
import { CowrieSequence, GlacierTrailBoard, ThrowSelector, allocationKey, defaultAllocation } from "./GlacierTrailBoard.jsx";
import { GlacierTrailOnline } from "./GlacierTrailOnline.jsx";
import {
  GLACIER_TRAIL_RULESET,
  actionSummary,
  applyAction,
  createExactLandingDrill,
  createGlacierTrailState,
  describeTurn,
  getLegalActions,
  getPlayerSummary,
  resultDetail,
  resultTitle,
  rollLocalSequence
} from "./rules.js";

export function GlacierTrailApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice-aurora");
  const [state, setState] = useState(() => createGlacierTrailState({ mode: "practice-aurora" }));
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [message, setMessage] = useState("");
  const botTimer = useRef(null);

  const humanSide = mode === "practice-ember" ? "ember" : "aurora";
  const botSide = humanSide === "aurora" ? "ember" : "aurora";
  const botMode = !["hotseat", "drill"].includes(mode);

  useEffect(() => () => window.clearTimeout(botTimer.current), []);
  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (screen !== "game" || !botMode || state.winner || state.currentPlayer !== botSide) return;
    botTimer.current = window.setTimeout(() => {
      if (state.awaiting === "roll") {
        const result = rollLocalSequence(state, botSide);
        setState(result.state);
        setSelectedAllocation(defaultAllocation(result.state));
        setMessage(result.error || sequenceSummary(result.state.lastRollSequence));
        return;
      }
      const action = chooseGlacierTrailBotAction(state, botSide);
      if (!action) return;
      const result = applyAction(state, action, botSide);
      setState(result.state);
      setSelectedAllocation(defaultAllocation(result.state));
      setMessage(result.error || actionSummary(result.state.lastMove));
    }, state.awaiting === "roll" ? 620 : 720);
  }, [botMode, botSide, screen, state]);

  function startGame(nextMode) {
    setMode(nextMode);
    const nextState = nextMode === "drill"
      ? createExactLandingDrill()
      : createGlacierTrailState({ mode: nextMode, starter: "aurora", seed: Date.now() });
    setState(nextState);
    setSelectedAllocation(defaultAllocation(nextState));
    setMessage(nextMode === "drill" ? "Aurora has a whole throw of 2. Land the last counter exactly beyond Kenda-ge." : "");
    setScreen("game");
  }

  function resetGame() { startGame(mode); }

  function castCowries() {
    if (state.winner || state.awaiting !== "roll" || (botMode && state.currentPlayer === botSide)) return;
    const result = rollLocalSequence(state, state.currentPlayer);
    setState(result.state);
    setSelectedAllocation(defaultAllocation(result.state));
    setMessage(result.error || sequenceSummary(result.state.lastRollSequence));
  }

  function submitAction(action) {
    if (!action || state.winner || (botMode && state.currentPlayer === botSide)) return;
    const result = applyAction(state, action, state.currentPlayer);
    setState(result.state);
    setSelectedAllocation(defaultAllocation(result.state));
    setMessage(result.error || actionSummary(result.state.lastMove));
  }

  if (screen === "cover") {
    return (
      <section className="gt-cover" aria-label="Glacier Trail cover">
        <button className="gt-back-pill" onClick={onExitToLibrary}>← All Games</button>
        <div className="gt-cover-art" aria-hidden="true">
          <div className="gt-cover-path"><i /><i /><i /><i /><i /></div>
          <span className="aurora">♟</span><span className="ember">♟</span>
          <b>5</b>
        </div>
        <div className="gt-cover-copy">
          <p>PANCHA KELIYA · PARKER 1909</p>
          <h1>GLACIER<br />TRAIL</h1>
          <span>Two caravans enter from opposite ends, converge at the first safe house, then climb a five-bend trail toward Kenda-ge.</span>
          <button onClick={() => setScreen("menu")}>Begin the ascent</button>
        </div>
      </section>
    );
  }

  if (screen === "menu") {
    return (
      <section className="gt-menu" aria-label="Glacier Trail menu">
        <button className="gt-back-pill" onClick={() => setScreen("cover")}>← Cover</button>
        <article className="gt-menu-card">
          <p className="gt-eyebrow">SRI LANKA · PANCHA KELIYA · THE FIVE GAME</p>
          <h1>Glacier Trail</h1>
          <p>Three counters belong to each of two opposing caravans. Cast six cowries, store every bonus result, allocate whole throws, cut exposed rivals, and land all three counters exactly beyond the terminal house.</p>
          <div className="gt-menu-actions">
            <button className="primary" onClick={() => setScreen("online")}>Online Multiplayer</button>
            <button onClick={() => startGame("practice-aurora")}>Practice as Aurora</button>
            <button onClick={() => startGame("practice-ember")}>Practice as Ember</button>
            <button onClick={() => startGame("hotseat")}>Local Two-Side</button>
            <button onClick={() => startGame("drill")}>Exact Landing Drill</button>
            <button onClick={() => setScreen("rules")}>How to Play</button>
          </div>
          <div className="gt-source-note"><strong>Source correction:</strong> Parker records two opposing sides, not three independent players. The six counters are three per side. His wider 4/6/8-player forms are team tables; this first release implements the clean two-seat form.</div>
        </article>
      </section>
    );
  }

  if (screen === "online") return <GlacierTrailOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;
  if (screen === "rules") return <RulesScreen onBack={() => setScreen("menu")} onStart={() => startGame("practice-aurora")} />;

  const legalActions = getLegalActions(state, state.currentPlayer);
  const botThinking = botMode && state.currentPlayer === botSide && !state.winner;
  const canHumanAct = !botThinking && !state.winner;
  const aurora = getPlayerSummary(state, "aurora");
  const ember = getPlayerSummary(state, "ember");
  const ariaLabel = mode === "drill" ? "Glacier Trail exact landing drill" : "Glacier Trail game";

  return (
    <section className="gt-game" aria-label={ariaLabel}>
      <header className="gt-game-header">
        <button onClick={() => setScreen("menu")}>← Menu</button>
        <div><p>PANCHA KELIYA · {GLACIER_TRAIL_RULESET.rulesetVersion}</p><h1>Glacier Trail</h1></div>
        <button onClick={resetGame}>New Race</button>
      </header>
      <main className="gt-game-main">
        <div className="gt-score-row"><CaravanScore side="ember" summary={ember} active={state.currentPlayer === "ember"} /><div className="gt-turn-medallion"><small>TURN</small><strong>{state.turn}</strong><span>{state.castCount} CASTS</span></div><CaravanScore side="aurora" summary={aurora} active={state.currentPlayer === "aurora"} /></div>
        <CowrieSequence sequence={state.awaiting === "allocate" ? state.throwPool : state.lastRollSequence} onRoll={castCowries} canRoll={canHumanAct && state.awaiting === "roll"} busy={botThinking && state.awaiting === "roll"} />
        <div className="gt-turn-banner" data-player={state.currentPlayer}><strong>{state.winner ? resultTitle(state) : botThinking ? `${sideName(state.currentPlayer)} is planning…` : describeTurn(state)}</strong><span>{state.winner ? resultDetail(state) : state.awaiting === "allocate" ? "Assign one whole score to one counter, or assign the entire stored total to a single counter." : "Throws of 1, 5, and 6 continue the sequence."}</span></div>
        <ThrowSelector state={state} selectedAllocation={selectedAllocation} onSelect={setSelectedAllocation} />
        <GlacierTrailBoard state={state} legalActions={legalActions} selectedAllocation={selectedAllocation} onAction={submitAction} interactive={canHumanAct} />
        {message && <p className="gt-game-message" role="status">{message}</p>}
        {state.winner && <div className="gt-result-actions"><button onClick={resetGame}>Race Again</button><button onClick={() => setScreen("menu")}>Return to Menu</button></div>}
      </main>
      <footer className="gt-game-footer"><span>Mode: {modeLabel(mode)}</span><span>Five marked houses are safe. Every movement score remains whole.</span></footer>
    </section>
  );
}

function RulesScreen({ onBack, onStart }) {
  return (
    <section className="gt-rules" aria-label="Glacier Trail rules">
      <button className="gt-back-pill" onClick={onBack}>← Menu</button>
      <article>
        <p className="gt-eyebrow">HERITAGE RULES</p><h1>Climb the five houses</h1>
        <div className="gt-rule-grid">
          <section><strong>1 · Two sides</strong><p>Six counters are used: three for Aurora and three for Ember. Each side begins off-board at its own end of the nine-room base.</p></section>
          <section><strong>2 · Cast</strong><p>Throw six cowries. Mouths up count 0–6. Results of 1, 5, and 6 grant another throw and may admit a waiting counter.</p></section>
          <section><strong>3 · Store</strong><p>Bonus throws form one stored sequence. Allocate each complete throw to a counter, or move one counter by the total of the stored sequence. Scores are never subdivided.</p></section>
          <section><strong>4 · Cut</strong><p>Exact landing on an opposing counter in a plain room sends it back to its starting station. The five diagonally marked houses are safe.</p></section>
          <section><strong>5 · Route</strong><p>The caravans enter from opposite base ends, converge at the central safe house, and then follow the same bent trail through four more safe bends.</p></section>
          <section><strong>6 · Land</strong><p>Pass beyond Kenda-ge only with the exact score needed. The first side to land all three counters wins.</p></section>
        </div>
        <div className="gt-modern-policy"><strong>Declared digital table policy</strong><span>One counter occupies a room. Friendly occupancy and an enemy on a safe house block landing; counters may pass occupied rooms. Parker’s team forms are reserved for a later multi-seat ruleset.</span></div>
        <button className="gt-rules-start" onClick={onStart}>Guide Aurora</button>
      </article>
    </section>
  );
}

function CaravanScore({ side, summary, active }) {
  return <article className={`gt-caravan-score ${side} ${active ? "active" : ""}`}><span aria-hidden="true">{side === "aurora" ? "✦" : "◆"}</span><div><strong>{sideName(side)}</strong><small>{summary.track} climbing · {summary.captures} cuts</small></div><b>{summary.finished}/3</b></article>;
}
function sequenceSummary(sequence = []) { return sequence.length ? `Stored sequence: ${sequence.map((roll) => roll.value).join(" + ")}.` : ""; }
function sideName(side) { return side === "ember" ? "Ember Caravan" : "Aurora Caravan"; }
function modeLabel(mode) { if (mode === "hotseat") return "Local Two-Side"; if (mode === "drill") return "Exact Landing Drill"; return mode === "practice-ember" ? "Practice as Ember" : "Practice as Aurora"; }
