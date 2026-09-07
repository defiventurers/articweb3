const { randomUUID, randomInt, createHash, timingSafeEqual } = require("node:crypto");
const { initialSanguoState, applySanguoAction, resignSanguoFaction, sanguoFactions, BOT_LEVELS } = require("./sanguoEngine.cjs");
const { createSanguoBotPool } = require("./sanguoBotPool.js");
const GAME_ID = "sanguo-qi";
const RULESET = "arctic-sanguo-1";
const GRACE_MS = 120000;
const WAIT_TTL = 30 * 60000;
const hash = value => createHash("sha256").update(value).digest("hex");
const safeToken = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const equalToken = (token, digest) => safeToken(token) && typeof digest === "string" && digest.length === 64 && timingSafeEqual(Buffer.from(hash(token), "hex"), Buffer.from(digest, "hex"));
const codeOf = value => String(value || "").trim().toUpperCase();
const cleanName = value => typeof value === "string" ? value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 24) : "";

function createSanguoService({ rooms, send, ok, fail, saveRoomSafe, chooseBot, now = Date.now, botDelay = 500 }) {
  const connections = new Map(), timers = new Map(), searching = new Set(), rate = new Map(), writes = new Map();
  const pool = chooseBot ? null : createSanguoBotPool();
  const choose = chooseBot || ((state, difficulty) => pool.choose(state, difficulty));
  let closed = false;
  const isRoom = room => room?.gameId === GAME_ID;
  const humans = room => Object.values(room.players);
  const connected = (room, player) => connections.get(`${room.roomCode}:${player.id}`)?.readyState === 1;
  function activeBot(room, faction) {
    const seat = room.seats[faction];
    if (seat.kind === "bot") return true;
    const player = room.players[seat.playerId];
    return player && !connected(room, player) && player.disconnectedAt != null && now() - player.disconnectedAt >= GRACE_MS;
  }
  function roomView(room) {
    return {
      gameId: GAME_ID, rulesetVersion: RULESET, roomCode: room.roomCode, status: room.status,
      visibility: room.visibility, hostId: room.hostId, revision: room.revision, humanCount: room.humanCount,
      difficulty: room.difficulty, bannermen: room.bannermen, createdAt: room.createdAt, updatedAt: room.updatedAt,
      gameState: room.gameState,
      seats: Object.fromEntries(sanguoFactions.map(f => [f, { ...room.seats[f], botActive: activeBot(room, f) }])),
      players: humans(room).map(p => ({ id: p.id, name: p.name, faction: p.faction, ready: p.ready, connected: connected(room, p), disconnectedAt: p.disconnectedAt, resigned: Boolean(p.resigned) })),
    };
  }
  function persist(room) {
    room.updatedAt = now();
    const snapshot = JSON.parse(JSON.stringify(room));
    // Serialize writes per room so a slower old write cannot replace a new move.
    const pending = (writes.get(room.roomCode) || Promise.resolve()).then(() => saveRoomSafe(snapshot)).catch(error => console.error("[sanguo-save]", error.message));
    writes.set(room.roomCode, pending);
    void pending.finally(() => { if (writes.get(room.roomCode) === pending) writes.delete(room.roomCode); });
  }
  function publish(room) {
    clearTimeout(timers.get(room.roomCode)); timers.delete(room.roomCode);
    persist(room);
    for (const player of humans(room)) {
      const ws = connections.get(`${room.roomCode}:${player.id}`);
      if (ws?.readyState === 1) send(ws, { type: "sg_room_state", payload: { room: roomView(room) } });
    }
  }
  function bind(ws, room, player) {
    const key = `${room.roomCode}:${player.id}`;
    connections.set(key, ws); player.disconnectedAt = null;
    if (!ws.sanguoBindings) {
      ws.sanguoBindings = new Set();
      ws.on?.("close", () => {
        for (const binding of ws.sanguoBindings) {
          if (connections.get(binding) !== ws) continue;
          connections.delete(binding);
          const [code, id] = binding.split(":"); const current = rooms.get(code), member = current?.players?.[id];
          if (!isRoom(current) || !member) continue;
          member.disconnectedAt = now(); publish(current); schedule(current);
        }
      });
    }
    ws.sanguoBindings.add(key);
  }
  function find(payload) {
    const room = rooms.get(codeOf(payload.roomCode));
    if (!isRoom(room)) throw new Error("Sanguo Qi room not found. Check the code.");
    return room;
  }
  function member(ws, payload) {
    const room = find(payload), player = room.players[payload.playerId];
    if (!player || !equalToken(payload.token, player.tokenHash)) throw new Error("This seat belongs to another player. Rejoin from the browser that joined the room.");
    if (!connected(room, player) || connections.get(`${room.roomCode}:${player.id}`) !== ws) { bind(ws, room, player); publish(room); }
    return { room, player };
  }
  function finish(room) { if (room.gameState.winner || room.gameState.draw) room.status = "finished"; }
  function schedule(room, delay = botDelay) {
    if (closed || room.status !== "playing" || timers.has(room.roomCode) || searching.has(room.roomCode)) return;
    // Keep abandoned rooms idle; a returning player resumes the scheduler.
    if (!humans(room).some(p => connected(room, p))) return;
    const faction = room.gameState.pending?.victor || room.gameState.turn;
    if (!activeBot(room, faction)) {
      const player = room.players[room.seats[faction].playerId];
      if (player && !connected(room, player) && player.disconnectedAt != null) {
        const timer = setTimeout(() => { timers.delete(room.roomCode); publish(room); schedule(room); }, Math.max(1, GRACE_MS - (now() - player.disconnectedAt)));
        timer.unref?.(); timers.set(room.roomCode, timer);
      }
      return;
    }
    const timer = setTimeout(async () => {
      timers.delete(room.roomCode);
      if (closed || room.status !== "playing" || !activeBot(room, faction)) return;
      searching.add(room.roomCode);
      const revision = room.revision;
      try {
        const result = await choose(room.gameState, room.difficulty);
        if (room.revision !== revision || room.status !== "playing" || !activeBot(room, faction)) return;
        if (!result.action) throw new Error("No bot move available.");
        const next = applySanguoAction(room.gameState, result.action);
        if (!next) throw new Error("Bot returned an illegal move.");
        room.gameState = next; room.revision++; finish(room); publish(room);
      } catch (error) {
        console.error("[sanguo-bot]", error.message);
        for (const player of humans(room)) { const ws = connections.get(`${room.roomCode}:${player.id}`); if (ws?.readyState === 1) send(ws, { type: "sg_notice", payload: { roomCode: room.roomCode, message: "The bot is retrying its move." } }); }
      } finally { searching.delete(room.roomCode); schedule(room, 1500); }
    }, delay);
    timer.unref?.(); timers.set(room.roomCode, timer);
  }
  function newCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code;
    do { code = Array.from({ length: 6 }, () => chars[randomInt(chars.length)]).join(""); } while (rooms.has(code));
    return code;
  }
  function addPlayer(ws, room, payload, faction) {
    const id = randomUUID();
    const player = { id, wallet: `sanguo:${id}`, name: cleanName(payload.name), faction, seat: faction, team: faction, tokenHash: hash(payload.token), joinedAt: now(), ready: false, disconnectedAt: null };
    room.players[id] = player; room.seats[faction] = { kind: "human", playerId: id }; bind(ws, room, player);
    return player;
  }
  function credentials(room, player) { return { room: roomView(room), playerId: player.id }; }
  function checkAdmission(ws, payload) {
    if (!cleanName(payload.name)) throw new Error("Enter a display name.");
    if (!safeToken(payload.token)) throw new Error("Invalid seat credentials. Reload and try again.");
    const ip = ws?._socket?.remoteAddress || "unknown";
    const key = ip + ":admission", recent = (rate.get(key) || []).filter(t => now() - t < 60000);
    if (recent.length >= 12) throw new Error("Too many room attempts. Try again in a minute.");
    recent.push(now()); rate.set(key, recent);
    if (rate.size > 5000) for (const [k, entries] of rate) if (entries.at(-1) < now() - 60000) rate.delete(k);
  }
  const handlers = {
    sg_room_list() {
      return { rooms: [...rooms.values()].filter(isRoom).filter(r => r.status === "waiting" && r.visibility === "public" && now() - r.updatedAt < WAIT_TTL && Object.values(r.seats).some(s => s.kind === "open"))
        .sort((a, b) => b.createdAt - a.createdAt).slice(0, 50).map(r => ({ roomCode: r.roomCode, host: r.players[r.hostId]?.name || "Player", playerCount: humans(r).length, humanCount: r.humanCount, difficulty: r.difficulty, bannermen: r.bannermen })) };
    },
    sg_room_create(ws, payload) {
      checkAdmission(ws, payload);
      const existing = [...rooms.values()].find(r => isRoom(r) && r.status !== "cancelled" && humans(r).some(p => equalToken(payload.token, p.tokenHash)));
      if (existing) { const player = humans(existing).find(p => equalToken(payload.token, p.tokenHash)); bind(ws, existing, player); return credentials(existing, player); }
      const count = Number(payload.humanCount);
      if (![1, 2, 3].includes(count) || !sanguoFactions.includes(payload.faction) || !Object.hasOwn(BOT_LEVELS, payload.difficulty)) throw new Error("Choose 1–3 players, a kingdom and a difficulty.");
      if ([...rooms.values()].filter(r => isRoom(r) && ["waiting", "playing"].includes(r.status)).length >= 500) throw new Error("The lobby is full. Please try again later.");
      const order = [payload.faction, ...sanguoFactions.filter(f => f !== payload.faction)];
      const room = { id: randomUUID(), matchId: `sg-${randomUUID()}`, gameId: GAME_ID, rulesetVersion: RULESET, roomCode: newCode(), roomMode: "sanguo_free", visibility: payload.visibility === "private" ? "private" : "public", status: "waiting", humanCount: count, difficulty: payload.difficulty, bannermen: payload.bannermen === true, seats: Object.fromEntries(order.map((f, i) => [f, { kind: i < count ? "open" : "bot" }])), players: {}, createdAt: now(), updatedAt: now(), revision: 0, gameState: initialSanguoState(payload.bannermen === true) };
      const player = addPlayer(ws, room, payload, payload.faction); room.hostId = player.id;
      rooms.set(room.roomCode, room); publish(room); return credentials(room, player);
    },
    sg_room_join(ws, payload) {
      checkAdmission(ws, payload);
      const room = find(payload);
      const previous = humans(room).find(p => equalToken(payload.token, p.tokenHash));
      if (previous) { bind(ws, room, previous); publish(room); schedule(room); return credentials(room, previous); }
      if (room.status !== "waiting" || now() - room.updatedAt >= WAIT_TTL) throw new Error("This room is no longer open.");
      const faction = sanguoFactions.find(f => room.seats[f].kind === "open");
      if (!faction) throw new Error("This room is full.");
      const player = addPlayer(ws, room, payload, faction); room.revision++; publish(room); return credentials(room, player);
    },
    sg_game_state(ws, payload) { const { room } = member(ws, payload); schedule(room); return { room: roomView(room) }; },
    sg_room_ready(ws, payload) {
      const { room, player } = member(ws, payload);
      if (room.status !== "waiting") throw new Error("The match has already started.");
      player.ready = payload.ready === true; room.revision++; publish(room); return { room: roomView(room) };
    },
    sg_room_start(ws, payload) {
      const { room, player } = member(ws, payload);
      if (room.hostId !== player.id) throw new Error("Only the host can start the match.");
      if (room.status !== "waiting") throw new Error("The match has already started.");
      if (humans(room).some(p => !p.ready || !connected(room, p))) throw new Error("Every player must be connected and ready.");
      if (Object.values(room.seats).some(s => s.kind === "open") && payload.fillWithBots !== true) throw new Error("Wait for the remaining players or fill empty seats with bots.");
      for (const f of sanguoFactions) if (room.seats[f].kind === "open") room.seats[f] = { kind: "bot" };
      room.humanCount = humans(room).length; room.status = "playing"; room.startedAt = now(); room.revision++;
      publish(room); schedule(room); return { room: roomView(room) };
    },
    sg_game_action(ws, payload) {
      const { room, player } = member(ws, payload);
      if (room.status !== "playing") throw new Error("This match is not in progress.");
      if (payload.revision !== room.revision) throw new Error("The board changed. Refreshing the latest position; try again.");
      if (room.seats[player.faction].playerId !== player.id || room.gameState.defeated.includes(player.faction)) throw new Error("You no longer control an active kingdom.");
      const action = payload.action;
      if (!action || !["move", "resolve", "resign"].includes(action.type)) throw new Error("Invalid action.");
      const actor = room.gameState.pending?.victor || room.gameState.turn;
      if (action.type !== "resign" && actor !== player.faction) throw new Error("It is not your turn.");
      if (action.type === "move" && (typeof action.pieceId !== "string" || !action.to || !sanguoFactions.includes(action.to.sector) || !Number.isInteger(action.to.rank) || !Number.isInteger(action.to.file) || action.to.rank < 0 || action.to.rank > 4 || action.to.file < 0 || action.to.file > 8)) throw new Error("Invalid move.");
      const next = action.type === "resign" ? resignSanguoFaction(room.gameState, player.faction) : applySanguoAction(room.gameState, action);
      if (!next) throw new Error("That move is not legal.");
      if (action.type === "resign") player.resigned = true;
      room.gameState = next; room.revision++; finish(room); publish(room); schedule(room); return { room: roomView(room) };
    },
    sg_room_leave(ws, payload) {
      const { room, player } = member(ws, payload);
      if (room.status === "playing" && !room.gameState.defeated.includes(player.faction)) throw new Error("Resign before leaving an active match.");
      connections.delete(`${room.roomCode}:${player.id}`); ws.sanguoBindings?.delete(`${room.roomCode}:${player.id}`);
      if (room.status === "waiting") {
        delete room.players[player.id]; room.seats[player.faction] = { kind: "open" };
        if (!humans(room).length) room.status = "cancelled";
        else if (room.hostId === player.id) room.hostId = humans(room)[0].id;
      } else player.disconnectedAt = now();
      room.revision++; publish(room); return { left: true };
    },
  };
  function dispatch(ws, requestId, type, payload) {
    try {
      if (!Object.hasOwn(handlers, type)) throw new Error("Unknown Sanguo Qi action.");
      const result = handlers[type](ws, payload || {});
      ok(ws, requestId, `${type}_result`, result);
    } catch (error) { fail(ws, requestId, error.message || "Could not complete this action."); }
  }
  function restoreRoom(room) {
    if (!isRoom(room)) return false;
    if (room.rulesetVersion !== RULESET) { room.status = "cancelled"; return true; }
    for (const player of humans(room)) player.disconnectedAt = now();
    return true;
  }
  const cleanup = setInterval(() => {
    for (const room of rooms.values()) if (isRoom(room) && room.status === "waiting" && now() - room.updatedAt > WAIT_TTL && !humans(room).some(p => connected(room, p))) { room.status = "cancelled"; persist(room); }
  }, 60000);
  cleanup.unref?.();
  return { dispatch, restoreRoom, roomView, close() { closed = true; clearInterval(cleanup); for (const t of timers.values()) clearTimeout(t); pool?.close(); connections.clear(); } };
}
module.exports = { createSanguoService, GAME_ID, RULESET };
