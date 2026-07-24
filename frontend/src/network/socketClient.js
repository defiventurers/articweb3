const SERVER_URL = import.meta.env.VITE_WS_URL || "ws://localhost:10000";

let socket = null;
let requestSeq = 0;
const pending = new Map();

export function connectSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) return Promise.resolve(socket);
  return new Promise((resolve, reject) => {
    socket = new WebSocket(SERVER_URL);
    const timer = setTimeout(() => reject(new Error("Lobby server timed out.")), 20000);
    socket.addEventListener("open", () => { clearTimeout(timer); resolve(socket); });
    socket.addEventListener("message", (event) => {
      const packet = JSON.parse(event.data);
      if (packet.requestId && pending.has(packet.requestId)) {
        const item = pending.get(packet.requestId);
        clearTimeout(item.timer);
        pending.delete(packet.requestId);
        packet.type === "error" ? item.reject(new Error(packet.payload?.message || "Server error")) : item.resolve(packet.payload);
      }
      window.dispatchEvent(new CustomEvent("server-packet", { detail: packet }));
    });
    socket.addEventListener("close", () => {
      for (const [requestId, item] of pending.entries()) {
        clearTimeout(item.timer);
        item.reject(new Error("Lobby connection closed. Reconnecting…"));
        pending.delete(requestId);
      }
    });
    socket.addEventListener("error", () => reject(new Error("Could not connect to lobby server.")));
  });
}

export async function request(type, payload = {}) {
  const ws = await connectSocket();
  const requestId = `req_${Date.now()}_${++requestSeq}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error("Server request timed out.")); }, 20000);
    pending.set(requestId, { resolve, reject, timer });
    ws.send(JSON.stringify({ type, requestId, payload }));
  });
}

export async function createProfile({ address, name }) { return (await request("profile_login", { address, name })).profile; }
export async function listRooms({ roomMode = "open_ice" } = {}) { return (await request("room_list", { roomMode })).rooms || []; }
export async function getGameHistory({ profile, gameId = null }) { return (await request("game_history", { wallet: profile.wallet, gameId })).history || []; }
export async function getLeaderboard() { return (await request("leaderboard", {})).leaderboard || []; }
export async function getMyRooms({ profile }) { return (await request("my_rooms", { wallet: profile.wallet })).rooms || []; }
export async function getVaultActivity({ profile }) { return (await request("vault_activity", { wallet: profile.wallet })).activity || []; }
export async function recordVaultActivity({ profile, activity }) { return (await request("vault_activity_record", { wallet: profile.wallet, ...activity })).activity; }
export async function spectateRoom({ roomCode }) { return (await request("spectate_room", { roomCode })).room; }
export async function createRoom({ visibility, roomMode = "open_ice", entryTier = "1", profile }) { return (await request("room_create", { visibility, roomMode, entryTier, wallet: profile.wallet })).room; }
export async function joinRoom({ roomCode, profile }) { return (await request("room_join", { roomCode, wallet: profile.wallet })).room; }
export async function confirmEntryLock({ roomCode, profile, txHash }) { return (await request("room_confirm_entry", { roomCode, wallet: profile.wallet, txHash })).room; }
export async function selectRoomTeam({ roomCode, profile, team }) { return (await request("room_select_team", { roomCode, wallet: profile.wallet, team })).room; }
export async function devFillRoom({ roomCode, profile }) { return (await request("dev_fill_room", { roomCode, wallet: profile.wallet })).room; }
export async function getGameState({ roomCode, profile }) { return (await request("game_state", { roomCode, wallet: profile.wallet })).room; }
export async function rollGameDice({ roomCode, profile }) { return (await request("game_roll_dice", { roomCode, wallet: profile.wallet })).room; }
export async function selectGameSquare({ roomCode, profile, row, col }) { return (await request("game_select_square", { roomCode, wallet: profile.wallet, row, col })).room; }
export async function endGameTurn({ roomCode, profile }) { return (await request("game_end_turn", { roomCode, wallet: profile.wallet })).room; }

export async function listNineIceFortsRooms() { return (await request("nif_room_list", {})).rooms || []; }
export async function createNineIceFortsRoom({ visibility = "public", profile }) { return (await request("nif_room_create", { visibility, wallet: profile.wallet })).room; }
export async function joinNineIceFortsRoom({ roomCode, profile }) { return (await request("nif_room_join", { roomCode, wallet: profile.wallet })).room; }
export async function getNineIceFortsState({ roomCode, profile }) { return (await request("nif_game_state", { roomCode, wallet: profile.wallet })).room; }
export async function submitNineIceFortsAction({ roomCode, profile, action }) { return (await request("nif_game_action", { roomCode, wallet: profile.wallet, action })).room; }
export async function getNineIceFortsLegalActions({ roomCode, profile }) { return (await request("nif_legal_actions", { roomCode, wallet: profile.wallet })).actions || []; }
export async function getNineIceFortsHistory({ profile }) { return (await request("nif_history", { wallet: profile.wallet })).history || []; }
export async function getMyNineIceFortsRooms({ profile }) { return (await request("nif_my_rooms", { wallet: profile.wallet })).rooms || []; }

export async function listFourWingIceHuntRooms() { return (await request("fwh_room_list", {})).rooms || []; }
export async function createFourWingIceHuntRoom({ visibility = "public", role = "leopards", profile }) { return (await request("fwh_room_create", { visibility, role, wallet: profile.wallet })).room; }
export async function joinFourWingIceHuntRoom({ roomCode, profile }) { return (await request("fwh_room_join", { roomCode, wallet: profile.wallet })).room; }
export async function getFourWingIceHuntState({ roomCode, profile }) { return (await request("fwh_game_state", { roomCode, wallet: profile.wallet })).room; }
export async function submitFourWingIceHuntAction({ roomCode, profile, action }) { return (await request("fwh_game_action", { roomCode, wallet: profile.wallet, action })).room; }
export async function getFourWingIceHuntLegalActions({ roomCode, profile }) { return (await request("fwh_legal_actions", { roomCode, wallet: profile.wallet })).actions || []; }
export async function getFourWingIceHuntHistory({ profile }) { return (await request("fwh_history", { wallet: profile.wallet })).history || []; }
export async function getMyFourWingIceHuntRooms({ profile }) { return (await request("fwh_my_rooms", { wallet: profile.wallet })).rooms || []; }

export async function listFishflowRooms() { return (await request("fish_room_list", {})).rooms || []; }
export async function createFishflowRoom({ visibility = "public", current = "blue", profile }) { return (await request("fish_room_create", { visibility, current, wallet: profile.wallet })).room; }
export async function joinFishflowRoom({ roomCode, profile }) { return (await request("fish_room_join", { roomCode, wallet: profile.wallet })).room; }
export async function getFishflowState({ roomCode, profile }) { return (await request("fish_game_state", { roomCode, wallet: profile.wallet })).room; }
export async function submitFishflowAction({ roomCode, profile, action }) { return (await request("fish_game_action", { roomCode, wallet: profile.wallet, action })).room; }
export async function getFishflowLegalActions({ roomCode, profile }) { return (await request("fish_legal_actions", { roomCode, wallet: profile.wallet })).actions || []; }
export async function getFishflowHistory({ profile }) { return (await request("fish_history", { wallet: profile.wallet })).history || []; }
export async function getMyFishflowRooms({ profile }) { return (await request("fish_my_rooms", { wallet: profile.wallet })).rooms || []; }

export async function listBreakTheIceRooms() { return (await request("bti_room_list", {})).rooms || []; }
export async function createBreakTheIceRoom({ visibility = "public", runner = "blue", profile }) { return (await request("bti_room_create", { visibility, runner, wallet: profile.wallet })).room; }
export async function joinBreakTheIceRoom({ roomCode, profile }) { return (await request("bti_room_join", { roomCode, wallet: profile.wallet })).room; }
export async function getBreakTheIceState({ roomCode, profile }) { return (await request("bti_game_state", { roomCode, wallet: profile.wallet })).room; }
export async function rollBreakTheIceCowries({ roomCode, profile }) { return (await request("bti_game_roll", { roomCode, wallet: profile.wallet })).room; }
export async function submitBreakTheIceAction({ roomCode, profile, action }) { return (await request("bti_game_action", { roomCode, wallet: profile.wallet, action })).room; }
export async function getBreakTheIceLegalActions({ roomCode, profile }) { return (await request("bti_legal_actions", { roomCode, wallet: profile.wallet })).actions || []; }
export async function getBreakTheIceHistory({ profile }) { return (await request("bti_history", { wallet: profile.wallet })).history || []; }
export async function getMyBreakTheIceRooms({ profile }) { return (await request("bti_my_rooms", { wallet: profile.wallet })).rooms || []; }
