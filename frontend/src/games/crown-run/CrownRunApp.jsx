import { useEffect, useMemo, useRef, useState } from "react";
import { chooseCrownRunBotAction } from "./bot.js";
import {
  CrownCowriePanel,
  CrownRunBoard,
  CrownRunDock,
  CrownThrowPool,
  sideLabel
} from "./CrownRunBoard.jsx";
import { CrownRunOnline } from "./CrownRunOnline.jsx";
import {
  CROWN_RUN_RULESET,
  actionSummary,
  applyAction,
  createCrownCollapseDrill,
  createCrownRunState,
  describeTurn,
  getLegalActions,
  resultDetail,
  resultTitle,
  rollLocalSequence
} from "./rules.js";

export function CrownRunApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice-aurora");
  const [state, setState] = useState(() => createCrownRunState({ mode: "practice-aurora" }));
  const [selectedThrowId, setSelectedThrowId] = useState(null);
  const [pendingActions, setPendingActions] = useState([]);
  const [message, setMessage] = useState("");
  const botTimer = useRef(null);

  const humanSide = mode === "practice-ember" ? "ember" : "aurora";
  const botSide = humanSide === "aurora" ? "ember" : "aurora";
  const localOpen = ["hotseat", "drill"].includes(mode);
  const drillSolved = mode === "drill" && state.lastMove?.capturedKind === "king";

  useEffect(() => () => window.clearTimeout(botTimer.current), []);
  useEffect(() => {
    if (!state.throwPool.some((item) => item.id === selectedThrowId)) setSelectedThrowId(state.throwPool[0]?.id || null);
    setPendingActions([]);
  }, [selectedThrowId, state.throwPool]);

  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (screen !== "game" || localOpen || state.winner || state.currentPlayer !== botSide) return;
    botTimer.current = window.setTimeout(() => {
      if (["roll", "capture-roll"].includes(state.awaiting)) {
        const result = rollLocalSequence(state, botSide);
        setState(result.state);
        setMessage(result.error || rollSummary(result.state, botSide));
        return;
      }
      const action = chooseCrownRunBotAction(state, botSide);
      if (!action) return;
      const result = applyAction(state, action, botSide);
      setState(result.state);
      setMessage(result.error || actionSummary(result.state.lastMove));
    }, state.awaiting === "allocate" ? 720 : 580);
  }, [botSide, localOpen, screen, state]);

  function startGame(nextMode) {
    setMode(nextMode);
    const nextState = nextMode === "drill"
      ? createCrownCollapseDrill()
      : createCrownRunState({ mode: nextMode, starter: "aurora", seed: Date.now() });
    setState(nextState);
    setSelectedThrowId(nextState.throwPool[0]?.id || null);
    setPendingActions([]);
    setMessage(nextMode === "drill" ? "Use the stored 3 with Aurora kaangi 1 to capture the Ember nakta." : "");
    setScreen("game");
  }

  function resetGame() { startGame(mode); }
  function canHumanAct() { return localOpen || state.currentPlayer === humanSide; }

  function castCowries() {
    if (!canHumanAct() || state.winner || !["roll", "capture-roll"].includes(state.awaiting)) return;
    const activeSide = state.currentPlayer;
    const result = rollLocalSequence(state, activeSide);
    setState(result.state);
    setMessage(result.error || rollSummary(result.state, activeSide));
  }

  function choosePiece(pieceId) {
    if (!canHumanAct() || state.winner || state.awaiting !== "allocate" || !selectedThrowId) return;
    const actions = getLegalActions(state, state.currentPlayer).filter((action) => action.throwId === selectedThrowId && action.pieceId === pieceId);
    if (!actions.length) return setMessage("That stored throw has no legal application to this piece.");
    if (actions.length === 1) return submitAction(actions[0]);
    setPendingActions(actions);
    setMessage("This piece can move or capture the rival sharing its room. Choose the action.");
  }

  function submitAction(action) {
    const result = applyAction(state, action, state.currentPlayer);
    setState(result.state);
    setPendingActions([]);
    setMessage(result.error || actionSummary(result.state.lastMove));
  }

  if (screen === "cover") {
    return (
      <section className="cr-cover" aria-label="Crown Run cover">
        <button className="cr-back-pill" onClick={onExitToLibrary}>← All Games</button>
        <div className="cr-cover-art" aria-hidden="true">
          <div className="cr-cover-crown">♛</div>
          <div className="cr-cover-track">{Array.from({ length: 36 }, (_, index) => <i key={index} className={index % 5 === 0 || index === 35 ? "safe" : ""} />)}</div>
          <span className="cr-cover-king aurora">♛</span><span className="cr-cover-king ember">♛</span>
        </div>
        <div className="cr-cover-copy">
          <p>DADU · DAWOODI BOHRA MAJORITY RULES</p>
          <h1>CROWN<br />RUN</h1>
          <span>Lead eight kaangi and one nakta across the opposing court. Capture the rival crown and an entire caravan can collapse.</span>
          <button onClick={() => setScreen("menu")}>Enter the royal track</button>
        </div>
      </section>
    );
  }

  if (screen === "menu") {
    return (
      <section className="cr-menu" aria-label="Crown Run menu">
        <button className="cr-back-pill" onClick={() => setScreen("cover")}>← Cover</button>
        <article className="cr-menu-card">
          <p className="cr-eyebrow">WESTERN INDIA · DAWOODI BOHRA DADU</p>
          <h1>Crown Run</h1>
          <p>Two courts move in opposite directions along one serpentine track. A da unlocks the turn. Capture opens the rival home row—and capturing the nakta can reset an entire side.</p>
          <div className="cr-menu-actions">
            <button className="primary" onClick={() => setScreen("online")}>Online Multiplayer</button>
            <button onClick={() => startGame("practice-aurora")}>Practice as Aurora Court</button>
            <button onClick={() => startGame("practice-ember")}>Practice as Ember Court</button>
            <button onClick={() => startGame("hotseat")}>Local Two Player</button>
            <button onClick={() => startGame("drill")}>Crown Collapse Drill</button>
            <button onClick={() => setScreen("rules")}>How to Play</button>
          </div>
          <div className="cr-source-note">This release implements the majority basic rules recorded from Dawoodi Bohra informants by Jacob Schmidt-Madsen. Household options such as triple cancellation, never-forfeit, mandatory killing and touch-move are not silently mixed into this ruleset.</div>
        </article>
      </section>
    );
  }

  if (screen === "online") return <CrownRunOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;
  if (screen === "rules") return <RulesScreen onBack={() => setScreen("menu")} onStart={() => startGame("practice-aurora")} />;

  const activeSide = state.currentPlayer;
  const botThinking = !localOpen && activeSide === botSide && !state.winner;
  const interactive = canHumanAct() && state.awaiting === "allocate" && !state.winner && !drillSolved && !botThinking;
  const canRoll = canHumanAct() && ["roll", "capture-roll"].includes(state.awaiting) && !state.winner && !drillSolved && !botThinking;
  const actionChoices = pendingActions.map((action) => ({ action, label: action.type === "capture-in-place" ? "Capture in this room" : `Move ${action.value} spaces${action.capturedPieceId ? " and capture" : ""}` }));

  return (
    <section className="cr-game" aria-label={mode === "drill" ? "Crown Run crown collapse drill" : "Crown Run game"}>
      <header className="cr-game-header">
        <button onClick={() => setScreen("menu")}>← Menu</button>
        <div><p>DADU · {CROWN_RUN_RULESET.rulesetVersion}</p><h1>Crown Run</h1></div>
        <button onClick={resetGame}>New Match</button>
      </header>
      <main className="cr-game-layout">
        <CrownRunDock state={state} side="aurora" selectedThrowId={selectedThrowId} onPiece={choosePiece} interactive={interactive} interactiveSide={activeSide} />
        <div className="cr-board-shell">
          <CrownCowriePanel state={state} onRoll={castCowries} canRoll={canRoll} busy={botThinking && ["roll", "capture-roll"].includes(state.awaiting)} />
          <div className="cr-turn-banner" data-player={activeSide}>
            <strong>{state.winner ? resultTitle(state) : drillSolved ? "The Ember crown collapses" : botThinking ? `${sideLabel(activeSide)} is calculating…` : describeTurn(state)}</strong>
            <span>{state.winner ? resultDetail(state) : drillSolved ? `${state.lastMove.resetCount} unfinished Ember pieces returned to start; the already-exited piece survived.` : `Turn ${state.turn}${state.captureLicense[activeSide] ? " · opposing home row open" : " · capture required for home row"}`}</span>
          </div>
          <CrownThrowPool throws={state.throwPool} selectedThrowId={selectedThrowId} onSelect={setSelectedThrowId} disabled={!interactive} />
          <CrownRunBoard state={state} selectedThrowId={selectedThrowId} onPiece={choosePiece} interactive={interactive} interactiveSide={activeSide} />
          {actionChoices.length > 0 && <div className="cr-action-choices">{actionChoices.map(({ action, label }) => <button key={`${action.type}-${action.pieceId}`} onClick={() => submitAction(action)}>{label}</button>)}</div>}
          {message && <p className="cr-game-message" role="status">{message}</p>}
          {drillSolved && <div className="cr-result-panel"><h2>Crown collapse confirmed</h2><p>A standard kaangi captured the nakta. All unfinished Ember pieces reset, but the piece that had already exited remained safe.</p><div><button onClick={() => startGame("drill")}>Replay Drill</button><button onClick={() => setScreen("menu")}>Return to Menu</button></div></div>}
          {state.winner && <div className="cr-result-panel"><h2>{resultTitle(state)}</h2><p>{resultDetail(state)}</p><div><button onClick={resetGame}>Race Again</button><button onClick={() => setScreen("menu")}>Return to Menu</button></div></div>}
        </div>
        <CrownRunDock state={state} side="ember" selectedThrowId={selectedThrowId} onPiece={choosePiece} interactive={interactive} interactiveSide={activeSide} />
      </main>
      <footer className="cr-game-footer"><span>{modeLabel(mode)}</span><span>Basic majority rules · optional household variants disabled.</span></footer>
    </section>
  );
}

function RulesScreen({ onBack, onStart }) {
  return (
    <section className="cr-rules" aria-label="Crown Run rules">
      <button className="cr-back-pill" onClick={onBack}>← Menu</button>
      <article>
        <p className="cr-eyebrow">DADU · MAJORITY BASIC RULES</p><h1>How to run the crown</h1>
        <div className="cr-rule-grid">
          <section><strong>1 · The courts</strong><p>Each side controls eight standard kaangi and one king-like nakta. All nine begin outside opposite ends of the 36-room track.</p></section>
          <section><strong>2 · Cast for da</strong><p>Five cowries score 1–4 mouths up; all five mouths up score 10. A 1 or 10 earns another cast. Without a 1, the player cannot apply the sequence.</p></section>
          <section><strong>3 · Zero forfeits</strong><p>All cowries facedown score zero and forfeit the turn, discarding results accumulated during that chance.</p></section>
          <section><strong>4 · Apply in any order</strong><p>After da, use stored results one at a time in any legal order. A 1 must enter a waiting piece before it may move or exit another piece.</p></section>
          <section><strong>5 · Capture</strong><p>Land on an opposing piece in an unprotected room to return one piece to start. Standard kaangi are captured before the nakta. Every capture grants an immediate cast.</p></section>
          <section><strong>6 · Open the home row</strong><p>You may not enter the final six-room opposing home row until your side has captured at least one rival piece.</p></section>
          <section><strong>7 · Crown collapse</strong><p>A standard piece capturing the nakta resets every unfinished allied piece. Nakta capturing nakta also resets pieces that already exited. The victim must capture again to reopen the rival home row.</p></section>
          <section><strong>8 · Exit</strong><p>Land exactly on the opposing entry room to enter the central quadrant. Once no pieces remain waiting to enter, spend a further da to exit a central piece. Exit all nine to win.</p></section>
        </div>
        <div className="cr-modern-policy"><strong>Version boundary</strong><span>This release uses two digital captain seats controlling the shared pieces of each side. Friendly stacking and opposing stacking are allowed, while a macho occupied by an opponent blocks landing. Multi-wallet family-team turns and minority household options require separate ruleset versions.</span></div>
        <button className="cr-rules-start" onClick={onStart}>Lead Aurora Court</button>
      </article>
    </section>
  );
}

function rollSummary(state, side) {
  const values = state.lastRollSequence?.map((item) => item.value) || [];
  const label = sideLabel(side);
  const lastPass = [...(state.history || [])].reverse().find((item) => item.type === "pass");
  if (lastPass?.turn === state.turn - 1 && lastPass.reason?.includes("zero")) return `${label} cast zero and forfeited the remaining sequence.`;
  if (lastPass?.turn === state.turn - 1 && lastPass.reason === "no-da") return `${label} cast ${values.join(" · ")} without da and could not move.`;
  return `${label} stored ${values.join(" · ")}. Choose a value and a legal piece.`;
}

function modeLabel(mode) {
  if (mode === "hotseat") return "Local Two Player";
  if (mode === "drill") return "Crown Collapse Drill";
  return mode === "practice-ember" ? "Practice as Ember" : "Practice as Aurora";
}
