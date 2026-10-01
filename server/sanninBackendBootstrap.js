function injectSanninShogi(source) {
  if (source.includes("const sannin = createSanninService")) return source;

  const replace = (needle, value) => {
    if (!source.includes(needle)) {
      throw new Error(`Sannin Shogi backend integration anchor missing: ${needle.slice(0, 80)}`);
    }
    source = source.replace(needle, value);
  };

  replace(
    'const { createSanYouService } = require("./sanyouService.js");\nconst sanyou = createSanYouService({ rooms, send, ok, fail, saveRoomSafe: room => saveRoom(room) });\nconst server = http.createServer(',
    'const { createSanYouService } = require("./sanyouService.js");\nconst sanyou = createSanYouService({ rooms, send, ok, fail, saveRoomSafe: room => saveRoom(room) });\nconst { createSanninService } = require("./sanninService.js");\nconst sannin = createSanninService({ rooms, send, ok, fail, saveRoomSafe: room => saveRoom(room) });\nconst server = http.createServer('
  );

  replace(
    'function scheduleBotIfNeeded(room) { if (["sanguo-qi", "san-you-qi"].includes(room?.gameId)) return;',
    'function scheduleBotIfNeeded(room) { if (["sanguo-qi", "san-you-qi", "sannin-shogi"].includes(room?.gameId)) return;'
  );

  replace(
    'room.botTimer = null; rooms.set(room.roomCode, room); sanguo.restoreRoom(room); sanyou.restoreRoom(room);',
    'room.botTimer = null; rooms.set(room.roomCode, room); sanguo.restoreRoom(room); sanyou.restoreRoom(room); sannin.restoreRoom(room);'
  );

  replace(
    'supportsSanguoQi: true, supportsSanYouQi: true, supportsSpectator: true,',
    'supportsSanguoQi: true, supportsSanYouQi: true, supportsSanninShogi: true, supportsSpectator: true,'
  );

  replace(
    'if (payload.roomCode && rooms.get(String(payload.roomCode).trim().toUpperCase())?.gameId === "san-you-qi" && !type.startsWith("sy_")) return fail(ws, requestId, "Use the San You Qi room controls."); if (type.startsWith("sy_")) return sanyou.dispatch(ws, requestId, type, payload);',
    'if (payload.roomCode && rooms.get(String(payload.roomCode).trim().toUpperCase())?.gameId === "sannin-shogi" && !type.startsWith("ss_")) return fail(ws, requestId, "Use the Sannin Shogi room controls."); if (type.startsWith("ss_")) return sannin.dispatch(ws, requestId, type, payload); if (payload.roomCode && rooms.get(String(payload.roomCode).trim().toUpperCase())?.gameId === "san-you-qi" && !type.startsWith("sy_")) return fail(ws, requestId, "Use the San You Qi room controls."); if (type.startsWith("sy_")) return sanyou.dispatch(ws, requestId, type, payload);'
  );

  replace(
    'server.on("close", () => { sanguo.close(); sanyou.close(); });\nserver.listen(PORT,',
    'server.on("close", () => { sanguo.close(); sanyou.close(); sannin.close(); });\nserver.listen(PORT,'
  );

  return source;
}

module.exports = { injectSanninShogi };
