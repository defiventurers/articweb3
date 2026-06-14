const CALIBRATION_QUERY_KEY = "calibrateHighstakes";
const DOCK_ID = "highstakes-calibration-export-dock";
const TEXTAREA_ID = "highstakes-calibration-export-output";
const STYLE_ID = "highstakes-calibration-export-style";
const DRAG_LAYER_ID = "highstakes-calibration-drag-layer";
const STORAGE_KEY = "highstakesCalibrationLatestCss";

let dragState = null;

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", startHighstakesCalibrationExportDock);
  window.setTimeout(startHighstakesCalibrationExportDock, 500);
}

function startHighstakesCalibrationExportDock() {
  if (!isEnabled()) return;
  injectDockStyles();

  const timer = window.setInterval(() => {
    const stage = document.querySelector(".highstakes-stage");
    if (!stage) return;
    ensureDock();
    ensureDragLayer();
    if (!dragState) updateDragBoxes();
    updateOutput();
  }, 180);

  window.addEventListener("pointermove", onGlobalPointerMove, { passive: false });
  window.addEventListener("pointerup", onGlobalPointerUp);
  window.addEventListener("beforeunload", () => {
    window.clearInterval(timer);
    window.removeEventListener("pointermove", onGlobalPointerMove);
    window.removeEventListener("pointerup", onGlobalPointerUp);
  }, { once: true });
}

function isEnabled() {
  return new URLSearchParams(window.location.search).get(CALIBRATION_QUERY_KEY) === "1";
}

function ensureDock() {
  if (document.getElementById(DOCK_ID)) return;

  const dock = document.createElement("section");
  dock.id = DOCK_ID;
  dock.className = "hs-cal-export-dock";
  dock.innerHTML = `
    <div class="hs-cal-export-head">
      <strong>Calibration Export</strong>
      <button type="button" data-hs-cal-minimize>−</button>
    </div>
    <p>Drag red boxes to move text. Drag yellow handles to resize. CSS updates live below.</p>
    <div class="hs-cal-export-actions">
      <button type="button" data-hs-cal-copy>Copy CSS</button>
      <button type="button" data-hs-cal-select>Select All</button>
      <button type="button" data-hs-cal-download>Download</button>
    </div>
    <textarea id="${TEXTAREA_ID}" spellcheck="false" readonly></textarea>
    <div class="hs-cal-export-status" data-hs-cal-status>Ready</div>
  `;
  document.body.appendChild(dock);

  dock.querySelector("[data-hs-cal-copy]")?.addEventListener("click", copyCss);
  dock.querySelector("[data-hs-cal-select]")?.addEventListener("click", selectCss);
  dock.querySelector("[data-hs-cal-download]")?.addEventListener("click", downloadCss);
  dock.querySelector("[data-hs-cal-minimize]")?.addEventListener("click", () => dock.classList.toggle("minimized"));
}

function ensureDragLayer() {
  const stage = document.querySelector(".highstakes-stage");
  if (!stage) return;
  if (document.getElementById(DRAG_LAYER_ID)) return;

  const layer = document.createElement("div");
  layer.id = DRAG_LAYER_ID;
  layer.className = "hs-cal-drag-layer";
  stage.appendChild(layer);
}

function updateDragBoxes() {
  const layer = document.getElementById(DRAG_LAYER_ID);
  const stage = document.querySelector(".highstakes-stage");
  if (!layer || !stage) return;

  const stageRect = stage.getBoundingClientRect();
  const activeIds = new Set();

  getTargets().forEach((target) => {
    const targetId = target.getAttribute("data-calibrate");
    if (!targetId) return;
    activeIds.add(targetId);

    let box = layer.querySelector(`[data-hs-cal-box="${cssEscape(targetId)}"]`);
    if (!box) {
      box = document.createElement("div");
      box.className = "hs-cal-box";
      box.setAttribute("data-hs-cal-box", targetId);
      box.innerHTML = `<span class="hs-cal-label"></span><span class="hs-cal-resize" data-hs-cal-resize="true"></span>`;
      box.addEventListener("pointerdown", (event) => startDrag(event, targetId, event.target?.hasAttribute("data-hs-cal-resize") ? "resize" : "move"));
      layer.appendChild(box);
    }

    const rect = target.getBoundingClientRect();
    box.style.left = `${rect.left - stageRect.left}px`;
    box.style.top = `${rect.top - stageRect.top}px`;
    box.style.width = `${Math.max(6, rect.width)}px`;
    box.style.height = `${Math.max(6, rect.height)}px`;
    box.querySelector(".hs-cal-label").textContent = targetId;
  });

  layer.querySelectorAll("[data-hs-cal-box]").forEach((box) => {
    if (!activeIds.has(box.getAttribute("data-hs-cal-box"))) box.remove();
  });
}

function startDrag(event, targetId, mode) {
  const target = getTargetById(targetId);
  const stage = document.querySelector(".highstakes-stage");
  if (!target || !stage) return;

  event.preventDefault();
  event.stopPropagation();

  const context = getPositionContext(target, stage);
  const contextRect = context.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const computed = window.getComputedStyle(target);

  dragState = {
    target,
    targetId,
    mode,
    originX: event.clientX,
    originY: event.clientY,
    contextRect,
    startLeft: targetRect.left - contextRect.left,
    startTop: targetRect.top - contextRect.top,
    startWidth: targetRect.width,
    startHeight: targetRect.height,
    fontSize: computed.fontSize || ""
  };

  document.body.classList.add("hs-cal-is-dragging");
  setStatus(mode === "resize" ? `Resizing ${targetId}` : `Moving ${targetId}`);
}

function onGlobalPointerMove(event) {
  if (!dragState) return;
  event.preventDefault();

  const dx = event.clientX - dragState.originX;
  const dy = event.clientY - dragState.originY;

  const nextLeft = dragState.mode === "move" ? dragState.startLeft + dx : dragState.startLeft;
  const nextTop = dragState.mode === "move" ? dragState.startTop + dy : dragState.startTop;
  const nextWidth = dragState.mode === "resize" ? Math.max(6, dragState.startWidth + dx) : dragState.startWidth;
  const nextHeight = dragState.mode === "resize" ? Math.max(6, dragState.startHeight + dy) : dragState.startHeight;

  dragState.target.style.left = toPercent(nextLeft, dragState.contextRect.width);
  dragState.target.style.top = toPercent(nextTop, dragState.contextRect.height);
  dragState.target.style.width = toPercent(nextWidth, dragState.contextRect.width);
  dragState.target.style.height = toPercent(nextHeight, dragState.contextRect.height);
  if (dragState.fontSize) dragState.target.style.fontSize = dragState.fontSize;

  updateDragBoxes();
  updateOutput();
}

function onGlobalPointerUp() {
  if (!dragState) return;
  setStatus(`Updated ${dragState.targetId}`);
  dragState = null;
  document.body.classList.remove("hs-cal-is-dragging");
  updateDragBoxes();
  updateOutput();
}

function getTargets() {
  const seen = new Set();
  return Array.from(document.querySelectorAll(".highstakes-stage [data-calibrate]")).filter((element) => {
    const id = element.getAttribute("data-calibrate");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function getTargetById(targetId) {
  return document.querySelector(`.highstakes-stage [data-calibrate="${cssEscape(targetId)}"]`);
}

function getPositionContext(element, stage) {
  return element.closest(".highstakes-room-card") || element.closest(".highstakes-hitboxes") || stage;
}

function updateOutput() {
  const textarea = document.getElementById(TEXTAREA_ID);
  if (!textarea) return;
  const css = buildCurrentCalibrationCss();
  if (!css || textarea.value === css) return;
  textarea.value = css;
  try {
    window.localStorage.setItem(STORAGE_KEY, css);
  } catch {}
}

function buildCurrentCalibrationCss() {
  const stage = document.querySelector(".highstakes-stage");
  if (!stage) return "";
  const entries = [];

  getTargets().forEach((element) => {
    const targetId = element.getAttribute("data-calibrate");
    const context = getPositionContext(element, stage);
    const contextRect = context.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const computed = window.getComputedStyle(element);
    entries.push([targetId, {
      left: toPercent(rect.left - contextRect.left, contextRect.width),
      top: toPercent(rect.top - contextRect.top, contextRect.height),
      width: toPercent(rect.width, contextRect.width),
      height: toPercent(rect.height, contextRect.height),
      fontSize: computed.fontSize || ""
    }]);
  });

  return entries.map(([targetId, style]) => {
    const selector = cssSelectorForTarget(targetId);
    const lines = [
      `  left: ${style.left};`,
      `  top: ${style.top};`,
      `  width: ${style.width};`,
      `  height: ${style.height};`,
      style.fontSize ? `  font-size: ${style.fontSize};` : ""
    ].filter(Boolean);
    return `${selector} {\n${lines.join("\n")}\n}`;
  }).join("\n\n");
}

async function copyCss() {
  const textarea = document.getElementById(TEXTAREA_ID);
  if (!textarea) return;
  textarea.focus();
  textarea.select();
  const css = textarea.value || buildCurrentCalibrationCss();
  try {
    await navigator.clipboard.writeText(css);
    setStatus("Copied CSS to clipboard.");
  } catch {
    document.execCommand?.("copy");
    setStatus("Selected CSS. Press Ctrl/Cmd+C if copy was blocked.");
  }
}

function selectCss() {
  const textarea = document.getElementById(TEXTAREA_ID);
  if (!textarea) return;
  textarea.focus();
  textarea.select();
  setStatus("Selected. Press Ctrl/Cmd+C to copy.");
}

function downloadCss() {
  const css = document.getElementById(TEXTAREA_ID)?.value || buildCurrentCalibrationCss();
  const blob = new Blob([css], { type: "text/css" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "highstakes-calibration.css";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus("Downloaded highstakes-calibration.css.");
}

function setStatus(message) {
  const status = document.querySelector("[data-hs-cal-status]");
  if (status) status.textContent = message;
}

function toPercent(value, total) {
  if (!total) return "0%";
  return `${((value / total) * 100).toFixed(2)}%`;
}

function cssSelectorForTarget(targetId) {
  const roomMatch = targetId.match(/^room-(\d+)-(code|users|eth|usd|join)$/);
  if (roomMatch) {
    const [, index, type] = roomMatch;
    const selectors = {
      code: ".hs-room-code",
      users: ".hs-room-count",
      eth: ".hs-room-fee",
      usd: ".hs-room-usd",
      join: ".hs-room-join-hitbox"
    };
    return `.hs-room-${index} ${selectors[type]}`;
  }

  const map = {
    "wallet-text": ".highstakes-wallet-text",
    "points-text": ".highstakes-points-text",
    "available-lock": ".available-lock-value",
    "locked-lock": ".locked-lock-value",
    "page-text": ".highstakes-page-text",
    "create-room-hitbox": ".hs-create-room-hitbox",
    "refresh-rooms-hitbox": ".hs-refresh-rooms-hitbox",
    "prev-page-hitbox": ".hs-prev-page-hitbox",
    "next-page-hitbox": ".hs-next-page-hitbox",
    "private-room-input": ".highstakes-private-input",
    "join-private-hitbox": ".hs-join-private-hitbox",
    "deposit-hitbox": ".hs-deposit-hitbox",
    "back-hitbox": ".hs-back-hitbox"
  };
  return map[targetId] || `[data-calibrate="${targetId}"]`;
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return String(value).replace(/"/g, "\\\"");
}

function injectDockStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .hs-cal-drag-layer {
      position: absolute;
      inset: 0;
      z-index: 99990;
      pointer-events: none;
    }
    .hs-cal-box {
      position: absolute;
      pointer-events: auto;
      border: 2px solid rgba(255, 45, 45, .82);
      background: rgba(255, 0, 0, .06);
      box-shadow: 0 0 0 1px rgba(255,255,255,.25), 0 0 12px rgba(255,45,45,.25);
      cursor: move;
      touch-action: none;
      user-select: none;
    }
    .hs-cal-box:hover {
      border-color: rgba(255, 230, 65, .98);
      background: rgba(255, 230, 65, .10);
    }
    .hs-cal-label {
      position: absolute;
      left: 0;
      top: -17px;
      max-width: 220px;
      padding: 2px 5px;
      border-radius: 5px;
      background: rgba(0, 10, 30, .94);
      color: white;
      font: 800 10px/1 system-ui, sans-serif;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
    }
    .hs-cal-resize {
      position: absolute;
      right: -8px;
      bottom: -8px;
      width: 16px;
      height: 16px;
      border-radius: 4px;
      border: 1px solid rgba(0,0,0,.75);
      background: #ffe640;
      cursor: nwse-resize;
      pointer-events: auto;
      touch-action: none;
    }
    .hs-cal-is-dragging * {
      user-select: none !important;
    }
    .hs-cal-export-dock {
      position: fixed;
      right: 10px;
      bottom: 10px;
      z-index: 99999;
      width: min(520px, calc(100vw - 20px));
      max-height: 46dvh;
      display: grid;
      gap: 8px;
      padding: 10px;
      border-radius: 14px;
      border: 1px solid rgba(190, 245, 255, .85);
      background: rgba(2, 14, 32, .96);
      color: #fff;
      box-shadow: 0 18px 44px rgba(0,0,0,.45);
      font: 700 12px system-ui, sans-serif;
    }
    .hs-cal-export-dock.minimized textarea,
    .hs-cal-export-dock.minimized p,
    .hs-cal-export-dock.minimized .hs-cal-export-actions,
    .hs-cal-export-dock.minimized .hs-cal-export-status {
      display: none;
    }
    .hs-cal-export-head,
    .hs-cal-export-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .hs-cal-export-head {
      justify-content: space-between;
    }
    .hs-cal-export-dock p {
      margin: 0;
      color: rgba(230, 250, 255, .82);
      line-height: 1.25;
    }
    .hs-cal-export-dock button {
      min-height: 30px;
      border-radius: 8px;
      border: 1px solid rgba(190, 245, 255, .68);
      background: #0878d8;
      color: white;
      font: inherit;
      cursor: pointer;
      padding: 4px 8px;
    }
    .hs-cal-export-dock textarea {
      width: 100%;
      height: 260px;
      min-height: 160px;
      resize: vertical;
      border-radius: 10px;
      border: 1px solid rgba(190, 245, 255, .5);
      background: rgba(255,255,255,.08);
      color: #fff;
      padding: 8px;
      font: 11px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      white-space: pre;
    }
    .hs-cal-export-status {
      color: #fff3c7;
      min-height: 16px;
    }
  `;
  document.head.appendChild(style);
}
