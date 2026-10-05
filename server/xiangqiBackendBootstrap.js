function injectXiangqi(source) {
  if (source.includes("const xiangqi = createXiangqiService")) return source;
  const replace = (needle, value) => {
    if (!source.includes(needle)) throw new Error(`Xiangqi backend integration anchor missing: ${needle.slice(0,80)}`);
    source = source.replace(needle, value);
  };
  replace('const server = http.createServer(', 'const { createXiangqiService } = require("./xiangqiService.js");\nconst xiangqi = createXiangqiService({ rooms, send, ok, fail, saveRoomSafe: room => saveRoom(room) });\nconst server = http.createServer(');
  replace('function scheduleBotIfNeeded(room) {', 'function scheduleBotIfNeeded(room) { if (room?.gameId === "xiangqi") return;');
  replace('sannin.restoreRoom(room);', 'sannin.restoreRoom(room); xiangqi.restoreRoom(room);');
  replace('supportsSanninShogi: true,', 'supportsSanninShogi: true, supportsXiangqi: true,');
  replace('if (type.startsWith("ss_")) return sannin.dispatch(ws, requestId, type, payload);', 'if (payload.roomCode && rooms.get(String(payload.roomCode).trim().toUpperCase())?.gameId === "xiangqi" && !type.startsWith("xq_")) return fail(ws, requestId, "Use the Xiangqi room controls."); if (type.startsWith("xq_")) return xiangqi.dispatch(ws, requestId, type, payload); if (type.startsWith("ss_")) return sannin.dispatch(ws, requestId, type, payload);');
  replace('sannin.close();', 'sannin.close(); xiangqi.close();');
  return source;
}
module.exports = { injectXiangqi };
