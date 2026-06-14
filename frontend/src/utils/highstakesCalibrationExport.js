const CALIBRATION_QUERY_KEY = "calibrateHighstakes";
const DOCK_ID = "highstakes-calibration-export-dock";
const TEXTAREA_ID = "highstakes-calibration-export-output";
const STYLE_ID = "highstakes-calibration-export-style";
const STORAGE_KEY = "highstakesCalibrationLatestCss";

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
    updateOutput();
  }, 350);

  window.addEventListener("beforeunload", () => window.clearInterval(timer), { once: true });
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
    <p>Copy this CSS after moving boxes. It updates live.</p>
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
  const stageRect = stage.getBoundingClientRect();
  const entries = [];
  const seen = new Set();

  document.querySelectorAll(".highstakes-stage [data-calibrate]").forEach((element) => {
    const targetId = element.getAttribute("data-calibrate");
    if (!targetId || seen.has(targetId)) return;
    seen.add(targetId);
    const rect = element.getBoundingClientRect();
    const computed = window.getComputedStyle(element);
    entries.push([targetId, {
      left: toPercent(rect.left - stageRect.left, stageRect.width),
      top: toPercent(rect.top - stageRect.top, stageRect.height),
      width: toPercent(rect.width, stageRect.width),
      height: toPercent(rect.height, stageRect.height),
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
    "next-page-hitbox": ".hs-next-page-hitbox",
    "private-room-input": ".highstakes-private-input",
    "join-private-hitbox": ".hs-join-private-hitbox",
    "deposit-hitbox": ".hs-deposit-hitbox",
    "back-hitbox": ".hs-back-hitbox"
  };
  return map[targetId] || `[data-calibrate="${targetId}"]`;
}

function injectDockStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
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
