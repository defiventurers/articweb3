import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Bot, ChevronDown, Copy, Globe2, Maximize, Minimize, MoreHorizontal, PanelRightClose, PanelRightOpen, RotateCcw, Undo2, Users, X } from "lucide-react";
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
  resolveStalemate,
} from "./rules.js";
import { BOT_LEVELS } from "./bot.js";
import {
  SanYouClient,
  forgetSanYouSeat,
  newSanYouSeatToken,
  readSanYouSeat,
  rememberSanYouSeat,
  sanYouInviteUrl,
} from "./onlineClient.js";
import { ALL_NODE_IDS, parseArmNode } from "./topology.js";
import "./sanYouQi.css";

const BOARD_IMAGE = "/assets/heritage-arcade/board/sanyou-arctic-board.png";
const TOKEN_ROOT = "/assets/heritage-arcade/tokens/sanyou";
const roomFromUrl = () =>
  (new URLSearchParams(window.location.search).get("room") || "").trim().toUpperCase();

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
  canAct = true,
}) {
  const targetSet = useMemo(() => new Set(targetIds), [targetIds]);
  const selectedPiece = state.pieces.find((piece) => piece.id === selectedPieceId) || null;
  const audit = new URLSearchParams(window.location.search).has("audit");
  const boardFrameRef = useRef(null);
  const boardImageRef = useRef(null);
  const [boardBox, setBoardBox] = useState(null);

  useEffect(() => {
    const frame = boardFrameRef.current;
    const image = boardImageRef.current;
    if (!frame || !image) return undefined;

    let frameId = 0;

    const fitBoardToFrame = () => {
      const naturalWidth = image.naturalWidth;
      const naturalHeight = image.naturalHeight;
      if (!naturalWidth || !naturalHeight) return;

      const styles = window.getComputedStyle(frame);
      const horizontalPadding =
        Number.parseFloat(styles.paddingLeft || "0") +
        Number.parseFloat(styles.paddingRight || "0");
      const verticalPadding =
        Number.parseFloat(styles.paddingTop || "0") +
        Number.parseFloat(styles.paddingBottom || "0");

      const availableWidth = Math.max(0, frame.clientWidth - horizontalPadding);
      const availableHeight = Math.max(0, frame.clientHeight - verticalPadding);
      if (!availableWidth || !availableHeight) return;

      const ratio = naturalWidth / naturalHeight;
      let width = availableWidth;
      let height = width / ratio;

      if (height > availableHeight) {
        height = availableHeight;
        width = height * ratio;
      }

      setBoardBox((previous) => {
        if (
          previous &&
          Math.abs(previous.width - width) < 0.25 &&
          Math.abs(previous.height - height) < 0.25
        ) {
          return previous;
        }
        return { width, height, ratio };
      });
    };

    const scheduleFit = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(fitBoardToFrame);
    };

    const observer = new ResizeObserver(scheduleFit);
    observer.observe(frame);
    image.addEventListener("load", scheduleFit);
    window.addEventListener("resize", scheduleFit);
    window.visualViewport?.addEventListener("resize", scheduleFit);

    if (image.complete) scheduleFit();

    return () => {
      observer.disconnect();
      image.removeEventListener("load", scheduleFit);
      window.removeEventListener("resize", scheduleFit);
      window.visualViewport?.removeEventListener("resize", scheduleFit);
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div ref={boardFrameRef} className="san-you-qi-board-wrapper">
      <div
        className="san-you-qi-board-stage san-you-qi-board-svg"
        data-board-fitted={boardBox ? "true" : "false"}
        style={boardBox ? {
          width: `${boardBox.width}px`,
          height: `${boardBox.height}px`,
          aspectRatio: String(boardBox.ratio),
        } : undefined}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClearSelection();
        }}
      >
        <img
          ref={boardImageRef}
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
                if (canAct) onMoveAttempt(node);
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
                if (!canAct) return;
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

const ROLE_MOVEMENT = Object.freeze({
  general: "One orthogonal point inside the original palace.",
  advisor: "One palace-diagonal step.",
  elephant: "Two-point diagonal movement in its original arm; the eye must be clear.",
  horse: "Blocked Xiangqi L move. Only its first orthogonal leg is stopped by an extended-Sea crossing. The three central tips also support the paired L4-5/L6-5 Horse jumps into C20/C22/C24.",
  chariot: "Slides along one explicit line until blocked. It cannot cross the extended Sea passages.",
  cannon: "Slides horizontally or vertically along one clear line. The first occupied point is a screen; captures only the next occupied enemy beyond exactly one screen. A Cannon may also be pinned if moving it exposes its General under the flying-General rule.",
  soldier: "One point forward at all times. After first entering enemy territory it also gains sideways movement where a horizontal line exists.",
  fire: "One diagonal-forward step and never retreats.",
  flag: "Exactly two clear points straight forward while still in its own territory. After entering enemy territory it moves any distance orthogonally like a Chariot and may not re-enter exclusive home territory; its own shared Fort gates remain legal return points.",
});

function MatchPanel({
  state,
  selectedPiece,
  selectedTargets,
  seatLabels = {},
  notice = "",
  online = false,
  roomCode = "",
  connectionStatus = "",
}) {
  const active = state.turn;
  const last = state.lastAction;
  return (
    <aside className="san-you-qi-match-panel" aria-label="Match details">
      <div className="san-you-qi-panel-heading">
        <span>MATCH DETAILS</span>
        <small>{online ? `Room ${roomCode} · ${connectionStatus}` : "Local table"}</small>
      </div>

      <div className="san-you-qi-kingdom-order">Red → Green → Blue</div>

      <div className="san-you-qi-player-list">
        {FACTIONS.map((candidate) => {
          const count = state.pieces.filter(
            (piece) => piece.status === "board" && piece.owner === candidate,
          ).length;
          const inherited = state.pieces.filter(
            (piece) =>
              piece.status === "board" &&
              piece.owner === candidate &&
              piece.faction !== candidate,
          ).length;
          const activeFaction = state.activeFactions.includes(candidate);
          return (
            <details
              key={candidate}
              className={`san-you-qi-player-card ${active === candidate && !state.outcome ? "active" : ""} ${!activeFaction ? "defeated" : ""}`}
              style={{ "--seat-color": FACTION_COLORS[candidate] }}
            >
              <summary>
                <span className="san-you-qi-seat-dot" />
                <div>
                  <b>{FACTION_LABELS[candidate]}</b>
                  <span>
                    {!activeFaction
                      ? "Eliminated"
                      : active === candidate && !state.outcome
                        ? "To move"
                        : seatLabels[candidate] || "Ready"}
                  </span>
                </div>
                <strong aria-label={`${count} pieces`}>{count}</strong>
                <ChevronDown size={14} />
              </summary>
              <div className="san-you-qi-player-detail">
                <span>{seatLabels[candidate] || (online ? "Online seat" : "Local seat")}</span>
                <small>{inherited ? `${inherited} inherited pieces` : "Original army"}</small>
              </div>
            </details>
          );
        })}
      </div>

      <section className="san-you-qi-piece-inspector" aria-label="Piece inspector">
        <h2>{selectedPiece ? "Selected piece" : "Piece guide"}</h2>
        {selectedPiece ? (
          <>
            <div className="san-you-qi-inspector-title">
              <img src={pieceAsset(selectedPiece)} alt="" />
              <div>
                <strong>{ROLE_LABELS[selectedPiece.role]}</strong>
                <span>{getNodeLabel(selectedPiece.node)}</span>
              </div>
            </div>
            <p>{ROLE_MOVEMENT[selectedPiece.role]}</p>
            <small>
              {selectedTargets.length} legal {selectedTargets.length === 1 ? "move" : "moves"}
              {selectedPiece.owner !== selectedPiece.faction
                ? ` · controlled by ${FACTION_LABELS[selectedPiece.owner]}`
                : ""}
            </small>
          </>
        ) : (
          <p>Select a piece to inspect its movement and see all legal destinations.</p>
        )}
      </section>

      <section className="san-you-qi-position-summary">
        <h2>Position</h2>
        <p>{notice}</p>
        {last ? (
          <div className="san-you-qi-last-action">
            <span>Last move</span>
            <b>{getNodeLabel(last.from)} → {getNodeLabel(last.to)}</b>
          </div>
        ) : (
          <small>Red opens. The latest move will appear here.</small>
        )}
      </section>

      <div className="san-you-qi-panel-legend">
        <span>● Legal move</span>
        <span>◎ Capture</span>
        <span>□ Last move</span>
      </div>
    </aside>
  );
}

function Rulebook({ state, selectedPiece, selectedTargets, seatLabels = {}, notice = "" }) {
  const currentPlayer = FACTION_LABELS[state.turn];

  return (
    <aside className="san-you-qi-rulebook">
      <div className="scroll-header">
        <span className="scroll-label">ARCTIC DOMINION · FINAL BOARD GRAPH</span>
      </div>
      <h2 className="scroll-title">SAN YOU QI — THREE FRIENDS CHESS</h2>
      <p className="scroll-subtitle">
        Zheng Jinde tradition · 3 kingdoms · 156 playable intersections
      </p>

      <div className="info-boxes">
        <div className="info-box"><span className="info-label">PLAYERS</span><span className="info-value">1–3 humans</span></div>
        <div className="info-box"><span className="info-label">BOARD</span><span className="info-value">135 + 21 central</span></div>
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
                <small>
                  {active ? `${controlled} controlled pieces` : "General defeated"}
                  {seatLabels[faction] ? ` · ${seatLabels[faction]}` : ""}
                </small>
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
            <li>Sanyou uses 21 surviving central intersections: C1–C18, C20, C22 and C24.</li>
            <li>Only H1, H2 and H3 remain as central horizontal lines; C20, C22 and C24 are continuation-only row points.</li>
            <li>Sanyou adds Fire and Flag and uses Sea, Mountain and City crossings.</li>
          </ul>
        </div>

        <div className="rules-column">
          <h3>TERRAIN</h3>
          <ul>
            <li>Extended-river crossings C3↔C17, C5↔C9 and C15↔C11 block Chariot; for Horse they block only when used as the first orthogonal leg. Cannon may cross.</li>
            <li>Mountain crossings C2↔C18, C6↔C8 and C14↔C12 block Cannon.</li>
            <li>At Forts, Cannon may stop on C1/C7/C13 from its own side but may not continue through into the opposite kingdom.</li>
            <li>C20, C22 and C24 are legal central stopping points linked by continuation routes, not horizontal H-lines.</li>
            <li><strong>Camp territory:</strong> Red owns C2–C6 + C20; Green owns C8–C12 + C22; Blue owns C14–C18 + C24. C1 is Red/Blue, C7 is Red/Green and C13 is Green/Blue. A shared gate is home for either owning camp and does not trigger promotion.</li>
          </ul>

          <h3>SPECIAL UNITS</h3>
          <ul>
            <li><strong>Fire:</strong> one diagonal step forward; never retreats.</li>
            <li><strong>Flag:</strong> exactly two clear forward steps while still in its own camp territory. After entering enemy territory it moves any distance orthogonally like a Chariot. It cannot re-enter exclusive home territory, but may return to C1/C7/C13 when that shared gate belongs to its original camp.</li>
            <li><strong>Soldier:</strong> always keeps its one-step forward move. On first entry into enemy territory it promotes and additionally gains sideways movement.</li>
          </ul>
        </div>
      </div>

      <section className="rules-section">
        <h3>VICTORY</h3>
        <p>
          A checked kingdom must answer immediately; if that interrupts the normal
          Red → Green → Blue cycle, the skipped turn resumes after the check is cleared.
          Checkmating a kingdom removes its General and transfers its surviving army
          to the faction whose piece actually delivered mate. The last surviving General wins.
          If the side to move is not in check but has no legal move, the game ends immediately
          as a stalemate draw.
        </p>
      </section>

      <div className="status-bar">
        <span className="turn-indicator">{currentPlayer}'s turn</span>
        {notice && <span className="selected-piece">{notice}</span>}
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

function SetupControls({
  mode,
  humanCount,
  setHumanCount,
  faction,
  setFaction,
  secondFaction,
  setSecondFaction,
  difficulty,
  setDifficulty,
}) {
  return (
    <>
      <fieldset className="san-you-qi-fieldset">
        <legend>Human players</legend>
        <div className="san-you-qi-choice-row">
          {[1, 2, 3].map((count) => (
            <button
              type="button"
              key={count}
              aria-pressed={humanCount === count}
              className={humanCount === count ? "selected" : ""}
              onClick={() => setHumanCount(count)}
            >
              <strong>{count} {count === 1 ? "player" : "players"}</strong>
              <small>{count === 3 ? "All human" : `${3 - count} ${3 - count === 1 ? "bot" : "bots"}`}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="san-you-qi-form-grid">
        <label>
          Your kingdom
          <select
            value={faction}
            onChange={(event) => {
              const next = event.target.value;
              setFaction(next);
              if (next === secondFaction) {
                setSecondFaction(FACTIONS.find((candidate) => candidate !== next));
              }
            }}
          >
            {FACTIONS.map((candidate) => (
              <option key={candidate} value={candidate}>{FACTION_LABELS[candidate]}</option>
            ))}
          </select>
        </label>

        {mode === "local" && humanCount === 2 && (
          <label>
            Player 2 kingdom
            <select value={secondFaction} onChange={(event) => setSecondFaction(event.target.value)}>
              {FACTIONS.filter((candidate) => candidate !== faction).map((candidate) => (
                <option key={candidate} value={candidate}>{FACTION_LABELS[candidate]}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <fieldset className="san-you-qi-fieldset">
        <legend>Bot difficulty</legend>
        <div className="san-you-qi-difficulty-grid">
          {Object.entries(BOT_LEVELS).map(([key, level]) => (
            <button
              key={key}
              type="button"
              aria-pressed={difficulty === key}
              className={difficulty === key ? "selected" : ""}
              disabled={mode === "local" && humanCount === 3}
              onClick={() => setDifficulty(key)}
            >
              <Bot size={19} />
              <strong>{level.label}</strong>
              <span>{level.description}</span>
            </button>
          ))}
        </div>
      </fieldset>
    </>
  );
}

export default function SanYouQiApp({ onExit }) {
  const initialRoomCode = roomFromUrl();
  const [mode, setMode] = useState(initialRoomCode ? "online" : "local");
  const [humanCount, setHumanCount] = useState(1);
  const [faction, setFaction] = useState("red");
  const [secondFaction, setSecondFaction] = useState("green");
  const [difficulty, setDifficulty] = useState("medium");
  const [local, setLocal] = useState(null);
  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [thinking, setThinking] = useState(false);
  const [botRetry, setBotRetry] = useState(0);

  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [code, setCode] = useState(initialRoomCode);
  const [room, setRoom] = useState(null);
  const [seat, setSeat] = useState(() => readSanYouSeat(initialRoomCode));
  const [rooms, setRooms] = useState([]);
  const [connected, setConnected] = useState(false);
  const [synced, setSynced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showRoom, setShowRoom] = useState(Boolean(initialRoomCode));
  const [compactMatch, setCompactMatch] = useState(() => window.matchMedia("(max-width: 900px)").matches);
  const [matchPanelOpen, setMatchPanelOpen] = useState(false);
  const [focusView, setFocusView] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const matchRef = useRef(null);

  const [client] = useState(() => new SanYouClient());
  const mounted = useRef(true);
  const seatRef = useRef(seat);
  const joiningToken = useRef("");
  const botStateRef = useRef(null);
  seatRef.current = seat;

  const updateRoom = (nextRoom) => {
    if (!mounted.current || !nextRoom) return;
    if (seatRef.current && nextRoom.roomCode !== seatRef.current.roomCode) return;
    setRoom((previous) =>
      !previous ||
      previous.roomCode !== nextRoom.roomCode ||
      nextRoom.revision >= previous.revision
        ? nextRoom
        : previous
    );
    setSynced(true);
  };

  useEffect(() => {
    mounted.current = true;
    client.onStatus = (online) => {
      if (!mounted.current) return;
      setConnected(online);
      if (!online) setSynced(false);
    };
    client.onPacket = (packet) => {
      if (packet.type === "sy_room_state" && packet.payload?.room) {
        updateRoom(packet.payload.room);
        setMessage("");
      }
      if (
        packet.type === "sy_notice" &&
        packet.payload?.roomCode === seatRef.current?.roomCode
      ) {
        setMessage(packet.payload.message || "");
      }
    };

    return () => {
      mounted.current = false;
      client.close();
    };
  }, [client]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const update = () => {
      setCompactMatch(media.matches);
      setMatchPanelOpen(false);
      if (media.matches) setFocusView(false);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const update = () => setFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const toggleFullScreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await matchRef.current?.requestFullscreen?.();
    } catch {
      setMessage("Fullscreen is unavailable here. Use your browser fullscreen command.");
    }
  };

  useEffect(() => {
    if (!seat) return undefined;
    let cancelled = false;
    let timer;

    const sync = async () => {
      try {
        const response = await client.request("sy_game_state", seat);
        if (!cancelled) {
          updateRoom(response.room);
          setError("");
        }
      } catch (reason) {
        if (!cancelled) {
          setSynced(false);
          setError(reason instanceof Error ? reason.message : "Could not restore the room.");
        }
      }

      if (!cancelled) timer = window.setTimeout(sync, 5000);
    };

    void sync();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [seat, client]);

  useEffect(() => {
    if (!local || local.state.outcome) {
      setThinking(false);
      return undefined;
    }

    const actor = local.state.turn;
    if (local.humans.includes(actor)) {
      setThinking(false);
      return undefined;
    }

    let cancelled = false;
    let worker;

    try {
      worker = new Worker(new URL("./bot.worker.js", import.meta.url), { type: "module" });
    } catch {
      setError("This browser could not start the bot. Try reloading the game.");
      setThinking(false);
      return undefined;
    }

    const position = local.state;
    botStateRef.current = position;
    setThinking(true);
    setError("");

    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        worker.terminate();
        setThinking(false);
        setError("The bot took too long. Retry its move.");
      }
    }, 15000);

    const start = window.setTimeout(() => {
      worker.postMessage({
        id: position.ply,
        state: position,
        difficulty: local.difficulty,
      });
    }, 420);

    worker.onmessage = ({ data }) => {
      if (cancelled) return;
      window.clearTimeout(timeout);

      if (data.error) {
        setThinking(false);
        setError(data.error);
        return;
      }

      if (!data.action) {
        const settled = resolveStalemate(position);
        if (settled !== position && settled.outcome?.reason === "stalemate") {
          setLocal((current) => {
            if (!current || current.state !== position) return current;
            return {
              ...current,
              state: settled,
              history: [...current.history.slice(-49), current.state],
            };
          });
          setSelectedPieceId(null);
          setError("");
          setThinking(false);
          return;
        }

        setThinking(false);
        setError("The bot could not choose a move. Retry its turn.");
        return;
      }

      setLocal((current) => {
        if (!current || current.state !== position) return current;
        const result = applyAction(current.state, data.action);
        if (result.error) {
          setError(result.error.message);
          return current;
        }
        return {
          ...current,
          state: result.state,
          history: [...current.history.slice(-49), current.state],
        };
      });

      setSelectedPieceId(null);
      setThinking(false);
    };

    worker.onerror = () => {
      window.clearTimeout(timeout);
      if (!cancelled) {
        setThinking(false);
        setError("Could not run the bot. Retry its turn.");
      }
    };

    return () => {
      cancelled = true;
      window.clearTimeout(start);
      window.clearTimeout(timeout);
      worker.terminate();
    };
  }, [local?.state, local?.difficulty, botRetry]);

  const run = async (action) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (reason) {
      if (mounted.current) {
        setError(reason instanceof Error ? reason.message : "Could not complete that action.");
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const startLocal = () => {
    const humans =
      humanCount === 3
        ? [...FACTIONS]
        : humanCount === 2
          ? [faction, secondFaction === faction ? FACTIONS.find((candidate) => candidate !== faction) : secondFaction]
          : [faction];

    setLocal({
      state: createInitialState(),
      humans,
      difficulty,
      history: [],
    });
    setRoom(null);
    setSeat(null);
    setSelectedPieceId(null);
    setError("");
    setMessage("");
  };

  const enterRoom = (nextRoom, playerId, token) => {
    const credentials = { roomCode: nextRoom.roomCode, playerId, token };
    rememberSanYouSeat(credentials);
    seatRef.current = credentials;
    setSeat(credentials);
    setRoom(nextRoom);
    setSynced(true);
    setShowRoom(true);
    joiningToken.current = "";
    window.history.replaceState(null, "", sanYouInviteUrl(nextRoom.roomCode));
  };

  const createRoom = () => run(async () => {
    if (!name.trim()) throw new Error("Enter a display name before creating a room.");
    const token = joiningToken.current ||= newSanYouSeatToken();
    const response = await client.request("sy_room_create", {
      name,
      humanCount,
      faction,
      difficulty,
      visibility,
      token,
    });
    enterRoom(response.room, response.playerId, token);
  });

  const joinRoom = (roomCode = code) => run(async () => {
    const normalized = String(roomCode || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);

    if (normalized.length !== 6) throw new Error("Enter the six-character room code.");

    const saved = readSanYouSeat(normalized);
    if (saved) {
      const response = await client.request("sy_game_state", saved);
      enterRoom(response.room, saved.playerId, saved.token);
      return;
    }

    if (!name.trim()) throw new Error("Enter a display name before joining.");
    const token = joiningToken.current ||= newSanYouSeatToken();
    const response = await client.request("sy_room_join", {
      name,
      roomCode: normalized,
      token,
    });
    enterRoom(response.room, response.playerId, token);
  });

  const refreshRooms = () => run(async () => {
    const response = await client.request("sy_room_list");
    setRooms(response.rooms || []);
    setMessage("Public rooms refreshed.");
  });

  const roomCommand = (type, payload = {}) => run(async () => {
    if (!seat) return;
    const response = await client.request(type, { ...seat, ...payload });
    if (response?.room) updateRoom(response.room);
  });

  const clearRoom = () => {
    if (seat) forgetSanYouSeat(seat.roomCode);
    seatRef.current = null;
    setSeat(null);
    setRoom(null);
    setSynced(false);
    setShowRoom(false);
    client.disconnect();
    window.history.replaceState(null, "", "?game=heritage-arcade&table=san-you-qi");
  };

  const leaveRoom = () => run(async () => {
    if (seat) await client.request("sy_room_leave", seat);
    clearRoom();
  });

  const me = room?.players?.find((player) => player.id === seat?.playerId);
  const onlineGame =
    room &&
    ["playing", "finished"].includes(room.status) &&
    !showRoom;

  const state = onlineGame ? room.gameState : local?.state || null;
  const localCanAct =
    Boolean(local && state && !state.outcome && local.humans.includes(state.turn) && !thinking);
  const onlineCanAct =
    Boolean(
      onlineGame &&
      state &&
      !state.outcome &&
      connected &&
      synced &&
      !busy &&
      me?.faction === state.turn &&
      state.activeFactions.includes(me.faction),
    );
  const canAct = onlineGame ? onlineCanAct : localCanAct;

  const legalActions = useMemo(
    () => state && !state.outcome ? getLegalActions(state) : [],
    [state],
  );

  const selectedPiece = useMemo(
    () => state?.pieces.find((piece) => piece.id === selectedPieceId) || null,
    [state, selectedPieceId],
  );

  const selectedActions = useMemo(
    () =>
      selectedPieceId
        ? legalActions.filter((action) => action.pieceId === selectedPieceId)
        : [],
    [legalActions, selectedPieceId],
  );

  const selectedTargets = useMemo(
    () => selectedActions.map((action) => action.to),
    [selectedActions],
  );

  const handleSelectPiece = (pieceId) => {
    if (!state || !canAct) return;
    const piece = state.pieces.find((candidate) => candidate.id === pieceId);
    if (!piece || piece.owner !== state.turn || state.outcome) return;
    setSelectedPieceId(pieceId);
    setMessage("");
  };

  const commitLocal = (action) => {
    setLocal((current) => {
      if (!current || !current.humans.includes(current.state.turn)) return current;
      const result = applyAction(current.state, action);
      if (result.error) {
        setError(result.error.message);
        return current;
      }
      return {
        ...current,
        state: result.state,
        history: [...current.history.slice(-49), current.state],
      };
    });
  };

  const handleMoveAttempt = (node) => {
    if (!selectedPiece || !state || !canAct) return;
    const action = selectedActions.find((candidate) => candidate.to === node);
    if (!action) {
      setMessage("That point is not a legal destination for the selected piece.");
      return;
    }

    if (onlineGame) {
      void roomCommand("sy_game_action", { revision: room.revision, action });
    } else {
      commitLocal(action);
    }

    setSelectedPieceId(null);
  };

  const restartLocal = () => {
    if (!local) return;
    setLocal((current) => ({
      ...current,
      state: createInitialState(),
      history: [],
    }));
    setSelectedPieceId(null);
    setError("");
    setMessage("");
  };

  const undoLocal = () => {
    setLocal((current) => {
      if (!current?.history.length || thinking) return current;
      return {
        ...current,
        state: current.history.at(-1),
        history: current.history.slice(0, -1),
      };
    });
    setSelectedPieceId(null);
    setError("");
  };

  if (state && (local || onlineGame)) {
    const seatLabels = Object.fromEntries(
      FACTIONS.map((candidate) => {
        if (!onlineGame) {
          return [
            candidate,
            local.humans.includes(candidate)
              ? `Player ${local.humans.indexOf(candidate) + 1}`
              : `${BOT_LEVELS[local.difficulty].label} bot`,
          ];
        }

        const seatInfo = room.seats[candidate];
        if (seatInfo?.kind === "bot") {
          return [candidate, `${BOT_LEVELS[room.difficulty].label} bot`];
        }

        const player = room.players.find((entry) => entry.faction === candidate);
        if (seatInfo?.botActive) {
          return [candidate, `${player?.name || "Player"} · bot covering`];
        }
        return [
          candidate,
          `${player?.name || "Player"}${player?.id === me?.id ? " (you)" : ""}`,
        ];
      }),
    );

    const notice = onlineGame
      ? !connected || !synced
        ? "Reconnecting… your seat is reserved."
        : busy
          ? "Confirming your move…"
          : state.outcome
            ? state.outcome.message
            : me?.faction === state.turn
              ? "Your turn."
              : `${FACTION_LABELS[state.turn]} is playing.`
      : thinking
        ? `${FACTION_LABELS[state.turn]} · ${BOT_LEVELS[local.difficulty].label} bot is thinking…`
        : state.note;

    return (
      <main
        ref={matchRef}
        className={`san-you-qi-app san-you-qi-match ${focusView ? "san-you-qi-focus" : ""}`}
      >
        <header className="san-you-qi-toolbar">
          <div className="san-you-qi-brand">
            <button
              type="button"
              className="san-you-qi-icon-button"
              aria-label={onlineGame ? "Room details" : "Return to setup"}
              title={onlineGame ? "Room details" : "Setup"}
              onClick={() => {
                if (onlineGame) setShowRoom(true);
                else {
                  setLocal(null);
                  setSelectedPieceId(null);
                }
              }}
            >
              <ArrowLeft size={17} />
            </button>
            <div>
              <h1>SAN YOU QI</h1>
              <span>ARCTIC DOMINION</span>
            </div>
          </div>

          <div
            className="san-you-qi-turn-chip"
            style={{ "--turn-color": FACTION_COLORS[state.turn] }}
            role="status"
            aria-live="polite"
          >
            <small>TURN <b>{state.ply + 1}</b></small>
            <span className="san-you-qi-turn-dot" />
            <div>
              <strong>{state.outcome ? state.outcome.message : `${FACTION_LABELS[state.turn]} to move`}</strong>
              <em>{notice}</em>
            </div>
          </div>

          <nav className="san-you-qi-toolbar-actions" aria-label="Table controls">
            <button
              type="button"
              className="san-you-qi-toolbar-button"
              onClick={() => setGuideOpen(true)}
              aria-label="Guide"
              title="Guide"
            >
              <BookOpen size={16} /><span>Guide</span>
            </button>

            <button
              type="button"
              className="san-you-qi-toolbar-button"
              aria-label={compactMatch ? "Open match details" : focusView ? "Show match panel" : "Focus view"}
              title={compactMatch ? "Match details" : focusView ? "Show match panel" : "Focus view"}
              onClick={() => compactMatch ? setMatchPanelOpen(true) : setFocusView((value) => !value)}
            >
              {compactMatch || focusView ? <PanelRightOpen size={17} /> : <PanelRightClose size={17} />}
            </button>

            <button
              type="button"
              className="san-you-qi-toolbar-button"
              onClick={toggleFullScreen}
              aria-label={fullScreen ? "Exit fullscreen" : "Fullscreen"}
              title={fullScreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullScreen ? <Minimize size={17} /> : <Maximize size={17} />}
            </button>

            <details className="san-you-qi-table-menu">
              <summary aria-label="More table options" title="More">
                <MoreHorizontal size={19} />
              </summary>
              <div>
                {!onlineGame && (
                  <>
                    <button
                      type="button"
                      disabled={!local?.history.length || thinking}
                      onClick={undoLocal}
                    >
                      <Undo2 size={16} /> Undo
                    </button>
                    <button type="button" onClick={restartLocal}>
                      <RotateCcw size={16} /> New game
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLocal(null);
                        setSelectedPieceId(null);
                      }}
                    >
                      <ArrowLeft size={16} /> Setup
                    </button>
                  </>
                )}
                {onlineGame && (
                  <button type="button" onClick={() => setShowRoom(true)}>
                    <Users size={16} /> Room {room.roomCode}
                  </button>
                )}
                {onExit && (
                  <button type="button" onClick={onExit}>
                    All Games
                  </button>
                )}
              </div>
            </details>
          </nav>
        </header>

        {error && (
          <div className="san-you-qi-message san-you-qi-error" role="alert">
            {error}
            {!onlineGame && botStateRef.current === local?.state && !thinking && (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setBotRetry((value) => value + 1);
                }}
              >
                Retry bot
              </button>
            )}
          </div>
        )}
        {message && <div className="san-you-qi-message" role="status">{message}</div>}

        <section className="san-you-qi-table-body">
          <div className="san-you-qi-battlefield-column">
            <div className="san-you-qi-battlefield-stage">
              <Board
                state={state}
                selectedPieceId={selectedPieceId}
                targetIds={selectedTargets}
                onSelectPiece={handleSelectPiece}
                onMoveAttempt={handleMoveAttempt}
                onClearSelection={() => setSelectedPieceId(null)}
                canAct={canAct}
              />
            </div>

            <footer className="san-you-qi-board-footer">
              <div className="san-you-qi-selection-feedback">
                {selectedPiece ? (
                  <img src={pieceAsset(selectedPiece)} alt="" />
                ) : (
                  <span className="san-you-qi-crosshair" aria-hidden="true">＋</span>
                )}
                <span>
                  {selectedPiece
                    ? `${ROLE_LABELS[selectedPiece.role]} · ${selectedTargets.length} legal ${selectedTargets.length === 1 ? "move" : "moves"}`
                    : canAct
                      ? "Select a piece to show legal moves"
                      : state.outcome
                        ? state.outcome.message
                        : notice}
                </span>
              </div>
              {state.lastAction && (
                <small className="san-you-qi-last-move-copy">
                  {getNodeLabel(state.lastAction.from)} → {getNodeLabel(state.lastAction.to)}
                </small>
              )}
            </footer>

            {compactMatch && (
              <div className="san-you-qi-phone-players" aria-label="Kingdom status">
                {FACTIONS.map((candidate) => {
                  const count = state.pieces.filter(
                    (piece) => piece.status === "board" && piece.owner === candidate,
                  ).length;
                  return (
                    <button
                      key={candidate}
                      type="button"
                      className={candidate === state.turn && !state.outcome ? "active" : ""}
                      style={{ "--seat-color": FACTION_COLORS[candidate] }}
                      onClick={() => setMatchPanelOpen(true)}
                    >
                      <span>{candidate === "red" ? "RED" : candidate === "green" ? "GREEN" : "BLUE"}</span>
                      <strong>{state.activeFactions.includes(candidate) ? count : "Out"}</strong>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {!compactMatch && !focusView && (
            <MatchPanel
              state={state}
              selectedPiece={selectedPiece}
              selectedTargets={selectedTargets}
              seatLabels={seatLabels}
              notice={notice}
              online={Boolean(onlineGame)}
              roomCode={room?.roomCode || ""}
              connectionStatus={connected && synced ? "Connected" : "Reconnecting"}
            />
          )}
        </section>

        {compactMatch && matchPanelOpen && (
          <div
            className="san-you-qi-mobile-backdrop"
            role="presentation"
            onClick={() => setMatchPanelOpen(false)}
          >
            <section
              className="san-you-qi-mobile-drawer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="sanyou-match-details-title"
              onClick={(event) => event.stopPropagation()}
            >
              <header>
                <h2 id="sanyou-match-details-title">Match details</h2>
                <button type="button" autoFocus aria-label="Close match details" onClick={() => setMatchPanelOpen(false)}>
                  <X size={20} />
                </button>
              </header>
              <MatchPanel
                state={state}
                selectedPiece={selectedPiece}
                selectedTargets={selectedTargets}
                seatLabels={seatLabels}
                notice={notice}
                online={Boolean(onlineGame)}
                roomCode={room?.roomCode || ""}
                connectionStatus={connected && synced ? "Connected" : "Reconnecting"}
              />
            </section>
          </div>
        )}

        {guideOpen && (
          <div
            className="san-you-qi-guide-backdrop"
            role="presentation"
            onClick={() => setGuideOpen(false)}
          >
            <section
              className="san-you-qi-guide-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="sanyou-guide-title"
              onClick={(event) => event.stopPropagation()}
            >
              <header>
                <div>
                  <small>FIELD GUIDE</small>
                  <h2 id="sanyou-guide-title">San You Qi</h2>
                </div>
                <button type="button" autoFocus aria-label="Close guide" onClick={() => setGuideOpen(false)}>
                  <X size={20} />
                </button>
              </header>
              <div className="san-you-qi-guide-scroll">
                <Rulebook
                  state={state}
                  selectedPiece={selectedPiece}
                  selectedTargets={selectedTargets}
                  seatLabels={seatLabels}
                  notice={notice}
                />
              </div>
            </section>
          </div>
        )}
      </main>
    );
  }

  if (seat) {
    return (
      <main className="san-you-qi-app san-you-qi-setup-page">
        <section className="san-you-qi-setup-card">
          <div className="san-you-qi-setup-heading">
            <span>ONLINE ROOM</span>
            <h1>SAN YOU QI · {seat.roomCode}</h1>
            <p>{connected && synced ? "Connected" : "Reconnecting to your reserved seat…"}</p>
          </div>

          {error && <div className="san-you-qi-message san-you-qi-error">{error}</div>}
          {message && <div className="san-you-qi-message">{message}</div>}

          {room ? (
            <>
              <div className="san-you-qi-room-meta">
                <b>{room.visibility === "private" ? "Private room" : "Public room"}</b>
                <span>{BOT_LEVELS[room.difficulty]?.label || "Medium"} bots</span>
                <span>{room.status}</span>
              </div>

              <div className="san-you-qi-room-seats">
                {FACTIONS.map((candidate) => {
                  const roomSeat = room.seats[candidate];
                  const player = room.players.find((entry) => entry.id === roomSeat?.playerId);
                  return (
                    <article key={candidate} style={{ "--seat-color": FACTION_COLORS[candidate] }}>
                      <span className="san-you-qi-seat-dot" />
                      <h3>{FACTION_LABELS[candidate]}</h3>
                      <b>
                        {roomSeat?.kind === "bot"
                          ? `${BOT_LEVELS[room.difficulty].label} bot`
                          : player?.name || "Open seat"}
                      </b>
                      <small>
                        {player
                          ? !player.connected
                            ? "Disconnected · seat reserved"
                            : player.ready
                              ? "Ready"
                              : "Not ready"
                          : roomSeat?.kind === "bot"
                            ? "Ready"
                            : "Invite a player"}
                      </small>
                    </article>
                  );
                })}
              </div>

              <div className="san-you-qi-invite">
                <label htmlFor="sanyou-invite">Invite link</label>
                <input
                  id="sanyou-invite"
                  readOnly
                  value={sanYouInviteUrl(room.roomCode)}
                  onFocus={(event) => event.target.select()}
                />
                <button
                  type="button"
                  onClick={() => run(async () => {
                    await navigator.clipboard.writeText(sanYouInviteUrl(room.roomCode));
                    setMessage("Invite link copied.");
                  })}
                >
                  <Copy size={17} /> Copy
                </button>
              </div>

              <div className="san-you-qi-setup-actions">
                {room.status === "waiting" ? (
                  <>
                    <button
                      type="button"
                      disabled={busy || !synced}
                      onClick={() => roomCommand("sy_room_ready", { ready: !me?.ready })}
                    >
                      {me?.ready ? "Not ready" : "I'm ready"}
                    </button>

                    {room.hostId === me?.id && (
                      <>
                        <button
                          type="button"
                          className="primary"
                          disabled={
                            busy ||
                            !synced ||
                            room.players.some((player) => !player.ready || !player.connected) ||
                            Object.values(room.seats).some((roomSeat) => roomSeat.kind === "open")
                          }
                          onClick={() => roomCommand("sy_room_start")}
                        >
                          Start match
                        </button>

                        {Object.values(room.seats).some((roomSeat) => roomSeat.kind === "open") && (
                          <button
                            type="button"
                            disabled={
                              busy ||
                              !synced ||
                              room.players.some((player) => !player.ready || !player.connected)
                            }
                            onClick={() => roomCommand("sy_room_start", { fillWithBots: true })}
                          >
                            Fill empty seats with bots & start
                          </button>
                        )}
                      </>
                    )}
                  </>
                ) : room.status !== "cancelled" ? (
                  <button
                    type="button"
                    className="primary"
                    onClick={() => setShowRoom(false)}
                  >
                    Return to board
                  </button>
                ) : null}

                <button type="button" disabled={busy} onClick={() => void leaveRoom()}>
                  {room.status === "playing" ? "Leave & hand seat to bot" : "Leave room"}
                </button>
              </div>

              <p className="san-you-qi-setup-note">
                A disconnected human keeps the seat for two minutes. After that,
                a bot temporarily covers that kingdom until the player reconnects.
              </p>
            </>
          ) : (
            <div className="san-you-qi-empty-room">
              <p>Restoring your room…</p>
              <button type="button" onClick={clearRoom}>Return to setup</button>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="san-you-qi-app san-you-qi-setup-page">
      <section className="san-you-qi-setup-card">
        <div className="san-you-qi-setup-heading">
          <span>ARCTIC DOMINION · HERITAGE ARCADE</span>
          <h1>SAN YOU QI</h1>
          <p>Three kingdoms. Choose local players and bots, or create an online room.</p>
        </div>

        <div className="san-you-qi-mode-tabs" role="group" aria-label="Where to play">
          <button
            type="button"
            className={mode === "local" ? "selected" : ""}
            aria-pressed={mode === "local"}
            onClick={() => setMode("local")}
          >
            <Users size={19} /> On this device
          </button>
          <button
            type="button"
            className={mode === "online" ? "selected" : ""}
            aria-pressed={mode === "online"}
            onClick={() => setMode("online")}
          >
            <Globe2 size={19} /> Online rooms
          </button>
        </div>

        {error && <div className="san-you-qi-message san-you-qi-error">{error}</div>}
        {message && <div className="san-you-qi-message">{message}</div>}

        <SetupControls
          mode={mode}
          humanCount={humanCount}
          setHumanCount={setHumanCount}
          faction={faction}
          setFaction={setFaction}
          secondFaction={secondFaction}
          setSecondFaction={setSecondFaction}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
        />

        {mode === "local" ? (
          <div className="san-you-qi-setup-actions">
            <button type="button" className="primary" onClick={startLocal}>
              Start local match
            </button>
            {onExit && <button type="button" onClick={onExit}>All Games</button>}
          </div>
        ) : (
          <>
            <div className="san-you-qi-form-grid">
              <label>
                Display name
                <input
                  value={name}
                  maxLength={24}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                />
              </label>
              <label>
                Room visibility
                <select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
                  <option value="private">Private · invite code</option>
                  <option value="public">Public · lobby listing</option>
                </select>
              </label>
            </div>

            <div className="san-you-qi-setup-actions">
              <button type="button" className="primary" disabled={busy} onClick={() => void createRoom()}>
                Create room
              </button>
              {onExit && <button type="button" onClick={onExit}>All Games</button>}
            </div>

            <div className="san-you-qi-join-row">
              <input
                value={code}
                maxLength={6}
                onChange={(event) =>
                  setCode(
                    event.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 6),
                  )
                }
                placeholder="ROOM CODE"
                aria-label="Room code"
              />
              <button type="button" disabled={busy} onClick={() => void joinRoom()}>
                Join room
              </button>
              <button type="button" disabled={busy} onClick={() => void refreshRooms()}>
                Refresh public rooms
              </button>
            </div>

            {rooms.length > 0 && (
              <div className="san-you-qi-public-rooms">
                {rooms.map((listed) => (
                  <button
                    type="button"
                    key={listed.roomCode}
                    onClick={() => {
                      setCode(listed.roomCode);
                      void joinRoom(listed.roomCode);
                    }}
                  >
                    <b>{listed.roomCode}</b>
                    <span>{listed.host}</span>
                    <small>
                      {listed.playerCount}/{listed.humanCount} humans · {BOT_LEVELS[listed.difficulty]?.label || "Medium"}
                    </small>
                  </button>
                ))}
              </div>
            )}

            <p className="san-you-qi-setup-note">
              Online rooms are free guest games. Your seat is stored only in this browser.
              The server validates every move and runs bot turns authoritatively.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
