const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {createCoTuLenhService}=require('../coTuLenhService');
const native=require('../coTuLenhEngine.cjs');
const engine=require('../fairPlayEngine.cjs');
const manifest=require('../../shared/fair-play/rules-manifest.json');
async function setup(t,options={}){
 const core=await import('../../shared/fair-play/core.js'),keys=await Promise.all([core.generateKey(),core.generateKey(),core.generateKey()]),rooms=new Map(),documents=new Map();
 const store={configured:true,async transact(k,id,fn){const key=k+':'+id,next=await fn(documents.get(key));documents.set(key,core.copy(next));return next;},async get(k,id){return documents.get(k+':'+id)||null;}};
 const socket=()=>Object.assign(new EventEmitter(),{readyState:1,inbox:[]}),red=socket(),blue=socket(),tokens=['a'.repeat(64),'b'.repeat(64)];
 const service=createCoTuLenhService({rooms,send:(ws,p)=>ws.inbox.push(p),ok:(ws,id,type,payload)=>ws.inbox.push({type,payload}),fail:(ws,id,message)=>ws.inbox.push({type:'error',message}),saveRoomSafe:async()=>{},proofOptions:{store,privateKey:keys[0].privateKey,trustedKeys:[keys[0].publicKey],anchor:{config:()=>({configured:false,chainId:46630})},withAccountSession:async(session,fn)=>fn({id:session})}});t.after(()=>service.close());
 async function call(n,type,payload={}){const ws=n===0?red:blue;await service.dispatch(ws,'test',type,{rulesVersion:native.VERSION,capabilities:['ctl-fair-play-v1'],fairKey:keys[n+1].publicKey,cloudSession:'account'+n,...payload});return ws.inbox.at(-1);}
 const created=await call(0,'ctl_room_create',{token:tokens[0],team:'red',mode:'youtuber_rules',...options});assert.equal(created.type,'ctl_ack',created.message);const code=created.payload.room.roomCode;
 const joined=await call(1,'ctl_room_join',{token:tokens[1],team:'blue',roomCode:code});assert.equal(joined.type,'ctl_ack',joined.message);
 const room=rooms.get(code),command=(n,type,payload={})=>call(n,type,{roomCode:code,token:tokens[n],revision:room.revision,...payload});
 return{core,keys,rooms,room,call,command,documents};
}
test('Commander standard untimed table signs native moves and final result; replay rejects tampering',async t=>{
 const f=await setup(t);assert.equal((await f.command(0,'ctl_room_start')).type,'ctl_ack');assert.equal(f.room.fair.bundle.header.gameId,'co-tu-lenh');
 const actionId=engine.actions('co-tu-lenh',f.room.gameState).find(a=>a.kind!=='concede').id;
 const signed=await f.core.makeIntent({bundle:f.room.fair.bundle,actor:'red',actionId,before:f.room.gameState},f.keys[1].privateKey);
 const accepted=await f.command(0,'ctl_game_action',{action:JSON.parse(actionId.slice(4)),fairIntent:signed});assert.equal(accepted.type,'ctl_ack',accepted.message);
 const n=f.room.gameState.turn==='red'?0:1,actor=f.room.gameState.turn,concede='ctl:'+f.core.canonical({kind:'concede'});
 const final=await f.core.makeIntent({bundle:f.room.fair.bundle,actor,actionId:concede,before:f.room.gameState},f.keys[n+1].privateKey);
 assert.equal((await f.command(n,'ctl_game_action',{action:{kind:'concede'},fairIntent:final})).type,'ctl_ack');assert.equal(f.room.status,'finished');assert.ok(f.room.fair.bundle.closure);
 const bundle=(await f.command(0,'ctl_fair_get')).payload.bundle;
 const report=await f.core.verifyBundle(bundle,{engine,rulesHash:manifest.rulesHash,trustedKeys:[f.keys[0].publicKey]});assert.equal(report.moves,2);assert.equal(report.chain.status,'unanchored');
 assert.ok(f.documents.get('fair-owner:account0').matches[0].closed);
 assert.ok(!JSON.stringify(bundle).includes('account0'));assert.ok(!JSON.stringify(bundle).includes('digest'));
 const changed=f.core.copy(bundle);changed.events[0].signed.intent.actionId=concede;await assert.rejects(()=>f.core.verifyBundle(changed,{engine,rulesHash:manifest.rulesHash,trustedKeys:[f.keys[0].publicKey]}),/signature|changed|altered|invalid/i);
});
test('Commander proofs enforce key, revision, rules version and native legality',async t=>{
 const f=await setup(t);await f.command(0,'ctl_room_start');
 const action={id:'red-01',kind:'move',x:10,y:11},actionId='ctl:'+f.core.canonical(action),fairIntent=await f.core.makeIntent({bundle:f.room.fair.bundle,actor:'red',actionId,before:f.room.gameState},f.keys[1].privateKey);
 assert.equal((await f.command(0,'ctl_game_action',{action,fairIntent})).type,'error');assert.equal(f.room.fair.bundle.events.length,0);
 assert.match((await f.command(0,'ctl_fair_get',{rulesVersion:'old'})).message,/matching/);
 assert.match((await f.command(0,'ctl_room_sync',{fairKey:f.keys[2].publicKey})).message,/original/);
 assert.equal((await f.command(0,'ctl_fair_get',{token:'c'.repeat(64)})).type,'error');
 assert.match((await f.command(0,'ctl_game_action',{revision:-1,action,fairIntent})).message,/Stale/);
});
test('secret and clocked Commander tables keep native protocol without leaking setup in proof summaries',async t=>{
 for(const options of [{deployment:'secret'},{timeLimitMinutes:10}]){
  const f=await setup(t,options);assert.equal(f.room.fairEnabled,undefined);assert.equal((await f.command(0,'ctl_room_start')).type,'ctl_ack');
  const state=(await f.command(0,'ctl_room_sync')).payload.room;assert.equal(state.fair.available,false);
  if(options.deployment==='secret')assert.ok(state.gameState.pieces.filter(p=>p.team==='blue').every(p=>p.hidden&&p.x===null));
 }
});
