function injectArcticPlay(source) {
  if(source.includes('const arcticPlay = createArcticPlayService')) return source;
  const replace=(needle,value)=>{if(!source.includes(needle))throw new Error(`Android integration anchor missing: ${needle}`);source=source.replace(needle,value);};
  replace('const server = http.createServer(', 'const { createArcticPlayService } = require("./arcticPlayService.js");\nconst arcticPlay = createArcticPlayService({ rooms, send, ok, fail, saveRoomSafe: room => saveRoom(room) });\nconst server = http.createServer(');
  replace('http.createServer((req, res) => {', 'http.createServer((req, res) => { if (arcticPlay.handleHttp(req,res)) return;');
  replace('function scheduleBotIfNeeded(room) {', 'function scheduleBotIfNeeded(room) { if (room?.gameId === "arctic-play") return;');
  replace('shogi.restoreRoom(room);', 'shogi.restoreRoom(room); arcticPlay.restoreRoom(room);');
  replace('if (type === "profile_login") return login(ws, requestId, payload);', 'if (typeof type === "string" && type.startsWith("ap_")) return arcticPlay.dispatch(ws, requestId, type, payload); if (payload.roomCode && rooms.get(String(payload.roomCode).trim().toUpperCase())?.gameId === "arctic-play") return fail(ws, requestId, "Use the Arctic Play app for this room."); if (type === "profile_login") return login(ws, requestId, payload);');
  replace('ws.on("message", async (raw) => {', 'ws.on("close", () => arcticPlay.disconnected(ws)); ws.on("message", async (raw) => {');
  replace('shogi.close();', 'shogi.close(); arcticPlay.close();');
  return source;
}
module.exports={injectArcticPlay};
