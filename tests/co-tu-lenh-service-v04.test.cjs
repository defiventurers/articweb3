const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {VERSION,legalActions,createInitialState}=require('../server/coTuLenhEngine.cjs'),{createCoTuLenhService}=require('../server/coTuLenhService.js');
function fixture(){const rooms=new Map(),output=[];const service=createCoTuLenhService({rooms,send:()=>{},ok:(ws,id,type,payload)=>output.push({type,payload}),fail:(ws,id,message)=>output.push({type:'error',message}),saveRoomSafe:()=>{}});const ws=new EventEmitter();ws.readyState=1;return {rooms,call(type,payload={},version=VERSION){service.dispatch(ws,'request',type,{...payload,rulesVersion:version});return output.at(-1);}};}
test('service refuses missing or older client versions before creating a room',()=>{
 const f=fixture();for(const v of [undefined,'co-tu-lenh-practice-0.3']){const r=f.call('ctl_room_create',{token:'a'.repeat(64)},v===undefined?null:v);assert.equal(r.type,'error');assert.match(r.message,/matching v0.5/);assert.equal(f.rooms.size,0);}
});
test('server retains the mover seat during a compound turn and validates each continuation and end-turn',()=>{
 const f=fixture(),red='a'.repeat(64),blue='b'.repeat(64),created=f.call('ctl_room_create',{token:red,team:'red',mode:'ancientchess_2015_long'}),code=created.payload.room.roomCode;
 f.call('ctl_room_join',{roomCode:code,token:blue,team:'blue'});f.call('ctl_room_start',{roomCode:code,token:red});const room=f.rooms.get(code);
 const piece=(id,type,x,y,extra={})=>({id,type,team:'red',x,y,alive:true,hero:false,carrier:null,...extra});room.gameState={...createInitialState('ancientchess_2015_long'),pieces:[piece('rc','commander',3,0),piece('bc','commander',9,11,{team:'blue'}),piece('t','tank',5,3),piece('i','infantry',5,3,{carrier:'t'})]};
 const move=legalActions(room.gameState,'t').find(a=>a.kind==='move'&&a.x===5&&a.y===4),revision=room.revision;
 const r=f.call('ctl_game_action',{roomCode:code,token:red,revision,action:move});assert.equal(r.type,'ctl_ack');assert.equal(r.payload.room.gameState.turn,'red');
 assert.match(f.call('ctl_game_action',{roomCode:code,token:blue,revision:room.revision,action:{kind:'end-turn'}}).message,/Not your turn/);
 assert.match(f.call('ctl_game_action',{roomCode:code,token:red,revision,action:{kind:'end-turn'}}).message,/Stale/);
 const end=f.call('ctl_game_action',{roomCode:code,token:red,revision:room.revision,action:{kind:'end-turn',id:'turn'}});assert.equal(end.type,'ctl_ack');assert.equal(end.payload.room.gameState.turn,'blue');assert.equal(end.payload.room.gameState.turnContext,null);
});
