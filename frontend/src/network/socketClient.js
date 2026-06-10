const SERVER_URL = import.meta.env.VITE_WS_URL || "ws://localhost:10000";

let socket = null;
let requestSeq = 0;
const pending = new Map();

export function connectSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return Promise.resolve(socket);
  }

  return new Promise((resolve, reject) => {
    socket = new WebSocket(SERVER_URL);

    const timer = setTimeout(() => {
      reject(new Error("Lobby server timed out."));
    }, 20000);

    socket.addEventListener("open", () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.addEventListener("message", (event) => {
      const packet = JSON.parse(event.data);

      if (packet.requestId && pending.has(packet.requestId)) {
        const item = pending.get(packet.requestId);
        clearTimeout(item.timer);
        pending.delete(packet.requestId);

        if (packet.type === "error") {
          item.reject(new Error(packet.payload?.message || "Server error"));
        } else {
          item.resolve(packet.payload);
        }
      }

      window.dispatchEvent(new CustomEvent("server-packet", { detail: packet }));
    });

    socket.addEventListener("error", () => {
      reject(new Error("Could not connect to lobby server."));
    });
  });
}

export async function request(type, payload = {}) {
  const ws = await connectSocket();
  const requestId = `req_${Date.now()}_${++requestSeq}`;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error("Server request timed out."));
    }, 20000);

    pending.set(requestId, { resolve, reject, timer });
    ws.send(JSON.stringify({ type, requestId, payload }));
  });
}

export async function createProfile({ address, name }) {
  const loginPayload = await request("profile_login", {
    address,
    name
  });

  return loginPayload.profile;
}

export async function listRooms() {
  const payload = await request("room_list");
  return payload.rooms || [];
}

export async function createRoom({ visibility, profile }) {
  const payload = await request("room_create", {
    visibility,
    wallet: profile.wallet
  });

  return payload.room;
}

export async function joinRoom({ roomCode, profile }) {
  const payload = await request("room_join", {
    roomCode,
    wallet: profile.wallet
  });

  return payload.room;
}

export async function devFillRoom({ roomCode, profile }) {
  const payload = await request("dev_fill_room", {
    roomCode,
    wallet: profile.wallet
  });

  return payload.room;
}
