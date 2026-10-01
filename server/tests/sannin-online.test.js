const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { randomBytes } = require("node:crypto");
const { createSanninService } = require("../sanninService.js");
const {
  getLegalActions,
  chooseSanninBotAction,
  RULESET_VERSION,
} = require("../sanninEngine.cjs");
const { injectSanninShogi } = require("../sanninBackendBootstrap.js");

const token = () => randomBytes(32).toString("hex");

function harness(t, options = {}) {
  const rooms = new Map();
  const saves = [];
  const packets = [];

  const service = createSanninService({
    rooms,
    send(ws, packet) {
      packets.push({ ws, ...packet });
    },
    ok(ws, requestId, type, payload) {
      packets.push({ ws, requestId, type, payload });
    },
    fail(ws, requestId, message) {
      packets.push({ ws, requestId, type: "error", payload: { message } });
    },
    saveRoomSafe(room) {
      saves.push(JSON.parse(JSON.stringify(room)));
    },
    chooseBot: async (state, difficulty) => chooseSanninBotAction(state, difficulty),
    botDelay: 1,
    ...options,
  });

  t.after(() => service.close());

  let serial = 0;
  const socket = () => Object.assign(new EventEmitter(), { readyState: 1 });

  function call(ws, type, payload = {}) {
    const requestId = String(++serial);
    service.dispatch(ws, requestId, type, payload);
    return packets.find((packet) => packet.requestId === requestId);
  }

  function create(count = 3, visibility = "public", faction = "red", allianceChoice = "none") {
    const ws = socket();
    const secret = token();
    const result = call(ws, "ss_room_create", {
      name: "Host",
      humanCount: count,
      faction,
      difficulty: "medium",
      visibility,
      allianceChoice,
      token: secret,
    });
    assert.notEqual(result.type, "error", result.payload.message);
    return {
      ws,
      room: result.payload.room,
      creds: {
        roomCode: result.payload.room.roomCode,
        playerId: result.payload.playerId,
        token: secret,
      },
    };
  }

  function join(roomCode, name = "Friend") {
    const ws = socket();
    const secret = token();
    const result = call(ws, "ss_room_join", {
      roomCode,
      name,
      token: secret,
    });
    assert.notEqual(result.type, "error", result.payload.message);
    return {
      ws,
      room: result.payload.room,
      creds: {
        roomCode,
        playerId: result.payload.playerId,
        token: secret,
      },
    };
  }

  function start(host, others = [], fillWithBots = false) {
    for (const player of [host, ...others]) {
      assert.notEqual(
        call(player.ws, "ss_room_ready", { ...player.creds, ready: true }).type,
        "error",
      );
    }

    const result = call(host.ws, "ss_room_start", {
      ...host.creds,
      fillWithBots,
    });
    assert.notEqual(result.type, "error", result.payload.message);
    return result.payload.room;
  }

  return { service, rooms, saves, packets, socket, call, create, join, start };
}

test("Sannin rooms are private/public correctly and never expose seat secrets", (t) => {
  const h = harness(t);
  const privateRoom = h.create(3, "private");
  const publicRoom = h.create(3, "public");

  const list = h.call(h.socket(), "ss_room_list").payload.rooms;
  assert.deepEqual(list.map((room) => room.roomCode), [publicRoom.room.roomCode]);
  assert.ok(h.join(privateRoom.room.roomCode));

  for (const packet of h.packets) {
    const body = JSON.stringify(packet.payload);
    assert.ok(!body.includes(privateRoom.creds.token));
    assert.ok(!body.includes("tokenHash"));
  }
});

test("Sannin enforces three seats, readiness, host start, ruleset and opening alliance", (t) => {
  const h = harness(t);
  const host = h.create(3, "public", "red", "green-blue");
  const middle = h.join(host.room.roomCode, "Middle");
  const last = h.join(host.room.roomCode, "Last");

  assert.equal(
    h.call(h.socket(), "ss_room_join", {
      roomCode: host.room.roomCode,
      name: "Fourth",
      token: token(),
    }).type,
    "error",
  );

  assert.equal(h.call(middle.ws, "ss_room_start", middle.creds).type, "error");
  assert.equal(h.call(host.ws, "ss_room_start", host.creds).type, "error");

  const room = h.start(host, [middle, last]);
  assert.equal(room.status, "playing");
  assert.equal(room.gameState.rulesetVersion, RULESET_VERSION);
  assert.deepEqual(room.gameState.alliance, ["blue", "green"]);
  assert.equal(room.gameState.turn, "red");
  assert.equal(room.gameState.pieces.length, 54);
});

test("Sannin online rejects forged seats, wrong turns, illegal actions and stale revisions", (t) => {
  const h = harness(t);
  const host = h.create();
  const middle = h.join(host.room.roomCode, "Middle");
  const last = h.join(host.room.roomCode, "Last");
  const room = h.start(host, [middle, last]);
  const action = getLegalActions(room.gameState)[0];

  assert.ok(action);
  assert.equal(
    h.call(middle.ws, "ss_game_action", {
      ...middle.creds,
      revision: room.revision,
      action,
    }).type,
    "error",
  );

  assert.equal(
    h.call(host.ws, "ss_game_action", {
      ...host.creds,
      token: token(),
      revision: room.revision,
      action,
    }).type,
    "error",
  );

  assert.equal(
    h.call(host.ws, "ss_game_action", {
      ...host.creds,
      revision: room.revision,
      action: { type: "move", pieceId: "red-king-1", from: "0,0", to: "99,99" },
    }).type,
    "error",
  );

  const moved = h.call(host.ws, "ss_game_action", {
    ...host.creds,
    revision: room.revision,
    action,
  });
  assert.notEqual(moved.type, "error");
  assert.notEqual(moved.payload.room.revision, room.revision);

  assert.equal(
    h.call(host.ws, "ss_game_action", {
      ...host.creds,
      revision: room.revision,
      action,
    }).type,
    "error",
  );
});

test("Sannin solo rooms run two bots and two-human rooms retain one bot", async (t) => {
  const h = harness(t);
  const host = h.create(1);
  const room = h.start(host);
  const first = getLegalActions(room.gameState)[0];

  const moved = h.call(host.ws, "ss_game_action", {
    ...host.creds,
    revision: room.revision,
    action: first,
  });
  assert.notEqual(moved.type, "error");

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Sannin bots did not return the turn.")), 6000);
    const poll = () => {
      const state = h.rooms.get(room.roomCode).gameState;
      if (state.ply >= 3 && state.turn === "red") {
        clearTimeout(timeout);
        resolve();
      } else {
        setTimeout(poll, 20);
      }
    };
    poll();
  });

  const pair = h.create(2);
  const friend = h.join(pair.room.roomCode, "Friend");
  const pairRoom = h.start(pair, [friend]);
  assert.equal(
    Object.values(pairRoom.seats).filter((seat) => seat.kind === "bot").length,
    1,
  );
});

test("leaving a live Sannin room hands that army to a bot", (t) => {
  const h = harness(t);
  const host = h.create();
  const middle = h.join(host.room.roomCode, "Middle");
  const last = h.join(host.room.roomCode, "Last");
  const room = h.start(host, [middle, last]);

  const left = h.call(middle.ws, "ss_room_leave", middle.creds);
  assert.notEqual(left.type, "error");

  const stored = h.rooms.get(room.roomCode);
  assert.equal(stored.seats.green.kind, "bot");
  assert.equal(stored.players[middle.creds.playerId], undefined);
});

test("serialized Sannin rooms require the original seat token on restore", (t) => {
  const h = harness(t);
  const host = h.create(2);
  const friend = h.join(host.room.roomCode);
  const room = h.start(host, [friend]);

  const stored = JSON.parse(JSON.stringify(h.rooms.get(room.roomCode)));
  const restored = harness(t);
  restored.rooms.set(room.roomCode, stored);
  assert.equal(restored.service.restoreRoom(stored), true);

  assert.equal(
    restored.call(restored.socket(), "ss_game_state", {
      ...host.creds,
      token: token(),
    }).type,
    "error",
  );

  const rejoined = restored.call(restored.socket(), "ss_game_state", host.creds);
  assert.notEqual(rejoined.type, "error");
  assert.equal(rejoined.payload.room.gameState.rulesetVersion, RULESET_VERSION);
});

test("Sannin bootstrap fails closed when integration anchors drift", () => {
  assert.throws(
    () => injectSanninShogi("invalid backend"),
    /integration anchor missing/,
  );
});
