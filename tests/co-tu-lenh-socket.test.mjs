import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
import {CoTuLenhClient} from '../frontend/src/games/co-tu-lenh/onlineClient.js';
import {RULE_PROFILES,allLegalActions,applyAction} from '../frontend/src/games/co-tu-lenh/rules.js';

test('production bootstrap serves all four Commander profiles over real sockets with shared adjudication',{timeout:30000},async t=>{
  const reserved=createServer();reserved.listen(0,'127.0.0.1');await once(reserved,'listening');
  const port=reserved.address().port;await new Promise(r=>reserved.close(r));
  const child=spawn(process.execPath,['-r','./allGamesBackendBootstrap.js','-e','require("./allGamesBackendBootstrap.js").loadAllGamesBackend()'],{
    cwd:fileURLToPath(new URL('../server/',import.meta.url)),env:{...process.env,PORT:String(port),DATABASE_URL:'',ETH_SETTLEMENT_SIGNER:'',HIGH_STAKES_ENABLED:'false'},stdio:['ignore','ignore','pipe']});
  let errors='';child.stderr.on('data',b=>errors+=b);const clients=[];
  t.after(async()=>{clients.forEach(c=>c.close());if(child.exitCode===null){child.kill();await once(child,'exit');}});
  let healthy=false;
  for(let i=0;i<100;i++){
    if(child.exitCode!==null)throw Error(errors);
    try{healthy=(await fetch(`http://127.0.0.1:${port}/health`)).ok;if(healthy)break;}catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  assert.ok(healthy,errors);
  for(const mode of Object.keys(RULE_PROFILES)){
    const red=new CoTuLenhClient(`ws://127.0.0.1:${port}`),blue=new CoTuLenhClient(`ws://127.0.0.1:${port}`);clients.push(red,blue);
    const redToken='a'.repeat(64),blueToken='b'.repeat(64);
    const created=await red.request('ctl_room_create',{token:redToken,team:'red',mode});const code=created.room.roomCode;
    await blue.request('ctl_room_join',{roomCode:code,token:blueToken,team:'blue'});
    const {room}=await red.request('ctl_room_start',{roomCode:code,token:redToken});
    assert.equal(room.gameState.rulesProfile,mode);
    await assert.rejects(blue.request('ctl_game_action',{roomCode:code,token:blueToken,revision:room.revision,action:{}}),/Not your turn/);
    await assert.rejects(red.request('ctl_game_action',{roomCode:code,token:redToken,revision:room.revision,action:{id:'invented'}}),/Illegal move/);
    const action=allLegalActions(room.gameState)[0];assert.ok(action);
    const next=await red.request('ctl_game_action',{roomCode:code,token:redToken,revision:room.revision,action});
    assert.deepEqual(next.room.gameState,applyAction(room.gameState,action));
    await assert.rejects(red.request('ctl_game_action',{roomCode:code,token:redToken,revision:room.revision,action}),/Stale room revision/);
    const sync=await blue.request('ctl_room_sync',{roomCode:code,token:blueToken});
    assert.deepEqual(sync.room.gameState,next.room.gameState);
  }
});
