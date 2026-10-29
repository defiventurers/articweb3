const {createPrivateKey,createPublicKey,sign}=require('node:crypto');
const pinned=require('../mobile/arctic-play/src/offlinePublicKey.cjs');
const PRODUCT='offline-access-v1',AUD='xyz.arcticdominion.play';
function createLicenseSigner({privateKey=process.env.AK_OFFLINE_LICENSE_PRIVATE_KEY,publicKey=pinned}={}){
 let key;try{key=createPrivateKey(String(privateKey||'').replace(/\\n/g,'\n'));const got=createPublicKey(key).export({format:'jwk'});if(got.n!==publicKey.jwk.n||got.e!==publicKey.jwk.e)key=null;}catch{}
 return {ready:!!key,issue(claims){if(!key)throw Error('Offline license signing is not configured.');const header=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT',kid:publicKey.kid})).toString('base64url'),payload=Buffer.from(JSON.stringify(claims)).toString('base64url'),input=header+'.'+payload;return input+'.'+sign('RSA-SHA256',Buffer.from(input),key).toString('base64url');}};
}
function createPlayAccess({signer,...signerOptions}={}){
 signer ||= createLicenseSigner(signerOptions);
 return{ready:signer.ready,async route({req,path,method,body,authenticated,error,now}){
  if(path!=='/play-access'||method!=='POST')return;
  const b=await body(req);if(!/^[a-f0-9-]{36}$/.test(b.installation||''))throw error('Reopen the app to restore this installation.');
  return authenticated(req,a=>{
   const owns=!a.temporaryExpiresAt&&a.entitlements?.[PRODUCT]?.active===true&&a.entitlements[PRODUCT].mode==='live';
   let license=null;
   if(owns&&signer.ready){const entitlements=Object.fromEntries(Object.entries(a.entitlements||{}).filter(([id,v])=>(id.startsWith('hall-')||id==='all-halls-v1')&&v.active===true&&v.mode==='live'));
    license=signer.issue({v:1,aud:AUD,sub:a.id,installation:b.installation,product:PRODUCT,mode:'live',iat:Math.floor(now()/1000),entitlements});}
   return {accountId:a.id,online:true,serverNow:now(),leaseSeconds:Math.min(60,Math.max(0,((a.temporaryExpiresAt||now()+60000)-now())/1000)),offlineOwned:owns,offlineReady:signer.ready,license,email:a.email||null,marketingChoiceNeeded:!!a.email&&!a.marketingChoiceSet,marketing:!!a.marketing?.enabled};
  });
 }};
}
module.exports={createLicenseSigner,createPlayAccess,PRODUCT,AUD};
