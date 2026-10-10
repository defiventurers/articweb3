export const ENDPOINT='wss://articweb3.onrender.com';
export const INVITE_ROOT='https://articweb3.onrender.com/arctic-play/join?room=';
export class RoomClient {
  constructor(){this.socket=null;this.opening=null;this.pending=new Map();this.listeners=new Set();this.statusListeners=new Set();this.session=null;this.status='offline';this.retry=null;this.backoff=1000;this.closed=false;}
  setStatus(value){this.status=value;for(const listener of this.statusListeners)listener(value);}
  listen(callback){this.listeners.add(callback);return()=>this.listeners.delete(callback);}
  onStatus(callback){this.statusListeners.add(callback);callback(this.status);return()=>this.statusListeners.delete(callback);}
  async connect(){
    if(this.socket?.readyState===WebSocket.OPEN)return;
    if(this.opening)return this.opening;
    this.closed=false;this.setStatus('connecting');
    this.opening=new Promise((resolve,reject)=>{
      const socket=new WebSocket(ENDPOINT);this.socket=socket;
      const timer=setTimeout(()=>{socket.close();reject(new Error('The server is waking up. Please retry in a moment.'));},45000);
      socket.onopen=()=>{clearTimeout(timer);this.backoff=1000;this.setStatus('online');resolve();if(this.session)this.call('ap_room_get',this.session).catch(error=>this.emit({error:error.message}));};
      socket.onmessage=({data})=>{
        let packet;try{packet=JSON.parse(data);}catch{return;}
        const pending=this.pending.get(packet.requestId);
        if(pending){clearTimeout(pending.timer);this.pending.delete(packet.requestId);packet.type==='error'?pending.reject(new Error(packet.payload?.message||'Room request failed.')):pending.resolve(packet.payload);}
        if(packet.type==='ap_room_update'&&packet.payload?.room)this.emit({room:packet.payload.room});
      };
      socket.onerror=()=>{};
      socket.onclose=()=>{
        clearTimeout(timer);if(this.socket===socket){this.socket=null;this.opening=null;this.setStatus('offline');}
        reject(new Error('Connection interrupted. Your seat is saved on this phone.'));
        for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('Connection interrupted. Reconnect before making another move.'));}this.pending.clear();
        if(this.session&&!this.closed){clearTimeout(this.retry);this.retry=setTimeout(()=>this.connect().catch(()=>{}),this.backoff);this.backoff=Math.min(this.backoff*2,15000);}
      };
    }).finally(()=>{this.opening=null;});
    return this.opening;
  }
  emit(value){for(const callback of this.listeners)callback(value);}
  async call(type,payload={}){
    await this.connect();
    const requestId=crypto.randomUUID();
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(requestId);reject(new Error('The room did not answer. Reconnect and try again.'));},20000);
      this.pending.set(requestId,{resolve,reject,timer});
      this.socket.send(JSON.stringify({type,requestId,payload}));
    });
  }
  useSession(session){this.session=session;}
  async detach(){const session=this.session;this.session=null;if(session&&this.socket?.readyState===WebSocket.OPEN)await this.call('ap_room_detach',session).catch(()=>{});}
  close(){this.closed=true;this.session=null;clearTimeout(this.retry);this.socket?.close();}
}
export const roomClient=new RoomClient();
