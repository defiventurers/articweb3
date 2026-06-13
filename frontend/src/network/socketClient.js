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
  const loginPayload = await request("profile_login", { address, name });
  return loginPayload.profile;
}

export async function listRooms({ roomMode = "open_ice" } = {}) {
  const payload = await request("room_list", { roomMode });
  return payload.rooms || [];
}

export async function getGameHistory({ profile }) {
  const payload = await request("game_history", { wallet: profile.wallet });
  return payload.history || [];
}

export async function getLeaderboard() {
  const payload = await request("leaderboard", {});
  return payload.leaderboard || [];
}

export async function getMyRooms({ profile }) {
  const payload = await request("my_rooms", { wallet: profile.wallet });
  return payload.rooms || [];
}

export async function getVaultActivity({ profile }) {
  const payload = await request("vault_activity", { wallet: profile.wallet });
  return payload.activity || [];
}

export async function recordVaultActivity({ profile, activity }) {
  const payload = await request("vault_activity_record", { wallet: profile.wallet, ...activity });
  return payload.activity;
}

export async function createRoom({ visibility, roomMode = "open_ice", entryTier = "1", profile }) {
  const payload = await request("room_create", { visibility, roomMode, entryTier, wallet: profile.wallet });
  return payload.room;
}

export async function joinRoom({ roomCode, profile }) {
  const payload = await request("room_join", { roomCode, wallet: profile.wallet });
  return payload.room;
}

export async function confirmEntryLock({ roomCode, profile, txHash }) {
  const payload = await request("room_confirm_entry", { roomCode, wallet: profile.wallet, txHash });
  return payload.room;
}

export async function selectRoomTeam({ roomCode, profile, team }) {
  const payload = await request("room_select_team", { roomCode, wallet: profile.wallet, team });
  return payload.room;
}

export async function devFillRoom({ roomCode, profile }) {
  const payload = await request("dev_fill_room", { roomCode, wallet: profile.wallet });
  return payload.room;
}

export async function getGameState({ roomCode, profile }) {
  const payload = await request("game_state", { roomCode, wallet: profile.wallet });
  return payload.room;
}

export async function rollGameDice({ roomCode, profile }) {
  const payload = await request("game_roll_dice", { roomCode, wallet: profile.wallet });
  return payload.room;
}

export async function selectGameSquare({ roomCode, profile, row, col }) {
  const payload = await request("game_select_square", { roomCode, wallet: profile.wallet, row, col });
  return payload.room;
}

export async function endGameTurn({ roomCode, profile }) {
  const payload = await request("game_end_turn", { roomCode, wallet: profile.wallet });
  return payload.room;
}
