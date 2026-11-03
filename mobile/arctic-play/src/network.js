import {secureUuid} from './uuid.js';
import {cloudSnapshot} from './cloud.js';
import {signGameRequest,retainReceipt} from './fairClient.js';
export const ENDPOINT='wss://articweb3.onrender.com';
export const INVITE_ROOT='https://articweb3.onrender.com/arctic-play/join?room=';
export const WEB_APP_URL='https://articweb3.onrender.com/arctic-play/app/';
export const CLIENT_CAPABILITIES=['dominion-teams-v1','hall-access-v1','dominion-flex-dice-v1','account-play-v1','fair-play-v1'];
export function browserRoomLink(code){
  const room=String(code||'').trim().toUpperCase();
  if(!/^[A-Z2-9]{6}$/.test(room))throw new Error('Choose a valid private room first.');
  return WEB_APP_URL+'?room='+room;
}
export async function requireServiceFeature(feature){
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),15000);
  try{
    const response=await fetch('https://articweb3.onrender.com/arctic-play/health',{signal:abort.signal,cache:'no-store'});
    if(!response.ok)throw new Error('The game service is reconnecting. Please retry in a moment.');
    const health=await response.json();
    if(!health.capabilities?.includes(feature))throw new Error(feature==='dominion-teams-v1'?'Online 2v2 is awaiting the service update. You can play 2v2 in practice or choose Four-way with friends.':feature==='dominion-flex-dice-v1'?'The online service needs its dice update before one-die rolls or skipping can be used.':feature==='hall-access-v1'?'Online hall invitations are awaiting the unlock service update. Your room code is kept here.':'Browser play is awaiting the service update. Please try again later.');
  }catch(error){if(error.name==='AbortError')throw new Error('The game service did not answer. Please retry.');throw error;}
  finally{clearTimeout(timer);}
}

export class RoomClient {
  constructor(){this.socket=null;this.opening=null;this.recovery=null;this.pending=new Map();this.listeners=new Set();this.statusListeners=new Set();this.session=null;this.status='offline';this.retry=null;this.backoff=1000;this.closed=false;}
  setStatus(value){this.status=value;for(const listener of this.statusListeners)listener(value);}
  listen(callback){this.listeners.add(callback);return()=>this.listeners.delete(callback);}
  onStatus(callback){this.statusListeners.add(callback);callback(this.status);return()=>this.statusListeners.delete(callback);}
  async connect(){
    if(this.socket?.readyState===WebSocket.OPEN)return;
    if(this.opening)return this.opening;
    this.closed=false;this.setStatus('connecting');
    const pendingConnection=new Promise((resolve,reject)=>{
      const socket=new WebSocket(ENDPOINT);this.socket=socket;
      const timer=setTimeout(()=>{socket.close();reject(new Error('The server is waking up. Please retry in a moment.'));},45000);
      socket.onopen=()=>{clearTimeout(timer);if(this.socket!==socket){socket.close();reject(new Error('The connection has been refreshed.'));return;}this.backoff=1000;this.setStatus('online');resolve();if(this.session)this.call('ap_room_get',this.session).catch(error=>this.emit({error:error.message}));};
      socket.onmessage=({data})=>{
        if(this.socket!==socket)return;
        let packet;try{packet=JSON.parse(data);}catch{return;}
        if(packet.payload?.room){this.room=packet.payload.room;try{retainReceipt(this.room);}catch{}}
        const pending=this.pending.get(packet.requestId);
        if(pending){clearTimeout(pending.timer);this.pending.delete(packet.requestId);packet.type==='error'?pending.reject(new Error(packet.payload?.message||'Room request failed.')):pending.resolve(packet.payload);}
        if(packet.type==='ap_room_update'&&packet.payload?.room)this.emit({room:packet.payload.room});
        if(packet.type==='ap_access_refresh')this.emit({accessRefresh:true});
      };
      socket.onerror=()=>{};
      socket.onclose=()=>{
        clearTimeout(timer);if(this.socket!==socket){reject(new Error('The connection has been refreshed.'));return;}this.socket=null;this.opening=null;this.setStatus('offline');
        reject(new Error('Connection interrupted. Your seat is saved on this phone.'));
        for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('Connection interrupted. Reconnect before making another move.'));}this.pending.clear();
        if(this.session&&!this.closed){clearTimeout(this.retry);this.retry=setTimeout(()=>this.connect().catch(()=>{}),this.backoff);this.backoff=Math.min(this.backoff*2,15000);}
      };
    });
    const opening=pendingConnection.finally(()=>{if(this.opening===opening)this.opening=null;});
    this.opening=opening;return opening;
  }
  emit(value){for(const callback of this.listeners)callback(value);}
  async call(type,payload={}){
    await this.connect();
    payload=await signGameRequest(type,payload,this.room);
    const socket=this.socket;if(socket?.readyState!==WebSocket.OPEN)throw new Error('Connection interrupted. Reconnect and try again.');
    const requestId=secureUuid();
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(requestId);reject(new Error('The room did not answer. Reconnect and try again.'));},type==='ap_game_action'?40000:20000);
      this.pending.set(requestId,{resolve,reject,timer});
      try{socket.send(JSON.stringify({type,requestId,payload:{...payload,...(cloudSnapshot().session?{cloudSession:cloudSnapshot().session.session}:{}),capabilities:CLIENT_CAPABILITIES}}));}catch(error){clearTimeout(timer);this.pending.delete(requestId);reject(error);}
    });
  }
  useSession(session){this.session=session;}
  recover(){
    if(!this.session||this.closed)return Promise.resolve();
    if(this.recovery)return this.recovery;
    this.recovery=(async()=>{
      clearTimeout(this.retry);this.backoff=1000;
      const previous=this.socket;this.socket=null;this.opening=null;
      // A backgrounded Safari tab can retain an apparently open dead socket.
      // Reauthenticate on a fresh socket, without replaying a pending move.
      for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('Connection refreshed. Check the board before moving again.'));}this.pending.clear();
      previous?.close();await this.connect();
    })().finally(()=>{this.recovery=null;});
    return this.recovery;
  }
  async detach(){const session=this.session;this.session=null;if(session&&this.socket?.readyState===WebSocket.OPEN)await this.call('ap_room_detach',session).catch(()=>{});}
  close(){this.closed=true;this.session=null;clearTimeout(this.retry);this.socket?.close();}
}
export function bindRoomLifecycle(client,win=globalThis.window,doc=globalThis.document){
  if(!win||!doc)return()=>{};
  let hiddenAt=null;
  const recover=()=>{if(client.session&&!doc.hidden)client.recover().catch(error=>client.emit({error:error.message}));};
  const hide=()=>{hiddenAt=Date.now();};
  const visibility=()=>{
    if(doc.hidden){hide();return;}
    if(hiddenAt!==null&&(Date.now()-hiddenAt>=5000||client.socket?.readyState!==1))recover();
    hiddenAt=null;
  };
  const show=event=>{if(event.persisted){hiddenAt=null;recover();}};
  win.addEventListener('online',recover);win.addEventListener('pagehide',hide);win.addEventListener('pageshow',show);doc.addEventListener('visibilitychange',visibility);
  return()=>{win.removeEventListener('online',recover);win.removeEventListener('pagehide',hide);win.removeEventListener('pageshow',show);doc.removeEventListener('visibilitychange',visibility);};
}
export const roomClient=new RoomClient();
