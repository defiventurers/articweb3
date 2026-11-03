function injectCoTuLenh(source){
 if(source.includes('const coTuLenh = createCoTuLenhService'))return source;
 const replace=(needle,value)=>{if(!source.includes(needle))throw Error('Cờ Tư Lệnh backend bootstrap anchor missing: '+needle);source=source.replace(needle,value);};
 replace('const server = http.createServer(', 'const { createCoTuLenhService } = require("./coTuLenhService.js");\nconst coTuLenh = createCoTuLenhService({rooms,send,ok,fail,saveRoomSafe:room=>saveRoom(room)});\nconst server = http.createServer(');
 replace('function scheduleBotIfNeeded(room) {', 'function scheduleBotIfNeeded(room) { if (room?.gameId === "co-tu-lenh") return;');
 replace('arcticPlay.restoreRoom(room);','arcticPlay.restoreRoom(room); coTuLenh.restoreRoom(room);');
 replace('if (typeof type === "string" && type.startsWith("ap_"))', 'if (typeof type === "string" && type.startsWith("ctl_")) return coTuLenh.dispatch(ws,requestId,type,payload); if (typeof type === "string" && type.startsWith("ap_"))');
 replace('arcticPlay.close();','arcticPlay.close(); coTuLenh.close();');
 return source;
}
module.exports={injectCoTuLenh};
