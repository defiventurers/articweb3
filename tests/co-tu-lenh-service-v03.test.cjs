const test=require('node:test'); const assert=require('node:assert/strict'); const {EventEmitter}=require('node:events');
const {createCoTuLenhService}=require('../server/coTuLenhService.js');
function create(){const rooms=new Map();const output=[];const s=createCoTuLenhService({rooms,send:(ws,p)=>output.push(p),ok:(ws,req,type,payload)=>output.push({type,payload}),fail:(ws,req,msg)=>output.push({type:'error',payload:{message:msg}}),saveRoomSafe:()=>{}});const ws=new EventEmitter();ws.readyState=1;return {rooms,s,req:(type,payload)=>{s.dispatch(ws,'one',type,payload);return output.at(-1)}};}
const tok='a'.repeat(64);
test('server accepts versioned 2015, 2024 and BGA profiles; validates unknown values',()=>{
 for(const mode of ['ancientchess_2015_standard','ancientchess_2015_long','creator_2024_standard','bga_2024']){
  const {req}=create();const m=req('ctl_room_create',{token:tok,team:'red',mode});assert.equal(m.type,'ctl_ack');assert.equal(m.payload.room.gameState.rulesProfile,mode);
 }
 const {req}=create();assert.match(req('ctl_room_create',{token:tok,team:'red',mode:'invented'}).payload.message,/Unknown rules profile/);
});
test('older in-progress room cannot silently switch to new rules engine',()=>{
 const {rooms,req}=create();const res=req('ctl_room_create',{token:tok,team:'red',mode:'bga_2024'});const room=rooms.get(res.payload.room.roomCode);
 room.status='playing';room.gameState.rulesVersion='co-tu-lenh-practice-0.2';
 const r=req('ctl_game_action',{roomCode:room.roomCode,token:tok,revision:room.revision,action:{id:'red-01',kind:'move',x:4,y:0}});
 assert.equal(r.type,'error');assert.match(r.payload.message,/older rules engine/);
});