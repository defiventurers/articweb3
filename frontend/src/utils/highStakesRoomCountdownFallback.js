const SERVER_URL = import.meta.env.VITE_WS_URL || "ws://localhost:10000";
const DEFAULT_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const ROOM_REFRESH_MS = 15000;
const TICK_MS = 1000;

let roomDeadlines = new Map();
let refreshTimer = null;
let tickTimer = null;
let observer = null;
let socket = null;
let requestId = 0;

function isHighStakesVisible() {
  return Boolean(document.querySelector("#screenHighStakes"));
}

function roomCodeFromElement(element) {
  const raw = Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent || "")
    .join(" ") || element.textContent || "";
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

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
  const remainingMs = Math.max(0, deadline - now);
  if (remainingMs <= 0) return "canceling";
  const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h${String(minutes).padStart(2, "0")}m` : `${minutes}m`;
}

function renderCountdowns() {
  if (!isHighStakesVisible()) return;
  document.querySelectorAll("#screenHighStakes .hs-room-code").forEach((element) => {
    const code = roomCodeFromElement(element);
    const deadline = roomDeadlines.get(code);
    const label = formatCountdown(deadline);
    let countdown = element.querySelector(":scope > .hs-room-autocancel");

    if (!label) {
      countdown?.remove();
      return;
    }

    if (!countdown) {
      countdown = document.createElement("span");
      countdown.className = "hs-room-autocancel";
      element.appendChild(countdown);
    }
    countdown.textContent = `(${label})`;
    element.title = `Auto-cancel ${label}`;
  });
}

function connectOnce() {
  if (socket && socket.readyState === WebSocket.OPEN) return Promise.resolve(socket);
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(SERVER_URL);
    const timer = setTimeout(() => reject(new Error("room countdown socket timed out")), 8000);
    ws.addEventListener("open", () => {
      clearTimeout(timer);
      socket = ws;
      resolve(ws);
    });
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("room countdown socket failed"));
    });
    ws.addEventListener("close", () => {
      if (socket === ws) socket = null;
    });
  });
}

async function refreshRooms() {
  if (!isHighStakesVisible()) return;
  try {
    const ws = await connectOnce();
    const id = `hs_countdown_${Date.now()}_${++requestId}`;
    const rooms = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("room countdown request timed out")), 8000);
      const onMessage = (event) => {
        let packet;
        try { packet = JSON.parse(event.data); } catch { return; }
        if (packet.requestId !== id) return;
        clearTimeout(timer);
        ws.removeEventListener("message", onMessage);
        packet.type === "error" ? reject(new Error(packet.payload?.message || "room list failed")) : resolve(packet.payload?.rooms || []);
      };
      ws.addEventListener("message", onMessage);
      ws.send(JSON.stringify({ type: "room_list", requestId: id, payload: { roomMode: "high_stakes" } }));
    });

    roomDeadlines = new Map(
      rooms
        .map((room) => [String(room.roomCode || "").toUpperCase(), deadlineForRoom(room)])
        .filter(([code, deadline]) => code && deadline)
    );
    renderCountdowns();
  } catch {
    // The React-rendered countdown remains the primary path; this fallback stays silent on socket failures.
  }
}

function start() {
  if (refreshTimer || tickTimer) return;
  refreshRooms();
  refreshTimer = setInterval(refreshRooms, ROOM_REFRESH_MS);
  tickTimer = setInterval(renderCountdowns, TICK_MS);
  observer = new MutationObserver(renderCountdowns);
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
