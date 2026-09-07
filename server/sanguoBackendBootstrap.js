function injectSanguo(source) {
  if (source.includes('const sanguo = createSanguoService')) return source;
  const replace = (needle, value) => {
    if (!source.includes(needle)) throw new Error(`Sanguo backend integration anchor missing: ${needle.slice(0, 70)}`);
    source = source.replace(needle, value);
  };
  replace('const server = http.createServer(', 'const { createSanguoService } = require("./sanguoService.js");\nconst sanguo = createSanguoService({ rooms, send, ok, fail, saveRoomSafe: room => saveRoom(room) });\nconst server = http.createServer(');
  replace('function scheduleBotIfNeeded(room) {', 'function scheduleBotIfNeeded(room) { if (room?.gameId === "sanguo-qi") return;');
  replace('room.botTimer = null; rooms.set(room.roomCode, room);', 'room.botTimer = null; rooms.set(room.roomCode, room); sanguo.restoreRoom(room);');
  replace('supportsSpectator: true,', 'supportsSanguoQi: true, supportsSpectator: true,');
  replace('if (type === "profile_auth_challenge") return createAuthChallenge(ws, requestId, payload);', 'if (payload.roomCode && rooms.get(String(payload.roomCode).trim().toUpperCase())?.gameId === "sanguo-qi" && !type.startsWith("sg_")) return fail(ws, requestId, "Use the Sanguo Qi room controls."); if (type.startsWith("sg_")) return sanguo.dispatch(ws, requestId, type, payload); if (type === "profile_auth_challenge") return createAuthChallenge(ws, requestId, payload);');
  replace('server.listen(PORT,', 'server.on("close", () => sanguo.close());\nserver.listen(PORT,');
  return source;
}
module.exports = { injectSanguo };
