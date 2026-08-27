/** Icebound Strategy Atlas: a reusable interactive board for all compact playable dossier modes. */
import { useMemo, useState } from "react";
import { CLANS, ClanId } from "@/game/millsRules";
import { getCompactMode } from "@/game/compactModes";
import { actOnCell, CompactState, createCompactState, demoCompactState, getCells, legalTargets, occupied } from "@/game/compactRules";

type Props = { modeId: number; roster: ClanId[]; onBack: () => void };

export default function CompactBoard({ modeId, roster, onBack }: Props) {
  const mode = getCompactMode(modeId);
  const effectiveRoster = [3, 14, 17, 18, 21].includes(modeId) ? roster.slice(0, 2) : roster;
  const [game, setGame] = useState<CompactState>(() => createCompactState(mode, effectiveRoster));
  const [history, setHistory] = useState<CompactState[]>([]);
  const cells = useMemo(() => getCells(mode), [mode]);
  const legal = useMemo(() => legalTargets(game), [game]);
  const active = CLANS[game.turn];
  const commit = (next: CompactState | null) => { if (!next) return; setHistory((past) => [...past.slice(-30), game]); setGame(next); };
  const reset = () => { setHistory([]); setGame(createCompactState(mode, effectiveRoster)); };
  const demo = () => { setHistory([]); setGame(demoCompactState(mode, effectiveRoster)); };
  const undo = () => { const previous = history.at(-1); if (!previous) return; setHistory((past) => past.slice(0, -1)); setGame(previous); };
  const title = modeId === 14 ? "Liubo" : modeId === 17 ? "Agon" : modeId === 18 ? "Hnefatafl" : modeId === 21 ? "Rithmomachia" : mode.boardLabel;

  return <main className="compact-screen">
    <header className="table-header"><button type="button" className="text-button" onClick={onBack}>← Back to Icebound Atlas</button><div className="table-title"><div className="table-brand"><span className="table-compass">✦</span><span>PUDGY PENGUINS BOARD ARCADE</span></div><span className="eyebrow">LIVE EXPEDITION TABLE · #{String(modeId).padStart(2, "0")}</span><h1>{title}</h1><p>{mode.boardLabel} · a marked expedition table</p></div><div className="table-actions"><button type="button" onClick={demo}>Chart demo</button><button type="button" onClick={undo} disabled={!history.length}>Undo route</button><button type="button" onClick={reset}>Reset expedition</button></div></header>
    <section className="compact-table">
      <aside className="match-rail"><div className="compass-status"><span className="pulse-dot" style={{ background: active.color }} /> <span>{game.winner ? "FINISHED" : "ACTIVE TURN"}</span></div><h2>{game.winner ? (game.winner === "shared" ? "Shared expedition" : `${CLANS[game.winner].name} prevails`) : `${active.name}'s turn`}</h2><p>{game.winner ? "The table recorded a final score or last-front victory." : mode.objective}</p><div className="match-player-stack">{effectiveRoster.map((clan) => <article key={clan} className={`match-player ${game.turn === clan && !game.winner ? "is-turn" : ""}`} style={{ "--clan": CLANS[clan].color } as React.CSSProperties}><img src={CLANS[clan].portrait} alt="" /><div><strong>{CLANS[clan].name}</strong><span>{game.tokens.filter((token) => token.owner === clan).length} tokens · {game.scores[clan]} score</span></div><em>{game.scores[clan]}</em></article>)}</div><div className="rules-ledger"><strong>Table state</strong><span>{mode.actionLimit}-action limit</span><span>{mode.interaction.toUpperCase()} interaction</span><span>{mode.shape.toUpperCase()} layout</span></div></aside>
      <section className="compact-board-panel"><div className="board-caption"><span>{mode.boardLabel}</span><strong>Action {game.actionCount} / {mode.actionLimit}</strong></div><div className={`compact-board shape-${mode.shape}`} style={{ "--rows": mode.rows, "--cols": mode.cols } as React.CSSProperties}><div className="chart-stamp"><span>ICEBOUND</span><b>SECTOR {String(modeId).padStart(2, "0")}</b></div>{cells.map((cell) => { const token = occupied(game, cell.id); const selected = game.selected === token?.id; const isLegal = legal.includes(cell.id); const isRing = mode.shape === "ring"; const style = isRing ? { "--angle": `${(cell.col / mode.cols) * 360}deg` } as React.CSSProperties : { gridColumn: cell.col + 1, gridRow: cell.row + 1 }; return <button type="button" key={cell.id} onClick={() => commit(actOnCell(game, cell.id))} aria-label={`${cell.label}${token ? `, ${CLANS[token.owner].name}` : ", open"}`} className={`compact-cell ${token ? "occupied" : ""} ${isLegal ? "legal" : ""} ${selected ? "selected" : ""}`} style={style}><span className="cell-label">{mode.shape === "map" ? `P${cell.col + 1 + cell.row * mode.cols}` : ""}</span>{token && <span className="compact-token" style={{ "--piece": CLANS[token.owner].color, backgroundImage: `url(${CLANS[token.owner].portrait})` } as React.CSSProperties}><b>{token.strength > 1 ? token.strength : ""}</b></span>}</button>; })}{mode.shape === "ring" && <div className="ring-core"><span>ICE</span><strong>{modeId}</strong></div>}</div><div className="event-tape"><span>FIELD NOTE</span><p>{game.lastEvent}</p></div></section>
      <aside className="rules-panel"><span className="eyebrow">ROUTE BRIEFING</span><h2>Claim the ice</h2><ol>{mode.mechanics.map((mechanic) => <li key={mechanic}>{mechanic}</li>)}</ol><div className="debug-box"><strong>Rule status</strong><span>{mode.historicalNote}</span><span>Selected token: {game.selected ?? "—"}</span><span>Legal targets: {legal.length}</span></div><p className="history-note">This local table follows the declared board contract. Historical routes identify their selected edition or reconstruction limit; Originals provide their full modern contract.</p></aside>
    </section>
  </main>;
}
