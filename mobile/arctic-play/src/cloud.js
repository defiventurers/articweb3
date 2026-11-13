import {secureUuid} from './uuid.js';
import {read,write} from './storage.js';
import progressModel from './cloudProgress.cjs';
import {verifyOwnerCode,normalizeOwnerCode} from './ownerAccess.js';
import {restoreCachedEntitlements} from './cloudEntitlements.js';
import {harborConnection} from './harborConnection.js';
const {PROGRESS_KEYS,mergeProgress}=progressModel;
export const CLOUD_ROOT='https://articweb3.onrender.com/arctic-play/v3';
const listeners=new Set();let timer,applying=false,syncing=null,queued=false,sessionRevision=0;
function loadSession(){try{return window.Android?.getCloudSession?JSON.parse(window.Android.getCloudSession()||'null'):read('cloud-session',null);}catch{return null;}}
const restored=loadSession(),cached=read('cloud-entitlements',null);
let current={session:restored,status:'On this phone',available:null,entitlements:restoreCachedEntitlements(restored,cached)};
function publish(patch){current={...current,...patch};for(const fn of listeners)fn({...current});}
export const cloudSnapshot=()=>({...current});
export const watchCloud=fn=>{listeners.add(fn);return()=>listeners.delete(fn);};
export function saveSession(value,preserveEntitlements=false){if(window.Android?.setCloudSession){if(!window.Android.setCloudSession(JSON.stringify(value)))throw Error('Secure storage is unavailable on this phone.');}else if(!write('cloud-session',value))throw Error('This phone could not save the account change. Please try again.');if(current.session?.session!==value?.session||current.session?.accountId!==value?.accountId||current.session?.ownerRecovery!==value?.ownerRecovery)sessionRevision++;publish({session:value,...(preserveEntitlements?{}:{entitlements:{}})});}
export async function cloudRequest(path,{method='GET',data,auth=true,token=current.session?.session,timeoutMs=15000}={}){if(/^\/(auth\/|recover$|passport$|play-access$)/.test(path))await harborConnection.ensureReady();const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),timeoutMs);try{const response=await fetch(CLOUD_ROOT+path,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...(auth&&token?{Authorization:'Bearer '+token}:{})},body:data?JSON.stringify(data):undefined,signal:controller.signal});let value;try{value=await response.json();}catch{throw Error('The connection was interrupted. Please try again.');}if(!response.ok){if(response.status===401&&auth&&token===current.session?.session){write('cloud-entitlements',null);publish({entitlements:{}});}throw Object.assign(Error(value.error||'Please try again later.'),{status:response.status});}return value;}catch(e){throw Object.assign(Error(e.name==='AbortError'?'The connection took too long. Try again when you’re online.':e.message||'Connect to the internet to continue.'),{status:e.status});}finally{clearTimeout(timeout);}}
export async function cloudCapabilities(){try{const value=await cloudRequest('/capabilities',{auth:false});publish({available:value.cloud,commerce:value.commerce});return value;}catch{publish({available:false});return{cloud:false,commerce:false};}}
function documents(){return Object.fromEntries(PROGRESS_KEYS.map(key=>[key,read(key,{})]));}
export async function syncCloud(){
 if(!current.session?.session)return;
 if(syncing){queued=true;return syncing;}
 const expected=current.session,revision=sessionRevision,valid=()=>revision===sessionRevision&&current.session?.session===expected.session;
 publish({status:'Saving progress…'});
 syncing=(async()=>{try{
  const value=await cloudRequest('/progress',{method:'POST',data:{progress:documents()},token:expected.session});
  if(!valid())return;
  const merged=mergeProgress(documents(),value.progress);applying=true;
  for(const[key,v]of Object.entries(merged)){const original=read(key,{});write(key,key==='companion-journey.v1'||key.startsWith('complete-rule-guide')?{...original,...v}:v);}
  applying=false;
  const account=await cloudRequest('/account',{token:expected.session});if(!valid())return;
  write('cloud-entitlements',{accountId:expected.accountId,value:account.entitlements||{},at:Date.now()});
  publish({status:'Saved to your account',lastSync:Date.now(),entitlements:account.entitlements||{}});window.dispatchEvent(new Event('arctic-cloud-progress'));return value;
 }catch(e){if(valid()){publish({status:e.message});throw e;}}finally{applying=false;syncing=null;if(queued&&current.session?.session){queued=false;clearTimeout(timer);timer=setTimeout(()=>syncCloud().catch(()=>{}),5000);}}})();return syncing;
}
export async function createCloudAccount(){const value=await cloudRequest('/accounts',{method:'POST',data:{},auth:false});saveSession({accountId:value.accountId,session:value.session});await syncCloud().catch(()=>{});return value.recoveryCode;}
export async function acceptVerifiedSession(value){saveSession({...value,...(current.session?.ownerRecovery?{ownerRecovery:current.session.ownerRecovery}:{})});await syncCloud().catch(()=>{});return value;}
export async function recoverCloudAccount(code){if(normalizeOwnerCode(code).startsWith('AK-OWNER-')){if(!await verifyOwnerCode(code))throw Error('That owner recovery code was not recognised. Check every group.');saveSession({...current.session,ownerRecovery:normalizeOwnerCode(code)},true);publish({status:'Owner access · Permanent on this phone'});return;}const value=await cloudRequest('/recover',{method:'POST',data:{code:code.trim()},auth:false});saveSession({...value,...(current.session?.ownerRecovery?{ownerRecovery:current.session.ownerRecovery}:{})});await syncCloud().catch(()=>{});}
export async function rotateCloudCode(){const value=await cloudRequest('/rotate',{method:'POST',data:{}});saveSession({accountId:value.accountId,session:value.session});return value.recoveryCode;}
export async function signOutCloud(){
 const token=current.session?.session;
 // Clear locally first. A sleeping service must never hold the player at logout.
 saveSession(null);clearTimeout(timer);queued=false;
 for(const key of ['cloud-entitlements','offline-license.v1','auth-handoff','hall-checkout'])write(key,null);
 write('usage-sharing',false);write('usage-queue',[]);publish({status:'Logged out on this phone',entitlements:{}});
 window.dispatchEvent(new Event('arctic-logout'));
 if(token)cloudRequest('/logout',{method:'POST',data:{},token}).catch(()=>{});
}
export async function deleteCloudAccount(code){await cloudRequest('/account',{method:'DELETE',data:{code:code.trim()}});saveSession(null);publish({status:'Account deleted. Local progress stays on this phone.'});}
export async function usageConsent(enabled){write('usage-sharing',enabled);if(!enabled){write('usage-queue',[]);if(current.session)await cloudRequest('/metrics',{method:'POST',data:{clear:true}});}}
export function measure(name,game,product){if(!read('usage-sharing',false)||!current.session)return;const event={id:secureUuid(),name,game,...(product?{product}:{})};write('usage-queue',[...read('usage-queue',[]),event].slice(-40));flushMetrics().catch(()=>{});}
let metricsSending=false;
async function flushMetrics(){if(metricsSending||!current.session||!read('usage-sharing',false))return;metricsSending=true;const events=read('usage-queue',[]);try{if(events.length){await cloudRequest('/metrics',{method:'POST',data:{consent:true,events}});const sent=new Set(events.map(e=>e.id));write('usage-queue',read('usage-queue',[]).filter(e=>!sent.has(e.id)));}}finally{metricsSending=false;}}
export function startCloud(){const changed=e=>{if(!applying&&current.session?.session&&PROGRESS_KEYS.includes(e.detail.key)){clearTimeout(timer);timer=setTimeout(()=>syncCloud().catch(()=>{}),3000);}};const online=()=>{syncCloud().catch(()=>{});flushMetrics().catch(()=>{});};window.addEventListener('arctic-storage',changed);window.addEventListener('online',online);const visible=()=>{if(document.visibilityState==='visible'&&current.session?.session)online();};document.addEventListener('visibilitychange',visible);if(current.session?.session)online();measure('app_open');return()=>{clearTimeout(timer);window.removeEventListener('arctic-storage',changed);window.removeEventListener('online',online);document.removeEventListener('visibilitychange',visible);};}

function b64url(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export async function startGoogleSignIn(){return startGameWallet('login');}
export async function startParaSignIn(){return startGameWallet(current.session?.session?'link':'login');}
export async function startGameWallet(purpose='manage'){
 const harborIntent=harborConnection.captureIntent();
 const verifier=b64url(crypto.getRandomValues(new Uint8Array(32))),challenge=b64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
 harborConnection.assertIntent(harborIntent);
 if(!write('auth-handoff',{verifier,at:Date.now()}))throw Error('This phone could not save sign-in. Free some storage and try again.');
 const value=await cloudRequest('/auth/para/start',{method:'POST',data:{challenge,purpose,platform:window.Android?'android':'web',returnPath:location.pathname.startsWith('/play/')?'/play/':'/arctic-play/app/'},auth:purpose!=='login',timeoutMs:20000});
 const u=new URL(value.url);if(u.origin!=='https://articweb3.onrender.com'||u.pathname!=='/arctic-play/wallet/'||!/^[A-Za-z0-9_-]{43}$/.test(u.searchParams.get('attempt')||''))throw Error('Sign-in could not be opened.');
 if(window.Android){if(typeof window.Android.openAuth!=='function')throw Error('Sign-in is unavailable in this installation. Reopen the app and try again.');if(!window.Android.openAuth(value.url))throw Error('The app could not open sign-in. Try again or use a recovery code.');}else location.assign(value.url);
}
let exchanging=null;
export async function finishGoogleSignIn(ticket){
 if(exchanging){if(exchanging.ticket===ticket)return exchanging.task;throw Error('Another sign-in is finishing. Please wait.');}
 const task=(async()=>{const saved=read('auth-handoff',null);if(!saved||Date.now()-saved.at>600000)throw Error('Start sign-in on this phone again.');const value=await cloudRequest('/auth/exchange',{method:'POST',data:{ticket,verifier:saved.verifier},auth:false,timeoutMs:60000});await acceptVerifiedSession(value);write('auth-handoff',null);return value;})();
 exchanging={ticket,task};try{return await task;}finally{if(exchanging?.task===task)exchanging=null;}
}
export const requestEmailCode=email=>cloudRequest('/auth/email/start',{method:'POST',data:{email},auth:false});
export async function verifyEmailCode(attempt,code){return acceptVerifiedSession(await cloudRequest('/auth/email/verify',{method:'POST',data:{attempt,code},auth:false}));}
export async function saveEmailChoice(enabled){await cloudRequest('/communication-preferences',{method:'POST',data:{enabled}});if(current.session)saveSession({...current.session,marketingChoiceNeeded:false},true);}

