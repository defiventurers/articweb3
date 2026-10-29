const test=require('node:test'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {createArcticPlayService}=require('../arcticPlayService');
const engine=require('../arcticPlayEngine.cjs');

test('The account API advertises supported rules and never silently downgrades a team-room request',async t=>{
 const packets=[];
 const service=createArcticPlayService({rooms:new Map(),requireLogin:false,accessOptions:{requireAccount:false},send(){},ok(ws,id,type,payload){packets.push({type,payload});},fail(ws,id,message){packets.push({type:'error',message});}});
 t.after(()=>service.close());
 const response={writeHead(status){this.status=status;},end(body){this.body=JSON.parse(body);}};
 assert.equal(service.handleHttp({url:'/arctic-play/health',headers:{}},response),true);
 assert.equal(response.status,200);
 assert.ok(response.body.capabilities.includes('account-play-v1'));
 assert.ok(response.body.capabilities.includes('hall-access-v1'));
 assert.equal(response.body.games.length,7);
 const supportsTeams=engine.create('dominion',{teamMode:'2v2'}).teamMode==='2v2';
 assert.equal(response.body.capabilities.includes('dominion-teams-v1'),supportsTeams);
 await service.dispatch({readyState:1},'1','ap_room_create',{playerId:randomUUID(),tableId:'dominion',teamMode:'2v2',capabilities:['dominion-teams-v1']});
 if(supportsTeams)assert.equal(packets.at(-1).payload.room.gameState.teamMode,'2v2');
 else{assert.equal(packets.at(-1).type,'error');assert.match(packets.at(-1).message,/awaiting a game-rules update/);}
});
