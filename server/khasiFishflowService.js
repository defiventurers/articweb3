const { randomUUID, createHash } = require("crypto");
const { KHASI_FISHFLOW_RULESET, applyAction, createKhasiFishflowState, getCounts, getLegalActions, assertCounterInvariant } = require("./khasiFishflowRules.js");

const GAME_ID = KHASI_FISHFLOW_RULESET.gameId;

function createKhasiFishflowService(deps) {
  const { rooms, profiles, sockets, send, ok, fail, walletOf, profileFor, saveRoomSafe, saveHistoryEntry, getHistoryForWallet } = deps;
  const players = (room) => Object.values(room.players || {});
  const normalizeCode = (value) => String(value || "").trim().toUpperCase();
  const normalizeSide = (value) => value === "ember" ? "ember" : "aurora";
  const oppositeSide = (side) => side === "aurora" ? "ember" : "aurora";
  const isRoom = (room) => room?.gameId === GAME_ID;
  const sha256 = (value) => createHash("sha256").update(String(value)).digest("hex");

  function code() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let value = "";
    for (let index = 0; index < 4; index += 1) value += chars[Math.floor(Math.random() * chars.length)];
    return rooms.has(value) ? code() : value;
  }
  function requireProfile(ws, requestId, payload) {
    const wallet = walletOf(payload.wallet);
    if (!wallet || !profiles.has(wallet)) { fail(ws, requestId, "Create profile first."); return null; }
    sockets.set(wallet, ws);
    return wallet;
  }
  function findRoom(ws, requestId, payload) {
    const room = rooms.get(normalizeCode(payload.roomCode));
    if (!room || !isRoom(room)) { fail(ws, requestId, "Khasi Fishflow room not found."); return null; }
    return room;
  }
  function audit(room, event) {
    room.auditLog = room.auditLog || [];
    const seq = room.auditLog.length + 1;
    const previousHash = room.lastAuditHash || room.auditLog.at(-1)?.eventHash || null;
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
      players: ps.map((player) => ({ wallet: player.wallet, name: profileFor(player.wallet)?.name || "Player", role: player.seat, side: player.seat, joinedAt: player.joinedAt }))
    };
  }
  function broadcast(room) {
    room.updatedAt = Date.now();
    saveRoomSafe(room);
    const packet = { type: "kf_room_state", payload: { room: roomView(room) } };
    players(room).forEach((player) => { const socket = sockets.get(player.wallet); if (socket) send(socket, packet); });
  }
  function createRoom(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload);
    if (!wallet) return;
    const side = normalizeSide(payload.side || payload.role);
    const roomCode = code();
    const now = Date.now();
    const room = {
      id: randomUUID(), gameId: GAME_ID, rulesetVersion: KHASI_FISHFLOW_RULESET.rulesetVersion,
      roomCode, roomMode: "open_ice", visibility: payload.visibility === "private" ? "private" : "public",
      status: "waiting", matchId: `kf-${randomUUID()}`, contractMatchId: null, currency: null, entryWei: "0",
      createdAt: now, updatedAt: now,
      players: { [wallet]: { wallet, seat: side, joinedAt: now, entryLocked: true } },
      gameState: createKhasiFishflowState({ mode: "online", starter: "aurora" }), auditLog: []
    };
    audit(room, { type: "room_created", wallet, side, visibility: room.visibility });
    rooms.set(roomCode, room); saveRoomSafe(room);
    ok(ws, requestId, "kf_room_create_result", { room: roomView(room) }); broadcast(room);
  }
  function listRooms(ws, requestId) {
    const result = [...rooms.values()].filter(isRoom).filter((room) => room.visibility === "public" && room.status === "waiting" && players(room).length < 2).sort((a,b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)).map(roomView);
    ok(ws, requestId, "kf_room_list_result", { rooms: result });
  }
  function joinRoom(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload); if (!wallet) return;
    const room = findRoom(ws, requestId, payload); if (!room) return;
    if (room.players[wallet]) return ok(ws, requestId, "kf_room_join_result", { room: roomView(room) });
    if (room.status !== "waiting") return fail(ws, requestId, "Room is no longer open.");
    if (players(room).length >= 2) return fail(ws, requestId, "Room is full.");
    const side = oppositeSide(players(room)[0]?.seat || "aurora");
    room.players[wallet] = { wallet, seat: side, joinedAt: Date.now(), entryLocked: true };
    room.status = "playing"; room.startedAt = Date.now();
    audit(room, { type: "player_joined", wallet, side });
    audit(room, { type: "game_started", players: players(room).map((player) => ({ wallet: player.wallet, side: player.seat })) });
    ok(ws, requestId, "kf_room_join_result", { room: roomView(room) }); broadcast(room);
  }
  function getState(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload); if (!wallet) return;
    const room = findRoom(ws, requestId, payload); if (!room) return;
    if (!room.players[wallet]) return fail(ws, requestId, "Join the room first.");
    ok(ws, requestId, "kf_game_state_result", { room: roomView(room) });
  }
  function legalActions(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload); if (!wallet) return;
    const room = findRoom(ws, requestId, payload); if (!room) return;
    const player = room.players[wallet]; if (!player) return fail(ws, requestId, "Join the room first.");
    const actions = room.status === "playing" && player.seat === room.gameState.currentPlayer ? getLegalActions(room.gameState, player.seat) : [];
    ok(ws, requestId, "kf_legal_actions_result", { actions, room: roomView(room) });
  }
  function action(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload); if (!wallet) return;
    const room = findRoom(ws, requestId, payload); if (!room) return;
    const player = room.players[wallet]; if (!player) return fail(ws, requestId, "Join the room first.");
    if (room.status !== "playing") return fail(ws, requestId, room.status === "finished" ? "This Khasi Fishflow match has ended." : "Waiting for a second player.");
    if (player.seat !== room.gameState.currentPlayer) return fail(ws, requestId, "It is not your turn.");
    const result = applyAction(room.gameState, payload.action, player.seat);
    if (result.error) return fail(ws, requestId, result.error);
    room.gameState = result.state;
    audit(room, { type: "game_action", wallet, side: player.seat, action: payload.action, resolved: room.gameState.lastTurn, turn: room.gameState.turn, round: room.gameState.round });
    if (room.gameState.winner) finalize(room);
    ok(ws, requestId, "kf_game_action_result", { room: roomView(room) }); broadcast(room);
  }
  async function history(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload); if (!wallet) return;
    try { ok(ws, requestId, "kf_history_result", { history: await getHistoryForWallet(wallet, GAME_ID) }); }
    catch (error) { fail(ws, requestId, error.message || "Could not load Khasi Fishflow history."); }
  }
  function myRooms(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload); if (!wallet) return;
    const result = [...rooms.values()].filter(isRoom).filter((room) => room.players?.[wallet]).sort((a,b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0)).map(roomView);
    ok(ws, requestId, "kf_my_rooms_result", { rooms: result });
  }
  function finalize(room) {
    if (room.finalizedAt) return;
    room.status = "finished"; room.finalizedAt = Date.now();
    const winnerSide = room.gameState.winner;
    const winnerPlayer = players(room).find((player) => player.seat === winnerSide) || null;
    room.result = { winner: winnerSide, winnerWallet: winnerPlayer?.wallet || null, draw: false, reason: room.gameState.winReason, rounds: room.gameState.round, counts: getCounts(room.gameState) };
    room.proofHash = sha256(JSON.stringify({ gameId: room.gameId, rulesetVersion: room.rulesetVersion, roomCode: room.roomCode, matchId: room.matchId, gameState: room.gameState, auditLog: room.auditLog }));
    audit(room, { type: "game_finished", result: room.result, proofHash: room.proofHash });
    recordHistory(room);
  }
  function recordHistory(room) {
    if (room.historyEntryIds?.length) return;
    room.historyEntryIds = [];
    const ps = players(room);
    const summaries = ps.map((player) => ({ wallet: player.wallet, name: profileFor(player.wallet)?.name || "Player", role: player.seat, won: room.result?.winnerWallet === player.wallet, summary: getCounts(room.gameState)[player.seat] }));
    ps.forEach((player) => {
      const won = room.result?.winnerWallet === player.wallet;
      const entry = { id: `${room.matchId}-${player.wallet}`, gameId: GAME_ID, rulesetVersion: room.rulesetVersion, roomCode: room.roomCode, matchId: room.matchId, contractMatchId: null, roomMode: "open_ice", currency: null, entryTier: null, entryWei: "0", wallet: player.wallet, playerName: profileFor(player.wallet)?.name || "Player", team: player.seat, position: won ? 1 : 2, won, draw: false, payoutWei: "0", points: won ? 18 : 4, startedAt: room.startedAt, finishedAt: room.finalizedAt, proofHash: room.proofHash, result: room.result, players: summaries };
      room.historyEntryIds.push(entry.id); saveHistoryEntry(entry);
    });
    saveRoomSafe(room);
  }
  function restoreRoom(room) {
    if (!isRoom(room)) return false;
    room.rulesetVersion = room.rulesetVersion || KHASI_FISHFLOW_RULESET.rulesetVersion;
    room.gameState = room.gameState || createKhasiFishflowState({ mode: "online" });
    room.auditLog = room.auditLog || [];
    assertCounterInvariant(room.gameState);
    if (room.status === "finished" && !room.historyEntryIds?.length) recordHistory(room);
    return true;
  }
  return { createRoom, listRooms, joinRoom, getState, legalActions, action, history, myRooms, restoreRoom, roomView, isRoom };
}

module.exports = { createKhasiFishflowService, GAME_ID };
