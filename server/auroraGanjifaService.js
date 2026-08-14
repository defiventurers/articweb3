const { randomUUID, randomBytes, randomInt, createHash } = require("crypto");
const {
  AURORA_GANJIFA_RULESET,
  makeDeck,
  createAcademyState,
  getLegalActions,
  applyAction,
  playerProjection,
  assertStateInvariant,
  seatName
} = require("./auroraGanjifaRules.js");

const GAME_ID = AURORA_GANJIFA_RULESET.gameId;

function createAuroraGanjifaService(deps) {
  const { rooms, profiles, sockets, send, ok, fail, walletOf, profileFor, saveRoomSafe, saveHistoryEntry, getHistoryForWallet } = deps;
  const players = (room) => Object.values(room.players || {}).sort((a, b) => a.seatIndex - b.seatIndex);
  const normalizeRoomCode = (value) => String(value || "").trim().toUpperCase();
  const isRoom = (room) => room?.gameId === GAME_ID;
  const sha256 = (value) => createHash("sha256").update(String(value)).digest("hex");
  function code() { const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let out = ""; for (let i = 0; i < 4; i += 1) out += chars[randomInt(chars.length)]; return rooms.has(out) ? code() : out; }
  function requireProfile(ws, requestId, payload) { const wallet = walletOf(payload.wallet); if (!wallet || !profiles.has(wallet)) { fail(ws, requestId, "Create profile first."); return null; } sockets.set(wallet, ws); return wallet; }
  function findRoom(ws, requestId, payload) { const room = rooms.get(normalizeRoomCode(payload.roomCode)); if (!room || !isRoom(room)) { fail(ws, requestId, "Aurora Ganjifa room not found."); return null; } return room; }
  function audit(room, event) { room.auditLog = room.auditLog || []; const seq = room.auditLog.length + 1; const previousHash = room.lastAuditHash || room.auditLog.at(-1)?.eventHash || null; const body = { at: Date.now(), seq, previousHash, ...event }; const eventHash = sha256(JSON.stringify({ roomCode: room.roomCode, matchId: room.matchId, event: body })); room.lastAuditHash = eventHash; room.auditLog.push({ ...body, eventHash }); }
  function safePlayers(room) { return players(room).map((player) => ({ wallet: player.wallet, name: profileFor(player.wallet)?.name || "Player", role: player.seat, seat: player.seat, joinedAt: player.joinedAt })); }
  function roomView(room, viewerWallet = null) {
    const viewer = viewerWallet ? room.players?.[viewerWallet] : null;
    const gameState = room.gameState ? playerProjection(room.gameState, viewer?.seat || null) : null;
    return {
      id: room.id, gameId: GAME_ID, rulesetVersion: room.rulesetVersion, roomCode: room.roomCode,
      roomMode: room.roomMode, visibility: room.visibility, status: room.status, matchId: room.matchId,
      createdAt: room.createdAt, updatedAt: room.updatedAt || room.createdAt, startedAt: room.startedAt || null,
      finalizedAt: room.finalizedAt || null, playerCount: players(room).length, maxPlayers: room.maxPlayers,
      gameState, result: room.result || null, proofHash: room.proofHash || null,
      shuffleCommitment: room.shuffleCommitment || null,
      shuffleReveal: room.status === "finished" ? room.shuffleReveal || null : null,
      players: safePlayers(room)
    };
  }
  function broadcast(room) {
    room.updatedAt = Date.now();
    saveRoomSafe(room);
    players(room).forEach((player) => { const socket = sockets.get(player.wallet); if (socket) send(socket, { type: "ag_room_state", payload: { room: roomView(room, player.wallet) } }); });
  }
  function secureShuffle() {
    const cards = makeDeck();
    for (let index = cards.length - 1; index > 0; index -= 1) { const swap = randomInt(index + 1); [cards[index], cards[swap]] = [cards[swap], cards[index]]; }
    return cards;
  }
  function startRoom(room) {
    const order = secureShuffle();
    const nonce = randomBytes(32).toString("hex");
    room.shuffleCommitment = sha256(JSON.stringify({ matchId: room.matchId, nonce, order: order.map((card) => card.id) }));
    room.shuffleSecret = { nonce, order: order.map((card) => card.id) };
    room.gameState = createAcademyState({ playerCount: room.maxPlayers, deckOrder: order, mode: "online" });
    room.status = "playing";
    room.startedAt = Date.now();
    audit(room, { type: "game_started", seats: safePlayers(room).map((player) => ({ wallet: player.wallet, seat: player.seat })), shuffleCommitment: room.shuffleCommitment });
  }
  function createRoom(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload); if (!wallet) return;
    const maxPlayers = Number(payload.playerCount) === 4 ? 4 : 3;
    const roomCode = code(); const now = Date.now(); const seats = ["north", "west", "south", "east"].slice(0, maxPlayers);
    const room = { id: randomUUID(), gameId: GAME_ID, rulesetVersion: AURORA_GANJIFA_RULESET.rulesetVersion, roomCode, roomMode: "open_ice", visibility: payload.visibility === "private" ? "private" : "public", status: "waiting", matchId: `ag-${randomUUID()}`, createdAt: now, updatedAt: now, maxPlayers, seatOrder: seats, players: { [wallet]: { wallet, seat: seats[0], seatIndex: 0, joinedAt: now, entryLocked: true } }, gameState: null, auditLog: [] };
    audit(room, { type: "room_created", wallet, maxPlayers, visibility: room.visibility }); rooms.set(roomCode, room); saveRoomSafe(room);
    ok(ws, requestId, "ag_room_create_result", { room: roomView(room, wallet) }); broadcast(room);
  }
  function listRooms(ws, requestId) { const result = [...rooms.values()].filter(isRoom).filter((room) => room.visibility === "public" && room.status === "waiting" && players(room).length < room.maxPlayers).sort((a,b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)).map((room) => roomView(room)); ok(ws, requestId, "ag_room_list_result", { rooms: result }); }
  function joinRoom(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload); if (!wallet) return;
    const room = findRoom(ws, requestId, payload); if (!room) return;
    if (room.players[wallet]) return ok(ws, requestId, "ag_room_join_result", { room: roomView(room, wallet) });
    if (room.status !== "waiting") return fail(ws, requestId, "This academy table has already started.");
    const index = players(room).length; if (index >= room.maxPlayers) return fail(ws, requestId, "The academy table is full.");
    room.players[wallet] = { wallet, seat: room.seatOrder[index], seatIndex: index, joinedAt: Date.now(), entryLocked: true };
    audit(room, { type: "player_joined", wallet, seat: room.seatOrder[index] });
    if (players(room).length === room.maxPlayers) startRoom(room);
    ok(ws, requestId, "ag_room_join_result", { room: roomView(room, wallet) }); broadcast(room);
  }
  function getState(ws, requestId, payload = {}) { const wallet = requireProfile(ws, requestId, payload); if (!wallet) return; const room = findRoom(ws, requestId, payload); if (!room) return; if (!room.players[wallet]) return fail(ws, requestId, "Join the room first."); ok(ws, requestId, "ag_game_state_result", { room: roomView(room, wallet) }); }
  function legalActions(ws, requestId, payload = {}) { const wallet = requireProfile(ws, requestId, payload); if (!wallet) return; const room = findRoom(ws, requestId, payload); if (!room) return; const player = room.players[wallet]; if (!player) return fail(ws, requestId, "Join the room first."); const actions = room.status === "playing" && room.gameState.currentPlayer === player.seat ? getLegalActions(room.gameState, player.seat) : []; ok(ws, requestId, "ag_legal_actions_result", { actions, room: roomView(room, wallet) }); }
  function action(ws, requestId, payload = {}) {
    const wallet = requireProfile(ws, requestId, payload); if (!wallet) return;
    const room = findRoom(ws, requestId, payload); if (!room) return;
    const player = room.players[wallet]; if (!player) return fail(ws, requestId, "Join the room first.");
    if (room.status !== "playing") return fail(ws, requestId, room.status === "finished" ? "This academy deal has ended." : "Waiting for every seat to join.");
    if (room.gameState.currentPlayer !== player.seat) return fail(ws, requestId, "It is not your turn.");
    const result = applyAction(room.gameState, payload.action, player.seat); if (result.error) return fail(ws, requestId, result.error);
    room.gameState = result.state;
    audit(room, { type: "card_played", wallet, seat: player.seat, cardId: payload.action.cardId, trickNumber: room.gameState.lastAction?.trickNumber, trickWinner: room.gameState.lastAction?.trickWinner || null });
    if (room.gameState.phase === "finished") finalize(room);
    ok(ws, requestId, "ag_game_action_result", { room: roomView(room, wallet) }); broadcast(room);
  }
  async function history(ws, requestId, payload = {}) { const wallet = requireProfile(ws, requestId, payload); if (!wallet) return; try { ok(ws, requestId, "ag_history_result", { history: await getHistoryForWallet(wallet, GAME_ID) }); } catch (err) { fail(ws, requestId, err.message || "Could not load Aurora Ganjifa history."); } }
  function myRooms(ws, requestId, payload = {}) { const wallet = requireProfile(ws, requestId, payload); if (!wallet) return; const result = [...rooms.values()].filter(isRoom).filter((room) => room.players?.[wallet]).sort((a,b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0)).map((room) => roomView(room, wallet)); ok(ws, requestId, "ag_my_rooms_result", { rooms: result }); }
  function finalize(room) {
    if (room.finalizedAt) return;
    room.status = "finished"; room.finalizedAt = Date.now(); room.shuffleReveal = room.shuffleSecret; delete room.shuffleSecret;
    const winners = room.gameState.winners || [];
    const winnerPlayers = players(room).filter((player) => winners.includes(player.seat));
    room.result = { winner: room.gameState.winner, winnerWallet: winnerPlayers.length === 1 ? winnerPlayers[0].wallet : null, winnerWallets: winnerPlayers.map((player) => player.wallet), draw: room.gameState.isDraw, reason: room.gameState.winReason, capturedCards: room.gameState.capturedCards, tricksWon: room.gameState.tricksWon };
    room.proofHash = sha256(JSON.stringify({ gameId: room.gameId, rulesetVersion: room.rulesetVersion, roomCode: room.roomCode, matchId: room.matchId, publicState: playerProjection(room.gameState, null), shuffleCommitment: room.shuffleCommitment, shuffleReveal: room.shuffleReveal, auditLog: room.auditLog }));
    audit(room, { type: "game_finished", result: room.result, proofHash: room.proofHash, shuffleReveal: room.shuffleReveal }); recordHistory(room);
  }
  function recordHistory(room) {
    if (room.historyEntryIds?.length) return; room.historyEntryIds = [];
    const ps = players(room); const best = Math.max(...Object.values(room.gameState.capturedCards));
    const summaries = ps.map((player) => ({ wallet: player.wallet, name: profileFor(player.wallet)?.name || "Player", role: player.seat, capturedCards: room.gameState.capturedCards[player.seat], tricksWon: room.gameState.tricksWon[player.seat], won: room.gameState.capturedCards[player.seat] === best }));
    ps.forEach((player) => { const won = room.gameState.capturedCards[player.seat] === best; const entry = { id: `${room.matchId}-${player.wallet}`, gameId: GAME_ID, rulesetVersion: room.rulesetVersion, roomCode: room.roomCode, matchId: room.matchId, roomMode: "open_ice", wallet: player.wallet, playerName: profileFor(player.wallet)?.name || "Player", team: player.seat, position: won ? 1 : 2, won, draw: room.gameState.isDraw, points: won ? 20 : 5, startedAt: room.startedAt, finishedAt: room.finalizedAt, proofHash: room.proofHash, result: room.result, players: summaries }; room.historyEntryIds.push(entry.id); saveHistoryEntry(entry); });
  }
  function restoreRoom(room) { if (!isRoom(room)) return false; room.rulesetVersion = room.rulesetVersion || AURORA_GANJIFA_RULESET.rulesetVersion; room.auditLog = room.auditLog || []; if (room.gameState) assertStateInvariant(room.gameState); return true; }
  return { createRoom, listRooms, joinRoom, getState, legalActions, action, history, myRooms, restoreRoom, roomView };
}

module.exports = { createAuroraGanjifaService };
