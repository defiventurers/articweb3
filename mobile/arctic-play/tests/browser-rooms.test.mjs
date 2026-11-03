import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomClient,browserRoomLink,bindRoomLifecycle} from '../src/network.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
class FakeSocket{
 static OPEN=1;static sockets=[];
 constructor(url){this.url=url;this.readyState=0;this.sent=[];FakeSocket.sockets.push(this);}
 open(){this.readyState=1;this.onopen?.();}
 send(text){this.sent.push(JSON.parse(text));}
 close(){this.readyState=3;}
 reply(request,payload){this.onmessage?.({data:JSON.stringify({requestId:request.requestId,type:request.type+'_ok',payload})});}
}
const session={roomCode:'ABC234',playerId:'local-player',seatToken:'a'.repeat(64)};
function setup(t){const previous=globalThis.WebSocket;globalThis.WebSocket=FakeSocket;FakeSocket.sockets=[];const client=new RoomClient();t.after(()=>{client.close();globalThis.WebSocket=previous;});return client;}

test('iPhone invitation is an HTTPS game link containing only the public room code',()=>{
 assert.equal(browserRoomLink(' abc234 '),'https://articweb3.onrender.com/arctic-play/app/?room=ABC234');
 for(const value of ['',null,'ABC01D','ABC234&seatToken=secret','https://evil.example/ABC234'])assert.throws(()=>browserRoomLink(value),/valid private room/);
});

test('Safari recovery reauthenticates the saved seat once, ignores late old-socket events and never replays a move',async t=>{
 const client=setup(t),updates=[];client.listen(packet=>updates.push(packet));client.useSession(session);
 const connecting=client.connect(),old=FakeSocket.sockets[0];old.open();await connecting;await flush();
 const first=old.sent.find(p=>p.type==='ap_room_get');old.reply(first,{room:{revision:1}});await flush();
 const pending=client.call('ap_game_action',{...session,actionId:'move|piece:one|next|0',revision:1}).catch(e=>e);await flush();
 const lateClose=old.onclose,recover=client.recover();assert.equal(client.recover(),recover);const fresh=FakeSocket.sockets[1];fresh.open();await recover;await flush();
 assert.match((await pending).message,/Check the board/);assert.equal(FakeSocket.sockets.length,2);
 const refresh=fresh.sent.find(p=>p.type==='ap_room_get');assert.ok(refresh);assert.equal(refresh.payload.seatToken,session.seatToken);assert.equal(refresh.payload.playerId,session.playerId);
 lateClose();assert.equal(client.status,'online');assert.ok(client.pending.has(refresh.requestId),'late close cannot reject the fresh authentication');
 old.onmessage({data:JSON.stringify({type:'ap_room_update',payload:{room:{revision:999}}})});assert.equal(updates.length,0);
 fresh.onmessage({data:JSON.stringify({type:'ap_room_update',payload:{room:{revision:2}}})});fresh.reply(refresh,{room:{revision:2}});await flush();
 assert.equal(updates[0].room.revision,2);assert.equal(client.pending.size,0);assert.equal(fresh.sent.filter(p=>p.type==='ap_game_action').length,0);
 assert.equal(old.sent.filter(p=>p.type==='ap_game_action').length,1);
});

test('Opening a replacement connection keeps concurrent commands on that connection',async t=>{
 const client=setup(t);client.useSession(session);const first=client.connect(),stale=FakeSocket.sockets[0];
 const recovered=client.recover(),fresh=FakeSocket.sockets[1];first.catch(()=>{});stale.onclose();await flush();
 const waiting=client.connect();assert.equal(FakeSocket.sockets.length,2);fresh.open();await Promise.all([recovered,waiting]);await flush();
 const refresh=fresh.sent.find(p=>p.type==='ap_room_get');fresh.reply(refresh,{room:{revision:1}});await flush();assert.equal(client.pending.size,0);
});

test('Safari tab return, back-forward cache and restored network refresh a saved room; cleanup removes all listeners',async t=>{
 const win=new EventTarget(),doc=new EventTarget(),client={session,socket:{readyState:1},calls:0,recover(){this.calls++;return Promise.resolve();},emit(){}};
 let now=1000;doc.hidden=false;t.mock.method(Date,'now',()=>now);const cleanup=bindRoomLifecycle(client,win,doc);
 doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));now+=6000;doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(client.calls,1);
 doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));now+=100;doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(client.calls,1,'brief input focus changes do not reset a healthy socket');
 const shown=new Event('pageshow');Object.defineProperty(shown,'persisted',{value:true});win.dispatchEvent(shown);assert.equal(client.calls,2);
 win.dispatchEvent(new Event('online'));assert.equal(client.calls,3);
 client.session=null;win.dispatchEvent(new Event('online'));assert.equal(client.calls,3);
 cleanup();client.session=session;win.dispatchEvent(new Event('online'));win.dispatchEvent(shown);assert.equal(client.calls,3);
});
