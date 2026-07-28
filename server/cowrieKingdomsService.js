const { randomUUID, createHash, randomInt } = require("crypto");
const {
  COWRIE_KINGDOMS_RULESET,
  applyAction,
  applyRoll,
  createCowrieKingdomsState,
  getLegalActions,
  getPlayerSummary
} = require("./cowrieKingdomsRules.js");

const GAME_ID = COWRIE_KINGDOMS_RULESET.gameId;
const SIDES = ["aurora", "ember"];

function createCowrieKingdomsService(deps) {
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
    getHistoryForWallet,
    rollFaces = secureCowrieFaces
  } = deps;

  function players(room) { return Object.values(room.players || {}); }
  function normalizeRoomCode(value) { return String(value || "").trim().toUpperCase(); }
  function normalizeSide(value) { return value === "ember" ? "ember" : "aurora"; }
  function oppositeSide(side) { return side === "aurora" ? "ember" : "aurora"; }
  function isCowrieKingdomsRoom(room) { return room?.gameId === GAME_ID; }
  function code() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let index = 0; index < 4; index += 1) out += chars[Math.floor(Math.random() * chars.length)];
    return rooms.has(out) ? code() : out;
  }
  function sha256(value) { return createHash("sha256").update(String(value)).digest("hex"); }

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
    if (!room || !isCowrieKingdomsRoom(room)) {
      fail(ws, requestId, "Cowrie Kingdoms room not found.");
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
      startedAt: room.startedAt || null,
      finalizedAt: room.finalizedAt || null,
      playerCount: ps.length,
      maxPlayers: 2,
      gameState: room.gameState,
      result: room.result || null,
      proofHash: room.proofHash || null,
      players: ps.map((player) => ({
        wallet: player.wallet,
        name: profileFor(player.wallet)?.name || "Player",
        role: player.seat,
        side: player.seat,
        joinedAt: player.joinedAt
      }))
    };
  }

  function broadcast(room) {
    room.updatedAt = Date.now();
    saveRoomSafe(room);
    const packet = { type: "ck_room_state", payload: { room: roomView(room) } };
    players(room).forEach((player) => {
      const socket = sockets.get(player.wallet);
      if (socket) send(socket, packet);
    });
  }

  function createRoom(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const chosenSide = normalizeSide(payload.side || payload.role);
    const roomCode = code();
    const now = Date.now();
    const room = {
      id: randomUUID(),
      gameId: GAME_ID,
      rulesetVersion: COWRIE_KINGDOMS_RULESET.rulesetVersion,
      roomCode,
      roomMode: "open_ice",
      visibility: payload.visibility === "private" ? "private" : "public",
      status: "waiting",
      matchId: `ck-${randomUUID()}`,
      contractMatchId: null,
      currency: null,
      entryWei: "0",
      createdAt: now,
      updatedAt: now,
      players: { [wallet]: { wallet, seat: chosenSide, joinedAt: now, entryLocked: true } },
      gameState: createCowrieKingdomsState({ mode: "online", starter: "aurora", seed: now }),
      auditLog: []
    };
    audit(room, { type: "room_created", wallet, side: chosenSide, visibility: room.visibility });
    rooms.set(roomCode, room);
    saveRoomSafe(room);
    ok(ws, requestId, "ck_room_create_result", { room: roomView(room) });
    broadcast(room);
  }

  function listRooms(ws, requestId) {
    const result = [...rooms.values()]
      .filter(isCowrieKingdomsRoom)
      .filter((room) => room.visibility === "public" && room.status === "waiting" && players(room).length < 2)
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .map(roomView);
    ok(ws, requestId, "ck_room_list_result", { rooms: result });
  }

  function joinRoom(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const room = findRoom(ws, requestId, payload);
    if (!room) return;
    if (room.players[wallet]) return ok(ws, requestId, "ck_room_join_result", { room: roomView(room) });
    if (room.status !== "waiting") return fail(ws, requestId, "Room is no longer open.");
    if (players(room).length >= 2) return fail(ws, requestId, "Room is full.");
    const occupiedSide = players(room)[0]?.seat || "aurora";
    const side = oppositeSide(occupiedSide);
    room.players[wallet] = { wallet, seat: side, joinedAt: Date.now(), entryLocked: true };
    room.status = "playing";
    room.startedAt = Date.now();
    audit(room, { type: "player_joined", wallet, side });
    audit(room, { type: "game_started", players: players(room).map((player) => ({ wallet: player.wallet, side: player.seat })) });
    ok(ws, requestId, "ck_room_join_result", { room: roomView(room) });
    broadcast(room);
  }

  function getState(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const room = findRoom(ws, requestId, payload);
    if (!room) return;
    if (!room.players[wallet]) return fail(ws, requestId, "Join the room first.");
    ok(ws, requestId, "ck_game_state_result", { room: roomView(room) });
  }

  function legalActions(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const room = findRoom(ws, requestId, payload);
    if (!room) return;
    const player = room.players[wallet];
    if (!player) return fail(ws, requestId, "Join the room first.");
    const actions = room.status === "playing" && player.seat === room.gameState.currentPlayer
      ? getLegalActions(room.gameState, player.seat, payload.unitId || null)
      : [];
    ok(ws, requestId, "ck_legal_actions_result", { actions, room: roomView(room) });
  }

  function roll(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const room = findRoom(ws, requestId, payload);
    if (!room) return;
    const player = room.players[wallet];
    if (!player) return fail(ws, requestId, "Join the room first.");
    if (room.status !== "playing") return fail(ws, requestId, room.status === "finished" ? "The Cowrie Kingdoms race has ended." : "Waiting for a second player.");
    if (player.seat !== room.gameState.currentPlayer) return fail(ws, requestId, "It is not your turn.");
    if (room.gameState.awaiting !== "roll") return fail(ws, requestId, "Allocate or pass every stored throw first.");

    const faces = rollFaces();
    const nonce = randomUUID();
    const proofHash = sha256(JSON.stringify({ matchId: room.matchId, turn: room.gameState.turn, castCount: room.gameState.castCount, faces, nonce }));
    const result = applyRoll(room.gameState, faces, player.seat, { nonce, proofHash });
    if (result.error) return fail(ws, requestId, result.error);
    room.gameState = result.state;
    audit(room, { type: "cowrie_cast", wallet, side: player.seat, faces, roll: room.gameState.lastRoll, proofHash, nonce });
    ok(ws, requestId, "ck_game_roll_result", { room: roomView(room) });
    broadcast(room);
  }

  function action(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const room = findRoom(ws, requestId, payload);
    if (!room) return;
    const player = room.players[wallet];
    if (!player) return fail(ws, requestId, "Join the room first.");
    if (room.status !== "playing") return fail(ws, requestId, room.status === "finished" ? "The Cowrie Kingdoms race has ended." : "Waiting for a second player.");
    if (player.seat !== room.gameState.currentPlayer) return fail(ws, requestId, "It is not your turn.");
    const result = applyAction(room.gameState, payload.action, player.seat);
    if (result.error) return fail(ws, requestId, result.error);
    room.gameState = result.state;
    audit(room, { type: "game_action", wallet, side: player.seat, action: payload.action, resolved: room.gameState.lastAction, turn: room.gameState.turn });
    if (room.gameState.winner) finalize(room);
    ok(ws, requestId, "ck_game_action_result", { room: roomView(room) });
    broadcast(room);
  }

  async function history(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    try {
      ok(ws, requestId, "ck_history_result", { history: await getHistoryForWallet(wallet, GAME_ID) });
    } catch (err) {
      fail(ws, requestId, err.message || "Could not load Cowrie Kingdoms history.");
    }
  }

  function myRooms(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const result = [...rooms.values()]
      .filter(isCowrieKingdomsRoom)
      .filter((room) => room.players?.[wallet])
      .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))
      .map(roomView);
    ok(ws, requestId, "ck_my_rooms_result", { rooms: result });
  }

  function finalize(room) {
    if (room.finalizedAt) return;
    room.status = "finished";
    room.finalizedAt = Date.now();
    const winnerSide = room.gameState.winner;
    const winnerPlayer = players(room).find((player) => player.seat === winnerSide) || null;
    room.result = {
      winner: winnerSide,
      winnerWallet: winnerPlayer?.wallet || null,
      reason: room.gameState.winReason,
      casts: room.gameState.castCount,
      captures: { ...room.gameState.captures }
    };
    room.proofHash = sha256(JSON.stringify({ gameId: room.gameId, rulesetVersion: room.rulesetVersion, roomCode: room.roomCode, matchId: room.matchId, gameState: room.gameState, auditLog: room.auditLog }));
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
      role: player.seat,
      won: room.result?.winnerWallet === player.wallet,
      summary: getPlayerSummary(room.gameState, player.seat)
    }));
    ps.forEach((player) => {
      const won = room.result?.winnerWallet === player.wallet;
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
        position: won ? 1 : 2,
        won,
        payoutWei: "0",
        points: 0,
        players: playerSummary,
        finalBoardState: room.gameState,
        auditLog: room.auditLog,
        proofHash: room.proofHash,
        result: room.result,
        randomness: room.gameState.history.filter((item) => item.type === "roll").map((item) => item.roll),
        finishedAt: room.finalizedAt
      };
      room.historyEntryIds.push(entry.id);
      saveHistoryEntry(entry).catch((err) => console.error(`[ck-history] save failed room=${room.roomCode}: ${err.message}`));
    });
    saveRoomSafe(room);
  }

  function restoreRoom(room) {
    if (!isCowrieKingdomsRoom(room)) return false;
    room.rulesetVersion = room.rulesetVersion || COWRIE_KINGDOMS_RULESET.rulesetVersion;
    room.updatedAt = room.updatedAt || room.createdAt || Date.now();
    if (room.status === "finished" && !room.historyEntryIds?.length) recordHistory(room);
    return true;
  }

  return { action, createRoom, getState, history, isCowrieKingdomsRoom, joinRoom, legalActions, listRooms, myRooms, restoreRoom, roll, roomView };
}

function secureCowrieFaces() {
  return Array.from({ length: COWRIE_KINGDOMS_RULESET.cowries }, () => randomInt(0, 2));
}

module.exports = { createCowrieKingdomsService, secureCowrieFaces, GAME_ID, SIDES };
