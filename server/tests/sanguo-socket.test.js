const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { createServer } = require("node:net");
const { randomBytes } = require("node:crypto");
const path = require("node:path");
const WebSocket = require("ws");
const { sanguoActions } = require("../sanguoEngine.cjs");

test("real lobby sockets create, invite, play, broadcast and reclaim a Sanguo seat", { timeout: 25000 }, async t => {
  const reservation = createServer(); reservation.listen(0, "127.0.0.1"); await once(reservation, "listening");
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  // Exercise the exact production bootstrap without DB, indexer or payment calls.
  const child = spawn(process.execPath, ["-r", "./allGamesBackendBootstrap.js", "-e", 'require("./allGamesBackendBootstrap.js").loadAllGamesBackend()'], { cwd: path.join(__dirname, ".."), env: { ...process.env, PORT: String(port), DATABASE_URL: "", ETH_SETTLEMENT_SIGNER: "", HIGH_STAKES_ENABLED: "false" }, stdio: ["ignore", "pipe", "pipe"] });
  const sockets = [];
  t.after(async () => { for (const ws of sockets) ws.terminate(); child.kill(); await once(child, "exit").catch(() => {}); });
  let ready = false;
  for (let tries = 0; tries < 60; tries++) {
    if (child.exitCode !== null) throw new Error("Lobby process exited before accepting connections.");
    try { const health = await (await fetch(`http://127.0.0.1:${port}/health`)).json(); assert.equal(health.supportsSanguoQi, true); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  assert.ok(ready, "Lobby should start with Sanguo integration");
  let serial = 0;
  async function connect() { const ws = new WebSocket(`ws://127.0.0.1:${port}`); sockets.push(ws); await once(ws, "open"); return ws; }
  function request(ws, type, payload = {}) {
    const requestId = `integration-${++serial}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { ws.off("message", handler); reject(new Error(`Timed out: ${type}`)); }, 4000);
      const handler = raw => { const packet = JSON.parse(raw); if (packet.requestId !== requestId) return; clearTimeout(timer); ws.off("message", handler); resolve(packet); };
      ws.on("message", handler); ws.send(JSON.stringify({ type, requestId, payload }));
    });
  }
  const hostWs = await connect(), friendWs = await connect(), thirdWs = await connect();
  const token = () => randomBytes(32).toString("hex");
  const hostToken = token();
  const created = await request(hostWs, "sg_room_create", { name: "Host", humanCount: 3, faction: "red", difficulty: "hard", token: hostToken, visibility: "private" });
  assert.notEqual(created.type, "error", created.payload.message);
  const roomCode = created.payload.room.roomCode;
  const host = { roomCode, playerId: created.payload.playerId, token: hostToken };
  const players = [{ ws: hostWs, creds: host }];
  for (const [ws, name] of [[friendWs, "Friend"], [thirdWs, "Third"]]) {
    const secret = token(), joined = await request(ws, "sg_room_join", { roomCode, name, token: secret });
    assert.notEqual(joined.type, "error", joined.payload.message); players.push({ ws, creds: { roomCode, playerId: joined.payload.playerId, token: secret } });
  }
  for (const p of players) await request(p.ws, "sg_room_ready", { ...p.creds, ready: true });
  const started = await request(hostWs, "sg_room_start", host); assert.equal(started.payload.room.status, "playing");
  const broadcasts = []; friendWs.on("message", raw => { const packet = JSON.parse(raw); if (packet.type === "sg_room_state") broadcasts.push(packet.payload.room); });
  const action = sanguoActions(started.payload.room.gameState)[0];
  const moved = await request(hostWs, "sg_game_action", { ...host, revision: started.payload.room.revision, action });
  assert.equal(moved.payload.room.gameState.turn, "green");
  // A synchronization request is also a barrier after the broadcast on this socket.
  const friendState = await request(friendWs, "sg_game_state", players[1].creds);
  assert.deepEqual(friendState.payload.room.gameState, moved.payload.room.gameState);
  assert.ok(broadcasts.some(r => r.gameState.moveNumber === 2));
  const spoofed = await request(thirdWs, "sg_game_action", { ...players[1].creds, token: token(), revision: moved.payload.room.revision, action: sanguoActions(moved.payload.room.gameState)[0] });
  assert.equal(spoofed.type, "error");
  const legacy = await request(hostWs, "spectate_room", { roomCode }); assert.equal(legacy.type, "error");
  friendWs.close(); await once(friendWs, "close");
  const returned = await connect();
  const resumed = await request(returned, "sg_game_state", players[1].creds);
  assert.deepEqual(resumed.payload.room.gameState, moved.payload.room.gameState);
  assert.equal(resumed.payload.room.players.length, 3);
  // Also exercise the real worker-thread bot path through the production dispatcher.
  const soloToken = token();
  const soloCreated = await request(hostWs, "sg_room_create", { name: "Solo", humanCount: 1, faction: "red", difficulty: "hard", token: soloToken });
  const solo = { roomCode: soloCreated.payload.room.roomCode, playerId: soloCreated.payload.playerId, token: soloToken };
  await request(hostWs, "sg_room_ready", { ...solo, ready: true });
  const soloStarted = await request(hostWs, "sg_room_start", solo);
  await request(hostWs, "sg_game_action", { ...solo, revision: soloStarted.payload.room.revision, action: sanguoActions(soloStarted.payload.room.gameState)[0] });
  let soloState;
  const deadline = Date.now() + 12000;
  do {
    await new Promise(resolve => setTimeout(resolve, 400));
    soloState = (await request(hostWs, "sg_game_state", solo)).payload.room.gameState;
  } while (soloState.moveNumber < 4 && Date.now() < deadline);
  assert.equal(soloState.turn, "red"); assert.equal(soloState.moveNumber, 4);
});
