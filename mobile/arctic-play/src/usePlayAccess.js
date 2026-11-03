import {secureUuid} from './uuid.js';
import {useEffect,useRef,useState} from 'react';
import {cloudSnapshot,watchCloud,cloudRequest,finishGoogleSignIn} from './cloud.js';
import {read,write} from './storage.js';
import {verifyOfflineLicense} from './offlineLicense.js';
import {verifyOwnerCode} from './ownerAccess.js';
const INSTALL='play-installation.v1',LICENSE='offline-license.v1';
function installation(){let id;try{id=window.Android?.getInstallationId?.();}catch{}if(!/^[a-f0-9-]{36}$/.test(id||'')){id=read(INSTALL,null);if(!/^[a-f0-9-]{36}$/.test(id||'')){id=secureUuid();write(INSTALL,id);}}return id;}
export function usePlayAccess(){
 const [cloud,setCloud]=useState(cloudSnapshot),[online,setOnline]=useState(false),[checking,setChecking]=useState(true),[license,setLicense]=useState(null),[message,setMessage]=useState('Checking your account…'),[consent,setConsent]=useState(false),[tick,setTick]=useState(0);
 const install=useRef(installation()),lease=useRef(0),generation=useRef(0),refreshing=useRef(null),active=useRef(true),lastAccount=useRef(cloud.session?.accountId);
 const accountId=cloud.session?.accountId;
 const [owner,setOwner]=useState(false);
 useEffect(()=>{let live=true;setOwner(false);verifyOwnerCode(cloud.session?.ownerRecovery).then(valid=>{if(live)setOwner(valid);});return()=>{live=false;};},[cloud.session?.ownerRecovery]);
 useEffect(()=>watchCloud(setCloud),[]);
 async function refresh(){
  const expected=cloudSnapshot().session?.accountId;if(refreshing.current&&refreshing.current.account===expected)return refreshing.current.task;const g=++generation.current;
  if(!expected){setChecking(false);setOnline(false);lease.current=0;return;}
  const task=(async()=>{try{
   const r=await cloudRequest('/play-access',{method:'POST',data:{installation:install.current}});
   if(!active.current||g!==generation.current||expected!==cloudSnapshot().session?.accountId)return;
   if(r.accountId!==expected||r.online!==true||!Number.isFinite(r.leaseSeconds)||r.leaseSeconds<=0||r.leaseSeconds>60)throw Error('The account service needs its access update.');
   lease.current=performance.now()+Math.min(60,r.leaseSeconds)*1000;setOnline(true);setConsent(r.marketingChoiceNeeded===true);setMessage('Signed in · Online');
   if(r.license){const verified=await verifyOfflineLicense(r.license,expected,install.current);if(g!==generation.current)return;if(verified){write(LICENSE,{accountId:expected,token:r.license});setLicense(verified);}else{write(LICENSE,null);setLicense(null);setMessage('Your offline pass could not be verified. Please restore it online.');}}
   else if(!r.offlineOwned){write(LICENSE,null);setLicense(null);}
  }catch(e){if(active.current&&g===generation.current){lease.current=0;setOnline(false);setMessage(e.message);if(e.status===401){write(LICENSE,null);setLicense(null);}}}finally{if(active.current&&g===generation.current)setChecking(false);}})();
  refreshing.current={account:expected,task};try{await task;}finally{if(refreshing.current?.task===task)refreshing.current=null;}
 }
 useEffect(()=>{
  active.current=true;const g=++generation.current;lease.current=0;setOnline(false);setLicense(null);setChecking(!!accountId);setConsent(!!cloud.session?.marketingChoiceNeeded);
  if(lastAccount.current!==accountId){write(LICENSE,null);lastAccount.current=accountId;}
  const saved=read(LICENSE,null);
  // Do not invalidate local verification by incrementing refresh generation until it has completed.
  Promise.resolve(accountId&&saved?.accountId===accountId?verifyOfflineLicense(saved.token,accountId,install.current):null).then(v=>{if(g!==generation.current||!active.current)return;if(v)setLicense(v);refresh();});
  return()=>{generation.current++;};
 },[accountId]);
 useEffect(()=>{
  const lost=()=>{lease.current=0;setOnline(false);setMessage('Connect to continue, or restore your Offline Access Pass.');},back=()=>refresh(),visible=()=>{if(document.visibilityState==='visible'){if(performance.now()>lease.current)setOnline(false);refresh();}};
  const timer=setInterval(()=>{setTick(v=>v+1);if(performance.now()>lease.current)setOnline(false);if(navigator.onLine!==false)refresh();},20000);
  window.addEventListener('offline',lost);window.addEventListener('online',back);document.addEventListener('visibilitychange',visible);
  window.arcticAuth=ticket=>finishGoogleSignIn(ticket).then(()=>refresh()).catch(e=>{setMessage(e.message);window.dispatchEvent(new CustomEvent('arctic-auth-error',{detail:{message:e.message}}));});const ticket=new URLSearchParams(location.search).get('auth_ticket');if(ticket){history.replaceState(null,'',location.pathname+location.search.replace(/([?&])auth_ticket=[^&]*&?/,'$1').replace(/[?&]$/,'')+location.hash);window.arcticAuth(ticket);}
  return()=>{active.current=false;clearInterval(timer);window.removeEventListener('offline',lost);window.removeEventListener('online',back);document.removeEventListener('visibilitychange',visible);delete window.arcticAuth;};
 },[]);
 const onlineAllowed=!!accountId&&online&&navigator.onLine!==false&&performance.now()<lease.current;
 return {accountId,session:cloud.session,owner,allowed:owner||!!accountId&&(onlineAllowed||!!license),online:onlineAllowed,offline:owner||!!license,offlineEntitlements:{...(license?{...license.entitlements,'offline-access-v1':{active:true,mode:'live',verifiedAt:license.iat*1000}}:{}),...(owner?{'owner-access-v1':{active:true,mode:'owner'}}:{})},checking,message:owner?'Owner access · Permanent':message,consentNeeded:!owner&&!!accountId&&consent,refresh,consentDone:()=>{setConsent(false);refresh();}};
}
