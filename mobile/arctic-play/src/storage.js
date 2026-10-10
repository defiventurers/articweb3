const ROOT='arctic-play.v1.';
export function read(key,fallback){try{return JSON.parse(localStorage.getItem(ROOT+key))??fallback;}catch{return fallback;}}
export function write(key,value){try{localStorage.setItem(ROOT+key,JSON.stringify(value));return true;}catch{return false;}}
export function getProfile(){const old=read('profile',null);if(old?.id)return old;const profile={id:crypto.randomUUID(),name:'Player',avatar:'blue'};write('profile',profile);return profile;}
export function saveRoom(session,room){const saved=read('rooms',{});saved[room.roomCode]={session,room,at:Date.now()};const entries=Object.entries(saved).sort((a,b)=>b[1].at-a[1].at).slice(0,20);write('rooms',Object.fromEntries(entries));}
export function forgetRoom(code){const saved=read('rooms',{});delete saved[code];write('rooms',saved);}
