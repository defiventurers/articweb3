const DEFAULT_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const TICK_MS = 1000;

let roomDeadlines = new Map();
let tickTimer = null;

function deadlineForRoom(room) {
  const explicit = Number(room?.highStakesExpiresAt || 0);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const createdAt = Number(room?.highStakesCreatedAt || room?.createdAt || 0);
  const timeoutMs = Number(room?.highStakesWaitTimeoutMs || DEFAULT_TIMEOUT_MS);
  if (Number.isFinite(createdAt) && createdAt > 0 && Number.isFinite(timeoutMs) && timeoutMs > 0) {
    return createdAt + timeoutMs;
  }

  return 0;
}

function formatCountdown(deadline, now = Date.now()) {
  if (!deadline) return "";
  const remainingMs = deadline - now;
  if (remainingMs <= 0) return "canceling";
  const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h${String(minutes).padStart(2, "0")}m` : `${minutes}m`;
}

function codeFromElement(element) {
  const raw = Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent || "")
    .join(" ") || element.textContent || "";
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

function renderCountdowns() {
  const screen = document.querySelector("#screenHighStakes");
  if (!screen) return;

  screen.querySelectorAll(".hs-room-code").forEach((element) => {
    const code = codeFromElement(element);
    const deadline = roomDeadlines.get(code);
    const label = formatCountdown(deadline);
    const existing = element.querySelector(":scope > .hs-room-autocancel");

    if (!label) {
      existing?.remove();
      return;
    }

    const span = existing || document.createElement("span");
    span.className = "hs-room-autocancel";
    span.textContent = `(${label})`;
    span.style.pointerEvents = "none";
    if (!existing) element.appendChild(span);
    element.title = `Auto-cancel ${label}`;
  });
}

function updateRoomDeadlines(rooms = []) {
  const next = new Map(roomDeadlines);
  rooms.forEach((room) => {
    const code = String(room?.roomCode || "").toUpperCase();
    const deadline = deadlineForRoom(room);
    if (code && deadline) next.set(code, deadline);
  });
  roomDeadlines = next;
  renderCountdowns();
}

function handleServerPacket(event) {
  const packet = event?.detail;
  if (packet?.type === "room_list_result" && Array.isArray(packet.payload?.rooms)) {
    updateRoomDeadlines(packet.payload.rooms.filter((room) => room?.roomMode === "high_stakes"));
  }

  if (packet?.type === "room_state" && packet.payload?.room?.roomMode === "high_stakes") {
    updateRoomDeadlines([packet.payload.room]);
  }
}

function start() {
  if (tickTimer || typeof window === "undefined" || typeof document === "undefined") return;
  window.addEventListener("server-packet", handleServerPacket);
  tickTimer = setInterval(renderCountdowns, TICK_MS);
  renderCountdowns();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
