import verifier from './ownerVerifier.json' with {type:'json'};

export function normalizeOwnerCode(value){return String(value||'').trim().toUpperCase().replace(/\s/g,'');}
export async function verifyOwnerCode(value){
 try{
  const code=normalizeOwnerCode(value);
  if(!/^AK-OWNER-(?:[0-9A-F]{6}-){7}[0-9A-F]{6}$/.test(code))return false;
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code)));
  const digest=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return digest===verifier.sha256;
 }catch{return false;}
}
