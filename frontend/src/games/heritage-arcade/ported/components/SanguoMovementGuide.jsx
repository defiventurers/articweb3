import React, { useMemo, useState } from "react";
import {
  ROLE_LABELS,
  getNodeLabel,
  getNodePoint,
  getMovementTargets,
  territoryOf,

} from "../game/sanguoMovementLesson.ts";
import { ALL_NODE_IDS, parseArmNode } from "../game/sanguoMovementLesson.ts";
import "../../../san-you-qi/sanYouQiMovementGuide.css";

const BOARD_IMAGE = "/assets/heritage-arcade/board/sanguo-arctic-board.png";
const TOKEN_ROOT = "/assets/heritage-arcade/tokens";

const ROLE_FILE = Object.freeze({ general: "general", advisor: "advisor", elephant: "elephant", horse: "horse", chariot: "chariot", cannon: "cannon", soldier: "soldier", bannerman: "bannerman" });

const ROLE_START = Object.freeze({
  general: "red:L5-1",
  advisor: "red:L4-1",
  elephant: "red:L3-1",
  horse: "red:L2-1",
  chariot: "red:L1-1",
  cannon: "red:L2-3",
  soldier: "red:L5-4",
  bannerman: "red:L4-3",
});

const ROLE_COPY = Object.freeze({
  general: "One point along a rank or file inside its original palace. It cannot move into attack or face another General along an open file.",
  advisor: "One diagonal step along the palace X. It stays on the four corners and centre of its original palace.",
  elephant: "Two points diagonally inside its home kingdom. The midpoint (eye) must be empty. It cannot cross the river.",
  horse: "One clear orthogonal step, then a diagonal finish: an L-shaped move. An occupied first step blocks that direction.",
  chariot: "Slides along a clear rank or file. It captures the first enemy on its route. At the river and central L5 junction, follow the approved continuation into another kingdom.",
  cannon: "Slides along a clear rank or file. A capture needs exactly one occupied screen between the Cannon and enemy; the screen can belong to either team.",
  soldier: "One point forward toward the river. In a foreign kingdom it gains one-step sideways moves and advances toward that kingdom’s back rank. It never moves backward.",
  bannerman: "Optional piece: two clear orthogonal transit points, then an outward diagonal finish (three points along and one across). It cannot jump either transit blocker.",
});

const ORDER = [
  "general",
  "advisor",
  "elephant",
  "horse",
  "chariot",
  "cannon",
  "soldier",
  "bannerman",
];

function pieceAsset(piece) {
  return `${TOKEN_ROOT}/token-sanguo-${piece.faction}-${ROLE_FILE[piece.role]}.webp`;
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
  };
}

function makeState(piece, enemies = []) {
  return { pieces: [piece, ...enemies] };
}

export default function SanguoMovementGuide({ onExit }) {
  const [boardRatio, setBoardRatio] = useState(1280 / 1124);
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
    () => new Set(getMovementTargets(state, piece.id)),
    [state, piece.id],
  );

  function selectRole(nextRole) {
    setNotice("Tap a green ring to move, or try an attack example.");
    setRole(nextRole);
    setPiece(makePiece(nextRole, team));
    setEnemies([]);
    setAddingEnemy(false);
    setTrail([]);
    setHistory([]);
    setFreeReposition(false);
  }

  function resetPiece() {
    setNotice("Piece reset. Tap a green ring to try a move.");
    setPiece(makePiece(role, team));
    setEnemies([]);
    setAddingEnemy(false);
    setTrail([]);
    setHistory([]);
    setFreeReposition(false);
  }

  function switchTeam(next) {
    setNotice(`Learning with the ${next} team. Choose a piece or try a move.`);
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
      bannerman: [node(4, 1), [enemy(node(5, 4), 1), enemy(node(4, 2), 2)]],
    };
    const [at, opponents] = examples[role];
    setHistory([]);
    setPiece({ ...start, node: at }); setEnemies(opponents); setTrail([]);
    setFreeReposition(false); setAddingEnemy(false);
    setNotice(role === "cannon" ? "The nearer enemy is the screen. Tap the coral ring to capture the enemy beyond it." : role === "horse" ? "The enemy beside the Horse blocks its forward leg. Remove it to see the difference." : role === "bannerman" ? "The near enemy blocks a Bannerman transit point. Remove it to unlock the capture three points along and one across." : "Coral rings show captures. Add or remove an enemy to see how the available moves change.");
  }

  function placeAt(node) {
    if (addingEnemy) {
      const existing = enemies.find((p) => p.node === node);
      if (existing) { setHistory([]); setEnemies(enemies.filter((p) => p.id !== existing.id)); return; }
      if (node === piece.node || !canPlace(enemyRole, enemyTeam, node)) return;
      setHistory([]);
      setEnemies([...enemies, { ...makePiece(enemyRole, enemyTeam), id: `enemy-${node}`, node }]);
      setNotice("Enemy placed. Turn off Add enemies to practise captures."); return;
    }
    if (!canPlace(piece.role, piece.faction, node) || (freeReposition && enemies.some((p) => p.node === node))) return;
    if (!freeReposition && !targets.has(node)) return;

    setHistory((items) => [...items, { piece, enemies, trail }]);
    const captured = enemies.find((p) => p.node === node);
    setEnemies(enemies.filter((p) => p.node !== node));
    setNotice(captured ? `Captured ${captured.faction} ${ROLE_LABELS[captured.role]}.` : `Moved to ${getNodeLabel(node)}.`);
    setPiece((current) => ({ ...current, node }));
    setTrail((current) => [...current.slice(-7), node]);
    if (freeReposition) setFreeReposition(false);
  }

  return (
    <main className="sanyou-movement-lab">
      <header className="sanyou-movement-lab__header">
        <div>
          <p>SANGUO QI · MOVEMENT LAB</p>
          <h1>Discover how every piece moves</h1>
          <span>Choose your team → choose a piece → try a move or an attack example.</span>
        </div>
        <div className="sanyou-movement-lab__header-actions">
          <a href="/?game=heritage-arcade&table=sanguo">Open full game</a>
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
            <p>{ROLE_COPY[role]}</p>

            <div className="sanyou-movement-lab__badges">
              <span>{targets.size} available {targets.size === 1 ? "move" : "moves"}</span>
              {piece.role === "soldier" && territoryOf(piece.node, team) === "enemy" && <strong>Across the river · sideways unlocked</strong>}
              
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
              <button type="button" onClick={() => { setEnemies([]); setHistory([]); }}>Clear enemies</button>
            </details>
            <p role="status" aria-live="polite">{notice}</p>
            <details className="sanyou-movement-lab__setup"><summary>River & palace tips</summary>
              <p>Elephant, General and Advisor remain in their home kingdom. Chariot, Cannon, Horse, Soldier and Bannerman use Sanguo’s river continuation rules.</p>
              <p>The central L5 endpoint offers two branches, one into each opposing kingdom. A sliding move follows one chosen branch. Use “Try the river” below to explore it.</p>
              <p>General and Advisor stay inside their original palace. General moves along ranks and files; Advisor follows the X diagonals. Generals cannot face one another on an open file.</p>
              <p>Enemy Generals can be added in their own palace to explore check. They are never directly captured; the full game resolves checkmate and army appropriation.</p>
            </details>
            <button type="button" className="sanyou-movement-lab__example" onClick={() => {
              if (["general", "advisor", "elephant"].includes(role)) { setNotice("This piece stays at home. Choose Chariot, Cannon, Horse, Soldier or Bannerman to explore the river."); return; }
              setPiece({ ...makePiece(role, team), node: `${team}:L5-5` }); setEnemies([]); setHistory([]); setTrail([]); setFreeReposition(false); setAddingEnemy(false);
              setNotice("You are at the L5 river endpoint. Highlighted moves follow this piece’s own crossing rules.");
            }}>Try the river</button>
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
            <img src={BOARD_IMAGE} alt="Sanguo Qi movement practice board" draggable="false" onLoad={(e) => setBoardRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)} />

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
                  {piece.role === "soldier" && territoryOf(piece.node, team) === "enemy" && <span>✦</span>}
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
