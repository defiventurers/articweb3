const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {createCoTuLenhService}=require('../server/coTuLenhService.js');
const {VERSION}=require('../server/coTuLenhEngine.cjs');
function fixture(t,options={}){
 const rooms=new Map();let now=1000;const ws=()=>{const s=new EventEmitter();s.readyState=1;s.inbox=[];return s;},r=ws(),b=ws();
 const service=createCoTuLenhService({rooms,now:()=>now,send:(w,p)=>w.inbox.push(p),ok:(w,id,type,payload)=>w.inbox.push({type,payload}),fail:(w,id,message)=>w.inbox.push({type:'error',message}),saveRoomSafe:()=>{}});t.after(()=>service.close());
 const red='a'.repeat(64),blue='b'.repeat(64),call=(w,type,payload={})=>{service.dispatch(w,'req',type,{...payload,rulesVersion:VERSION});return w.inbox.at(-1);};
 const created=call(r,'ctl_room_create',{team:'red',token:red,mode:'youtuber_rules',...options});assert.equal(created.type,'ctl_ack');const code=created.payload.room.roomCode;
 call(b,'ctl_room_join',{team:'blue',token:blue,roomCode:code});call(r,'ctl_room_start',{token:red,roomCode:code});
 return {rooms,r,b,call,code,red,blue,room:()=>rooms.get(code),setNow:t=>now=t};
}
test('secret deployment is seat-redacted in acknowledgements, broadcasts and reconnects until both ready',t=>{
 const f=fixture(t,{deployment:'secret',timeLimitMinutes:10});
 const sync=(w,token)=>f.call(w,'ctl_room_sync',{roomCode:f.code,token}).payload.room;
 let r=sync(f.r,f.red),b=sync(f.b,f.blue);assert.equal(r.status,'setup');assert.equal(r.gameState.clock.deadline,null);
 assert.ok(r.gameState.pieces.filter(p=>p.team==='blue').every(p=>p.hidden&&p.x===null&&p.y===null));
 assert.ok(b.gameState.pieces.filter(p=>p.team==='red').every(p=>p.hidden&&p.x===null));
 const changed=f.call(f.r,'ctl_setup_move',{roomCode:f.code,token:f.red,revision:r.revision,action:{id:'red-01',x:4,y:0}});assert.equal(changed.type,'ctl_ack');
 b=sync(f.b,f.blue);assert.equal(b.gameState.lastMove,null);assert.equal(b.gameState.pieces.find(p=>p.id==='red-01').x,null);
 assert.ok(f.b.inbox.filter(p=>p.type==='ctl_room_state').every(p=>p.payload.room.gameState.pieces.filter(q=>q.team==='red').every(q=>q.x===null)));
 assert.match(f.call(f.b,'ctl_setup_move',{roomCode:f.code,token:f.blue,revision:f.room().revision,action:{id:'red-01',x:5,y:0}}).message,/Deploy/);
 assert.match(f.call(f.r,'ctl_setup_ready',{roomCode:f.code,token:f.red,revision:0}).message,/Stale/);
 f.call(f.r,'ctl_setup_ready',{roomCode:f.code,token:f.red,revision:f.room().revision});assert.equal(f.room().status,'setup');
 f.setNow(9000);const ready=f.call(f.b,'ctl_setup_ready',{roomCode:f.code,token:f.blue,revision:f.room().revision});assert.equal(ready.type,'ctl_ack');assert.equal(ready.payload.room.status,'playing');assert.equal(ready.payload.room.gameState.clock.deadline,609000);
 assert.equal(sync(f.b,f.blue).gameState.pieces.find(p=>p.id==='red-01').x,4);
});
test('server clock wins on server time and rejects client clock/deployment injection',t=>{
 const f=fixture(t,{timeLimitMinutes:10});const deadline=f.room().gameState.clock.deadline;assert.equal(deadline,601000);
 f.room().gameState.captures.push({by:'red',type:'tank'});f.setNow(deadline);
 const reply=f.call(f.b,'ctl_game_action',{roomCode:f.code,token:f.blue,revision:f.room().revision,action:{kind:'move',deadline:999999999}});assert.equal(reply.type,'ctl_ack');assert.equal(reply.payload.room.status,'finished');assert.equal(reply.payload.room.gameState.winner,'red');
 assert.equal(reply.payload.room.gameState.clock.deadline,deadline);
});
