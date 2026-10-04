import { useMemo, useRef, useState } from 'react';
import { SanninBoard } from './SanninShogiApp.jsx';
import { createInitialState, FACTIONS, FACTION_LABELS, TYPES, TYPE_LABELS } from './rules.js';
import { HEX_CELLS, HEX_CELL_BY_ID } from './hex.js';
import { PIECE_SIZE } from './boardGeometry.js';
import { PLACEMENT_KEY, readPiecePlacement, placementCss, shiftPlacement } from './piecePlacement.js';
import './sanninPiecePlacement.css';

export default function SanninPiecePlacement() {
  const [map, setMap] = useState(readPiecePlacement);
  const [history, setHistory] = useState([]);
  const [cell, setCell] = useState('0,0');
  const [scope, setScope] = useState('cell');
  const [preview, setPreview] = useState('all');
  const [faction, setFaction] = useState('green');
  const [type, setType] = useState('pawn');
  const [step, setStep] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [fullArtwork, setFullArtwork] = useState(false);
  const [status, setStatus] = useState('Choose a hex, then drag its wooden piece or use the arrows.');
  const drag = useRef(null);
  const exportRef = useRef(null);
  const state = useMemo(() => {
    const original = createInitialState();
    if (preview === 'starting') return original;
    const cells = preview === 'one' ? [HEX_CELL_BY_ID[cell]] : HEX_CELLS;
    return { ...original, pieces: cells.map(c => ({ id: `probe-${c.id}`, owner: faction, type, cell: c.id, status: 'board', promoted: false })) };
  }, [cell, faction, type, preview]);
  const selected = { kind: 'piece', id: state.pieces.find(p => p.cell === cell)?.id };
  const idsFor = id => scope === 'all' ? HEX_CELLS.map(c => c.id) : scope === 'row' ? HEX_CELLS.filter(c => c.r === HEX_CELL_BY_ID[id].r).map(c => c.id) : [id];
  const point = map[cell] || { x: 0, y: 0 };
  const css = placementCss(map);
  function save(next) {
    setMap(next);
    try { localStorage.setItem(PLACEMENT_KEY, JSON.stringify(next)); }
    catch { setStatus('Browser storage unavailable. Copy CSS to keep your changes.'); }
  }
  function change(next) { setHistory(h => [...h.slice(-49), map]); save(next); setStatus('Placement saved in this browser. Copy CSS when ready.'); }
  function nudge(dx, dy) { change(shiftPlacement(map, idsFor(cell), dx, dy)); }
  function localPoint(event, target) {
    const svg = target.ownerSVGElement;
    const matrix = target.getScreenCTM();
    if (!svg || !matrix) return null;
    const p = svg.createSVGPoint(); p.x = event.clientX; p.y = event.clientY;
    return p.matrixTransform(matrix.inverse());
  }
  function pointerDown(event, c) {
    if (event.button !== 0 || !state.pieces.some(p => p.cell === c.id)) return;
    const target = event.currentTarget;
    const start = localPoint(event, target);
    if (!start) return;
    setCell(c.id);
    target.setPointerCapture(event.pointerId);
    drag.current = { start, target, map, ids: idsFor(c.id), moved: false, next: map };
    event.preventDefault();
  }
  function pointerMove(event) {
    const d = drag.current;
    if (!d) return;
    const p = localPoint(event, d.target);
    if (!p) return;
    const dx = p.x - d.start.x, dy = p.y - d.start.y;
    if (Math.abs(dx) + Math.abs(dy) < .1 && !d.moved) return;
    d.moved = true;
    d.next = shiftPlacement(d.map, d.ids, dx, dy);
    setMap(d.next);
  }
  function pointerUp(event) {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (d.target.hasPointerCapture(event.pointerId)) d.target.releasePointerCapture(event.pointerId);
    if (d.moved) {
      setHistory(h => [...h.slice(-49), d.map]);
      save(d.next);
      setStatus('Placement saved in this browser. Copy CSS when ready.');
    }
  }
  function undo() {
    if (!history.length) return;
    save(history.at(-1)); setHistory(h => h.slice(0, -1)); setStatus('Last placement change undone.');
  }
  async function copy() {
    try { await navigator.clipboard.writeText(css); setStatus('CSS copied. Send these values back to make them permanent.'); }
    catch { exportRef.current.focus(); exportRef.current.select(); setStatus('CSS selected. Use your browser’s Copy command.'); }
  }
  return <main className="sannin-shell sannin-placement">
    <header className="sannin-battle-toolbar">
      <div className="sannin-battle-brand"><p className="sannin-kicker">Wooden piece workshop</p><h1>Sannin Shogi · align the pieces</h1></div>
      <a className="sannin-placement-link" href="/?game=sannin-shogi&skipLoader=1" target="_blank" rel="noopener noreferrer">Open battle ↗</a>
    </header>
    <div className="sannin-placement-body">
      <section className="sannin-placement-stage" aria-label="Wooden piece alignment board">
        <SanninBoard state={state} selected={selected} legalActions={[]} onCell={setCell} onCancel={() => setStatus('Choose another hex to adjust.')} zoom={zoom} fullArtwork={fullArtwork} piecePlacement={map} onPiecePointerDown={pointerDown} onPiecePointerMove={pointerMove} onPiecePointerUp={pointerUp} />
        <footer className="sannin-placement-footer"><span>Hex {cell} · X {point.x}px · Y {point.y}px</span><div className="sannin-zoom"><button onClick={() => setZoom(100)}>Fit</button><button aria-label="Zoom board out" disabled={zoom === 100} onClick={() => setZoom(z => Math.max(100, z - 25))}>−</button><output>{zoom}%</output><button aria-label="Zoom board in" disabled={zoom === 200} onClick={() => setZoom(z => Math.min(200, z + 25))}>+</button><button aria-pressed={fullArtwork} onClick={() => { setFullArtwork(v => !v); setZoom(100); }}>{fullArtwork ? 'Battlefield' : 'Full artwork'}</button></div></footer>
      </section>
      <aside className="sannin-placement-controls" aria-label="Placement controls">
        <p className="sannin-kicker">Same pieces. Same scale.</p>
        <p className="sannin-placement-intro">Drag a wooden hex into its printed hex. These are the actual battle pieces, at the same {PIECE_SIZE} × {PIECE_SIZE} board units. The board and pieces resize together.</p>
        <label>Preview<select value={preview} onChange={e => setPreview(e.target.value)}><option value="all">Wooden piece in every hex</option><option value="one">One wooden piece</option><option value="starting">Actual starting armies</option></select></label>
        {preview !== 'starting' && <div className="sannin-placement-fields"><label>Team<select value={faction} onChange={e => setFaction(e.target.value)}>{FACTIONS.map(f => <option key={f} value={f}>{FACTION_LABELS[f]} · {f}</option>)}</select></label><label>Piece<select value={type} onChange={e => setType(e.target.value)}>{TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select></label></div>}
        <label>Selected hex<select value={cell} onChange={e => setCell(e.target.value)}>{HEX_CELLS.map(c => <option key={c.id}>{c.id}</option>)}</select></label>
        <label>Apply adjustments to<select value={scope} onChange={e => setScope(e.target.value)}><option value="cell">Selected hex only</option><option value="row">Selected row</option><option value="all">All 127 hexes</option></select></label>
        <div className="sannin-placement-fields"><label>X offset<input type="number" step="0.25" min="-120" max="120" value={point.x} onChange={e => { if (e.target.value !== '' && Number.isFinite(e.target.valueAsNumber)) nudge(e.target.valueAsNumber - point.x, 0); }} /></label><label>Y offset<input type="number" step="0.25" min="-120" max="120" value={point.y} onChange={e => { if (e.target.value !== '' && Number.isFinite(e.target.valueAsNumber)) nudge(0, e.target.valueAsNumber - point.y); }} /></label></div>
        <div className="sannin-placement-nudge" aria-label="Nudge wooden piece"><button aria-label="Move piece left" onClick={() => nudge(-step, 0)}>←</button><button aria-label="Move piece up" onClick={() => nudge(0, -step)}>↑</button><button aria-label="Move piece down" onClick={() => nudge(0, step)}>↓</button><button aria-label="Move piece right" onClick={() => nudge(step, 0)}>→</button><label>Step<select value={step} onChange={e => setStep(Number(e.target.value))}><option value="0.25">0.25</option><option value="1">1</option><option value="5">5</option></select></label></div>
        <div className="sannin-placement-buttons"><button disabled={!history.length} onClick={undo}>Undo</button><button onClick={() => { const next = { ...map }; idsFor(cell).forEach(id => delete next[id]); change(next); }}>Reset {scope === 'cell' ? 'hex' : scope === 'row' ? 'row' : 'all'}</button></div>
        <p className="sannin-placement-status" role="status">{status}</p>
        <button className="sannin-primary" onClick={copy}>Copy CSS values</button>
        <textarea ref={exportRef} aria-label="Piece placement CSS" readOnly value={css} onFocus={e => e.target.select()} spellCheck={false} />
        <p className="sannin-placement-note">Saved locally, and previewed in battle on this browser. Send the copied CSS back to apply your alignment for every player. Offsets follow the hex grid at every screen size; the grid itself stays fixed.</p>
      </aside>
    </div>
  </main>;
}
