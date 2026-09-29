function injectSanYouQi(source) {
  if (source.includes("const sanyou = createSanYouService")) return source;

  const replace = (needle, value) => {
    if (!source.includes(needle)) {
      throw new Error(`San You Qi backend integration anchor missing: ${needle.slice(0, 80)}`);
    }
    source = source.replace(needle, value);
  };

  replace(
    'const { createSanguoService } = require("./sanguoService.js");\nconst sanguo = createSanguoService({ rooms, send, ok, fail, saveRoomSafe: room => saveRoom(room) });\nconst server = http.createServer(',
    'const { createSanguoService } = require("./sanguoService.js");\nconst sanguo = createSanguoService({ rooms, send, ok, fail, saveRoomSafe: room => saveRoom(room) });\nconst { createSanYouService } = require("./sanyouService.js");\nconst sanyou = createSanYouService({ rooms, send, ok, fail, saveRoomSafe: room => saveRoom(room) });\nconst server = http.createServer('
  );

  replace(
    'function scheduleBotIfNeeded(room) { if (room?.gameId === "sanguo-qi") return;',
    'function scheduleBotIfNeeded(room) { if (["sanguo-qi", "san-you-qi"].includes(room?.gameId)) return;'
  );

  replace(
    'room.botTimer = null; rooms.set(room.roomCode, room); sanguo.restoreRoom(room);',
    'room.botTimer = null; rooms.set(room.roomCode, room); sanguo.restoreRoom(room); sanyou.restoreRoom(room);'
  );

  replace(
    'supportsSanguoQi: true, supportsSpectator: true,',
    'supportsSanguoQi: true, supportsSanYouQi: true, supportsSpectator: true,'
  );

  replace(
    'if (payload.roomCode && rooms.get(String(payload.roomCode).trim().toUpperCase())?.gameId === "sanguo-qi" && !type.startsWith("sg_")) return fail(ws, requestId, "Use the Sanguo Qi room controls."); if (type.startsWith("sg_")) return sanguo.dispatch(ws, requestId, type, payload); if (type === "profile_auth_challenge") return createAuthChallenge(ws, requestId, payload);',
    'if (payload.roomCode && rooms.get(String(payload.roomCode).trim().toUpperCase())?.gameId === "san-you-qi" && !type.startsWith("sy_")) return fail(ws, requestId, "Use the San You Qi room controls."); if (type.startsWith("sy_")) return sanyou.dispatch(ws, requestId, type, payload); if (payload.roomCode && rooms.get(String(payload.roomCode).trim().toUpperCase())?.gameId === "sanguo-qi" && !type.startsWith("sg_")) return fail(ws, requestId, "Use the Sanguo Qi room controls."); if (type.startsWith("sg_")) return sanguo.dispatch(ws, requestId, type, payload); if (type === "profile_auth_challenge") return createAuthChallenge(ws, requestId, payload);'
  );

  replace(
    'server.on("close", () => sanguo.close());\nserver.listen(PORT,',
    'server.on("close", () => { sanguo.close(); sanyou.close(); });\nserver.listen(PORT,'
  );

  return source;
}

module.exports = { injectSanYouQi };
