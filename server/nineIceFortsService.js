const { randomUUID, createHash } = require("crypto");
const {
  NINE_ICE_FORTS_RULESET,
  applyAction,
  createNineIceFortsState,
  getLegalActions
} = require("./nineIceFortsRules.js");

const GAME_ID = NINE_ICE_FORTS_RULESET.gameId;
const MAX_PLAYERS = 2;
const SEATS = ["blue", "coral"];

function createNineIceFortsService(deps) {
  const {
    rooms,
    profiles,
    sockets,
    send,
    ok,
    fail,
    walletOf,
    profileFor,
    saveRoomSafe,
    saveHistoryEntry,
    getHistoryForWallet
  } = deps;

  function players(room) { return Object.values(room.players || {}); }
  function roomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 4; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
    return rooms.has(out) ? roomCode() : out;
  }
  function sha256(value) { return createHash("sha256").update(String(value)).digest("hex"); }
  function normalizeRoomCode(value) { return String(value || "").trim().toUpperCase(); }
  function isNineIceFortsRoom(room) { return room?.gameId === GAME_ID; }
  function requireProfile(ws, requestId, payload) {
    const wallet = walletOf(payload.wallet);
    if (!wallet || !profiles.has(wallet)) {
      fail(ws, requestId, "Create profile first.");
      return null;
    }
    sockets.set(wallet, ws);
    return wallet;
  }
  function findRoom(ws, requestId, payload) {
    const room = rooms.get(normalizeRoomCode(payload.roomCode));
    if (!room || !isNineIceFortsRoom(room)) {
      fail(ws, requestId, "Nine Ice Forts room not found.");
      return null;
    }
    return room;
  }
  function audit(room, event) {
    room.auditLog = room.auditLog || [];
    const seq = room.auditLog.length + 1;
    const previousHash = room.lastAuditHash || room.auditLog[room.auditLog.length - 1]?.eventHash || null;
    const body = { at: Date.now(), seq, previousHash, ...event };
    const eventHash = sha256(JSON.stringify({ roomCode: room.roomCode, matchId: room.matchId, event: body }));
    room.lastAuditHash = eventHash;
    room.auditLog.push({ ...body, eventHash });
  }
  function roomView(room) {
    const ps = players(room);
    return {
      id: room.id,
      gameId: GAME_ID,
      rulesetVersion: room.rulesetVersion,
      roomCode: room.roomCode,
      roomMode: room.roomMode,
      visibility: room.visibility,
      status: room.status,
      matchId: room.matchId,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt || room.createdAt,
      finalizedAt: room.finalizedAt || null,
      playerCount: ps.length,
      maxPlayers: MAX_PLAYERS,
      gameState: room.gameState,
      result: room.result || null,
      proofHash: room.proofHash || null,
      players: ps.map((player) => ({
        wallet: player.wallet,
        name: profileFor(player.wallet)?.name || "Player",
        seat: player.seat,
        joinedAt: player.joinedAt
      }))
    };
  }
  function broadcast(room) {
    room.updatedAt = Date.now();
    saveRoomSafe(room);
    const packet = { type: "nif_room_state", payload: { room: roomView(room) } };
    players(room).forEach((player) => {
      const socket = sockets.get(player.wallet);
      if (socket) send(socket, packet);
    });
  }
  function createRoom(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const code = roomCode();
    const now = Date.now();
    const room = {
      id: randomUUID(),
      gameId: GAME_ID,
      rulesetVersion: NINE_ICE_FORTS_RULESET.rulesetVersion,
      roomCode: code,
      roomMode: "open_ice",
      visibility: payload.visibility === "private" ? "private" : "public",
      status: "waiting",
      matchId: `nif-${randomUUID()}`,
      contractMatchId: null,
      currency: null,
      entryWei: "0",
      createdAt: now,
      updatedAt: now,
      players: {
        [wallet]: { wallet, seat: "blue", joinedAt: now, entryLocked: true }
      },
      gameState: createNineIceFortsState({ startingPlayer: "blue", mode: "online" }),
      auditLog: []
    };
    audit(room, { type: "room_created", wallet, seat: "blue", visibility: room.visibility });
    rooms.set(code, room);
    saveRoomSafe(room);
    ok(ws, requestId, "nif_room_create_result", { room: roomView(room) });
    broadcast(room);
  }
  function listRooms(ws, requestId) {
    const result = [...rooms.values()]
      .filter(isNineIceFortsRoom)
      .filter((room) => room.visibility === "public" && room.status === "waiting")
      .filter((room) => players(room).length < MAX_PLAYERS)
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .map(roomView);
    ok(ws, requestId, "nif_room_list_result", { rooms: result });
  }
  function joinRoom(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const room = findRoom(ws, requestId, payload);
    if (!room) return;
    if (room.players[wallet]) {
      ok(ws, requestId, "nif_room_join_result", { room: roomView(room) });
      return;
    }
    if (room.status !== "waiting") return fail(ws, requestId, "Room is no longer open.");
    if (players(room).length >= MAX_PLAYERS) return fail(ws, requestId, "Room is full.");
    const occupied = new Set(players(room).map((player) => player.seat));
    const seat = SEATS.find((candidate) => !occupied.has(candidate));
    room.players[wallet] = { wallet, seat, joinedAt: Date.now(), entryLocked: true };
    audit(room, { type: "player_joined", wallet, seat });
    if (players(room).length === MAX_PLAYERS) {
      room.status = "playing";
      room.startedAt = Date.now();
      audit(room, { type: "game_started", players: players(room).map((player) => ({ wallet: player.wallet, seat: player.seat })) });
    }
    ok(ws, requestId, "nif_room_join_result", { room: roomView(room) });
    broadcast(room);
  }
  function getState(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const room = findRoom(ws, requestId, payload);
    if (!room) return;
    if (!room.players[wallet]) return fail(ws, requestId, "Join the room first.");
    ok(ws, requestId, "nif_game_state_result", { room: roomView(room) });
  }
  function action(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const room = findRoom(ws, requestId, payload);
    if (!room) return;
    if (!room.players[wallet]) return fail(ws, requestId, "Join the room first.");
    if (room.status !== "playing") return fail(ws, requestId, room.status === "finished" ? "The match has ended." : "Waiting for a second player.");
    const seat = room.players[wallet].seat;
    if (seat !== room.gameState.currentPlayer) return fail(ws, requestId, "It is not your turn.");
    const result = applyAction(room.gameState, payload.action, seat);
    if (result.error) return fail(ws, requestId, result.error);
    room.gameState = result.state;
    audit(room, { type: "game_action", wallet, seat, action: payload.action, turn: room.gameState.turn });
    if (room.gameState.winner) finalize(room);
    ok(ws, requestId, "nif_game_action_result", { room: roomView(room) });
    broadcast(room);
  }
  function legalActions(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const room = findRoom(ws, requestId, payload);
    if (!room) return;
    if (!room.players[wallet]) return fail(ws, requestId, "Join the room first.");
    const seat = room.players[wallet].seat;
    const actions = room.status === "playing" && seat === room.gameState.currentPlayer ? getLegalActions(room.gameState, seat) : [];
    ok(ws, requestId, "nif_legal_actions_result", { actions, room: roomView(room) });
  }
  async function history(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    try {
      const entries = await getHistoryForWallet(wallet, GAME_ID);
      ok(ws, requestId, "nif_history_result", { history: entries });
    } catch (err) {
      fail(ws, requestId, err.message || "Could not load Nine Ice Forts history.");
    }
  }
  function myRooms(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const result = [...rooms.values()]
      .filter(isNineIceFortsRoom)
      .filter((room) => room.players?.[wallet])
      .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))
      .map(roomView);
    ok(ws, requestId, "nif_my_rooms_result", { rooms: result });
  }
  function finalize(room) {
    if (room.finalizedAt) return;
    room.status = "finished";
    room.finalizedAt = Date.now();
    const winnerSeat = room.gameState.winner;
    const winnerPlayer = players(room).find((player) => player.seat === winnerSeat) || null;
    room.result = {
      winner: winnerSeat,
      winnerWallet: winnerPlayer?.wallet || null,
      reason: room.gameState.winReason
    };
    room.proofHash = sha256(JSON.stringify({
      gameId: room.gameId,
      rulesetVersion: room.rulesetVersion,
      roomCode: room.roomCode,
      matchId: room.matchId,
      gameState: room.gameState,
      auditLog: room.auditLog
    }));
    audit(room, { type: "game_finished", result: room.result, proofHash: room.proofHash });
    recordHistory(room);
  }
  function recordHistory(room) {
    if (room.historyEntryIds?.length) return;
    room.historyEntryIds = [];
    const ps = players(room);
    const playerSummary = ps.map((player) => ({
      wallet: player.wallet,
      name: profileFor(player.wallet)?.name || "Player",
      seat: player.seat,
      won: room.result?.winnerWallet === player.wallet
    }));
    ps.forEach((player) => {
      const won = room.result?.winnerWallet === player.wallet;
      const draw = room.result?.winner === "draw";
      const entry = {
        id: `${room.matchId}-${player.wallet}`,
        gameId: GAME_ID,
        rulesetVersion: room.rulesetVersion,
        roomCode: room.roomCode,
        matchId: room.matchId,
        contractMatchId: null,
        roomMode: "open_ice",
        currency: null,
        entryTier: null,
        entryWei: "0",
        wallet: player.wallet,
        playerName: profileFor(player.wallet)?.name || "Player",
        team: player.seat,
        position: draw ? null : won ? 1 : 2,
        won,
        payoutWei: "0",
        points: 0,
        players: playerSummary,
        finalBoardState: room.gameState,
        auditLog: room.auditLog,
        proofHash: room.proofHash,
        result: room.result,
        finishedAt: room.finalizedAt
      };
      room.historyEntryIds.push(entry.id);
      saveHistoryEntry(entry).catch((err) => console.error(`[nif-history] save failed room=${room.roomCode}: ${err.message}`));
    });
    saveRoomSafe(room);
  }
  function restoreRoom(room) {
    if (!isNineIceFortsRoom(room)) return false;
    room.rulesetVersion = room.rulesetVersion || NINE_ICE_FORTS_RULESET.rulesetVersion;
    room.updatedAt = room.updatedAt || room.createdAt || Date.now();
    if (room.status === "finished" && !room.historyEntryIds?.length) recordHistory(room);
    return true;
  }

  return { createRoom, listRooms, joinRoom, getState, action, legalActions, history, myRooms, restoreRoom, roomView, isNineIceFortsRoom };
}

module.exports = { createNineIceFortsService, GAME_ID };
