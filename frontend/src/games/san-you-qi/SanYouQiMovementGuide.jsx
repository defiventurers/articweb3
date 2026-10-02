import React, { useMemo, useState } from "react";
import {
  ROLE_LABELS,
  getNodeLabel,
  getNodePoint,
  getPseudoTargets,
  territoryOf,
  isInCheck,
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
  if (piece.faction !== "red") return `${TOKEN_ROOT}/${piece.faction}_team_${piece.faction === "blue" ? "SEfacing" : "SWfacing"}_${ROLE_FILE[piece.role]}.webp`;
  return `${TOKEN_ROOT}/red_team_${redFacingForNode(piece.node)}_${ROLE_FILE[piece.role]}.webp`;
}

export function canPlace(role, faction, node) {
  if (!ALL_NODE_IDS.includes(node)) return false;
  const arm = parseArmNode(node);
  if (role === "general" || role === "advisor") {
    if (!arm || arm.faction !== faction || arm.lane < 4 || arm.lane > 6 || arm.rank > 3) return false;
    return role !== "advisor" || (arm.lane === 5 ? arm.rank === 2 : arm.rank !== 2);
  }
  return role !== "elephant" || arm?.faction === faction;
}

function makePiece(role, faction = "red") {
  return {
    id: `movement-${faction}-${role}`,
    faction,
    owner: faction,
    role,
    node: ROLE_START[role].replace("red:", `${faction}:`),
    status: "board",
    promoted: false,
    leftHome: false,
    hasMoved: false,
    lastMoveFrom: null,
    lastMovedPly: null,
    lastMovedBy: null,
  };
}

function makeState(piece, enemies = []) {
  return {
    gameId: "san-you-qi",
    phase: "play",
    turn: piece.faction,
    activeFactions: ["red", "blue", "green"],
    pieces: [piece, ...enemies],
    outcome: null,
    lastAction: null,
    note: "",
    ply: 0,
    resumeTurn: null,
    repetition: {},
  };
}

export default function SanYouQiMovementGuide({ onExit }) {
  const [boardRatio, setBoardRatio] = useState(1354 / 1161);
  const [team, setTeam] = useState("red");
  const [enemies, setEnemies] = useState([]);
  const [enemyTeam, setEnemyTeam] = useState("blue");
  const [enemyRole, setEnemyRole] = useState("soldier");
  const [addingEnemy, setAddingEnemy] = useState(false);
  const [notice, setNotice] = useState("Choose a piece, then tap a green ring to try a move.");
  const [role, setRole] = useState("general");
  const [piece, setPiece] = useState(() => makePiece("general"));
  const [freeReposition, setFreeReposition] = useState(false);
  const [trail, setTrail] = useState([]);
  const [history, setHistory] = useState([]);

  const state = useMemo(() => makeState(piece, enemies), [piece, enemies]);
  const targets = useMemo(
    () => new Set(getPseudoTargets(state, piece.id).filter((node) => {
      if (!canPlace(piece.role, piece.faction, node)) return false;
      if (piece.role !== "general") return true;
      const next = { ...state, pieces: state.pieces.filter((p) => p.node !== node || p.id === piece.id).map((p) => p.id === piece.id ? { ...p, node } : p) };
      return !isInCheck(next, piece.faction);
    })),
    [state, piece.id],
  );

  function selectRole(nextRole) {
    setRole(nextRole);
    setPiece(makePiece(nextRole, team));
    setEnemies([]);
    setAddingEnemy(false);
    setTrail([]);
    setHistory([]);
    setFreeReposition(false);
  }

  function resetPiece() {
    setPiece(makePiece(role, team));
    setEnemies([]);
    setAddingEnemy(false);
    setTrail([]);
    setHistory([]);
    setFreeReposition(false);
  }

  function switchTeam(next) {
    setHistory([]);
    setTeam(next); setPiece(makePiece(role, next)); setEnemies([]); setTrail([]);
    setEnemyTeam(next === "blue" ? "green" : "blue"); setFreeReposition(false); setAddingEnemy(false);
  }

  function attackExample() {
    const faction = team;
    const opponent = faction === "blue" ? "green" : "blue";
    const node = (lane, rank) => `${faction}:L${lane}-${rank}`;
    const start = makePiece(role, faction);
    const enemy = (at, index) => ({ ...makePiece("soldier", opponent), id: `example-${index}`, node: at });
    const examples = {
      general: [node(5, 2), [enemy(node(5, 3), 1)]],
      advisor: [node(4, 1), [enemy(node(5, 2), 1)]],
      elephant: [node(3, 1), [enemy(node(5, 3), 1)]],
      horse: [node(2, 2), [enemy(node(3, 4), 1), enemy(node(2, 3), 2)]],
      chariot: [node(5, 3), [enemy(node(5, 5), 1)]],
      cannon: [node(5, 1), [enemy(node(5, 3), 1), enemy(node(5, 5), 2)]],
      soldier: [node(5, 3), [enemy(node(5, 4), 1)]],
      fire: [node(5, 3), [enemy(node(4, 4), 1)]],
      flag: [node(5, 1), [enemy(node(5, 3), 1)]],
    };
    const [at, opponents] = examples[role];
    setHistory([]);
    setPiece({ ...start, node: at }); setEnemies(opponents); setTrail([]);
    setFreeReposition(false); setAddingEnemy(false);
    setNotice(role === "cannon" ? "The nearer enemy is the screen. Tap the coral ring to capture the enemy beyond it." : role === "horse" ? "The enemy beside the Horse blocks its forward leg. Remove it to see the difference." : role === "flag" ? "A home Flag cannot jump or capture the piece two points ahead. Remove that blocker, then try again." : "Coral rings show captures. Add or remove an enemy to see how the available moves change.");
  }

  function placeAt(node) {
    if (addingEnemy) {
      const existing = enemies.find((p) => p.node === node);
      if (existing) { setEnemies(enemies.filter((p) => p.id !== existing.id)); return; }
      if (node === piece.node || !canPlace(enemyRole, enemyTeam, node)) return;
      setEnemies([...enemies, { ...makePiece(enemyRole, enemyTeam), id: `enemy-${node}`, node }]);
      setNotice("Enemy placed. Turn off Add enemies to practise captures."); return;
    }
    if (!canPlace(piece.role, piece.faction, node) || (freeReposition && enemies.some((p) => p.node === node))) return;
    if (!freeReposition && !targets.has(node)) return;

    setHistory((items) => [...items, { piece, enemies, trail }]);
    const captured = enemies.find((p) => p.node === node);
    setEnemies(enemies.filter((p) => p.node !== node));
    setNotice(captured ? `Captured ${captured.faction} ${ROLE_LABELS[captured.role]}.` : `Moved to ${getNodeLabel(node)}.`);
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
          <h1>Discover how every piece moves</h1>
          <span>Choose your team → choose a piece → try a move or an attack example.</span>
        </div>
        <div className="sanyou-movement-lab__header-actions">
          <a href="/?game=san-you-qi">Open full game</a>
          {onExit && <button type="button" onClick={onExit}>All Games</button>}
        </div>
      </header>

      <section className="sanyou-movement-lab__layout">
        <aside className="sanyou-movement-lab__picker">
          <h2>1 · Choose your team</h2>
          <div className="sanyou-movement-lab__teams">{["red", "blue", "green"].map((t) => <button type="button" aria-pressed={team === t} key={t} onClick={() => switchTeam(t)}>{t}</button>)}</div>
          <h2>2 · Explore a piece</h2>
          <div className="sanyou-movement-lab__roles">
            {ORDER.map((candidate) => {
              const preview = makePiece(candidate, team);
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
            <p>{ROLE_COPY[role].replaceAll("Red", team[0].toUpperCase() + team.slice(1)).replace("Capturing requires exactly one occupied screen, so capture jumps are not demonstrated in this one-piece sandbox.", "Capturing requires exactly one piece between the Cannon and its target. The screen can belong to either team.")}</p>

            <div className="sanyou-movement-lab__badges">
              <span>{targets.size} available {targets.size === 1 ? "move" : "moves"}</span>
              {piece.role === "soldier" && piece.promoted && <strong>Promoted Soldier</strong>}
              {piece.role === "flag" && piece.leftHome && <strong>Flag crossed</strong>}
            </div>

            <div className="sanyou-movement-lab__controls">
              <button type="button" onClick={resetPiece}>Start again</button>
              <button type="button" disabled={!history.length} onClick={() => { const previous = history[history.length - 1]; setPiece(previous.piece); setEnemies(previous.enemies); setTrail(previous.trail); setHistory(history.slice(0, -1)); setNotice("Last move undone."); }}>Undo move</button>
              <button
                type="button"
                className={freeReposition ? "is-active" : ""}
                onClick={() => { setFreeReposition((value) => !value); setAddingEnemy(false); }}
              >
                {freeReposition ? "Choose a valid starting point…" : "Choose starting point"}
              </button>
            </div>

            <button type="button" className="sanyou-movement-lab__example" onClick={attackExample}>Try an attack example</button>
            <details className="sanyou-movement-lab__setup"><summary>Build your own example</summary>
              <label>Enemy team<select value={enemyTeam} onChange={(e) => setEnemyTeam(e.target.value)}>{["red", "blue", "green"].filter((t) => t !== team).map((t) => <option key={t}>{t}</option>)}</select></label>
              <label>Enemy piece<select value={enemyRole} onChange={(e) => setEnemyRole(e.target.value)}>{ORDER.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></label>
              <button type="button" aria-pressed={addingEnemy} onClick={() => { setAddingEnemy(!addingEnemy); setFreeReposition(false); }}>{addingEnemy ? "Done adding enemies" : "Add / remove enemies"}</button>
              <button type="button" onClick={() => setEnemies([])}>Clear enemies</button>
            </details>
            <p role="status" aria-live="polite">{notice}</p>
            <details className="sanyou-movement-lab__setup"><summary>Terrain & movement tips</summary>
              <p>Chariot and Horse cannot use the three extended sea crossings C3–C17, C5–C9 and C15–C11. Cannon can cross these sea routes, but cannot cross the mountain routes C2–C18, C6–C8 or C14–C12.</p>
              <p>Cannon may reach a shared fort gate from its home side, but cannot exit into the other kingdom through that fort. Soldier and Fire use their own forward direction. A Soldier keeps its sideways movement once promoted.</p>
              <p>King and Advisor stay in their original palace. The Advisor follows the palace diagonals. Elephant stays in its home arm and cannot jump an occupied eye. Horse cannot jump an occupied first step.</p>
              <p>A home Flag advances exactly two clear points. After reaching enemy territory it slides like a Chariot and cannot return to exclusive home territory.</p>
            </details>
            <small>
              {freeReposition
                ? "Tap a highlighted intersection. King and Advisor stay in their palace; Elephant stays in its home arm. The next legal moves will be recalculated immediately."
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
          <div className="sanyou-movement-lab__board" style={{ aspectRatio: boardRatio }}>
            <img src={BOARD_IMAGE} alt="San You Qi movement practice board" draggable="false" onLoad={(e) => setBoardRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)} />

            {ALL_NODE_IDS.map((node) => {
              const point = getNodePoint(node);
              if (!point) return null;
              const legal = targets.has(node);
              const enemy = enemies.find((p) => p.node === node);
              const occupied = node === piece.node;
              const setup = freeReposition && canPlace(role, team, node) && !enemy;
              const clickable = addingEnemy ? !occupied && (Boolean(enemy) || canPlace(enemyRole, enemyTeam, node)) : setup || legal;

              return (
                <button
                  type="button"
                  key={node}
                  className={[
                    "sanyou-movement-lab__node",
                    legal ? (enemy ? "is-capture" : "is-legal") : "",
                    (setup || addingEnemy && clickable) ? "is-reposition" : "",
                    occupied ? "is-occupied" : "",
                  ].filter(Boolean).join(" ")}
                  style={{ left: `${point[0] * 100}%`, top: `${point[1] * 100}%` }}
                  aria-label={
                    addingEnemy ? `${enemy ? "Remove enemy" : "Add enemy"} at ${getNodeLabel(node)}` : occupied
                      ? `${ROLE_LABELS[role]} at ${getNodeLabel(node)}`
                      : legal
                        ? `${enemy ? "Capture at" : "Move to"} ${getNodeLabel(node)}`
                        : `Place at ${getNodeLabel(node)}`
                  }
                  disabled={!clickable || occupied}
                  title={getNodeLabel(node)}
                  onClick={() => placeAt(node)}
                />
              );
            })}

            {enemies.map((enemy) => { const point = getNodePoint(enemy.node); return <div key={enemy.id} className="sanyou-movement-lab__piece is-enemy" style={{ left: `${point[0]*100}%`, top: `${point[1]*100}%` }}><img src={pieceAsset(enemy)} alt={`${enemy.faction} ${ROLE_LABELS[enemy.role]}`} /></div>; })}
            {(() => {
              const point = getNodePoint(piece.node);
              return point ? (
                <div
                  className="sanyou-movement-lab__piece"
                  style={{ left: `${point[0] * 100}%`, top: `${point[1] * 100}%`, "--team-color": { red: "#ff6868", blue: "#69c5ff", green: "#87edaa" }[team] }}
                >
                  <img src={pieceAsset(piece)} alt={`${team} ${ROLE_LABELS[role]}`} draggable="false" />
                  {piece.role === "soldier" && piece.promoted && <span>✦</span>}
                </div>
              ) : null;
            })()}
          </div>

          <p className="sanyou-movement-lab__practice-note">Movement practice: enemies stay in place. Use setup to explore blockers, attacks and terrain.</p>
          <footer className="sanyou-movement-lab__legend">
            <span><i className="legal" /> legal move</span>
            <span><i className="capture" /> capture an enemy</span>
            <span><i className="piece" /> your piece</span>
            <span><i className="free" /> free-reposition point</span>
          </footer>
        </section>
      </section>
    </main>
  );
}
