const test=require('node:test'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {createArcticPlayService}=require('../arcticPlayService');

test('game health and Chaturanga room creation remain available',async t=>{
 const packets=[],rooms=new Map();
 const service=createArcticPlayService({rooms,requireLogin:false,accessOptions:{requireAccount:false},send(){},ok(ws,id,type,payload){packets.push({type,payload});},fail(ws,id,message){packets.push({type:'error',message});}});
 t.after(()=>service.close());
 const response={writeHead(status){this.status=status;},end(body){this.body=JSON.parse(body);}};
 assert.equal(service.handleHttp({url:'/arctic-play/health',headers:{}},response),true);
 assert.equal(response.status,200);
 assert.ok(response.body.capabilities.includes('chaturanga-long-dice-v1'));
 await service.dispatch({readyState:1},'1','ap_room_create',{playerId:randomUUID(),tableId:'dominion',seat:'green',rulesProfile:'chaturanga-long-dice-v1',capabilities:['chaturanga-long-dice-v1']});
 assert.equal(packets.at(-1).type,'ap_room_create_ok',packets.at(-1).message);
 assert.equal(packets.at(-1).payload.room.tableId,'dominion');
 assert.equal(rooms.size,1);
});
