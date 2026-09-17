import { useState, useEffect, useMemo } from "react";
import {
  FACTION_COLORS,
  FACTION_LABELS,
  FACTIONS,
  ROLE_LABELS,
  ROLES,
  applyAction,
  createInitialState,
  getLegalActions,
  getBoardPiece,
  squareKey,
  __testing,
} from "./rules.js";
import "./sanYouQi.css";

const {
  RANK_COUNT, FILE_COUNT, RIVER_RANK, HOME_RANK, CENTRAL_FILE,
  PALACE_LEFT, PALACE_RIGHT, PALACE_FRONT,
} = __testing;

// --- Board geometry --------------------------------------------------------

/** Each arm of the Y is rotated 120 degrees around the central junction. */
const SECTOR_ANGLES = { red: -90, green: 30, blue: 150 };

const CELL_SIZE = 54;
const CENTER_X = 520;
const CENTER_Y = 520;

/** Convert logical (sector, rank, file) to screen (x, y). */
function nodeToScreen(node) {
  const { sector, rank, file } = node;
  // Rank moves along the arm axis (away from the river toward home).
  const armLength = rank * CELL_SIZE;
  // File moves perpendicular to the arm.
  const perp = (file - CENTRAL_FILE) * CELL_SIZE;
  const angle = (SECTOR_ANGLES[sector] * Math.PI) / 180;
  const x = CENTER_X + armLength * Math.sin(angle) + perp * Math.cos(angle);
  const y = CENTER_Y - armLength * Math.cos(angle) + perp * Math.sin(angle);
  return { x, y };
}

/** All logical nodes on the board. */
function allLogicalNodes() {
  const out = [];
  for (const sector of FACTIONS) {
    for (let rank = 0; rank < RANK_COUNT; rank += 1) {
      for (let file = 0; file < FILE_COUNT; file += 1) {
        out.push(__testing.logicalNode(sector, rank, file));
      }
    }
  }
  return out;
}

/**
 * Build the set of lines (grid + palace X + river) as SVG elements.
 */
function BoardGrid() {
  const lines = [];
  const polylines = [];

  for (const sector of FACTIONS) {
    // Rank lines (horizontal across files within the sector)
    for (let rank = 0; rank < RANK_COUNT; rank += 1) {
      const a = nodeToScreen(__testing.logicalNode(sector, rank, 0));
      const b = nodeToScreen(__testing.logicalNode(sector, rank, FILE_COUNT - 1));
      lines.push(
        <line key={`r-${sector}-${rank}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke="#554433" strokeWidth={1} />
      );
    }
    // File lines (from river to home rank within the sector)
    for (let file = 0; file < FILE_COUNT; file += 1) {
      const a = nodeToScreen(__testing.logicalNode(sector, 0, file));
      const b = nodeToScreen(__testing.logicalNode(sector, HOME_RANK, file));
      lines.push(
        <line key={`f-${sector}-${file}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke="#554433" strokeWidth={1} />
      );
    }
    // Palace X diagonals: (2,3)-(3,4)-(4,5) and (2,5)-(3,4)-(4,3)
    const p1 = nodeToScreen(__testing.logicalNode(sector, PALACE_FRONT, PALACE_LEFT));
    const p2 = nodeToScreen(__testing.logicalNode(sector, PALACE_FRONT + 1, CENTRAL_FILE));
    const p3 = nodeToScreen(__testing.logicalNode(sector, PALACE_FRONT, PALACE_RIGHT));
    const p4 = nodeToScreen(__testing.logicalNode(sector, HOME_RANK, PALACE_LEFT));
    const p5 = nodeToScreen(__testing.logicalNode(sector, HOME_RANK, PALACE_RIGHT));
    polylines.push(
      <polyline key={`px1-${sector}`}
        points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p5.x},${p5.y}`}
        stroke="#662211" strokeWidth={2} fill="none" />,
      <polyline key={`px2-${sector}`}
        points={`${p3.x},${p3.y} ${p2.x},${p2.y} ${p4.x},${p4.y}`}
        stroke="#662211" strokeWidth={2} fill="none" />
    );
  }

  // River lines (dashed) at rank 0
  for (const sector of FACTIONS) {
    const a = nodeToScreen(__testing.logicalNode(sector, RIVER_RANK, 0));
    const b = nodeToScreen(__testing.logicalNode(sector, RIVER_RANK, FILE_COUNT - 1));
    lines.push(
      <line key={`river-${sector}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
        stroke="#4a86e8" strokeWidth={2} strokeDasharray="6,4" />
    );
  }

  // Central junction curved connectors
  for (const sector of FACTIONS) {
    const junction = nodeToScreen(__testing.logicalNode(sector, RIVER_RANK, CENTRAL_FILE));
    for (const other of FACTIONS.filter((s) => s !== sector)) {
      const target = nodeToScreen(__testing.logicalNode(other, RIVER_RANK, CENTRAL_FILE));
      const midX = (junction.x + target.x) / 2;
      const midY = (junction.y + target.y) / 2;
      const ctrlX = midX + (target.y - junction.y) * 0.15;
      const ctrlY = midY - (target.x - junction.x) * 0.15;
      lines.push(
        <path key={`jx-${sector}-${other}`}
          d={`M ${junction.x} ${junction.y} Q ${ctrlX} ${ctrlY} ${target.x} ${target.y}`}
          stroke="#888" strokeWidth={1.5} fill="none" strokeDasharray="3,3" />
      );
    }
  }

  return [...lines, ...polylines];
}

/** Render a chess piece as an inline SVG icon. */
function PieceIcon({ role, owner, selected }) {
  const color = FACTION_COLORS[owner];
  const ring = selected ? <circle cx="16" cy="16" r="18" fill="none" stroke="#fff" strokeWidth="3" /> : null;

  let shape;
  switch (role) {
    case "general":
      shape = <circle cx="16" cy="16" r="12" fill={color} stroke="#000" strokeWidth={2} />;
      break;
    case "advisor":
      shape = <rect x="6" y="6" width="20" height="20" fill={color} stroke="#000" strokeWidth={2} transform="rotate(45 16 16)" />;
      break;
    case "elephant":
      shape = <ellipse cx="16" cy="16" rx="12" ry="8" fill={color} stroke="#000" strokeWidth={2} transform="rotate(30 16 16)" />;
      break;
    case "horse":
      shape = <path d="M12 4 L26 4 L22 26 L14 26 Z" fill={color} stroke="#000" strokeWidth={2} />;
      break;
    case "chariot":
      shape = <rect x="5" y="8" width="22" height="16" fill={color} stroke="#000" strokeWidth={2} />;
      break;
    case "cannon":
      shape = <rect x="6" y="7" width="20" height="18" fill={color} stroke="#000" strokeWidth={2} rx={4} />;
      break;
    case "soldier":
      shape = <circle cx="16" cy="16" r="8" fill={color} stroke="#000" strokeWidth={2} />;
      break;
    case "fire":
      shape = <path d="M13 5 L19 5 L22 14 L19 11 L13 14 Z" fill={color} stroke="#000" strokeWidth={2} />;
      break;
    case "flag":
      shape = <rect x="8" y="6" width="16" height="20" fill={color} stroke="#000" strokeWidth={2} rx={2} />;
      break;
    default:
      shape = <circle cx="16" cy="16" r="8" fill={color} />;
  }

  return (
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      {shape}
      {ring}
    </svg>
  );
}

/** Interactive board component. */
function Board({ state, selectedPiece, selectedTargets, onSelectPiece, onMoveAttempt }) {
  const nodes = useMemo(() => allLogicalNodes(), []);
  const viewBox = "0 0 1040 1040";

  return (
    <div className="san-you-qi-board-wrapper">
      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        className="san-you-qi-board-svg"
      >
        <rect x="0" y="0" width="1040" height="1040" fill="#f0e6d2" />
        <BoardGrid />
        {nodes.map((node) => {
          const pos = nodeToScreen(node);
          const piece = getBoardPiece(state, node);
          const isSelected =
            selectedPiece &&
            selectedPiece.owner === state.turn &&
            node.sector === selectedPiece.node?.sector &&
            node.rank === selectedPiece.node?.rank &&
            node.file === selectedPiece.node?.file;
          const isTarget = selectedTargets.some((t) =>
            t.sector === node.sector && t.rank === node.rank && t.file === node.file
          );
          return (
            <g key={`${squareKey(node)}`} transform={`translate(${pos.x} ${pos.y})`}>
              <circle
                r={isSelected ? 6 : isTarget ? 7 : 3}
                className={isTarget ? "san-you-qi-node san-you-qi-node--target" : "san-you-qi-node"}
                data-testid={`node-${node.sector}-${node.rank}-${node.file}`}
                fill={isSelected ? "#fff" : isTarget ? "#e74c3c" : "#333"}
                stroke={isTarget ? "#fff" : "#333"} strokeWidth="2"
                onClick={() => {
                  if (piece && piece.owner === state.turn) {
                    onSelectPiece(piece);
                  } else if (selectedPiece && isTarget) {
                    onMoveAttempt(node);
                  }
                }}
                style={{ cursor: "pointer", transition: "all 0.15s" }}
              />
              {piece && (
                <foreignObject x={-16} y={-16} width={32} height={32}>
                  <button
                    type="button"
                    className="san-you-qi-piece-button"
                    data-testid={`piece-${piece.id}`}
                    onClick={() => {
                      if (piece.owner === state.turn) {
                        onSelectPiece(piece);
                      } else if (selectedPiece) {
                        onMoveAttempt(node);
                      }
                    }}
                    aria-label={`${FACTION_LABELS[piece.owner]} ${ROLE_LABELS[piece.role]}`}
                    title={`${FACTION_LABELS[piece.owner]} ${ROLE_LABELS[piece.role]}`}
                  >
                    <PieceIcon role={piece.role} owner={piece.owner} selected={isSelected} />
                  </button>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Scroll-themed rulebook side panel. */
function Rulebook({ state, selectedPiece, selectedTargets }) {
  const currentPlayer = FACTION_LABELS[state.turn];
  const army = (faction) =>
    state.pieces
      .filter((p) => p.owner === faction && p.status === "board")
      .reduce((acc, p) => {
        acc[p.role] = (acc[p.role] || 0) + 1;
        return acc;
      }, {});

  const armies = FACTIONS.map((f) => army(f));

  return (
    <div className="san-you-qi-rulebook">
      <div className="scroll-header">
        <span className="scroll-label">ARCTIC DOMINION HISTORICAL SCROLL</span>
      </div>
      <h2 className="scroll-title">SAN YOU QI — THREE FRIENDS CHESS</h2>
      <p className="scroll-subtitle">3 players | Qing dynasty | Y-board with mountain, city and sea</p>

      <div className="info-boxes">
        <div className="info-box"><span className="info-label">PLAYERS</span><span className="info-value">3</span></div>
        <div className="info-box"><span className="info-label">BOARD</span><span className="info-value">Y-shaped + terrain</span></div>
        <div className="info-box"><span className="info-label">FORCE</span><span className="info-value">18 each / 54 total</span></div>
        <div className="info-box"><span className="info-label">CHANCE</span><span className="info-value">None</span></div>
      </div>

      <div className="rules-columns">
        <div className="rules-column">
          <h3>SETUP</h3>
          <ul>
            <li>Y-shaped board with three Xiangqi arms converging on central terrain.</li>
            <li>Each kingdom: 18 pieces — 1 General, 2 Advisors, 2 Elephants, 2 Horses, 2 Chariots, 2 Cannons, 3 Soldiers, 2 Fire, 2 Flag.</li>
            <li>Two Soldiers replaced by Fire; two Flags added at front palace corners.</li>
          </ul>
          <h3>TERRAIN</h3>
          <ul>
            <li>Sea: Chariot and Horse may not pass.</li>
            <li>Mountain: Cannon may not pass.</li>
            <li>City/city wall: Cannon may not pass.</li>
            <li>Ordinary Xiangqi blocking still applies.</li>
          </ul>
        </div>
        <div className="rules-column">
          <h3>SPECIAL UNITS</h3>
          <ul>
            <li><strong>Fire</strong>: one diagonal step forward; never retreats.</li>
            <li><strong>Flag</strong>: two steps straight forward in own territory; after leaving, exactly two orthogonal steps and no return home.</li>
          </ul>
          <h3>STANDARD XIANGQI CORE</h3>
          <ul>
            <li>General: 1 orthogonal step in palace.</li>
            <li>Advisor: palace diagonal only.</li>
            <li>Elephant: 2 diagonal, blockable eye, no river.</li>
            <li>Horse: blockable L-move.</li>
            <li>Chariot: orthogonal slide.</li>
            <li>Cannon: one-screen capture.</li>
            <li>Soldier: forward before river, sideways after.</li>
          </ul>
        </div>
      </div>

      <div className="rules-section">
        <h3>PLAY AND VICTORY</h3>
        <ul>
          <li>Red (Shu) first; turns proceed counterclockwise: Red, Green, Blue.</li>
          <li>Check/checkmate follow Xiangqi rules.</li>
          <li>When a General is mated, it is removed; the mating player takes control of surviving pieces.</li>
          <li>Last surviving General wins.</li>
        </ul>
        <div className="disputed-rule">
          <label>DISPUTED FLAG RULE</label>
          <span>Some English summaries say the Flag becomes a Chariot. This edition follows the stronger Chinese-source rule: exactly two orthogonal steps outside home.</span>
        </div>
      </div>

      <div className="status-bar">
        <span className="turn-indicator">{currentPlayer}'s turn</span>
        {selectedPiece && (
          <span className="selected-piece">
            Selected: {FACTION_LABELS[selectedPiece.owner]} {ROLE_LABELS[selectedPiece.role]}
            ({selectedTargets.length} legal targets)
          </span>
        )}
        {state.outcome && <span className="selected-piece">{state.outcome.message}</span>}
      </div>
    </div>
  );
}

export default function SanYouQiApp({ onExit }) {
  const [state, setState] = useState(() => createInitialState());
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [selectedTargets, setSelectedTargets] = useState([]);

  useEffect(() => {
    if (selectedPiece) {
      setSelectedTargets(getLegalActions(state)
        .filter((action) => action.pieceId === selectedPiece.id)
        .map((action) => action.to));
    }
  }, [state, selectedPiece]);

  const handleSelectPiece = (piece) => {
    if (piece.owner !== state.turn) return;
    setSelectedPiece(piece);
  };

  const handleMoveAttempt = (node) => {
    if (!selectedPiece) return;
    const result = applyAction(state, {
      type: "move",
      pieceId: selectedPiece.id,
      from: selectedPiece.node,
      to: node,
    });
    if (result.error) {
      // Illegal move — just deselect
      setSelectedPiece(null);
      setSelectedTargets([]);
      return;
    }
    setState(result.state);
    setSelectedPiece(null);
    setSelectedTargets([]);
  };

  const handleReset = () => {
    setState(createInitialState());
    setSelectedPiece(null);
    setSelectedTargets([]);
  };

  return (
    <div className="san-you-qi-app">
      <div className="san-you-qi-toolbar" aria-label="San You Qi controls">
        <button type="button" className="san-you-qi-toolbar-button" onClick={handleReset}>
          Reset
        </button>
        {onExit && (
          <button type="button" className="san-you-qi-toolbar-button" onClick={onExit}>
            All Games
          </button>
        )}
      </div>
      <div className="san-you-qi-layout">
        <div className="san-you-qi-board-pane">
          <Board
            state={state}
            selectedPiece={selectedPiece}
            selectedTargets={selectedTargets}
            onSelectPiece={handleSelectPiece}
            onMoveAttempt={handleMoveAttempt}
          />
        </div>
        <div className="san-you-qi-rules-pane">
          <Rulebook
            state={state}
            selectedPiece={selectedPiece}
            selectedTargets={selectedTargets}
          />
        </div>
      </div>
    </div>
  );
}
