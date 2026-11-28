(()=>{'use strict';
const root='https://articweb3.onrender.com/arctic-play/v3',sessionKey='ak.first33.session.v1',pkceKey='ak.first33.pkce.v1',$=id=>document.getElementById(id);
let session=sessionStorage.getItem(sessionKey),account=null,passport=null,loading=false,poll=null,ready=false;
function setStatus(message){$('connection-status').textContent=message;}
function error(message){const box=$($('harbor-app').hidden?'entry-error':'passport-error');box.textContent=String(message||'Please try again.');box.hidden=false;}
function clearError(){for(const id of ['passport-error','entry-error']){$(id).hidden=true;$(id).textContent='';}}
function clearSession(){session=null;account=null;passport=null;sessionStorage.removeItem(sessionKey);$('harbor-app').hidden=true;$('harbor-app').setAttribute('inert','');$('entry-gate').hidden=false;$('entry-loading').hidden=true;$('connect-card').hidden=false;$('wallet-card').hidden=true;$('collection-card').hidden=true;}
function setBusy(value){loading=value;for(const id of ['sign-in','refresh'])$(id).disabled=value||id==='sign-in'&&!ready;}
const ageKey='ak.first33.adult.v1';
if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.filter(r=>new URL(r.scope).pathname==='/early/').map(r=>r.unregister()))).catch(()=>{});
const base64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
async function api(path,data,needsAuth=true,timeoutMs=30000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{const response=await fetch(root+path,{method:data?'POST':'GET',mode:'cors',cache:'no-store',signal:controller.signal,headers:{...(data?{'Content-Type':'application/json'}:{}),...(needsAuth&&session?{Authorization:'Bearer '+session}:{})},body:data?JSON.stringify(data):undefined});let result=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(Error(result.error||'Lantern Harbor is still connecting. Please try again.'),{status:response.status});return result;}catch(e){if(e.name==='AbortError')throw Error('The server is still waking up. Please try again.');throw e;}finally{clearTimeout(timer);}
}
const verifiedWallet=()=>account?.wallet?.provider==='para'&&/^0x[0-9a-fA-F]{40}$/.test(account.wallet.address||'');
function tab(name,reload=true){if(!verifiedWallet())return;for(const v of ['home','passport'])$(v+'-view').hidden=v!==name;
 const app=document.querySelector('.app[data-screen="lobby"]');app.dataset.tab=name==='passport'?'profile':'home';
 const main=$('main');main.dataset.view=name==='passport'?'profile':'home';
 for(const b of document.querySelectorAll('button[data-tab]')){const selected=b.dataset.tab===name;
 b.classList.toggle('active',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
 main.scrollTop=0;window.scrollTo(0,0);if(name==='passport'&&reload)refresh().catch(e=>error(e.message));}
function comingSoon(){const d=$('soon-dialog');if(typeof d.showModal==='function'&&!d.open)d.showModal();else d.setAttribute('open','');}
// Build links only from the account's chain and valid public hashes, never arbitrary URLs.
const networks={46630:{name:'Robinhood Chain Testnet',explorer:'https://explorer.testnet.chain.robinhood.com'},4663:{name:'Robinhood Chain',explorer:'https://robinhoodchain.blockscout.com'},2741:{name:'Abstract',explorer:'https://abscan.org'},11124:{name:'Abstract Sepolia',explorer:'https://sepolia.abscan.org'},42161:{name:'Arbitrum One',explorer:'https://arbiscan.io'},421614:{name:'Arbitrum Sepolia',explorer:'https://sepolia.arbiscan.io'}};
const sameAddress=(a,b)=>!!a&&!!b&&a.toLowerCase()===b.toLowerCase();
const delivery=kind=>passport?.deliveries?.find(d=>d.kind===kind);
function walletMatches(){return sameAddress(passport?.wallet,account?.wallet?.address)&&Number(passport?.chainId)===Number(account?.wallet?.chainId);}
function rewardStatus(kind){const d=delivery(kind);if(!d)return !passport?'Preparing your collectibles…':kind==='egg'?(passport?.eggSerial?'Egg reserved · Checking delivery':'No Egg · First 33 eligible signups only'):'Preparing your Passport…';
 if(!walletMatches())return 'Delivery wallet needs checking';
 if(d.status==='confirmed')return 'Checking blockchain receipt…';
 if(d.status==='awaiting_setup')return 'Reserved · Waiting for minting';
 if(d.status==='blocked')return 'Delivery delayed · Reservation saved';
 if(d.status==='submitted')return 'Confirming on blockchain…';
 if(d.status==='queued')return 'Reserved · Waiting to mint';
 return 'Delivery pending · Check again shortly';
}
function transactionLink(kind,hash,label){const a=$(kind+'-tx'),network=networks[passport?.chainId];a.hidden=true;a.removeAttribute('href');if(network&&/^0x[0-9a-f]{64}$/i.test(hash||'')){a.href=network.explorer+'/tx/'+hash;a.textContent=label;a.hidden=false;}}
function updateTile(kind){const d=delivery(kind),state=$(kind+'-state');state.textContent=rewardStatus(kind);state.dataset.state=d?.status==='confirmed'?'checking':d?.status||'unallocated';
 const number=kind==='egg'?passport?.eggSerial:d?.tokenId;
 $(kind+'-title').textContent=(kind==='egg'?'Mystery Golden Egg':'Antarctic Passport')+(number?' #'+number+(kind==='egg'?' / 33':''):'');
 transactionLink(kind,walletMatches()?d?.transactionHash:null,'View transaction ↗');
}
function showAccount(result){account=result.identity;passport=result.passport;const wallet=account?.wallet;
 if(!verifiedWallet()){clearSession();error('Your verified Para wallet is not ready. Sign in again to finish setup.');return false;}
 $('connect-card').hidden=true;$('wallet-card').hidden=false;$('created-wallet').textContent=wallet.address;
 const network=networks[wallet.chainId],link=$('wallet-explorer');$('wallet-network').textContent=network?.name||'Network '+wallet.chainId;link.hidden=!network;link.removeAttribute('href');if(network)link.href=network.explorer+'/address/'+wallet.address;
 $('wallet-match').hidden=!passport||walletMatches();$('wallet-match').textContent='Your registered delivery wallet differs from this sign-in. Delivery must be checked before confirming receipt.';
 $('collection-card').hidden=false;
 $('collection-status').textContent=passport?'Delivery updates automatically.':'Preparing your collectibles automatically…';updateTile('visa');updateTile('egg');return true;
}
async function verifyDelivery(kind,expectedSession){const d=delivery(kind),currentPassport=passport;if(d?.status!=='confirmed'||!walletMatches())return;
 const state=$(kind+'-state');try{const evidence=await api(kind==='visa'?'/passport/acceptance':'/passport/egg/acceptance');
 if(session!==expectedSession||passport!==currentPassport)return;
 const confirmed=evidence.confirmed===true&&/^0x[0-9a-f]{64}$/i.test(d.transactionHash||'')&&Number(d.chainId)===Number(passport.chainId)&&evidence.paraWalletVerified===true&&Number(evidence.chainId)===Number(passport.chainId)&&sameAddress(evidence.wallet,passport.wallet)&&String(evidence.tokenId)===String(d.tokenId)&&evidence.transactionHash?.toLowerCase()===d.transactionHash?.toLowerCase();
 state.textContent=confirmed?'Received ✓ · #'+d.tokenId:'Receipt verification pending';state.dataset.state=confirmed?'confirmed':'checking';transactionLink(kind,d.transactionHash,confirmed?'View transaction ↗':'View pending receipt ↗');
 }catch{if(session===expectedSession&&passport===currentPassport){state.textContent='Unable to verify receipt · Try refresh';state.dataset.state='checking';}}
}
let refreshing=null;
function refresh(silent=false){if(refreshing)return refreshing;refreshing=refreshAccount(silent).finally(()=>{refreshing=null;});return refreshing;}
async function refreshAccount(silent=false){if(!session)return false;const expectedSession=session;
 try{const result=await api('/passport');if(session!==expectedSession)return false;if(!showAccount(result))return false;
 await Promise.all(['visa','egg'].map(kind=>verifyDelivery(kind,expectedSession)));if(session!==expectedSession)return false;
 $('delivery-updated').textContent='Last checked '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+' · Updates automatically';clearError();return true;
 }catch(e){if(session!==expectedSession)return false;if(e.status===401){clearSession();if(!booting)wake().catch(()=>{});}if(!silent)error(e.message);return false;}
}
function entryLoading(message){$('harbor-app').hidden=true;$('harbor-app').setAttribute('inert','');$('entry-gate').hidden=false;$('entry-loading').hidden=false;$('connect-card').hidden=true;$('entry-retry').hidden=true;$('entry-status').textContent=message;}
function entrySignIn(){$('entry-loading').hidden=true;$('connect-card').hidden=false;}
async function wake(){
 ready=false;setBusy(false);
 for(let attempt=0;attempt<2;attempt++){
  try{const config=await api('/auth/para/config',undefined,false,25000);ready=!!config.enabled&&config.earlySignup?.enabled!==false;entrySignIn();setStatus(ready?'Welcome to Lantern Harbor. Continue with Para to sign in.':'Sign-in is not available yet. Please try again shortly.');$('provider-note').textContent=config.environment==='BETA'?'Robinhood Chain testnet · experimental collectibles with no monetary value.':'Your wallet is created automatically through Para.';setBusy(false);$('entry-retry').hidden=ready;return;}
  catch(e){if(attempt===0){$('entry-status').textContent='Waking the harbor server… Please stay on this page.';continue;}entrySignIn();setStatus('The harbor server is taking longer than expected.');error(e.message);$('entry-retry').hidden=false;setBusy(false);}
 }
}
let booting=false;
async function boot(){if(booting)return;booting=true;clearError();entryLoading('Preparing your arrival…');try{
 await exchangeTicket();
 if(session){$('entry-status').textContent='Checking your signed-in wallet…';if(await refresh()){if(account.needsEarlySignup){await wake();return;}$('entry-gate').hidden=true;$('harbor-app').hidden=false;$('harbor-app').removeAttribute('inert');tab('passport',false);return;}if(session){entrySignIn();$('entry-retry').hidden=false;setStatus('We could not check your session. Try connecting again.');return;}}
 await wake();
 }catch(e){entrySignIn();error(e.message);$('entry-retry').hidden=false;}finally{booting=false;}}
async function signIn(){if(loading)return;clearError();if(!$('adult-confirm').checked)return error('Confirm that you are at least 18 and accept the signup terms.');sessionStorage.setItem(ageKey,'yes');setBusy(true);const consent={consentVersion:'early-signup-v1',adultConfirmed:true};try{
 if(session&&verifiedWallet()){
  const expectedSession=session;await api('/early/signup',consent);if(session!==expectedSession)return;
  if(!await refresh()||session!==expectedSession||!verifiedWallet())throw Error('Sign in again to finish checking your signup.');if(account.needsEarlySignup)throw Error('Your signup is still being saved. Please try again.');$('entry-gate').hidden=true;$('harbor-app').hidden=false;$('harbor-app').removeAttribute('inert');tab('passport',false);return;
 }
 const verifier=base64(crypto.getRandomValues(new Uint8Array(32))),challenge=base64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));sessionStorage.setItem(pkceKey,verifier);const result=await api('/auth/para/start',{challenge,platform:'web',returnPath:'/early/',earlySignup:consent},false,35000);const url=new URL(result.url);if(url.origin!=='https://articweb3.onrender.com'||url.pathname!=='/arctic-play/wallet/')throw Error('Unexpected sign-in destination.');location.assign(url.href);
 }catch(e){error(e.message);}finally{setBusy(false);}}
async function exchangeTicket(){const u=new URL(location.href),ticket=u.searchParams.get('auth_ticket');if(!ticket)return;history.replaceState(null,'',u.pathname);const verifier=sessionStorage.getItem(pkceKey);if(!verifier)throw Error('Please start sign-in again in this tab.');try{setBusy(true);const result=await api('/auth/exchange',{ticket,verifier},false,60000);if(!result.session)throw Error('Your sign-in did not complete.');session=result.session;sessionStorage.setItem(sessionKey,session);sessionStorage.removeItem(pkceKey);}catch(e){session=null;account=null;sessionStorage.removeItem(sessionKey);throw e;}finally{setBusy(false);}}
for(const b of document.querySelectorAll('[data-open-passport]'))b.addEventListener('click',()=>tab('passport'));
for(const b of document.querySelectorAll('button[data-tab]'))b.addEventListener('click',()=>tab(b.dataset.tab));
for(const b of document.querySelectorAll('[data-soon]'))b.addEventListener('click',comingSoon);
$('close-soon').addEventListener('click',()=>$('soon-dialog').close());
$('sign-in').addEventListener('click',signIn);
$('refresh').addEventListener('click',()=>{setBusy(true);refresh().finally(()=>setBusy(false));});
$('sign-out').addEventListener('click',async()=>{const old=session;session=null;passport=null;account=null;sessionStorage.removeItem(sessionKey);sessionStorage.removeItem(pkceKey);sessionStorage.removeItem(ageKey);clearError();boot();if(old)fetch(root+'/logout',{method:'POST',headers:{Authorization:'Bearer '+old,'Content-Type':'application/json'},body:'{}'}).catch(()=>{});});
for(const b of document.querySelectorAll('[data-copy]'))b.addEventListener('click',async()=>{const address=account?.wallet?.address;if(!address)return;try{await navigator.clipboard.writeText(address);b.textContent='Copied!';setTimeout(()=>{b.textContent='Copy address';},2000);}catch{b.textContent='Select address to copy';}});
$('entry-retry').addEventListener('click',boot);
boot();
poll=setInterval(()=>{if(session&&account&&!document.hidden&&!loading)refresh(true).catch(()=>{});},10000);
window.addEventListener('pageshow',()=>{if(session&&document.visibilityState==='visible')refresh(true).catch(()=>{});});
})();
