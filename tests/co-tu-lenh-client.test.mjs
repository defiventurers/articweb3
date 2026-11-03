import test from 'node:test';
import assert from 'node:assert/strict';
import {CoTuLenhClient} from '../frontend/src/games/co-tu-lenh/onlineClient.js';
import {VERSION,createInitialState} from '../frontend/src/games/co-tu-lenh/rules.js';

test('client accepts matching rules and refuses incompatible lobby replies and broadcasts',async t=>{
  const current={gameId:'co-tu-lenh',rulesVersion:VERSION,gameState:createInitialState()};
  let reply=current,lastPayload,packets=0;
  class Socket {
    readyState=0;
    constructor(){queueMicrotask(()=>{this.readyState=1;this.onopen?.();});}
    send(raw){const request=JSON.parse(raw);lastPayload=request.payload;queueMicrotask(()=>this.onmessage?.({data:JSON.stringify({type:'ctl_ack',requestId:request.requestId,payload:{room:reply}})}));}
    close(){this.readyState=3;this.onclose?.();}
  }
  const original=globalThis.WebSocket;globalThis.WebSocket=Socket;
  t.after(()=>{globalThis.WebSocket=original;});
  const c=new CoTuLenhClient('ws://fixture');t.after(()=>c.close());
  c.onPacket=()=>packets++;
  assert.equal((await c.request('ctl_room_create')).room.rulesVersion,VERSION);
  assert.equal(lastPayload.rulesVersion,VERSION);
  assert.equal(packets,1);
  reply={...current,rulesVersion:'co-tu-lenh-practice-0.2'};
  await assert.rejects(c.request('ctl_room_create'),/incompatible Commander Chess rules/);
  assert.equal(packets,1,'old state never reaches the UI');
  reply={...current,gameState:{...current.gameState,rulesVersion:'old'}};
  await assert.rejects(c.request('ctl_room_sync'),/incompatible Commander Chess rules/);
  reply=current;await c.request('ctl_room_sync');
  const count=packets;
  c.socket.onmessage({data:JSON.stringify({type:'ctl_room_state',payload:{room:{...current,rulesVersion:'old'}}})});
  assert.equal(packets,count,'incompatible asynchronous updates are discarded');
});
