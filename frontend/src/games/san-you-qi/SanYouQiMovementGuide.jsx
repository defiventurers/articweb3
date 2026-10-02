import { useMemo, useState } from "react";
import {
  ROLE_LABELS,
  getNodeLabel,
  getNodePoint,
  getPseudoTargets,
  territoryOf,
} from "./rules.js";
import { ALL_NODE_IDS, parseArmNode } from "./topology.js";
import "./sanYouQiMovementGuide.css";

const BOARD_IMAGE = "/assets/heritage-arcade/board/sanyou-arctic-board.png";
const TOKEN_ROOT = "/assets/heritage-arcade/tokens/sanyou";

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

const ROLE_START = Object.freeze({
  general: "red:L5-1",
  advisor: "red:L4-1",
  elephant: "red:L3-1",
  horse: "red:L2-1",
  chariot: "red:L1-1",
  cannon: "red:L2-3",
  soldier: "red:L5-4",
  fire: "red:L3-4",
  flag: "red:L4-3",
});

const ROLE_COPY = Object.freeze({
  general: "One orthogonal point inside the original Red palace.",
  advisor: "One palace-diagonal step. It remains inside the original Red palace.",
  elephant: "Two-point diagonal movement in the original Red arm. The eye must be clear.",
  horse: "Blocked Xiangqi L move. The first orthogonal leg must be clear; the central compressed Horse routes use the current San You graph.",
  chariot: "Slides along one approved straight line until blocked. It cannot cross the extended Sea passages.",
  cannon: "Slides along one clear line. Capturing requires exactly one occupied screen, so capture jumps are not demonstrated in this one-piece sandbox.",
  soldier: "One point forward. After first entering enemy territory it permanently gains sideways movement where a horizontal line exists.",
  fire: "One forward-diagonal step. The exact Fort and inner-C routes come directly from the current San You rules.",
  flag: "Exactly two clear points straight forward while at home. After entering enemy territory it becomes Chariot-like and cannot re-enter exclusive Red home territory.",
});

const ORDER = [
  "general",
  "advisor",
  "elephant",
  "horse",
  "chariot",
  "cannon",
  "soldier",
  "fire",
  "flag",
];

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
  return `${TOKEN_ROOT}/red_team_${redFacingForNode(piece.node)}_${ROLE_FILE[piece.role]}.webp`;
}

function makePiece(role) {
  return {
    id: `movement-red-${role}`,
    faction: "red",
    owner: "red",
    role,
    node: ROLE_START[role],
    status: "board",
    promoted: false,
    leftHome: false,
    hasMoved: false,
    lastMoveFrom: null,
    lastMovedPly: null,
    lastMovedBy: null,
  };
}

function makeState(piece) {
  return {
    gameId: "san-you-qi",
    phase: "play",
    turn: "red",
    activeFactions: ["red"],
    pieces: [piece],
    outcome: null,
    lastAction: null,
    note: "",
    ply: 0,
    resumeTurn: null,
    repetition: {},
  };
}

export default function SanYouQiMovementGuide({ onExit }) {
  const [role, setRole] = useState("general");
  const [piece, setPiece] = useState(() => makePiece("general"));
  const [freeReposition, setFreeReposition] = useState(false);
  const [trail, setTrail] = useState([]);

  const state = useMemo(() => makeState(piece), [piece]);
  const targets = useMemo(
    () => new Set(getPseudoTargets(state, piece.id)),
    [state, piece.id],
  );

  function selectRole(nextRole) {
    setRole(nextRole);
    setPiece(makePiece(nextRole));
    setTrail([]);
    setFreeReposition(false);
  }

  function resetPiece() {
    setPiece(makePiece(role));
    setTrail([]);
    setFreeReposition(false);
  }

  function placeAt(node) {
    if (!freeReposition && !targets.has(node)) return;

    setPiece((current) => {
      const enemy = territoryOf(node, current.faction) === "enemy";
      return {
        ...current,
        lastMoveFrom: current.node,
        node,
        hasMoved: true,
        leftHome: current.leftHome || enemy,
        promoted:
          current.role === "soldier"
            ? current.promoted || enemy
            : current.promoted,
      };
    });
    setTrail((current) => [...current.slice(-7), node]);
    if (freeReposition) setFreeReposition(false);
  }

  return (
    <main className="sanyou-movement-lab">
      <header className="sanyou-movement-lab__header">
        <div>
          <p>SAN YOU QI · MOVEMENT LAB</p>
          <h1>Learn one Red piece at a time</h1>
          <span>No opponents. No captures. Movement comes from the live San You Qi rules engine.</span>
        </div>
        <div className="sanyou-movement-lab__header-actions">
          <a href="/?game=san-you-qi">Open full game</a>
          {onExit && <button type="button" onClick={onExit}>All Games</button>}
        </div>
      </header>

      <section className="sanyou-movement-lab__layout">
        <aside className="sanyou-movement-lab__picker">
          <h2>Choose a Red piece</h2>
          <div className="sanyou-movement-lab__roles">
            {ORDER.map((candidate) => {
              const preview = makePiece(candidate);
              return (
                <button
                  type="button"
                  key={candidate}
                  className={candidate === role ? "is-active" : ""}
                  onClick={() => selectRole(candidate)}
                >
                  <img src={pieceAsset(preview)} alt="" />
                  <span>{ROLE_LABELS[candidate]}</span>
                </button>
              );
            })}
          </div>

          <div className="sanyou-movement-lab__lesson">
            <div className="sanyou-movement-lab__lesson-title">
              <img src={pieceAsset(piece)} alt="" />
              <div>
                <b>{ROLE_LABELS[role]}</b>
                <span>{getNodeLabel(piece.node)}</span>
              </div>
            </div>
            <p>{ROLE_COPY[role]}</p>

            <div className="sanyou-movement-lab__badges">
              <span>{targets.size} available {targets.size === 1 ? "move" : "moves"}</span>
              {piece.role === "soldier" && piece.promoted && <strong>Promoted Soldier</strong>}
              {piece.role === "flag" && piece.leftHome && <strong>Flag crossed</strong>}
            </div>

            <div className="sanyou-movement-lab__controls">
              <button type="button" onClick={resetPiece}>Reset piece</button>
              <button
                type="button"
                className={freeReposition ? "is-active" : ""}
                onClick={() => setFreeReposition((value) => !value)}
              >
                {freeReposition ? "Choose any intersection…" : "Free reposition"}
              </button>
            </div>

            <small>
              {freeReposition
                ? "Click any board intersection to place the piece there. The next legal moves will be recalculated immediately."
                : "Green rings are legal movement destinations. Click one to move the piece."}
            </small>

            {trail.length > 0 && (
              <div className="sanyou-movement-lab__trail">
                <b>Recent path</b>
                <span>{trail.map(getNodeLabel).join(" → ")}</span>
              </div>
            )}
          </div>
        </aside>

        <section className="sanyou-movement-lab__board-panel">
          <div className="sanyou-movement-lab__board">
            <img src={BOARD_IMAGE} alt="San You Qi movement practice board" draggable="false" />

            {ALL_NODE_IDS.map((node) => {
              const point = getNodePoint(node);
              if (!point) return null;
              const legal = targets.has(node);
              const occupied = node === piece.node;
              const clickable = freeReposition || legal;

              return (
                <button
                  type="button"
                  key={node}
                  className={[
                    "sanyou-movement-lab__node",
                    legal ? "is-legal" : "",
                    freeReposition ? "is-reposition" : "",
                    occupied ? "is-occupied" : "",
                  ].filter(Boolean).join(" ")}
                  style={{ left: `${point[0] * 100}%`, top: `${point[1] * 100}%` }}
                  aria-label={
                    occupied
                      ? `${ROLE_LABELS[role]} at ${getNodeLabel(node)}`
                      : legal
                        ? `Move to ${getNodeLabel(node)}`
                        : `Place at ${getNodeLabel(node)}`
                  }
                  disabled={!clickable || occupied}
                  title={getNodeLabel(node)}
                  onClick={() => placeAt(node)}
                />
              );
            })}

            {(() => {
              const point = getNodePoint(piece.node);
              return point ? (
                <div
                  className="sanyou-movement-lab__piece"
                  style={{ left: `${point[0] * 100}%`, top: `${point[1] * 100}%` }}
                >
                  <img src={pieceAsset(piece)} alt={`Red ${ROLE_LABELS[role]}`} draggable="false" />
                  {piece.role === "soldier" && piece.promoted && <span>✦</span>}
                </div>
              ) : null;
            })()}
          </div>

          <footer className="sanyou-movement-lab__legend">
            <span><i className="legal" /> legal move</span>
            <span><i className="piece" /> current piece</span>
            <span><i className="free" /> free-reposition point</span>
          </footer>
        </section>
      </section>
    </main>
  );
}
