import { useMemo, useState } from "react";
import {
  FACTION_COLORS,
  FACTION_LABELS,
  FACTIONS,
  ROLE_LABELS,
  applyAction,
  createInitialState,
  getLegalActions,
  getNodeLabel,
  getNodePoint,
  isInCheck,
} from "./rules.js";
import { ALL_NODE_IDS, parseArmNode } from "./topology.js";
import "./sanYouQi.css";

const BOARD_IMAGE = "/assets/heritage-arcade/board/sanyou-arctic-board.png";
const TOKEN_ROOT = "/assets/heritage-arcade/tokens";

const ROLE_FILE = Object.freeze({
  general: "general",
  advisor: "guard",
  elephant: "elephant",
  horse: "horse",
  chariot: "chariot",
  cannon: "cannon",
  soldier: "soldier",
  fire: "fire",
  flag: "flag",
});

const STATIC_TEAM_ASSETS = Object.freeze({
  blue: Object.fromEntries(
    Object.entries(ROLE_FILE).map(([role, file]) => [
      role,
      `${TOKEN_ROOT}/blue_team_SEfacing_${file}.webp`,
    ]),
  ),
  green: Object.fromEntries(
    Object.entries(ROLE_FILE).map(([role, file]) => [
      role,
      `${TOKEN_ROOT}/green_team_SWfacing_${file}.webp`,
    ]),
  ),
});

function redFacingForNode(node) {
  const arm = parseArmNode(node);
  if (arm?.faction === "red") {
    if (arm.lane <= 4) return "NWfacing";
    if (arm.lane === 5) return "backfacing";
    return "NEfacing";
  }
  if (arm?.faction === "blue") return "NWfacing";
  if (arm?.faction === "green") return "NEfacing";

  const point = getNodePoint(node);
  if (!point) return "backfacing";
  if (point[0] < 0.485) return "NWfacing";
  if (point[0] > 0.515) return "NEfacing";
  return "backfacing";
}

function pieceAsset(piece) {
  const roleFile = ROLE_FILE[piece.role];
  if (piece.faction === "red") {
    return `${TOKEN_ROOT}/red_team_${redFacingForNode(piece.node)}_${roleFile}.webp`;
  }
  return STATIC_TEAM_ASSETS[piece.faction]?.[piece.role] || "";
}

function ownerShort(owner) {
  return owner === "red" ? "RED" : owner === "green" ? "GREEN" : "BLUE";
}

function originalShort(faction) {
  return faction === "red" ? "SHU" : faction === "green" ? "WU" : "WEI";
}

function Board({
  state,
  selectedPieceId,
  targetIds,
  onSelectPiece,
  onMoveAttempt,
  onClearSelection,
}) {
  const targetSet = useMemo(() => new Set(targetIds), [targetIds]);
  const selectedPiece = state.pieces.find((piece) => piece.id === selectedPieceId) || null;
  const audit = new URLSearchParams(window.location.search).has("audit");

  return (
    <div className="san-you-qi-board-wrapper">
      <div
        className="san-you-qi-board-stage san-you-qi-board-svg"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClearSelection();
        }}
      >
        <img
          className="san-you-qi-board-image"
          src={BOARD_IMAGE}
          alt="Arctic Dominion San You Qi board"
          draggable="false"
        />

        {state.lastAction && (
          <>
            {[state.lastAction.from, state.lastAction.to].map((node, index) => {
              const point = getNodePoint(node);
              if (!point) return null;
              return (
                <span
                  key={`${node}-${index}`}
                  className={`san-you-qi-last-move ${index ? "destination" : "source"}`}
                  style={{ left: `${point[0] * 100}%`, top: `${point[1] * 100}%` }}
                  aria-hidden="true"
                />
              );
            })}
          </>
        )}

        {targetIds.map((node) => {
          const point = getNodePoint(node);
          if (!point) return null;
          const occupied = state.pieces.some(
            (piece) => piece.status === "board" && piece.node === node,
          );
          return (
            <button
              key={`target-${node}`}
              type="button"
              className={`san-you-qi-node san-you-qi-node--target ${occupied ? "capture" : ""}`}
              style={{ left: `${point[0] * 100}%`, top: `${point[1] * 100}%` }}
              data-testid={`node-${node.replace(/[:]/g, "-")}`}
              aria-label={`${occupied ? "Capture on" : "Move to"} ${getNodeLabel(node)}`}
              onClick={(event) => {
                event.stopPropagation();
                onMoveAttempt(node);
              }}
            />
          );
        })}

        {audit && ALL_NODE_IDS.map((node) => {
          const point = getNodePoint(node);
          if (!point) return null;
          return (
            <span
              key={`audit-${node}`}
              className="san-you-qi-audit-node"
              style={{ left: `${point[0] * 100}%`, top: `${point[1] * 100}%` }}
            >
              {node.includes(":") ? node.split(":")[1] : node}
            </span>
          );
        })}

        {state.pieces.filter((piece) => piece.status === "board").map((piece) => {
          const point = getNodePoint(piece.node);
          if (!point) return null;
          const selected = selectedPiece?.id === piece.id;
          const captureTarget = targetSet.has(piece.node) && piece.owner !== state.turn;
          const checked = piece.role === "general" && isInCheck(state, piece.faction);
          const inherited = piece.owner !== piece.faction;

          return (
            <button
              key={piece.id}
              type="button"
              data-testid={`piece-${piece.id}`}
              className={[
                "san-you-qi-piece-button",
                selected ? "selected" : "",
                captureTarget ? "capture-target" : "",
                inherited ? "inherited" : "",
                checked ? "in-check" : "",
                piece.role === "soldier" && piece.promoted ? "promoted" : "",
              ].filter(Boolean).join(" ")}
              style={{
                left: `${point[0] * 100}%`,
                top: `${point[1] * 100}%`,
                "--piece-owner": FACTION_COLORS[piece.owner],
              }}
              aria-label={`${FACTION_LABELS[piece.owner]} ${ROLE_LABELS[piece.role]} at ${getNodeLabel(piece.node)}`}
              title={`${originalShort(piece.faction)} ${ROLE_LABELS[piece.role]} · ${getNodeLabel(piece.node)}${inherited ? ` · controlled by ${ownerShort(piece.owner)}` : ""}${piece.promoted ? " · promoted" : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                if (captureTarget && selectedPiece) onMoveAttempt(piece.node);
                else if (piece.owner === state.turn) onSelectPiece(piece.id);
              }}
            >
              <img src={pieceAsset(piece)} alt="" draggable="false" />
              <span className="san-you-qi-piece-ring" aria-hidden="true" />
              {piece.role === "soldier" && piece.promoted && (
                <span className="san-you-qi-promotion-mark" aria-hidden="true">✦</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Rulebook({ state, selectedPiece, selectedTargets }) {
  const currentPlayer = FACTION_LABELS[state.turn];

  return (
    <aside className="san-you-qi-rulebook">
      <div className="scroll-header">
        <span className="scroll-label">ARCTIC DOMINION · FINAL BOARD GRAPH</span>
      </div>
      <h2 className="scroll-title">SAN YOU QI — THREE FRIENDS CHESS</h2>
      <p className="scroll-subtitle">
        Zheng Jinde tradition · 3 kingdoms · 159 playable intersections
      </p>

      <div className="info-boxes">
        <div className="info-box"><span className="info-label">PLAYERS</span><span className="info-value">3</span></div>
        <div className="info-box"><span className="info-label">BOARD</span><span className="info-value">135 + C1–C24</span></div>
        <div className="info-box"><span className="info-label">FORCE</span><span className="info-value">18 each / 54 total</span></div>
        <div className="info-box"><span className="info-label">TURN</span><span className="info-value">Red → Green → Blue</span></div>
      </div>

      <section className="san-you-qi-armies" aria-label="Kingdom status">
        {FACTIONS.map((faction) => {
          const controlled = state.pieces.filter(
            (piece) => piece.status === "board" && piece.owner === faction,
          ).length;
          const active = state.activeFactions.includes(faction);
          return (
            <div
              key={faction}
              className={`san-you-qi-army ${state.turn === faction && !state.outcome ? "active" : ""} ${!active ? "defeated" : ""}`}
              style={{ "--army": FACTION_COLORS[faction] }}
            >
              <span className="army-dot" />
              <div>
                <b>{FACTION_LABELS[faction]}</b>
                <small>{active ? `${controlled} controlled pieces` : "General defeated"}</small>
              </div>
            </div>
          );
        })}
      </section>

      <div className="rules-columns">
        <div className="rules-column">
          <h3>OPENING FORMATION</h3>
          <ul>
            <li>Back row: Chariot, Horse, Elephant, Guard, General, Guard, Elephant, Horse, Chariot.</li>
            <li>Middle line: Cannon, Flag, Flag, Cannon.</li>
            <li>Front line: Soldier, Fire, Soldier, Fire, Soldier.</li>
          </ul>

          <h3>SANYOU VS SANGUO</h3>
          <ul>
            <li>Sanguo uses direct file-to-file river continuations.</li>
            <li>Sanyou inserts C1–C24 as real playable central intersections.</li>
            <li>Six additional C-network horizontals create lateral central movement.</li>
            <li>Sanyou adds Fire and Flag and uses Sea, Mountain and City crossings.</li>
          </ul>
        </div>

        <div className="rules-column">
          <h3>TERRAIN</h3>
          <ul>
            <li>Sea crossings block Chariot and Horse.</li>
            <li>Mountain and City crossings block Cannon.</li>
            <li>Soldier, Fire and Flag may use those crossings when their movement otherwise permits it.</li>
          </ul>

          <h3>SPECIAL UNITS</h3>
          <ul>
            <li><strong>Fire:</strong> one diagonal step forward; never retreats.</li>
            <li><strong>Flag:</strong> two clear forward steps before leaving home; then exactly two orthogonal steps and no return to its original kingdom.</li>
            <li><strong>Soldier:</strong> one forward step. On first entry into enemy territory it promotes and also gains sideways movement.</li>
          </ul>
        </div>
      </div>

      <section className="rules-section">
        <h3>CENTRAL PROMOTION BOUNDARIES</h3>
        <p>
          Promotion is determined by the faction-specific C-point territory map,
          not by a simple coloured-grid boundary. For example, Red entering C24
          has already entered enemy territory.
        </p>
        <h3>VICTORY</h3>
        <p>
          Protect your General. Checkmating a kingdom removes its General and
          transfers its surviving army to the mating player. The last surviving
          General wins.
        </p>
      </section>

      <div className="status-bar">
        <span className="turn-indicator">{currentPlayer}'s turn</span>
        {selectedPiece ? (
          <span className="selected-piece">
            {ROLE_LABELS[selectedPiece.role]} · {getNodeLabel(selectedPiece.node)} · {selectedTargets.length} legal
          </span>
        ) : (
          <span className="selected-piece">Select a piece to show legal moves</span>
        )}
      </div>
    </aside>
  );
}

export default function SanYouQiApp({ onExit }) {
  const [state, setState] = useState(() => createInitialState());
  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [message, setMessage] = useState("");

  const legalActions = useMemo(() => getLegalActions(state), [state]);

  const selectedPiece = useMemo(
    () => state.pieces.find((piece) => piece.id === selectedPieceId) || null,
    [state.pieces, selectedPieceId],
  );

  const selectedActions = useMemo(
    () => selectedPieceId
      ? legalActions.filter((action) => action.pieceId === selectedPieceId)
      : [],
    [legalActions, selectedPieceId],
  );

  const selectedTargets = useMemo(
    () => selectedActions.map((action) => action.to),
    [selectedActions],
  );

  const handleSelectPiece = (pieceId) => {
    const piece = state.pieces.find((candidate) => candidate.id === pieceId);
    if (!piece || piece.owner !== state.turn || state.outcome) return;
    setSelectedPieceId(pieceId);
    setMessage("");
  };

  const handleMoveAttempt = (node) => {
    if (!selectedPiece) return;
    const action = selectedActions.find((candidate) => candidate.to === node);
    if (!action) {
      setMessage("That point is not a legal destination for the selected piece.");
      return;
    }

    const result = applyAction(state, action);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    const moved = result.state.pieces.find((piece) => piece.id === selectedPiece.id);
    const promotedNow =
      selectedPiece.role === "soldier" &&
      !selectedPiece.promoted &&
      moved?.promoted;

    setState(result.state);
    setSelectedPieceId(null);
    setMessage(promotedNow ? `${originalShort(selectedPiece.faction)} Soldier promoted on entering enemy territory.` : result.state.note);
  };

  const handleReset = () => {
    setState(createInitialState());
    setSelectedPieceId(null);
    setMessage("");
  };

  return (
    <main className="san-you-qi-app">
      <header className="san-you-qi-toolbar">
        <div className="san-you-qi-brand">
          <span>HERITAGE ARCADE</span>
          <h1>SAN YOU QI</h1>
          <small>THREE FRIENDS CHESS</small>
        </div>

        <div
          className="san-you-qi-turn-chip"
          style={{ "--turn-color": FACTION_COLORS[state.turn] }}
          role="status"
          aria-live="polite"
        >
          <span />
          {state.outcome ? state.outcome.message : `${FACTION_LABELS[state.turn]} to move`}
        </div>

        <div className="san-you-qi-toolbar-actions">
          <button type="button" className="san-you-qi-toolbar-button" onClick={handleReset}>
            Reset
          </button>
          {onExit && (
            <button type="button" className="san-you-qi-toolbar-button" onClick={onExit}>
              All Games
            </button>
          )}
        </div>
      </header>

      {message && <div className="san-you-qi-message" role="status">{message}</div>}

      <div className="san-you-qi-layout">
        <section className="san-you-qi-board-pane" aria-label="San You Qi battlefield">
          <Board
            state={state}
            selectedPieceId={selectedPieceId}
            targetIds={selectedTargets}
            onSelectPiece={handleSelectPiece}
            onMoveAttempt={handleMoveAttempt}
            onClearSelection={() => setSelectedPieceId(null)}
          />
        </section>

        <div className="san-you-qi-rules-pane">
          <Rulebook
            state={state}
            selectedPiece={selectedPiece}
            selectedTargets={selectedTargets}
          />
        </div>
      </div>
    </main>
  );
}
