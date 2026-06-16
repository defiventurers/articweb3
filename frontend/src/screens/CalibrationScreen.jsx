import { useMemo, useRef, useState } from "react";

const MAIN_MENU_ITEMS = [
  { id: "menu-play", label: "Start Game", selector: ".menu-play-hitbox", kind: "button", left: 13.16, top: 75.33, width: 74.41, height: 12.92 },
  { id: "menu-how", label: "Rules / How To Play", selector: ".menu-how-hitbox", kind: "button", left: 22.37, top: 88.93, width: 54.51, height: 5.95 },
  { id: "menu-spectate", label: "Spectate Room", selector: ".menu-spectate-hitbox", kind: "button", left: 30.0, top: 94.0, width: 40.0, height: 4.4 }
];

const OPEN_ICE_ITEMS = [
  ...Array.from({ length: 9 }, (_, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const lefts = [7.8, 36.9, 64.9];
    const tops = [31.7, 44.9, 58.1];
    return {
      id: `openice-room-${index}`,
      label: `Room Card ${index + 1}`,
      selector: `.openicehub-room-${index}`,
      kind: "card",
      left: lefts[col],
      top: tops[row],
      width: 25.95,
      height: 11.8
    };
  }),
  ...Array.from({ length: 9 }, (_, index) => ([
    { id: `openice-room-${index}-code`, parent: `openice-room-${index}`, label: `Room ${index + 1} Code`, selector: `.openicehub-room-${index} .openicehub-room-code`, kind: "text", left: 12.2, top: 28.2, width: 75.6, height: 16.2, fontSize: "2.15cqh" },
    { id: `openice-room-${index}-users`, parent: `openice-room-${index}`, label: `Room ${index + 1} Users`, selector: `.openicehub-room-${index} .openicehub-users-count`, kind: "text", left: 68.3, top: 55.6, width: 16.7, height: 19.2, fontSize: "2.0cqh" },
    { id: `openice-room-${index}-join`, parent: `openice-room-${index}`, label: `Room ${index + 1} Join`, selector: `.openicehub-room-${index} .openicehub-room-join-hit`, kind: "button", left: 5.0, top: 75.1, width: 90.0, height: 21.5 }
  ])).flat(),
  { id: "openice-create", label: "Create Room", selector: ".openicehub-create-hit", kind: "button", left: 49.0, top: 17.6, width: 34.8, height: 6.5 },
  { id: "openice-refresh", label: "Refresh Rooms", selector: ".openicehub-refresh-hit", kind: "button", left: 72.4, top: 29.2, width: 18.2, height: 3.4 },
  { id: "openice-next-page", label: "Next Page", selector: ".openicehub-next-page-hit", kind: "button", left: 34.2, top: 70.4, width: 31.8, height: 3.7 },
  { id: "openice-private-code-hit", label: "Private Code Tap Area", selector: ".openicehub-private-code-hit", kind: "button", left: 20.5, top: 78.2, width: 31.4, height: 3.7 },
  { id: "openice-private-input", label: "Private Code Text", selector: ".openicehub-private-input", kind: "input", left: 21.3, top: 78.35, width: 29.6, height: 3.1, fontSize: "2.2cqh" },
  { id: "openice-join-private", label: "Join Private", selector: ".openicehub-join-private-hit", kind: "button", left: 54.3, top: 77.9, width: 25.0, height: 4.5 },
  { id: "openice-back", label: "Back", selector: ".openicehub-back-hit", kind: "button", left: 22.5, top: 93.1, width: 55.0, height: 5.3 },
  { id: "openice-status", label: "Status Text", selector: ".openicehub-status", kind: "text", left: 12.0, top: 95.8, width: 76.0, height: 2.9, fontSize: "1.5cqh", extraCss: ["bottom: auto;"] }
];

const CALIBRATION_CONFIGS = {
  "main-menu": {
    title: "Main Menu Calibration",
    image: "/assets/screens/main-menu.png",
    aspectRatio: "9 / 16",
    stageClass: "cal-art-stage main-menu-cal-stage",
    storageKey: "arcticCalibrationMainMenu",
    cssFileName: "main-menu-calibration.css",
    jsConstName: "MAIN_MENU_CALIBRATION",
    items: MAIN_MENU_ITEMS
  },
  "open-ice": {
    title: "Open Ice Hub Calibration",
    image: "/assets/screens/openicehub.png",
    aspectRatio: "941 / 1672",
    stageClass: "cal-art-stage open-ice-cal-stage",
    storageKey: "arcticCalibrationOpenIce",
    cssFileName: "open-ice-calibration.css",
    jsConstName: "OPEN_ICE_CALIBRATION",
    items: OPEN_ICE_ITEMS
  }
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
  const output = outputMode === "css" ? buildCssOutput(items) : buildJsOutput(config.jsConstName, items);

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
      ? {
          left: (parentBox.left / 100) * stageRect.width,
          top: (parentBox.top / 100) * stageRect.height,
          width: (parentBox.width / 100) * stageRect.width,
          height: (parentBox.height / 100) * stageRect.height
        }
      : { left: 0, top: 0, width: stageRect.width, height: stageRect.height };

    dragRef.current = {
      id,
      mode,
      originX: event.clientX,
      originY: event.clientY,
      start: { ...item },
      contextPx
    };

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

    const patch = drag.mode === "resize"
      ? {
          width: clampNumber(drag.start.width + dxPct, 1, 130),
          height: clampNumber(drag.start.height + dyPct, 1, 130)
        }
      : {
          left: clampNumber(drag.start.left + dxPct, -20, 120),
          top: clampNumber(drag.start.top + dyPct, -20, 120)
        };

    updateItem(drag.id, patch);
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
          <span>Temporary links: <code>?calibrate=main-menu</code> / <code>?calibrate=open-ice</code></span>
        </div>
        <div className="cal-link-row">
          <a href="?calibrate=main-menu">Main Menu</a>
          <a href="?calibrate=open-ice">Open Ice</a>
          <a href="/">Exit</a>
        </div>
      </div>

      <div className="cal-layout">
        <div className="cal-stage-wrap">
          <div className={config.stageClass} style={{ aspectRatio: config.aspectRatio }} ref={stageRef}>
            <img src={config.image} alt={config.title} draggable="false" />
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
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    selectItem(item.id);
                  }}
                >
                  <span>{item.label}</span>
                  <i onPointerDown={(event) => startPointer(event, item.id, "resize")} />
                </button>
              );
            })}
          </div>
        </div>

        <aside className="cal-panel">
          <div className="cal-panel-head">
            <strong>Calibration Output</strong>
            <span>{status}</span>
          </div>

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
                  <label key={field}>
                    <span>{label} %</span>
                    <input value={toFixedInput(selectedItem[field])} onChange={(event) => updateSelectedNumber(field, event.target.value)} />
                  </label>
                ))}
              </div>
              {(selectedItem.kind === "text" || selectedItem.kind === "input") && (
                <div className="cal-font-row">
                  <span>Font: {selectedItem.fontSize || "not set"}</span>
                  <button type="button" onClick={() => bumpFont(-0.1)}>-</button>
                  <button type="button" onClick={() => bumpFont(0.1)}>+</button>
                </div>
              )}
            </div>
          )}

          <select className="cal-target-select" value={selectedId} onChange={(event) => selectItem(event.target.value)}>
            {items.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>

          <textarea value={output} readOnly spellCheck="false" onFocus={(event) => event.currentTarget.select()} />
        </aside>
      </div>
    </section>
  );
}

function percentBoxToStageBox(item, parent) {
  if (!parent) return item;
  return {
    left: parent.left + (parent.width * item.left / 100),
    top: parent.top + (parent.height * item.top / 100),
    width: parent.width * item.width / 100,
    height: parent.height * item.height / 100
  };
}

function buildCssOutput(items) {
  return items.map((item) => {
    const lines = [
      `  left: ${formatPct(item.left)};`,
      `  top: ${formatPct(item.top)};`,
      `  width: ${formatPct(item.width)};`,
      `  height: ${formatPct(item.height)};`,
      item.fontSize ? `  font-size: ${item.fontSize};` : "",
      ...(item.extraCss || []).map((line) => `  ${line}`)
    ].filter(Boolean);
    return `${item.selector} {\n${lines.join("\n")}\n}`;
  }).join("\n\n");
}

function buildJsOutput(name, items) {
  const clean = items.reduce((acc, item) => {
    acc[item.id] = {
      selector: item.selector,
      parent: item.parent || null,
      kind: item.kind,
      left: Number(item.left.toFixed(2)),
      top: Number(item.top.toFixed(2)),
      width: Number(item.width.toFixed(2)),
      height: Number(item.height.toFixed(2)),
      ...(item.fontSize ? { fontSize: item.fontSize } : {})
    };
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
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {}
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
