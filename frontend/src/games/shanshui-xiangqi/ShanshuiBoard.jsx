import React, { useMemo, useState } from 'react';
import { ARMY_META, pointKey, teamOf, ROLE_LABELS } from './rules.js';
import { POINTS, pixelPoint, spriteFor, PIECE_SIZE, BOARD_SIZE, pieceLabel } from './presentation.js';

export function ShanshuiBoard({ state, actions = [], selected, onPoint, theme = 'dark', rotation = 90, assets, editable = false, interactive = true }) {
  const [zoom, setZoom] = useState(1);
  const byPoint = useMemo(() => new Map(state.pieces.map(p => [pointKey(p), p])), [state.pieces]);
  const targets = useMemo(() => new Map(actions.filter(a => a.pieceId === selected && a.to).map(a => [pointKey(a.to), a])), [actions, selected]);
  const chosen = state.pieces.find(p => p.id === selected);
  const last = state.lastMove;
  const root = assets?.root || '/assets/games/shanshui-xiangqi';
  return <div className="shanshui-board-frame">
    <div className="shanshui-board-scroll" aria-label="Scrollable board. Use zoom for larger touch targets.">
      <svg viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`} style={{ width: `${zoom * 100}%` }} className="shanshui-board" aria-label="Shanshui Xiangqi: 13 by 13 intersections" role="group">
        <g transform={`rotate(${rotation} 768 768)`}>
          <image href={`${root}/board-${theme}.webp`} width="1536" height="1536"/>
          {POINTS.map(point => {
            const key = pointKey(point), p = pixelPoint(point), piece = byPoint.get(key), target = targets.get(key), active = piece?.id === selected;
            const wasLast = last?.kind !== 'pass' && ((last?.from && pointKey(last.from) === key) || (last?.to && pointKey(last.to) === key));
            const label = `${piece ? pieceLabel(piece) : 'Empty point'}, row ${point.row + 1}, column ${point.col + 1}${target ? ', legal destination' : ''}`;
            return <g key={key} data-shanshui-point={key} role="button" tabIndex={interactive && (piece || target || editable) ? 0 : -1} aria-label={label} aria-disabled={!interactive} onClick={() => interactive && onPoint?.(point)} onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (interactive) onPoint?.(point); }
              if (event.key.startsWith('Arrow')) { event.preventDefault(); const offsets = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }; let [dr, dc] = offsets[event.key]; for (let angle = 0; angle < rotation; angle += 90) [dr, dc] = [-dc, dr]; const next = event.currentTarget.ownerSVGElement.querySelector(`[data-shanshui-point="${point.row + dr},${point.col + dc}"]`); next?.focus(); }
            }}>
              <rect x={p.x - 53} y={p.y - 53} width="106" height="106" fill="transparent"/>
              {wasLast && <circle cx={p.x} cy={p.y} r="49" fill="#f1ce6e33" stroke="#e6bc56" strokeWidth="5"/>}
              {active && <circle cx={p.x} cy={p.y} r="53" fill="#9de6ff55" stroke="#effaff" strokeWidth="8"/>}
              {piece && <g transform={`rotate(${-rotation} ${p.x} ${p.y})`} pointerEvents="none">
                <image href={spriteFor(piece, assets)} x={p.x - PIECE_SIZE / 2} y={p.y - PIECE_SIZE / 2} width={PIECE_SIZE} height={PIECE_SIZE}/>
                {piece.role.endsWith('soldier') && <g><circle cx={p.x + 34} cy={p.y + 33} r="18" fill={piece.role.startsWith('mountain') ? '#596c81' : '#126c9b'} stroke="white" strokeWidth="3"/>
                  {piece.role.startsWith('mountain') ? <path d={`M${p.x + 24} ${p.y + 39}l10-18 10 18z`} fill="white"/> : <path d={`M${p.x + 23} ${p.y + 29}q5-6 10 0t10 0 M${p.x + 23} ${p.y + 37}q5-6 10 0t10 0`} fill="none" stroke="white" strokeWidth="3"/>}
                </g>}
              </g>}
              {target && <circle cx={p.x} cy={p.y} r={piece ? 51 : 15} fill={piece ? '#ff956d22' : '#d7fbff'} stroke={piece ? '#ffb28a' : '#177d9b'} strokeWidth={piece ? 7 : 4}/>}
              <rect x={p.x - 53} y={p.y - 53} width="106" height="106" fill="transparent"/>
            </g>;
          })}
          {chosen?.role.endsWith('soldier') && (() => {
            const p = pixelPoint(chosen), m = ARMY_META[chosen.army], dx = chosen.role.startsWith('mountain') ? m.colSign * 74 : 0, dy = chosen.role.startsWith('river') ? m.rowSign * 74 : 0;
            return <path d={`M${p.x} ${p.y}l${dx} ${dy}`} stroke="#ffe49a" strokeWidth="9" markerEnd="url(#shanshui-arrow)" pointerEvents="none"/>;
          })()}
        </g>
        <defs><marker id="shanshui-arrow" markerWidth="5" markerHeight="5" refX="3.5" refY="2.5" orient="auto"><path d="M0 0L5 2.5 0 5" fill="#ffe49a"/></marker></defs>
      </svg>
    </div>
    <div className="shanshui-zoom"><span>{zoom === 1 ? 'Pinpoint moves · zoom for larger targets' : 'Scroll to pan · arrow keys move focus'}</span><button onClick={() => setZoom(Math.max(1, zoom - .5))} aria-label="Zoom out">−</button><button onClick={() => setZoom(Math.min(3, zoom + .5))} aria-label="Zoom in">+</button><button onClick={() => setZoom(1)}>Fit</button></div>
  </div>;
}
