(()=>{'use strict';
const root='https://articweb3.onrender.com/arctic-play/v3',sessionKey='ak.first33.session.v1',pkceKey='ak.first33.pkce.v1',$=id=>document.getElementById(id);
let session=sessionStorage.getItem(sessionKey),account=null,passport=null,loading=false,poll=null,ready=false;
function setStatus(message){$('connection-status').textContent=message;}
function error(message){const box=$('passport-error');box.textContent=String(message||'Please try again.');box.hidden=false;}
function clearError(){$('passport-error').hidden=true;$('passport-error').textContent='';}
function setBusy(value){loading=value;for(const id of ['sign-in','register','refresh'])$(id).disabled=value||id==='sign-in'&&!ready;}
const ageKey='ak.first33.adult.v1';
if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.filter(r=>new URL(r.scope).pathname==='/early/').map(r=>r.unregister()))).catch(()=>{});
const base64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
async function api(path,data,needsAuth=true,timeoutMs=30000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{const response=await fetch(root+path,{method:data?'POST':'GET',mode:'cors',cache:'no-store',signal:controller.signal,headers:{...(data?{'Content-Type':'application/json'}:{}),...(needsAuth&&session?{Authorization:'Bearer '+session}:{})},body:data?JSON.stringify(data):undefined});let result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||'Lantern Harbor is still connecting. Please try again.');return result;}catch(e){if(e.name==='AbortError')throw Error('The server is still waking up. Please try again.');throw e;}finally{clearTimeout(timer);}
}
function tab(name){for(const v of ['home','passport'])$(v+'-view').hidden=v!==name;for(const b of document.querySelectorAll('[data-tab]')){const selected=b.dataset.tab===name;b.classList.toggle('selected',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}window.scrollTo(0,0);if(name==='passport')refresh().catch(e=>error(e.message));}
function comingSoon(){const d=$('soon-dialog');if(typeof d.showModal==='function'&&!d.open)d.showModal();else d.setAttribute('open','');}
function rewardStatus(kind){const d=passport?.deliveries?.find(v=>v.kind===kind);if(!d)return kind==='egg'?'Not allocated — limited to the first 33 eligible registrations.':'Registration is pending.';
 if(d.status==='confirmed')return 'Confirmed on '+(passport.network||'the selected network')+' • #'+(d.tokenId||'');
 if(d.status==='awaiting_setup')return 'Reserved • Minting setup pending';
 if(d.status==='blocked')return 'Mint needs support • Your reservation is saved';
 if(d.status==='submitted')return 'Transaction submitted • Confirming on-chain';
 return kind==='egg'?'Egg #'+passport.eggSerial+' reserved • '+d.status.replaceAll('_',' '):'Passport registered • '+d.status.replaceAll('_',' ');
}
function updateTile(kind,id){const d=passport?.deliveries?.find(v=>v.kind===kind),a=$(id+'-tx');$(id+'-state').textContent=rewardStatus(kind);if(d?.explorerUrl&&d.status==='confirmed'){a.href=d.explorerUrl;a.hidden=false;}else{a.hidden=true;a.removeAttribute('href');}}
function showAccount(result){account=result.identity;passport=result.passport;const wallet=account?.wallet;
 if(wallet?.provider!=='para'||!/^0x[0-9a-fA-F]{40}$/.test(wallet.address||'')){error('Your verified Para wallet is not ready. Sign in again to finish setup.');$('connect-card').hidden=false;$('registration-card').hidden=true;$('collection-card').hidden=true;return;}
 $('connect-card').hidden=true;$('new-wallet').textContent=wallet.address;$('created-wallet').textContent=wallet.address;
 $('registration-card').hidden=!!passport;$('collection-card').hidden=!passport;
 if(passport){$('welcome-name').textContent='Welcome, '+passport.playerName+'!';$('collection-status').textContent='Registration complete. Your wallet and NFT delivery status are shown below.';updateTile('visa','visa');updateTile('egg','egg');}
}
async function refresh(silent=false){if(!session){$('connect-card').hidden=false;$('registration-card').hidden=true;$('collection-card').hidden=true;return;}
 try{const result=await api('/passport');showAccount(result);if(result.passport){const d=result.passport.deliveries?.find(x=>x.kind==='visa');if(d?.status==='confirmed'){try{const accepted=await api('/passport/acceptance');if(!accepted.confirmed){$('visa-state').textContent='Receipt verification pending';$('visa-tx').hidden=true;}}catch{$('visa-state').textContent='Receipt verification pending';$('visa-tx').hidden=true;}}const egg=result.passport.deliveries?.find(x=>x.kind==='egg');if(egg?.status==='confirmed'){try{const accepted=await api('/passport/egg/acceptance');if(!accepted.confirmed){$('egg-state').textContent='Receipt verification pending';$('egg-tx').hidden=true;}}catch{$('egg-state').textContent='Receipt verification pending';$('egg-tx').hidden=true;}}}clearError();}catch(e){if(e.message.includes('Sign in')||e.message.includes('401')){session=null;sessionStorage.removeItem(sessionKey);}if(!silent)error(e.message);}
}
async function wake(){try{const config=await api('/auth/para/config',undefined,false,25000);ready=!!config.enabled;setStatus(ready?'Harbor connection ready. Choose a sign-in method.':'Passport sign-in needs activation. Please check back shortly.');$('provider-note').textContent=config.environment==='BETA'?'Current Para configuration is BETA; any NFTs are testnet collectibles with no real-world value. Production sign-in requires a verified production Para application.':'Select one of the sign-in methods available through Para.';setBusy(false);}catch(e){ready=false;setStatus('Connecting to Lantern Harbor… The server may be waking up.');$('sign-in').disabled=true;}if(!ready)setTimeout(wake,6000);}
async function signIn(){if(loading)return;clearError();if(!$('adult-confirm').checked)return error('Participants must be at least 18 to use Robinhood Chain testnet.');sessionStorage.setItem(ageKey,'yes');setBusy(true);try{const verifier=base64(crypto.getRandomValues(new Uint8Array(32))),challenge=base64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));sessionStorage.setItem(pkceKey,verifier);const result=await api('/auth/para/start',{challenge,platform:'web',returnPath:'/early/'},false,35000);const url=new URL(result.url);if(url.origin!=='https://articweb3.onrender.com'||url.pathname!=='/arctic-play/wallet/')throw Error('Unexpected sign-in destination.');location.assign(url.href);}catch(e){error(e.message);setBusy(false);}}
async function register(){if(loading)return;clearError();const name=$('player-name').value.trim();if([...name].length<2||[...name].length>24)return error('Your explorer name must have 2–24 characters.');if(!$('consent').checked)return error('Confirm your wallet and NFT delivery consent before registering.');setBusy(true);try{await api('/passport',{playerName:name,walletMode:'embedded',consentVersion:'antarctic-visa-v2',souvenir:false,achievementOptIn:false,campaign:'first33-20261114',adultConfirmed:sessionStorage.getItem(ageKey)==='yes'});await refresh();}catch(e){error(e.message);}finally{setBusy(false);}}
async function exchangeTicket(){const u=new URL(location.href),ticket=u.searchParams.get('auth_ticket');if(!ticket)return;history.replaceState(null,'',u.pathname);const verifier=sessionStorage.getItem(pkceKey);if(!verifier)return error('Please start sign-in again in this tab.');try{setBusy(true);const result=await api('/auth/exchange',{ticket,verifier},false,60000);if(!result.session)throw Error('Your sign-in did not complete.');session=result.session;sessionStorage.setItem(sessionKey,session);sessionStorage.removeItem(pkceKey);tab('passport');}catch(e){error(e.message);}finally{setBusy(false);}}
for(const b of document.querySelectorAll('[data-open-passport]'))b.addEventListener('click',()=>tab('passport'));
for(const b of document.querySelectorAll('[data-tab]'))b.addEventListener('click',()=>tab(b.dataset.tab));
for(const b of document.querySelectorAll('[data-soon]'))b.addEventListener('click',comingSoon);
$('close-soon').addEventListener('click',()=>$('soon-dialog').close());
$('sign-in').addEventListener('click',signIn);$('register').addEventListener('click',register);
$('refresh').addEventListener('click',()=>{setBusy(true);refresh().finally(()=>setBusy(false));});
$('sign-out').addEventListener('click',async()=>{const old=session;session=null;passport=null;account=null;sessionStorage.removeItem(sessionKey);sessionStorage.removeItem(pkceKey);sessionStorage.removeItem(ageKey);clearError();tab('home');if(old)fetch(root+'/logout',{method:'POST',headers:{Authorization:'Bearer '+old,'Content-Type':'application/json'},body:'{}'}).catch(()=>{});});
for(const b of document.querySelectorAll('[data-copy]'))b.addEventListener('click',async()=>{const address=account?.wallet?.address;if(!address)return;try{await navigator.clipboard.writeText(address);b.textContent='Copied!';}catch{b.textContent='Select address to copy';}});
wake();exchangeTicket().then(()=>{if(session)tab('passport');}).catch(e=>error(e.message));
poll=setInterval(()=>{if(session&&passport&&!document.hidden&&!loading)refresh(true).catch(()=>{});},10000);
window.addEventListener('pageshow',()=>{if(session&&document.visibilityState==='visible')refresh(true).catch(()=>{});});
})();