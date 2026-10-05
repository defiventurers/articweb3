function injectShogi(source) {
  if (source.includes("const shogi = createShogiService")) return source;
  const replace = (needle, value) => {
    if (!source.includes(needle)) throw new Error(`Shogi backend integration anchor missing: ${needle.slice(0,80)}`);
    source = source.replace(needle, value);
  };
  replace('const server = http.createServer(', 'const { createShogiService } = require("./shogiService.js");\nconst shogi = createShogiService({ rooms, send, ok, fail, saveRoomSafe: room => saveRoom(room) });\nconst server = http.createServer(');
  replace('function scheduleBotIfNeeded(room) {', 'function scheduleBotIfNeeded(room) { if (room?.gameId === "shogi-frozen-shogunate") return;');
  replace('sannin.restoreRoom(room);', 'sannin.restoreRoom(room); shogi.restoreRoom(room);');
  replace('supportsSanninShogi: true,', 'supportsSanninShogi: true, supportsShogi: true,');
  replace('if (type.startsWith("ss_")) return sannin.dispatch(ws, requestId, type, payload);', 'if (payload.roomCode && rooms.get(String(payload.roomCode).trim().toUpperCase())?.gameId === "shogi-frozen-shogunate" && !type.startsWith("sh_")) return fail(ws, requestId, "Use the Shogi room controls."); if (type.startsWith("sh_")) return shogi.dispatch(ws, requestId, type, payload); if (type.startsWith("ss_")) return sannin.dispatch(ws, requestId, type, payload);');
  replace('sannin.close();', 'sannin.close(); shogi.close();');
  return source;
}
module.exports = { injectShogi };
