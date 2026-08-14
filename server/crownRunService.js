const { randomUUID, createHash, randomInt } = require("crypto");
const {
  CROWN_RUN_RULESET,
  applyAction,
  applyRollSequence,
  createCrownRunState,
  getLegalActions,
  getSideSummary
} = require("./crownRunRules.js");

const GAME_ID = CROWN_RUN_RULESET.gameId;
const SIDES = ["aurora", "ember"];

function createCrownRunService(deps) {
  const { rooms, profiles, sockets, send, ok, fail, walletOf, profileFor, saveRoomSafe, saveHistoryEntry, getHistoryForWallet, rollFaces = secureFaces } = deps;

  function players(room) { return Object.values(room.players || {}); }
  function normalizeRoomCode(value) { return String(value || "").trim().toUpperCase(); }
  function normalizeSide(value) { return value === "ember" ? "ember" : "aurora"; }
  function oppositeSide(side) { return side === "aurora" ? "ember" : "aurora"; }
  function isCrownRunRoom(room) { return room?.gameId === GAME_ID; }
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
    if (!room || !isCrownRunRoom(room)) {
      fail(ws, requestId, "Crown Run room not found.");
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
        side: player.seat,
        role: player.seat,
        joinedAt: player.joinedAt
      }))
    };
  }

  function broadcast(room) {
    room.updatedAt = Date.now();
    saveRoomSafe(room);
    const packet = { type: "cr_room_state", payload: { room: roomView(room) } };
    players(room).forEach((player) => {
      const socket = sockets.get(player.wallet);
      if (socket) send(socket, packet);
    });
  }

  function createRoom(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const side = normalizeSide(payload.side || payload.role);
    const roomCode = code();
    const now = Date.now();
    const room = {
      id: randomUUID(),
      gameId: GAME_ID,
      rulesetVersion: CROWN_RUN_RULESET.rulesetVersion,
      roomCode,
      roomMode: "open_ice",
      visibility: payload.visibility === "private" ? "private" : "public",
      status: "waiting",
      matchId: `cr-${randomUUID()}`,
      contractMatchId: null,
      currency: null,
      entryWei: "0",
      createdAt: now,
      updatedAt: now,
      players: { [wallet]: { wallet, seat: side, joinedAt: now, entryLocked: true } },
      gameState: createCrownRunState({ mode: "online", starter: "aurora", seed: now }),
      auditLog: []
    };
    audit(room, { type: "room_created", wallet, side, visibility: room.visibility });
    rooms.set(roomCode, room);
    saveRoomSafe(room);
    ok(ws, requestId, "cr_room_create_result", { room: roomView(room) });
    broadcast(room);
  }

  function listRooms(ws, requestId) {
    const result = [...rooms.values()]
      .filter(isCrownRunRoom)
      .filter((room) => room.visibility === "public" && room.status === "waiting" && players(room).length < 2)
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .map(roomView);
    ok(ws, requestId, "cr_room_list_result", { rooms: result });
  }

  function joinRoom(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const room = findRoom(ws, requestId, payload);
    if (!room) return;
    if (room.players[wallet]) {
      ok(ws, requestId, "cr_room_join_result", { room: roomView(room) });
      return;
    }
    if (room.status !== "waiting") return fail(ws, requestId, "Room is no longer open.");
    if (players(room).length >= 2) return fail(ws, requestId, "Room is full.");
    const occupiedSide = players(room)[0]?.seat || "aurora";
    const side = oppositeSide(occupiedSide);
    room.players[wallet] = { wallet, seat: side, joinedAt: Date.now(), entryLocked: true };
    room.status = "playing";
    room.startedAt = Date.now();
    audit(room, { type: "player_joined", wallet, side });
    audit(room, { type: "game_started", players: players(room).map((player) => ({ wallet: player.wallet, side: player.seat })) });
    ok(ws, requestId, "cr_room_join_result", { room: roomView(room) });
    broadcast(room);
  }

  function getState(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const room = findRoom(ws, requestId, payload);
    if (!room) return;
    if (!room.players[wallet]) return fail(ws, requestId, "Join the room first.");
    ok(ws, requestId, "cr_game_state_result", { room: roomView(room) });
  }

  function legalActions(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const room = findRoom(ws, requestId, payload);
    if (!room) return;
    const player = room.players[wallet];
    if (!player) return fail(ws, requestId, "Join the room first.");
    const actions = room.status === "playing" && player.seat === room.gameState.currentPlayer
      ? getLegalActions(room.gameState, player.seat)
      : [];
    ok(ws, requestId, "cr_legal_actions_result", { actions, room: roomView(room) });
  }

  function roll(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const room = findRoom(ws, requestId, payload);
    if (!room) return;
    const player = room.players[wallet];
    if (!player) return fail(ws, requestId, "Join the room first.");
    if (room.status !== "playing") return fail(ws, requestId, room.status === "finished" ? "The Crown Run match has ended." : "Waiting for the opposing court.");
    if (player.seat !== room.gameState.currentPlayer) return fail(ws, requestId, "It is not your turn.");
    if (!["roll", "capture-roll"].includes(room.gameState.awaiting)) return fail(ws, requestId, "Apply the stored throws before casting again.");

    const context = room.gameState.awaiting;
    const sequence = secureSequence(room, context, rollFaces, sha256);
    const result = applyRollSequence(room.gameState, sequence, player.seat);
    if (result.error) return fail(ws, requestId, result.error);
    room.gameState = result.state;
    audit(room, {
      type: "cowrie_sequence",
      wallet,
      side: player.seat,
      context,
      rolls: sequence.map((item) => ({ faces: item.faces, mouthsUp: item.mouthsUp, value: item.value, bonus: item.bonus, nonce: item.nonce, proofHash: item.proofHash }))
    });
    if (room.gameState.winner) finalize(room);
    ok(ws, requestId, "cr_game_roll_result", { room: roomView(room) });
    broadcast(room);
  }

  function action(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const room = findRoom(ws, requestId, payload);
    if (!room) return;
    const player = room.players[wallet];
    if (!player) return fail(ws, requestId, "Join the room first.");
    if (room.status !== "playing") return fail(ws, requestId, room.status === "finished" ? "The Crown Run match has ended." : "Waiting for the opposing court.");
    if (player.seat !== room.gameState.currentPlayer) return fail(ws, requestId, "It is not your turn.");
    const result = applyAction(room.gameState, payload.action, player.seat);
    if (result.error) return fail(ws, requestId, result.error);
    room.gameState = result.state;
    audit(room, {
      type: "game_action",
      wallet,
      side: player.seat,
      action: payload.action,
      move: room.gameState.lastMove,
      reset: room.gameState.lastReset,
      turn: room.gameState.turn
    });
    if (room.gameState.winner) finalize(room);
    ok(ws, requestId, "cr_game_action_result", { room: roomView(room) });
    broadcast(room);
  }

  async function history(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    try {
      ok(ws, requestId, "cr_history_result", { history: await getHistoryForWallet(wallet, GAME_ID) });
    } catch (err) {
      fail(ws, requestId, err.message || "Could not load Crown Run history.");
    }
  }

  function myRooms(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const result = [...rooms.values()]
      .filter(isCrownRunRoom)
      .filter((room) => room.players?.[wallet])
      .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))
      .map(roomView);
    ok(ws, requestId, "cr_my_rooms_result", { rooms: result });
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
      captures: { ...room.gameState.captures },
      kingResets: { ...room.gameState.kingResets }
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
      side: player.seat,
      won: room.result?.winnerWallet === player.wallet,
      summary: getSideSummary(room.gameState, player.seat)
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
        randomness: room.gameState.history.filter((item) => item.type === "roll-sequence").flatMap((item) => item.rolls || []),
        finishedAt: room.finalizedAt
      };
      room.historyEntryIds.push(entry.id);
      saveHistoryEntry(entry).catch((err) => console.error(`[cr-history] save failed room=${room.roomCode}: ${err.message}`));
    });
    saveRoomSafe(room);
  }

  function restoreRoom(room) {
    if (!isCrownRunRoom(room)) return false;
    room.rulesetVersion = room.rulesetVersion || CROWN_RUN_RULESET.rulesetVersion;
    room.updatedAt = room.updatedAt || room.createdAt || Date.now();
    if (room.status === "finished" && !room.historyEntryIds?.length) recordHistory(room);
    return true;
  }

  return { action, createRoom, getState, history, isCrownRunRoom, joinRoom, legalActions, listRooms, myRooms, restoreRoom, roll, roomView };
}

function secureFaces() { return Array.from({ length: CROWN_RUN_RULESET.cowries }, () => randomInt(0, 2)); }

function secureSequence(room, context, rollFaces, sha256) {
  const sequence = [];
  do {
    const faces = rollFaces();
    const mouthsUp = faces.reduce((sum, face) => sum + Number(Boolean(face)), 0);
    const value = mouthsUp === 5 ? 10 : mouthsUp;
    const bonus = [1, 10].includes(value);
    const nonce = randomUUID();
    const proofHash = sha256(JSON.stringify({
      matchId: room.matchId,
      turn: room.gameState.turn,
      context,
      castNumber: room.gameState.castCount + sequence.length + 1,
      faces,
      nonce
    }));
    sequence.push({ id: `${room.gameState.turn}-${room.gameState.castCount + sequence.length + 1}`, faces, mouthsUp, value, bonus, nonce, proofHash });
  } while (sequence[sequence.length - 1].bonus);
  return sequence;
}

module.exports = { createCrownRunService, secureFaces, secureSequence, GAME_ID, SIDES };