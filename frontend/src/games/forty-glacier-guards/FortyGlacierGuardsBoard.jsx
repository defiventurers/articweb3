import { useMemo, useState } from "react";
import { EDGES, NODES, getLegalActions } from "./rules.js";

const NODE_BY_ID = Object.fromEntries(NODES.map((node) => [node.id, node]));
const BASE_SIZE = 620;

export function FortyGlacierGuardsBoard({ state, selectedNode, onNode, interactive = true, viewerSide = state.currentPlayer }) {
  const [zoom, setZoom] = useState(() => typeof window !== "undefined" && window.innerWidth < 720 ? 0.82 : 1);
  const legalActions = useMemo(
    () => interactive && viewerSide === state.currentPlayer ? getLegalActions(state, viewerSide) : [],
    [interactive, state, viewerSide]
  );
  const legalOrigins = new Set(legalActions.filter((action) => action.from && action.type !== "end-chain").map((action) => action.from));
  const legalTargets = new Set(legalActions.filter((action) => action.to).map((action) => action.to));
  const captureTargets = new Set(legalActions.filter((action) => action.type === "capture").map((action) => action.to));
  const activeCaptureLine = state.chainFrom ? legalActions.filter((action) => action.type === "capture") : [];

  return (
    <div className="fgg-board-system">
      <div className="fgg-board-tools" aria-label="Board zoom controls">
        <button type="button" onClick={() => setZoom((value) => Math.max(0.7, Number((value - 0.15).toFixed(2))))} aria-label="Zoom board out">−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((value) => Math.min(1.45, Number((value + 0.15).toFixed(2))))} aria-label="Zoom board in">+</button>
        <button type="button" onClick={() => setZoom(1)} aria-label="Reset board zoom">Reset</button>
      </div>
      <div className="fgg-board-viewport">
        <div className="fgg-board-scale" style={{ width: `${BASE_SIZE * zoom}px`, height: `${BASE_SIZE * zoom}px` }}>
          <div className="fgg-board" role="grid" aria-label="Forty Glacier Guards board" style={{ transform: `scale(${zoom})` }}>
            <svg className="fgg-board-lines" viewBox="0 0 100 100" aria-hidden="true">
              <defs>
                <filter id="fggLineGlow"><feGaussianBlur stdDeviation="0.38" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              {EDGES.map(([from, to]) => {
                const a = NODE_BY_ID[from];
                const b = NODE_BY_ID[to];
                const chain = activeCaptureLine.some((action) => [action.from, action.over, action.to].includes(from) && [action.from, action.over, action.to].includes(to));
                return <line className={chain ? "chain-line" : ""} key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
              })}
            </svg>
            <div className="fgg-board-ice" aria-hidden="true" />
            <span className="fgg-axis top" aria-hidden="true">EMBER FRONT</span>
            <span className="fgg-axis bottom" aria-hidden="true">AURORA FRONT</span>
            {NODES.map((node) => {
              const piece = state.board[node.id];
              const selected = selectedNode === node.id || state.chainFrom === node.id;
              const legal = interactive && (legalOrigins.has(node.id) || legalTargets.has(node.id));
              const capture = captureTargets.has(node.id);
              const actionHint = capture ? " capture target" : legal ? " legal move" : "";
              return (
                <button
                  key={node.id}
                  type="button"
                  role="gridcell"
                  disabled={!interactive}
                  aria-pressed={selected}
                  className={`fgg-node ${piece ? `piece-${piece}` : "empty"} ${selected ? "selected" : ""} ${legal ? "legal" : ""} ${capture ? "capture" : ""}`}
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  onClick={() => onNode(node.id)}
                  aria-label={`${node.id}${piece ? ` occupied by ${piece}` : " empty"}${selected ? " selected" : ""}${actionHint}`}
                >
                  {piece && (
                    <span className={`fgg-piece fgg-piece-${piece}`}>
                      <i className="guard-crest" />
                      <b>{piece === "aurora" ? "A" : "E"}</b>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
