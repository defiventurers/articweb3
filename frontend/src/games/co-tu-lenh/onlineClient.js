import { VERSION } from './rules.js';
const key=code=>`antarctic-ctl-seat:${code}`;
export const newSeatToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
export const getSeat=code=>{try{const x=JSON.parse(localStorage.getItem(key(code))||'null');return x?.roomCode===code&&/^[a-f0-9]{64}$/.test(x.token)?x:null;}catch{return null;}};
export const saveSeat=seat=>{try{localStorage.setItem(key(seat.roomCode),JSON.stringify(seat));}catch{/* private browsing */}};
export const inviteUrl=(code,baseUrl=null)=>{const url=new URL(baseUrl||window.location.href);url.search=new URLSearchParams({game:'co-tu-lenh',room:code}).toString();return url.toString();};
export class CoTuLenhClient {
  constructor(endpoint=null){this.endpoint=endpoint;this.socket=null;this.pending=new Map();this.connecting=null;this.serial=0;this.onPacket=()=>{};this.onStatus=()=>{};}
  async connect(){if(this.socket?.readyState===1)return this.socket;if(this.connecting)return this.connecting;
    const endpoint=this.endpoint||import.meta.env?.VITE_WS_URL||(import.meta.env?.DEV?'ws://localhost:10000':'');
    if(!endpoint)throw Error('Online lobby unavailable. Set VITE_WS_URL for this deployment.');
    const pending=new Promise((resolve,reject)=>{
      const ws=new WebSocket(endpoint);this.socket=ws;
      const timeout=setTimeout(()=>{ws.close();reject(Error('Lobby connection timed out'));},12000);
      ws.onopen=()=>{clearTimeout(timeout);this.onStatus(true);resolve(ws);};
      ws.onerror=()=>{clearTimeout(timeout);reject(Error('Could not connect to game lobby'));};
      ws.onclose=()=>{clearTimeout(timeout);if(this.socket===ws){this.socket=null;this.onStatus(false);}for(const [id,item]of this.pending){clearTimeout(item.timer);item.reject(Error('Lobby disconnected'));this.pending.delete(id);}reject(Error('Lobby disconnected'));};
      ws.onmessage=e=>{let msg;try{msg=JSON.parse(e.data);}catch{return;}
        if(['ctl_ack','ctl_room_state'].includes(msg.type)&&msg.payload?.room){
          const room=msg.payload.room;
          if(room.gameId!=='co-tu-lenh'||room.rulesVersion!==VERSION||room.gameState?.rulesVersion!==VERSION){
            const error=Error('This lobby uses incompatible Commander Chess rules. A matching v0.4 backend is required.');
            for(const [id,item]of this.pending){clearTimeout(item.timer);item.reject(error);this.pending.delete(id);}
            ws.close();return;
          }
        }
        const item=this.pending.get(msg.requestId);if(item){clearTimeout(item.timer);this.pending.delete(msg.requestId);msg.type==='error'?item.reject(Error(msg.payload?.message||'Request rejected')):item.resolve(msg.payload);}
        this.onPacket(msg);
      };
    });this.connecting=pending;try{return await pending;}finally{if(this.connecting===pending)this.connecting=null;}
  }
  async request(type,payload={}){
    const ws=await this.connect();const id=`ctl-${++this.serial}`;
    return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('The lobby did not confirm the operation'));},12000);
      this.pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({type,requestId:id,payload:{...payload,rulesVersion:VERSION}}));
    });
  }
  close(){const ws=this.socket;this.socket=null;ws?.close();for(const [id,p]of this.pending){clearTimeout(p.timer);p.reject(Error('Session closed'));this.pending.delete(id);}this.onPacket=()=>{};this.onStatus=()=>{};}
}
