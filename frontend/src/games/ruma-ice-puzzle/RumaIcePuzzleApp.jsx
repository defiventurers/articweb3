import { useMemo, useState } from "react";
import { RUMA_RULESET, applyRumaMove, createLastPebbleDrill, createRumaState, getHint, getLegalStarts, getWinningStarts, moveSummary, resultDetail, resultTitle } from "./rules.js";

export function RumaIcePuzzleApp({ onExitToLibrary }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("guided");
  const [state, setState] = useState(() => createRumaState({ mode: "guided" }));
  const [message, setMessage] = useState("");
  const [hintPit, setHintPit] = useState(null);
  const legal = getLegalStarts(state);
  const winningStarts = useMemo(() => mode === "guided" && state.status === "playing" ? getWinningStarts(state) : [], [mode, state]);

  function start(nextMode) {
    setMode(nextMode);
    const next = nextMode === "drill" ? createLastPebbleDrill() : createRumaState({ mode: nextMode });
    setState(next);
    setMessage(nextMode === "drill" ? next.lastMove.summary : "");
    setHintPit(null);
    setScreen("game");
  }
  function sow(pit) {
    const result = applyRumaMove(state, pit);
    setState(result.state);
    setMessage(result.error || moveSummary(result.state.lastMove));
    setHintPit(null);
    if (!result.error && result.state.status === "won") {
      const best = Number(localStorage.getItem("ruma-best") || 0);
      if (!best || result.state.moves < best) localStorage.setItem("ruma-best", String(result.state.moves));
    }
  }
  function hint() {
    const next = getHint(state);
    setHintPit(next.pit);
    setMessage(next.message);
  }

  if (screen === "cover") return <section className="rp-cover" aria-label="Ruma Ice Puzzle cover"><button className="rp-back" onClick={onExitToLibrary}>← All Games</button><div className="rp-cover-art" aria-hidden="true"><div className="rp-ice-channel">{[2,2,2,2].map((count, index) => <i key={index}><b>{count}</b></i>)}<i className="ruma"><span>RUMA</span><b>0</b></i></div><div className="rp-penguin">🐧<span>→</span>❄</div></div><div className="rp-cover-copy"><p>TCHUKA RUMA · SOLITAIRE SOWING</p><h1>RUMA ICE<br />PUZZLE</h1><span>Chain every sowing toward the Ruma. Land in the store to choose again; land in an empty ordinary pit and the route breaks.</span><button onClick={() => setScreen("menu")}>Open the puzzle</button></div></section>;

  if (screen === "menu") return <section className="rp-menu" aria-label="Ruma Ice Puzzle menu"><button className="rp-back" onClick={() => setScreen("cover")}>← Cover</button><article><p className="rp-eyebrow">TCHUKA RUMA · EIGHT-PEBBLE BASELINE</p><h1>Ruma Ice Puzzle</h1><p>Four ordinary pits begin with two pebbles each. Sow toward the Ruma, wrap when necessary, and keep chaining whenever the last pebble lands in a non-empty pit.</p><div className="rp-menu-actions"><button className="primary" onClick={() => start("guided")}>Guided Classic</button><button onClick={() => start("classic")}>Classic Puzzle</button><button onClick={() => start("drill")}>Last Pebble Drill</button><button onClick={() => setScreen("rules")}>How to Play</button></div><div className="rp-source-note">Ruleset: {RUMA_RULESET.rulesetVersion}. The classic 4×2 position is solved locally; no wallet, room or transaction is required.</div></article></section>;

  if (screen === "rules") return <section className="rp-rules" aria-label="Ruma Ice Puzzle rules"><button className="rp-back" onClick={() => setScreen("menu")}>← Menu</button><article><p className="rp-eyebrow">HOW TO PLAY</p><h1>Tchuka Ruma</h1><div className="rp-rule-grid"><section><strong>1 · Choose</strong><p>Pick up every pebble from any non-empty ordinary pit.</p></section><section><strong>2 · Sow right</strong><p>Drop one pebble in each following pit toward the Ruma. Continue from the far-left pit after passing the Ruma.</p></section><section><strong>3 · Chain</strong><p>If the last pebble lands in a non-empty ordinary pit, lift the complete new contents and continue automatically.</p></section><section><strong>4 · Safe stop</strong><p>If the last pebble lands in the Ruma, the move ends and you may choose any non-empty pit next.</p></section><section><strong>5 · Loss</strong><p>If the last pebble lands in an empty ordinary pit, the attempt ends immediately.</p></section><section><strong>6 · Win</strong><p>Place all eight pebbles in the Ruma. The Ruma is never emptied.</p></section></div><button onClick={() => start("guided")}>Start Guided Classic</button></article></section>;

  return <section className="rp-game" aria-label={mode === "drill" ? "Ruma Ice Puzzle last pebble drill" : "Ruma Ice Puzzle game"}><header><button onClick={() => setScreen("menu")}>← Menu</button><div><p>{RUMA_RULESET.rulesetVersion}</p><h1>Ruma Ice Puzzle</h1></div><button onClick={() => start(mode)}>Reset</button></header><main><div className="rp-status"><strong>{resultTitle(state)}</strong><span>{resultDetail(state)}</span></div><div className="rp-board" role="grid" aria-label="Tchuka Ruma five pit board">{state.pits.map((count, index) => { const enabled = legal.includes(index); const winning = winningStarts.includes(index); const hinted = hintPit === index; return <button key={index} type="button" className={`rp-pit ${winning ? "winning" : ""} ${hinted ? "hinted" : ""}`} disabled={!enabled} onClick={() => sow(index)} aria-label={`Ordinary pit ${index + 1} with ${count} pebbles${winning ? ", winning route" : ""}`}><small>PIT {index + 1}</small><strong>{count}</strong><span aria-hidden="true">{Array.from({ length: count }, (_, stone) => <i key={stone} />)}</span></button>; })}<div className="rp-pit ruma" role="gridcell" aria-label={`Ruma with ${state.ruma} pebbles`}><small>RUMA</small><strong>{state.ruma}</strong><span aria-hidden="true">{Array.from({ length: state.ruma }, (_, stone) => <i key={stone} />)}</span></div></div><div className="rp-controls">{mode === "guided" && state.status === "playing" && <button onClick={hint}>Show one safe start</button>}{state.status !== "playing" && <button onClick={() => start(mode)}>Try Again</button>}<span>Best classic: {localStorage.getItem("ruma-best") || "—"} moves</span></div>{message && <p className="rp-message" role="alert">{message}</p>}</main><footer><span>Solo · no blockchain action</span><span>4 ordinary pits · 2 pebbles each · Ruma never emptied</span></footer></section>;
}
