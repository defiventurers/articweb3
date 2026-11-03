import pinned from './offlinePublicKey.cjs';
function bytes(value){if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value))throw Error();return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
export async function verifyOfflineLicense(token,accountId,installation,publicKey=pinned){
 try{
  if(typeof token!=='string'||token.length>15000)return null;const p=token.split('.');if(p.length!==3)return null;
  const h=JSON.parse(new TextDecoder().decode(bytes(p[0]))),c=JSON.parse(new TextDecoder().decode(bytes(p[1])));
  if(h.alg!=='RS256'||h.kid!==publicKey.kid||h.typ!=='JWT'||c.v!==1||c.aud!=='xyz.arcticdominion.play'||c.sub!==accountId||c.installation!==installation||c.product!=='offline-access-v1'||c.mode!=='live'||!Number.isSafeInteger(c.iat)||c.iat<=0)return null;
  const key=await crypto.subtle.importKey('jwk',publicKey.jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(p[2]),new TextEncoder().encode(p[0]+'.'+p[1])))return null;
  return c;
 }catch{return null;}
}
