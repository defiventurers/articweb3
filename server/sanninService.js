const { randomUUID, randomInt, createHash, timingSafeEqual } = require("node:crypto");
const {
  RULESET_VERSION,
  FACTIONS,
  HEX_CELLS,
  createInitialState,
  applyAction,
  chooseSanninBotAction,
} = require("./sanninEngine.cjs");

const GAME_ID = "sannin-shogi";
const GRACE_MS = 120000;
const WAIT_TTL = 30 * 60000;
const BOT_LEVELS = Object.freeze(["easy", "medium"]);
const ALLIANCES = Object.freeze({
  none: null,
  "green-blue": Object.freeze(["green", "blue"]),
});

const hash = (value) => createHash("sha256").update(value).digest("hex");
const safeToken = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const equalToken = (token, digest) =>
  safeToken(token) &&
  typeof digest === "string" &&
  digest.length === 64 &&
  timingSafeEqual(Buffer.from(hash(token), "hex"), Buffer.from(digest, "hex"));
const codeOf = (value) => String(value || "").trim().toUpperCase();
const cleanName = (value) =>
  typeof value === "string"
    ? value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 24)
    : "";

function normalizedAlliance(value) {
  return Object.hasOwn(ALLIANCES, value) ? ALLIANCES[value] : undefined;
}

function createSanninService({
  rooms,
  send,
  ok,
  fail,
  saveRoomSafe,
  chooseBot,
  now = Date.now,
  botDelay = 450,
}) {
  const connections = new Map();
  const timers = new Map();
  const searching = new Set();
  const rate = new Map();
  const writes = new Map();
  const cellIds = new Set(HEX_CELLS.map((cell) => cell.id));
  const choose = chooseBot || (async (state, difficulty) => chooseSanninBotAction(state, difficulty));
  let closed = false;

  const isRoom = (room) => room?.gameId === GAME_ID;
  const humans = (room) => Object.values(room.players || {});
  const connected = (room, player) =>
    connections.get(`${room.roomCode}:${player.id}`)?.readyState === 1;

  function activeBot(room, faction) {
    const seat = room.seats[faction];
    if (!seat) return false;
    if (seat.kind === "bot") return true;
    const player = room.players[seat.playerId];
    return Boolean(
      player &&
      !connected(room, player) &&
      player.disconnectedAt != null &&
      now() - player.disconnectedAt >= GRACE_MS
    );
  }

  function roomView(room) {
    return {
      gameId: GAME_ID,
      rulesetVersion: RULESET_VERSION,
      roomCode: room.roomCode,
      status: room.status,
      visibility: room.visibility,
      hostId: room.hostId,
      revision: room.revision,
      humanCount: room.humanCount,
      difficulty: room.difficulty,
      allianceChoice: room.allianceChoice,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      gameState: room.gameState,
      seats: Object.fromEntries(
        FACTIONS.map((faction) => [
          faction,
          {
            ...room.seats[faction],
            botActive: activeBot(room, faction),
          },
        ]),
      ),
      players: humans(room).map((player) => ({
        id: player.id,
        name: player.name,
        faction: player.faction,
        ready: player.ready,
        connected: connected(room, player),
        disconnectedAt: player.disconnectedAt,
      })),
    };
  }

  function persist(room) {
    room.updatedAt = now();
    const snapshot = JSON.parse(JSON.stringify(room));
    const pending = (writes.get(room.roomCode) || Promise.resolve())
      .then(() => saveRoomSafe(snapshot))
      .catch((error) => console.error("[sannin-save]", error.message));

    writes.set(room.roomCode, pending);
    void pending.finally(() => {
      if (writes.get(room.roomCode) === pending) writes.delete(room.roomCode);
    });
  }

  function publish(room) {
    clearTimeout(timers.get(room.roomCode));
    timers.delete(room.roomCode);
    persist(room);

    for (const player of humans(room)) {
      const ws = connections.get(`${room.roomCode}:${player.id}`);
      if (ws?.readyState === 1) {
        send(ws, {
          type: "ss_room_state",
          payload: { room: roomView(room) },
        });
      }
    }
  }

  function bind(ws, room, player) {
    const key = `${room.roomCode}:${player.id}`;
    connections.set(key, ws);
    player.disconnectedAt = null;

    if (!ws.sanninBindings) {
      ws.sanninBindings = new Set();
      ws.on?.("close", () => {
        for (const binding of ws.sanninBindings) {
          if (connections.get(binding) !== ws) continue;
          connections.delete(binding);

          const separator = binding.indexOf(":");
          const code = binding.slice(0, separator);
          const id = binding.slice(separator + 1);
          const current = rooms.get(code);
          const member = current?.players?.[id];

          if (!isRoom(current) || !member) continue;
          member.disconnectedAt = now();
          publish(current);
          schedule(current);
        }
      });
    }

    ws.sanninBindings.add(key);
  }

  function find(payload) {
    const room = rooms.get(codeOf(payload.roomCode));
    if (!isRoom(room)) throw new Error("Sannin Shogi room not found. Check the code.");
    return room;
  }

  function member(ws, payload) {
    const room = find(payload);
    const player = room.players[payload.playerId];

    if (!player || !equalToken(payload.token, player.tokenHash)) {
      throw new Error(
        "This seat belongs to another player. Rejoin from the browser that joined the room.",
      );
    }

    if (!connected(room, player) || connections.get(`${room.roomCode}:${player.id}`) !== ws) {
      bind(ws, room, player);
      publish(room);
    }

    return { room, player };
  }

  function finish(room) {
    if (room.gameState.outcome || room.gameState.phase === "complete") {
      room.status = "finished";
    }
  }

  function schedule(room, delay = botDelay) {
    if (
      closed ||
      room.status !== "playing" ||
      timers.has(room.roomCode) ||
      searching.has(room.roomCode)
    ) {
      return;
    }

    // Do not spend server compute on abandoned all-bot rooms.
    if (!humans(room).some((player) => connected(room, player))) return;

    const faction = room.gameState.turn;
    if (!room.gameState.activeFactions.includes(faction)) return;

    if (!activeBot(room, faction)) {
      const player = room.players[room.seats[faction]?.playerId];
      if (player && !connected(room, player) && player.disconnectedAt != null) {
        const remaining = Math.max(1, GRACE_MS - (now() - player.disconnectedAt));
        const timer = setTimeout(() => {
          timers.delete(room.roomCode);
          publish(room);
          schedule(room);
        }, remaining);
        timer.unref?.();
        timers.set(room.roomCode, timer);
      }
      return;
    }

    const timer = setTimeout(async () => {
      timers.delete(room.roomCode);
      if (
        closed ||
        room.status !== "playing" ||
        room.gameState.turn !== faction ||
        !activeBot(room, faction)
      ) {
        return;
      }

      searching.add(room.roomCode);
      const revision = room.revision;

      try {
        const action = await choose(room.gameState, room.difficulty);
        if (
          room.revision !== revision ||
          room.status !== "playing" ||
          room.gameState.turn !== faction ||
          !activeBot(room, faction)
        ) {
          return;
        }

        if (!action) {
          // The pure rules engine resolves no-move draws as part of the previous
          // action. Reaching this state means the stored room is inconsistent.
          throw new Error("No legal bot action in a live Sannin position.");
        }

        const applied = applyAction(room.gameState, action);
        if (applied.error) throw new Error("Bot returned an illegal action.");

        room.gameState = applied.state;
        room.revision += 1;
        finish(room);
        publish(room);
      } catch (error) {
        console.error("[sannin-bot]", error.message);
        for (const player of humans(room)) {
          const ws = connections.get(`${room.roomCode}:${player.id}`);
          if (ws?.readyState === 1) {
            send(ws, {
              type: "ss_notice",
              payload: {
                roomCode: room.roomCode,
                message: "The command bot is retrying its turn.",
              },
            });
          }
        }
      } finally {
        searching.delete(room.roomCode);
        schedule(room, 1400);
      }
    }, delay);

    timer.unref?.();
    timers.set(room.roomCode, timer);
  }

  function newCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code;
    do {
      code = Array.from({ length: 6 }, () => chars[randomInt(chars.length)]).join("");
    } while (rooms.has(code));
    return code;
  }

  function addPlayer(ws, room, payload, faction) {
    const id = randomUUID();
    const player = {
      id,
      wallet: `sannin:${id}`,
      name: cleanName(payload.name),
      faction,
      seat: faction,
      team: faction,
      tokenHash: hash(payload.token),
      joinedAt: now(),
      ready: false,
      disconnectedAt: null,
    };

    room.players[id] = player;
    room.seats[faction] = { kind: "human", playerId: id };
    bind(ws, room, player);
    return player;
  }

  function credentials(room, player) {
    return { room: roomView(room), playerId: player.id };
  }

  function checkAdmission(ws, payload) {
    if (!cleanName(payload.name)) throw new Error("Enter a display name.");
    if (!safeToken(payload.token)) {
      throw new Error("Invalid seat credentials. Reload and try again.");
    }

    const ip = ws?._socket?.remoteAddress || "unknown";
    const key = `${ip}:sannin-admission`;
    const recent = (rate.get(key) || []).filter((stamp) => now() - stamp < 60000);
    if (recent.length >= 12) throw new Error("Too many room attempts. Try again in a minute.");

    recent.push(now());
    rate.set(key, recent);

    if (rate.size > 5000) {
      for (const [entryKey, entries] of rate) {
        if (entries.at(-1) < now() - 60000) rate.delete(entryKey);
      }
    }
  }

  function validActionShape(action) {
    if (!action || typeof action !== "object" || typeof action.pieceId !== "string") return false;
    if (!["move", "castle", "drop", "illuminate"].includes(action.type)) return false;
    if (JSON.stringify(action).length > 4096) return false;

    if (action.type === "move" || action.type === "castle") {
      return typeof action.from === "string" &&
        typeof action.to === "string" &&
        cellIds.has(action.from) &&
        cellIds.has(action.to) &&
        (action.promote == null || typeof action.promote === "boolean");
    }

    if (action.type === "drop") {
      return typeof action.to === "string" && cellIds.has(action.to);
    }

    return Array.isArray(action.targets) &&
      action.targets.length <= 12 &&
      action.targets.every((id) => typeof id === "string");
  }

  const handlers = {
    ss_room_list() {
      return {
        rooms: [...rooms.values()]
          .filter(isRoom)
          .filter(
            (room) =>
              room.status === "waiting" &&
              room.visibility === "public" &&
              now() - room.updatedAt < WAIT_TTL &&
              Object.values(room.seats).some((seat) => seat.kind === "open"),
          )
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 50)
          .map((room) => ({
            roomCode: room.roomCode,
            host: room.players[room.hostId]?.name || "Player",
            playerCount: humans(room).length,
            humanCount: room.humanCount,
            difficulty: room.difficulty,
            allianceChoice: room.allianceChoice,
          })),
      };
    },

    ss_room_create(ws, payload) {
      checkAdmission(ws, payload);

      const existing = [...rooms.values()].find(
        (room) =>
          isRoom(room) &&
          room.status !== "cancelled" &&
          humans(room).some((player) => equalToken(payload.token, player.tokenHash)),
      );

      if (existing) {
        const player = humans(existing).find((entry) =>
          equalToken(payload.token, entry.tokenHash)
        );
        bind(ws, existing, player);
        return credentials(existing, player);
      }

      const count = Number(payload.humanCount);
      const alliance = normalizedAlliance(payload.allianceChoice);
      if (
        ![1, 2, 3].includes(count) ||
        !FACTIONS.includes(payload.faction) ||
        !BOT_LEVELS.includes(payload.difficulty) ||
        alliance === undefined
      ) {
        throw new Error("Choose 1–3 players, an army, bot difficulty and opening pact.");
      }

      if (
        [...rooms.values()].filter(
          (room) => isRoom(room) && ["waiting", "playing"].includes(room.status),
        ).length >= 500
      ) {
        throw new Error("The Sannin lobby is full. Please try again later.");
      }

      const order = [
        payload.faction,
        ...FACTIONS.filter((candidate) => candidate !== payload.faction),
      ];

      const room = {
        id: randomUUID(),
        matchId: `ss-${randomUUID()}`,
        gameId: GAME_ID,
        rulesetVersion: RULESET_VERSION,
        roomCode: newCode(),
        roomMode: "sannin_free",
        visibility: payload.visibility === "public" ? "public" : "private",
        status: "waiting",
        humanCount: count,
        difficulty: payload.difficulty,
        allianceChoice: payload.allianceChoice,
        seats: Object.fromEntries(
          order.map((candidate, index) => [
            candidate,
            { kind: index < count ? "open" : "bot" },
          ]),
        ),
        players: {},
        createdAt: now(),
        updatedAt: now(),
        revision: 0,
        gameState: createInitialState({ alliance }),
      };

      const player = addPlayer(ws, room, payload, payload.faction);
      room.hostId = player.id;
      rooms.set(room.roomCode, room);
      publish(room);
      return credentials(room, player);
    },

    ss_room_join(ws, payload) {
      checkAdmission(ws, payload);
      const room = find(payload);

      const previous = humans(room).find((player) =>
        equalToken(payload.token, player.tokenHash)
      );
      if (previous) {
        bind(ws, room, previous);
        publish(room);
        schedule(room);
        return credentials(room, previous);
      }

      if (room.status !== "waiting" || now() - room.updatedAt >= WAIT_TTL) {
        throw new Error("This room is no longer open.");
      }

      const faction = FACTIONS.find((candidate) => room.seats[candidate].kind === "open");
      if (!faction) throw new Error("This room is full.");

      const player = addPlayer(ws, room, payload, faction);
      room.revision += 1;
      publish(room);
      return credentials(room, player);
    },

    ss_game_state(ws, payload) {
      const { room } = member(ws, payload);
      schedule(room);
      return { room: roomView(room) };
    },

    ss_room_ready(ws, payload) {
      const { room, player } = member(ws, payload);
      if (room.status !== "waiting") throw new Error("The match has already started.");
      player.ready = payload.ready === true;
      room.revision += 1;
      publish(room);
      return { room: roomView(room) };
    },

    ss_room_start(ws, payload) {
      const { room, player } = member(ws, payload);
      if (room.hostId !== player.id) throw new Error("Only the host can start the match.");
      if (room.status !== "waiting") throw new Error("The match has already started.");
      if (humans(room).some((entry) => !entry.ready || !connected(room, entry))) {
        throw new Error("Every player must be connected and ready.");
      }

      if (
        Object.values(room.seats).some((seat) => seat.kind === "open") &&
        payload.fillWithBots !== true
      ) {
        throw new Error("Wait for the remaining players or fill empty seats with bots.");
      }

      for (const faction of FACTIONS) {
        if (room.seats[faction].kind === "open") room.seats[faction] = { kind: "bot" };
      }

      room.humanCount = humans(room).length;
      room.status = "playing";
      room.startedAt = now();
      room.revision += 1;
      publish(room);
      schedule(room);
      return { room: roomView(room) };
    },

    ss_game_action(ws, payload) {
      const { room, player } = member(ws, payload);

      if (room.status !== "playing") throw new Error("This match is not in progress.");
      if (payload.revision !== room.revision) {
        throw new Error("The board changed. Refreshing the latest position; try again.");
      }
      if (
        room.seats[player.faction]?.playerId !== player.id ||
        !room.gameState.activeFactions.includes(player.faction)
      ) {
        throw new Error("You no longer control an active army.");
      }
      if (room.gameState.turn !== player.faction) throw new Error("It is not your turn.");
      if (!validActionShape(payload.action)) throw new Error("Invalid Sannin action.");

      const applied = applyAction(room.gameState, payload.action);
      if (applied.error) throw new Error(applied.error.message || "That action is not legal.");

      room.gameState = applied.state;
      room.revision += 1;
      finish(room);
      publish(room);
      schedule(room);
      return { room: roomView(room) };
    },

    ss_room_leave(ws, payload) {
      const { room, player } = member(ws, payload);
      const key = `${room.roomCode}:${player.id}`;
      connections.delete(key);
      ws.sanninBindings?.delete(key);

      if (room.status === "waiting") {
        delete room.players[player.id];
        room.seats[player.faction] = { kind: "open" };

        if (!humans(room).length) {
          room.status = "cancelled";
        } else if (room.hostId === player.id) {
          room.hostId = humans(room)[0].id;
        }
      } else if (room.status === "playing") {
        room.seats[player.faction] = { kind: "bot" };
        delete room.players[player.id];
        if (room.hostId === player.id) room.hostId = humans(room)[0]?.id || null;
      } else {
        delete room.players[player.id];
      }

      room.revision += 1;
      publish(room);
      schedule(room);
      return { left: true };
    },
  };

  function dispatch(ws, requestId, type, payload) {
    try {
      if (!Object.hasOwn(handlers, type)) throw new Error("Unknown Sannin Shogi action.");
      const result = handlers[type](ws, payload || {});
      ok(ws, requestId, `${type}_result`, result);
    } catch (error) {
      fail(ws, requestId, error.message || "Could not complete this action.");
    }
  }

  function restoreRoom(room) {
    if (!isRoom(room)) return false;

    if (room.rulesetVersion !== RULESET_VERSION) {
      room.status = "cancelled";
      return true;
    }

    for (const player of humans(room)) player.disconnectedAt = now();
    return true;
  }

  const cleanup = setInterval(() => {
    for (const room of rooms.values()) {
      if (
        isRoom(room) &&
        room.status === "waiting" &&
        now() - room.updatedAt > WAIT_TTL &&
        !humans(room).some((player) => connected(room, player))
      ) {
        room.status = "cancelled";
        persist(room);
      }
    }
  }, 60000);
  cleanup.unref?.();

  return {
    dispatch,
    restoreRoom,
    roomView,
    close() {
      closed = true;
      clearInterval(cleanup);
      for (const timer of timers.values()) clearTimeout(timer);
      connections.clear();
    },
  };
}

module.exports = {
  createSanninService,
  GAME_ID,
  RULESET: RULESET_VERSION,
};
