import { useMemo, useRef, useState } from "react";

const DESKTOP_MEDIA_QUERY = "@media (min-width: 900px) and (orientation: landscape)";

const MAIN_MENU_ITEMS = [
  { id: "menu-play", label: "Start Game", selector: ".menu-play-hitbox", kind: "button", left: 13.16, top: 75.33, width: 74.41, height: 12.92 },
  { id: "menu-how", label: "Rules / How To Play", selector: ".menu-how-hitbox", kind: "button", left: 22.37, top: 88.93, width: 54.51, height: 5.95 },
  { id: "menu-spectate", label: "Spectate Room", selector: ".menu-spectate-hitbox", kind: "button", left: 30, top: 94, width: 40, height: 4.4 }
];

const OPEN_ICE_ITEMS = [
  ...Array.from({ length: 9 }, (_, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const lefts = [7.8, 36.9, 64.9];
    const tops = [31.7, 44.9, 58.1];
    return { id: `openice-room-${index}`, label: `Room Card ${index + 1}`, selector: `.openicehub-room-${index}`, kind: "card", left: lefts[col], top: tops[row], width: 25.95, height: 11.8 };
  }),
  ...Array.from({ length: 9 }, (_, index) => ([
    { id: `openice-room-${index}-code`, parent: `openice-room-${index}`, label: `Room ${index + 1} Code`, selector: `.openicehub-room-${index} .openicehub-room-code`, kind: "text", left: 12.2, top: 28.2, width: 75.6, height: 16.2, fontSize: "2.15cqh" },
    { id: `openice-room-${index}-users`, parent: `openice-room-${index}`, label: `Room ${index + 1} Users`, selector: `.openicehub-room-${index} .openicehub-users-count`, kind: "text", left: 68.3, top: 55.6, width: 16.7, height: 19.2, fontSize: "2.0cqh" },
    { id: `openice-room-${index}-join`, parent: `openice-room-${index}`, label: `Room ${index + 1} Join`, selector: `.openicehub-room-${index} .openicehub-room-join-hit`, kind: "button", left: 5, top: 75.1, width: 90, height: 21.5 }
  ])).flat(),
  { id: "openice-create", label: "Create Room", selector: ".openicehub-create-hit", kind: "button", left: 49, top: 17.6, width: 34.8, height: 6.5 },
  { id: "openice-refresh", label: "Refresh Rooms", selector: ".openicehub-refresh-hit", kind: "button", left: 72.4, top: 29.2, width: 18.2, height: 3.4 },
  { id: "openice-next-page", label: "Next Page", selector: ".openicehub-next-page-hit", kind: "button", left: 34.2, top: 70.4, width: 31.8, height: 3.7 },
  { id: "openice-private-code-hit", label: "Private Code Tap Area", selector: ".openicehub-private-code-hit", kind: "button", left: 20.5, top: 78.2, width: 31.4, height: 3.7 },
  { id: "openice-private-input", label: "Private Code Text", selector: ".openicehub-private-input", kind: "input", left: 21.3, top: 78.35, width: 29.6, height: 3.1, fontSize: "2.2cqh" },
  { id: "openice-join-private", label: "Join Private", selector: ".openicehub-join-private-hit", kind: "button", left: 54.3, top: 77.9, width: 25, height: 4.5 },
  { id: "openice-back", label: "Back", selector: ".openicehub-back-hit", kind: "button", left: 22.5, top: 93.1, width: 55, height: 5.3 },
  { id: "openice-status", label: "Status Text", selector: ".openicehub-status", kind: "text", left: 12, top: 95.8, width: 76, height: 2.9, fontSize: "1.5cqh", extraCss: ["bottom: auto;"] }
];

const GAME_ITEMS = [
  { id: "game-board", label: "8x8 Board Square", selector: ".game-stage", kind: "board", left: 31.6, top: 23.5, width: 40.83, height: 40.83, cssVarPrefix: "board" },
  { id: "game-roll", label: "Roll Dice Hitbox", selector: ".roll-hitbox", kind: "button", left: 23.26, top: 91.1, width: 14.7, height: 7.67 },
  { id: "game-main-menu", label: "Main Menu Hitbox", selector: ".new-game-hitbox", kind: "button", left: 41.8, top: 92.67, width: 16.6, height: 6.26 },
  { id: "game-end-turn", label: "End Turn Hitbox", selector: ".end-turn-hitbox", kind: "button", left: 61.5, top: 92, width: 15.6, height: 5.6 },
  { id: "game-dice", label: "Dice Overlay Area", selector: ".dice-overlay", kind: "card", left: 37.6, top: 83.36, width: 25.02, height: 8.05 },
  { id: "game-status", label: "Turn / Status Text", selector: ".game-status-overlay", kind: "text", left: 31.77, top: 14.1, width: 29.04, height: 5.3, fontSize: "1.1cqh" },
  { id: "game-room-badge", label: "Room Badge", selector: ".game-status-badge", kind: "text", left: 61.3, top: 14.9, width: 7.15, height: 4.06, fontSize: "1.0cqh", extraCss: ["position: absolute;"] }
];

const PLAYER_HUB_ITEMS = [
  { id: "hub-open-ice", label: "Open Ice", selector: ".open-ice-hitbox", kind: "button", left: 38.56, top: 27.01, width: 24.43, height: 29.12 },
  { id: "hub-high-stakes", label: "High Stakes", selector: ".high-stakes-hitbox", kind: "button", left: 38.47, top: 57.36, width: 23.97, height: 26.15 },
  { id: "hub-match-history", label: "Match History", selector: ".match-history-hitbox", kind: "button", left: 12.83, top: 36.97, width: 11.47, height: 21.48 },
  { id: "hub-leaderboard", label: "Leaderboard", selector: ".leaderboard-hitbox", kind: "button", left: 24.3, top: 37.3, width: 11.93, height: 20.16 },
  { id: "hub-account-activity", label: "Account Activity", selector: ".account-activity-hitbox", kind: "button", left: 12.83, top: 58.6, width: 11.56, height: 19.99 },
  { id: "hub-my-rooms", label: "My Rooms", selector: ".my-rooms-hitbox", kind: "button", left: 24.77, top: 58.6, width: 11.09, height: 20.32 },
  { id: "hub-wallet-value", label: "Wallet Value", selector: ".wallet-value", kind: "text", left: 77.24, top: 41.44, width: 13.28, height: 4.99, fontSize: "1.8cqh", extraCss: ["display: grid;"] },
  { id: "hub-available-value", label: "Available Value", selector: ".available-value", kind: "text", left: 77.06, top: 47.33, width: 13.65, height: 5.32, fontSize: "1.8cqh", extraCss: ["display: grid;"] },
  { id: "hub-locked-value", label: "Locked Value", selector: ".locked-value", kind: "text", left: 77.13, top: 53.01, width: 13.67, height: 5.11, fontSize: "1.8cqh", extraCss: ["display: grid;"] },
  { id: "hub-amount", label: "Amount Input", selector: ".playerhub-amount-input", kind: "input", left: 72.48, top: 60.28, width: 18.4, height: 4.8, fontSize: "1.8cqh", extraCss: ["display: block;"] },
  { id: "hub-refresh", label: "Refresh", selector: ".refresh-hitbox", kind: "button", left: 65.09, top: 67.02, width: 8.12, height: 7.59 },
  { id: "hub-deposit", label: "Deposit", selector: ".deposit-hitbox", kind: "button", left: 73.64, top: 67.19, width: 8.4, height: 7.1 },
  { id: "hub-withdraw", label: "Withdraw", selector: ".withdraw-hitbox", kind: "button", left: 82.93, top: 67.35, width: 8.4, height: 6.6 },
  { id: "hub-back", label: "Back", selector: ".playerhub-back-hitbox", kind: "button", left: 37.91, top: 83.69, width: 24.17, height: 10.95 }
];

const PROFILE_ITEMS = [
  { id: "profile-connect", label: "Connect AGW Hitbox", selector: ".profile-connect-hitbox", kind: "button", left: 18, top: 30, width: 64, height: 10 },
  { id: "profile-wallet-address", label: "Wallet Address Text", selector: ".profile-wallet-address", kind: "text", left: 19, top: 52, width: 30, height: 5, fontSize: "2.0cqh" },
  { id: "profile-wallet-copy", label: "Wallet Copy Hitbox", selector: ".profile-wallet-copy-hitbox", kind: "button", left: 45, top: 52, width: 5, height: 5 },
  { id: "profile-name", label: "Player Name Input", selector: ".profile-name-input", kind: "input", left: 52, top: 52, width: 30, height: 5, fontSize: "2.2cqh" },
  { id: "profile-complete", label: "Complete Profile Hitbox", selector: ".profile-complete-hitbox", kind: "button", left: 31, top: 71, width: 38, height: 8 },
  { id: "profile-back", label: "Back Hitbox", selector: ".profile-back-hitbox", kind: "button", left: 39, top: 82, width: 22, height: 6 },
  { id: "profile-status", label: "Status / Error Message", selector: ".profile-status-message", kind: "text", left: 31, top: 88, width: 38, height: 4, fontSize: "1.7cqh" },
  { id: "profile-wallet-status", label: "AGW Connected Label", selector: ".profile-wallet-status", kind: "text", left: 18, top: 30, width: 64, height: 10, fontSize: "2.2cqh" },
  { id: "profile-disconnect", label: "Disconnect Hitbox", selector: ".profile-disconnect-hitbox", kind: "button", left: 39, top: 34, width: 22, height: 4 },
  { id: "profile-loading", label: "Loading / Creating Text", selector: ".profile-loading-message", kind: "text", left: 31, top: 88, width: 38, height: 4, fontSize: "1.7cqh" }
];

const CALIBRATION_CONFIGS = {
  "main-menu": { title: "Main Menu Calibration", image: "/assets/screens/main-menu.png", aspectRatio: "9 / 16", stageClass: "cal-art-stage main-menu-cal-stage", storageKey: "arcticCalibrationMainMenu", cssFileName: "main-menu-calibration.css", jsConstName: "MAIN_MENU_CALIBRATION", items: MAIN_MENU_ITEMS },
  "open-ice": { title: "Open Ice Hub Calibration", image: "/assets/screens/openicehub.png", aspectRatio: "941 / 1672", stageClass: "cal-art-stage open-ice-cal-stage", storageKey: "arcticCalibrationOpenIce", cssFileName: "open-ice-calibration.css", jsConstName: "OPEN_ICE_CALIBRATION", items: OPEN_ICE_ITEMS },
  game: { title: "Game Screen Desktop Calibration", image: "/assets/screens/arctic-dominion-game-base-desktop.png", aspectRatio: "16 / 9", stageClass: "cal-art-stage game-cal-stage", storageKey: "arcticCalibrationGameDesktop", cssFileName: "game-desktop-calibration.css", jsConstName: "GAME_DESKTOP_CALIBRATION", desktopOnly: true, showBoardGrid: true, items: GAME_ITEMS },
  "game-grid": { title: "Game 8x8 Grid Desktop Calibration", image: "/assets/screens/arctic-dominion-game-base-desktop.png", aspectRatio: "16 / 9", stageClass: "cal-art-stage game-cal-stage game-grid-cal-stage", storageKey: "arcticCalibrationGameGridDesktop", cssFileName: "game-grid-desktop-calibration.css", jsConstName: "GAME_GRID_DESKTOP_CALIBRATION", desktopOnly: true, showBoardGrid: true, items: GAME_ITEMS },
  "player-hub": { title: "Player Hub Desktop Calibration", image: "/assets/screens/playerhub-desktop.png", aspectRatio: "16 / 9", stageClass: "cal-art-stage player-hub-cal-stage", storageKey: "arcticCalibrationPlayerHubDesktop", cssFileName: "player-hub-desktop-calibration.css", jsConstName: "PLAYER_HUB_DESKTOP_CALIBRATION", desktopOnly: true, items: PLAYER_HUB_ITEMS },
  profile: { title: "Profile Screen Desktop Calibration", image: "/assets/screens/profile-desktop.png", mobileImage: "/assets/screens/profile.webp", aspectRatio: "16 / 9", stageClass: "cal-art-stage profile-cal-stage", storageKey: "arcticCalibrationProfileDesktop", cssFileName: "profile-desktop-calibration.css", jsConstName: "PROFILE_DESKTOP_CALIBRATION", desktopOnly: true, items: PROFILE_ITEMS }
};

export function CalibrationScreen({ target = "main-menu" }) {
  const config = CALIBRATION_CONFIGS[target] || CALIBRATION_CONFIGS["main-menu"];
  const initialItems = useMemo(() => loadSavedItems(config) || config.items, [config]);
  const [items, setItems] = useState(initialItems);
  const [selectedId, setSelectedId] = useState(initialItems[0]?.id || "");
  const [outputMode, setOutputMode] = useState("css");
  const [status, setStatus] = useState("Ready. Drag red boxes. Resize from yellow corners.");
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const output = outputMode === "css" ? buildCssOutput(items, config) : buildJsOutput(config.jsConstName, items);

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveItems(config.storageKey, next);
      return next;
    });
  }

  function resetAll() {
    setItems(config.items);
    saveItems(config.storageKey, config.items);
    setSelectedId(config.items[0]?.id || "");
    setStatus("Reset to current repo values.");
  }

  function selectItem(id) {
    setSelectedId(id);
    setStatus(`Selected ${id}`);
  }

  function startPointer(event, id, mode) {
    const stage = stageRef.current;
    const item = itemMap.get(id);
    if (!stage || !item) return;
    event.preventDefault();
    event.stopPropagation();
    selectItem(id);
    const stageRect = stage.getBoundingClientRect();
    const parent = item.parent ? itemMap.get(item.parent) : null;
    const parentBox = parent ? percentBoxToStageBox(parent, null) : null;
    const contextPx = parentBox
      ? { left: parentBox.left / 100 * stageRect.width, top: parentBox.top / 100 * stageRect.height, width: parentBox.width / 100 * stageRect.width, height: parentBox.height / 100 * stageRect.height }
      : { left: 0, top: 0, width: stageRect.width, height: stageRect.height };
    dragRef.current = { id, mode, originX: event.clientX, originY: event.clientY, start: { ...item }, contextPx };
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp, { once: true });
    setStatus(mode === "resize" ? `Resizing ${id}` : `Moving ${id}`);
  }

  function onPointerMove(event) {
    const drag = dragRef.current;
    if (!drag) return;
    event.preventDefault();
    const dxPct = (event.clientX - drag.originX) / drag.contextPx.width * 100;
    const dyPct = (event.clientY - drag.originY) / drag.contextPx.height * 100;
    updateItem(drag.id, drag.mode === "resize"
      ? { width: clampNumber(drag.start.width + dxPct, 1, 130), height: clampNumber(drag.start.height + dyPct, 1, 130) }
      : { left: clampNumber(drag.start.left + dxPct, -20, 120), top: clampNumber(drag.start.top + dyPct, -20, 120) });
  }

  function onPointerUp() {
    const id = dragRef.current?.id;
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    setStatus(id ? `Recorded ${id}` : "Ready");
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output);
      setStatus(`Copied ${outputMode.toUpperCase()} to clipboard.`);
    } catch {
      setStatus("Clipboard blocked. Select the text area and copy manually.");
    }
  }

  function downloadOutput() {
    const blob = new Blob([output], { type: outputMode === "css" ? "text/css" : "text/javascript" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = outputMode === "css" ? config.cssFileName : `${config.jsConstName.toLowerCase()}.js`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("Downloaded calibration output.");
  }

  function updateSelectedNumber(field, value) {
    if (!selectedId) return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    updateItem(selectedId, { [field]: parsed });
  }

  function bumpFont(delta) {
    const item = itemMap.get(selectedId);
    if (!item) return;
    const current = parseFloat(item.fontSize || "12") || 12;
    const unit = String(item.fontSize || "px").replace(/[\d.\s-]/g, "") || "px";
    updateItem(item.id, { fontSize: `${Math.max(1, current + delta).toFixed(2).replace(/\.00$/, "")}${unit}` });
  }

  const selectedItem = itemMap.get(selectedId);

  return (
    <section className="cal-screen">
      <div className="cal-topbar">
        <div>
          <strong>{config.title}</strong>
          <span>Temporary links: <code>?calibrate=main-menu</code> / <code>?calibrate=open-ice</code> / <code>?calibrate=game-grid</code> / <code>?calibrate=player-hub</code> / <code>?calibrate=profile</code></span>
        </div>
        <div className="cal-link-row">
          <a href="?calibrate=main-menu">Main Menu</a>
          <a href="?calibrate=open-ice">Open Ice</a>
          <a href="?calibrate=game-grid">Game Grid</a>
          <a href="?calibrate=game">Game Old</a>
          <a href="?calibrate=player-hub">Player Hub</a>
          <a href="?calibrate=profile">Profile</a>
          <a href="/">Exit</a>
        </div>
      </div>

      <div className="cal-layout">
        <div className="cal-stage-wrap">
          <div className={config.stageClass} style={{ aspectRatio: config.aspectRatio }} ref={stageRef}>
            <picture>
              {config.mobileImage && <source media="(max-width: 899px), (orientation: portrait)" srcSet={config.mobileImage} />}
              <img src={config.image} alt={config.title} draggable="false" />
            </picture>
            {config.showBoardGrid && <BoardGridOverlay boardItem={itemMap.get("game-board")} />}
            {items.map((item) => {
              const box = percentBoxToStageBox(item, item.parent ? itemMap.get(item.parent) : null);
              const isChild = Boolean(item.parent);
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`cal-box ${item.kind} ${isChild ? "child" : ""} ${selectedId === item.id ? "selected" : ""}`}
                  style={{ left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%` }}
                  onPointerDown={(event) => startPointer(event, item.id, "move")}
                  onClick={(event) => { event.preventDefault(); event.stopPropagation(); selectItem(item.id); }}
                >
                  <span>{item.label}</span>
                  <i onPointerDown={(event) => startPointer(event, item.id, "resize")} />
                </button>
              );
            })}
          </div>
        </div>

        <aside className="cal-panel">
          <div className="cal-panel-head"><strong>Calibration Output</strong><span>{status}</span></div>
          <div className="cal-actions">
            <button type="button" onClick={() => setOutputMode("css")} className={outputMode === "css" ? "active" : ""}>CSS</button>
            <button type="button" onClick={() => setOutputMode("js")} className={outputMode === "js" ? "active" : ""}>JS</button>
            <button type="button" onClick={copyOutput}>Copy</button>
            <button type="button" onClick={downloadOutput}>Download</button>
            <button type="button" onClick={resetAll}>Reset</button>
          </div>

          {selectedItem && (
            <div className="cal-selected-card">
              <strong>{selectedItem.label}</strong>
              <code>{selectedItem.selector}</code>
              <div className="cal-number-grid">
                {[["left", "Left"], ["top", "Top"], ["width", "Width"], ["height", "Height"]].map(([field, label]) => (
                  <label key={field}><span>{label} %</span><input value={toFixedInput(selectedItem[field])} onChange={(event) => updateSelectedNumber(field, event.target.value)} /></label>
                ))}
              </div>
              {(selectedItem.kind === "text" || selectedItem.kind === "input") && (
                <div className="cal-font-row"><span>Font: {selectedItem.fontSize || "not set"}</span><button type="button" onClick={() => bumpFont(-0.1)}>-</button><button type="button" onClick={() => bumpFont(0.1)}>+</button></div>
              )}
            </div>
          )}

          <select className="cal-target-select" value={selectedId} onChange={(event) => selectItem(event.target.value)}>
            {items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <textarea value={output} readOnly spellCheck="false" onFocus={(event) => event.currentTarget.select()} />
        </aside>
      </div>
    </section>
  );
}

function BoardGridOverlay({ boardItem }) {
  if (!boardItem) return null;
  const size = Math.min(boardItem.width, boardItem.height);
  return <div className="cal-board-grid-overlay" aria-hidden="true" style={{ left: `${boardItem.left}%`, top: `${boardItem.top}%`, width: `${size}%`, height: `${size}%` }}>{Array.from({ length: 64 }, (_, index) => <span key={index} />)}</div>;
}

function percentBoxToStageBox(item, parent) {
  if (!parent) return item;
  return { left: parent.left + parent.width * item.left / 100, top: parent.top + parent.height * item.top / 100, width: parent.width * item.width / 100, height: parent.height * item.height / 100 };
}

function buildCssOutput(items, config) {
  const css = items.map((item) => buildCssRule(item)).join("\n\n");
  if (!config.desktopOnly) return css;
  return `${DESKTOP_MEDIA_QUERY} {\n${indentCss(css)}\n}`;
}

function buildCssRule(item) {
  if (item.cssVarPrefix === "board") {
    const size = Math.min(item.width, item.height);
    const lines = [`  --board-left: ${formatPct(item.left)};`, `  --board-top: ${formatPct(item.top)};`, `  --board-size: ${formatPct(size)};`, ...(item.extraCss || []).map((line) => `  ${line}`)];
    return `${item.selector} {\n${lines.join("\n")}\n}`;
  }
  const lines = [`  left: ${formatPct(item.left)};`, `  top: ${formatPct(item.top)};`, `  width: ${formatPct(item.width)};`, `  height: ${formatPct(item.height)};`, item.fontSize ? `  font-size: ${item.fontSize};` : "", ...(item.extraCss || []).map((line) => `  ${line}`)].filter(Boolean);
  return `${item.selector} {\n${lines.join("\n")}\n}`;
}

function indentCss(css) {
  return css.split("\n").map((line) => line ? `  ${line}` : line).join("\n");
}

function buildJsOutput(name, items) {
  const clean = items.reduce((acc, item) => {
    acc[item.id] = { selector: item.selector, parent: item.parent || null, kind: item.kind, left: Number(item.left.toFixed(2)), top: Number(item.top.toFixed(2)), width: Number(item.width.toFixed(2)), height: Number(item.height.toFixed(2)), ...(item.fontSize ? { fontSize: item.fontSize } : {}), ...(item.cssVarPrefix ? { cssVarPrefix: item.cssVarPrefix } : {}) };
    return acc;
  }, {});
  return `export const ${name} = ${JSON.stringify(clean, null, 2)};\n`;
}

function loadSavedItems(config) {
  try {
    const raw = window.localStorage.getItem(config.storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const byId = new Map(parsed.map((item) => [item.id, item]));
    return config.items.map((item) => ({ ...item, ...(byId.get(item.id) || {}) }));
  } catch {
    return null;
  }
}

function saveItems(key, items) {
  try { window.localStorage.setItem(key, JSON.stringify(items)); } catch {}
}

function formatPct(value) {
  return `${Number(value).toFixed(2)}%`;
}

function toFixedInput(value) {
  return Number(value).toFixed(2).replace(/\.00$/, "");
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
