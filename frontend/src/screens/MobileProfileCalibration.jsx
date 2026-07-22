import { useMemo, useRef, useState } from "react";
import { PROFILE_MOBILE_CALIBRATION } from "../utils/profileMobileLayout.js";

const ITEMS = [
  { id: "connect", label: "Connect AGW", selector: ".profile-connect-hitbox", ...PROFILE_MOBILE_CALIBRATION.connect },
  { id: "connected", label: "Connected Label", selector: ".profile-wallet-status", ...PROFILE_MOBILE_CALIBRATION.connected },
  { id: "disconnect", label: "Disconnect", selector: ".profile-disconnect-hitbox", ...PROFILE_MOBILE_CALIBRATION.disconnect },
  { id: "wallet", label: "Wallet Address", selector: ".profile-wallet-address", ...PROFILE_MOBILE_CALIBRATION.wallet },
  { id: "copy", label: "Copy Wallet", selector: ".profile-wallet-copy-hitbox", ...PROFILE_MOBILE_CALIBRATION.copy },
  { id: "name", label: "Player Name", selector: ".profile-name-input", ...PROFILE_MOBILE_CALIBRATION.name },
  { id: "complete", label: "Complete Profile", selector: ".profile-complete-hitbox", ...PROFILE_MOBILE_CALIBRATION.complete },
  { id: "back", label: "Back", selector: ".profile-back-hitbox", ...PROFILE_MOBILE_CALIBRATION.back }
];

export function MobileProfileCalibration() {
  const [items, setItems] = useState(() => loadItems());
  const [selectedId, setSelectedId] = useState(ITEMS[0].id);
  const dragRef = useRef(null);
  const stageRef = useRef(null);
  const selected = items.find((item) => item.id === selectedId) || items[0];
  const output = useMemo(() => buildOutput(items), [items]);

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => item.id === id ? { ...item, ...patch } : item);
      localStorage.setItem("arcticProfileMobileCalibration", JSON.stringify(next));
      return next;
    });
  }

  function startPointer(event, item, mode) {
    event.preventDefault();
    event.stopPropagation();
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSelectedId(item.id);
    dragRef.current = { id: item.id, mode, x: event.clientX, y: event.clientY, start: { ...item }, rect };
    window.addEventListener("pointermove", movePointer, { passive: false });
    window.addEventListener("pointerup", stopPointer, { once: true });
  }

  function movePointer(event) {
    const drag = dragRef.current;
    if (!drag) return;
    event.preventDefault();
    const dx = (event.clientX - drag.x) / drag.rect.width * 100;
    const dy = (event.clientY - drag.y) / drag.rect.height * 100;
    updateItem(drag.id, drag.mode === "resize"
      ? { width: clamp(drag.start.width + dx, 1, 100), height: clamp(drag.start.height + dy, 1, 100) }
      : { left: clamp(drag.start.left + dx, 0, 100), top: clamp(drag.start.top + dy, 0, 100) });
  }

  function stopPointer() {
    dragRef.current = null;
    window.removeEventListener("pointermove", movePointer);
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
  }

  function reset() {
    localStorage.removeItem("arcticProfileMobileCalibration");
    setItems(ITEMS);
    setSelectedId(ITEMS[0].id);
  }

  return (
    <section className="cal-screen mobile-profile-calibration">
      <div className="cal-topbar">
        <div><strong>Create Profile Mobile Calibration</strong><span>Mobile-only output. Desktop values are not affected.</span></div>
        <div className="cal-link-row"><a href="/">Exit</a></div>
      </div>
      <div className="cal-layout">
        <div className="cal-stage-wrap">
          <div ref={stageRef} className="cal-art-stage profile-mobile-cal-stage" style={{ aspectRatio: "941 / 1672" }}>
            <picture><source srcSet="/assets/screens/profile.webp" type="image/webp" /><img src="/assets/screens/profile.png" alt="Create Profile mobile calibration" draggable="false" /></picture>
            {items.map((item) => (
              <button key={item.id} type="button" className={`cal-box ${selectedId === item.id ? "selected" : ""}`} style={{ left: `${item.left}%`, top: `${item.top}%`, width: `${item.width}%`, height: `${item.height}%` }} onPointerDown={(event) => startPointer(event, item, "move")}>
                <span>{item.label}</span><i onPointerDown={(event) => startPointer(event, item, "resize")} />
              </button>
            ))}
          </div>
        </div>
        <aside className="cal-panel">
          <div className="cal-panel-head"><strong>Mobile Calibration Output</strong><span>{selected?.label}</span></div>
          <div className="cal-actions"><button type="button" onClick={copyOutput}>Copy CSS</button><button type="button" onClick={reset}>Reset</button></div>
          <select className="cal-target-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          <div className="cal-number-grid">{["left", "top", "width", "height"].map((field) => <label key={field}><span>{field} %</span><input type="number" step="0.01" value={selected[field]} onChange={(event) => updateItem(selected.id, { [field]: Number(event.target.value) })} /></label>)}</div>
          <textarea value={output} readOnly spellCheck="false" onFocus={(event) => event.currentTarget.select()} />
        </aside>
      </div>
    </section>
  );
}

function loadItems() {
  try {
    const saved = JSON.parse(localStorage.getItem("arcticProfileMobileCalibration") || "null");
    return Array.isArray(saved) && saved.length === ITEMS.length ? saved : ITEMS;
  } catch {
    return ITEMS;
  }
}

function buildOutput(items) {
  const rules = items.map((item) => `  ${item.selector} {\n    left: ${item.left.toFixed(2)}%;\n    top: ${item.top.toFixed(2)}%;\n    width: ${item.width.toFixed(2)}%;\n    height: ${item.height.toFixed(2)}%;\n  }`).join("\n\n");
  return `@media (max-width: 899px) and (orientation: portrait) {\n${rules}\n}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
