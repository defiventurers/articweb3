'use strict';
const SOURCE='antarcticgaming.co/early',CONSENT='early-signup-v1';
const ORIGINS=new Set(['https://antarcticgaming.co','https://www.antarcticgaming.co']);
const fail=(message,status=400)=>Object.assign(Error(message),{status});
function enrollment(input,origin,at){
 if(!ORIGINS.has(origin))throw fail('Use the Antarctic Gaming signup page.',403);
 if(input?.consentVersion!==CONSENT||input.adultConfirmed!==true)throw fail('Confirm the signup and testnet collectible terms.');
 return {source:SOURCE,consentVersion:CONSENT,adultConfirmed:true,at};
}
function recordEnrollment(account,record,at){
 if(record?.source!==SOURCE||record.consentVersion!==CONSENT||record.adultConfirmed!==true)throw fail('Invalid signup consent.');
 if(account.gameWallet?.provider!=='para'||Number(account.gameWallet.chainId)!==46630)throw fail('A verified Para wallet on Robinhood testnet is required.',409);
 account.earlySignup={source:SOURCE,firstAt:account.earlySignup?.firstAt||at,consentedAt:at,consentVersion:CONSENT,adultConfirmed:true};
}
function createEarlySignup({store,passports,now=Date.now,enabled=process.env.AK_EARLY_AUTO_ENROLL_ENABLED==='true'}={}){
 const active=new Map();
 async function fulfill(id){
  if(!enabled)return {status:'disabled'};
  if(active.has(id))return active.get(id);
  const task=(async()=>{const account=await store.get('account',id);if(account?.earlySignup?.source!==SOURCE||account.earlySignup.consentVersion!==CONSENT||account.earlySignup.adultConfirmed!==true)return {status:'consent_required'};
   try{await passports.autoRegister(account,account.earlySignup.firstAt);return {status:'registered'};}catch(e){return {status:e.status===409?'needs_support':'retrying'};}
  })().finally(()=>active.delete(id));active.set(id,task);return task;
 }
 return {enabled,fulfill,async enroll(ctx,body){if(!enabled)throw fail('Automatic signup is being prepared. Please try again shortly.',503);const record=enrollment(body,ctx.req.headers.origin,now());const id=await ctx.authenticated(ctx.req,a=>{recordEnrollment(a,record,now());return a.id;});return {setup:await fulfill(id)};}};
}
module.exports={SOURCE,CONSENT,enrollment,recordEnrollment,createEarlySignup};
