import { useMemo, useRef, useState } from "react";

const STORAGE_KEY = "arcticCalibrationMainMenuDesktop";
const MEDIA_QUERY = "@media (min-width: 900px) and (orientation: landscape)";
const DEFAULT_ITEMS = [
  { id: "menu-play", label: "Start Game", selector: ".menu-play-hitbox", left: 32.7, top: 84.2, width: 35.48, height: 14.5 },
  { id: "menu-how", label: "Rules / How To Play", selector: ".menu-how-hitbox", left: 70.33, top: 86.14, width: 23.36, height: 12.73 },
  { id: "menu-spectate", label: "Spectate Room", selector: ".menu-spectate-hitbox", left: 1.99, top: 86.54, width: 24.04, height: 8.12 }
];

export function DesktopMainMenuCalibration() {
  const [items, setItems] = useState(() => loadItems());
  const [selectedId, setSelectedId] = useState(items[0]?.id || "");
  const [status, setStatus] = useState("Ready. Drag red boxes. Resize from yellow corners.");
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const selected = useMemo(() => items.find((item) => item.id === selectedId), [items, selectedId]);
  const output = buildCss(items);

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => item.id === id ? { ...item, ...patch } : item);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function startPointer(event, id, mode) {
    const stage = stageRef.current;
    const item = items.find((entry) => entry.id === id);
    if (!stage || !item) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(id);
    const rect = stage.getBoundingClientRect();
    dragRef.current = { id, mode, originX: event.clientX, originY: event.clientY, start: { ...item }, width: rect.width, height: rect.height };
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp, { once: true });
  }

  function onPointerMove(event) {
    const drag = dragRef.current;
    if (!drag) return;
    event.preventDefault();
    const dx = (event.clientX - drag.originX) / drag.width * 100;
    const dy = (event.clientY - drag.originY) / drag.height * 100;
    updateItem(drag.id, drag.mode === "resize"
      ? { width: clamp(drag.start.width + dx, 1, 100), height: clamp(drag.start.height + dy, 1, 100) }
      : { left: clamp(drag.start.left + dx, 0, 100), top: clamp(drag.start.top + dy, 0, 100) });
  }

  function onPointerUp() {
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    setStatus("Position recorded.");
  }

  function updateNumber(field, value) {
    const number = Number(value);
    if (selected && Number.isFinite(number)) updateItem(selected.id, { [field]: number });
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output);
      setStatus("Desktop CSS copied.");
    } catch {
      setStatus("Clipboard blocked. Select the CSS manually.");
    }
  }

  function reset() {
    setItems(DEFAULT_ITEMS);
    setSelectedId(DEFAULT_ITEMS[0].id);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ITEMS)); } catch {}
    setStatus("Reset to desktop defaults.");
  }

  return (
    <section className="cal-screen">
      <div className="cal-topbar">
        <div>
          <strong>Desktop Main Menu Calibration</strong>
          <span>16:9 artwork: <code>main-menu-desktop.png</code></span>
        </div>
        <div className="cal-link-row">
          <a href="?calibrate=main-menu-desktop">Desktop Main Menu</a>
          <a href="?calibrate=main-menu">Mobile Main Menu</a>
          <a href="?calibrate=player-hub">Player Hub</a>
          <a href="/">Exit</a>
        </div>
      </div>

      <div className="cal-layout">
        <div className="cal-stage-wrap">
          <div className="cal-art-stage main-menu-cal-stage" style={{ aspectRatio: "16 / 9" }} ref={stageRef}>
            <img src="/assets/screens/main-menu-desktop.png" alt="Desktop Main Menu Calibration" draggable="false" />
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`cal-box button ${selectedId === item.id ? "selected" : ""}`}
                style={{ left: `${item.left}%`, top: `${item.top}%`, width: `${item.width}%`, height: `${item.height}%` }}
                onPointerDown={(event) => startPointer(event, item.id, "move")}
                onClick={(event) => { event.preventDefault(); event.stopPropagation(); setSelectedId(item.id); }}
              >
                <span>{item.label}</span>
                <i onPointerDown={(event) => startPointer(event, item.id, "resize")} />
              </button>
            ))}
          </div>
        </div>

        <aside className="cal-panel">
          <div className="cal-panel-head"><strong>Desktop Calibration Output</strong><span>{status}</span></div>
          <div className="cal-actions">
            <button type="button" className="active">CSS</button>
            <button type="button" onClick={copyOutput}>Copy</button>
            <button type="button" onClick={reset}>Reset</button>
          </div>
          {selected && (
            <div className="cal-selected-card">
              <strong>{selected.label}</strong>
              <code>{selected.selector}</code>
              <div className="cal-number-grid">
                {["left", "top", "width", "height"].map((field) => (
                  <label key={field}><span>{field[0].toUpperCase() + field.slice(1)} %</span><input value={Number(selected[field]).toFixed(2)} onChange={(event) => updateNumber(field, event.target.value)} /></label>
                ))}
              </div>
            </div>
          )}
          <select className="cal-target-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <textarea value={output} readOnly spellCheck="false" onFocus={(event) => event.currentTarget.select()} />
        </aside>
      </div>
    </section>
  );
}

function loadItems() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (Array.isArray(parsed)) return DEFAULT_ITEMS.map((item) => ({ ...item, ...(parsed.find((entry) => entry.id === item.id) || {}) }));
  } catch {}
  return DEFAULT_ITEMS;
}

function buildCss(items) {
  const rules = items.map((item) => `${item.selector} {\n  left: ${item.left.toFixed(2)}%;\n  top: ${item.top.toFixed(2)}%;\n  width: ${item.width.toFixed(2)}%;\n  height: ${item.height.toFixed(2)}%;\n}`).join("\n\n");
  return `${MEDIA_QUERY} {\n${rules.split("\n").map((line) => line ? `  ${line}` : line).join("\n")}\n}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
