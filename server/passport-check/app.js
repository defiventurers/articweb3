(()=>{'use strict';
 const $=id=>document.getElementById(id),api='/arctic-play/v3',key='ak.passport-check.session',pkce='ak.passport-check.pkce';
 let session=sessionStorage.getItem(key),acceptance,busy=false,timer;
 const message=s=>{$('status').textContent=s;};
 async function call(path,data){const r=await fetch(api+path,{method:data?'POST':'GET',cache:'no-store',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session}:{})},body:data?JSON.stringify(data):undefined});const result=await r.json();if(!r.ok)throw Error(result.error||result.message||'The request could not be completed.');return result;}
 const base64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
 async function action(fn){if(busy)return;busy=true;for(const b of document.querySelectorAll('button'))b.disabled=true;try{await fn();}catch(e){message(e.message||'Please retry.');}finally{busy=false;for(const b of document.querySelectorAll('button'))b.disabled=false;}}
 async function refresh(){
  clearTimeout(timer);const config=await call('/passport/delivery/config');
  if(!session){message(config.ready?'Passport delivery is ready. Sign in to check your own wallet.':'Delivery setup: '+config.status.replaceAll('_',' ')+'. You can sign in and register while setup completes.');return;}
  const result=await call('/passport'),wallet=result.identity.wallet;
  $('signin').hidden=true;$('signout').hidden=false;
  if(wallet?.provider!=='para'){message('This check needs your verified Para wallet. Sign out here and use Para.');return;}
  $('wallet').textContent=wallet.address;$('network').textContent='Robinhood testnet · '+wallet.chainId;
  if(wallet.chainId!==46630)throw Error('This delivery check is for Robinhood testnet only.');
  $('review').hidden=!!result.passport;
  if(!result.passport){message('Signed in. Review the wallet address and confirm your free passport.');return;}
  $('delivery').hidden=false;const visa=result.passport.deliveries.find(d=>d.kind==='visa');
  $('delivery-state').textContent='Passport: '+(visa?.status||'awaiting setup').replaceAll('_',' ');
  $('delivery-detail').textContent='Delivery wallet: '+result.passport.wallet;
  if(visa?.explorerUrl){$('receipt').href=visa.explorerUrl;$('receipt').hidden=false;}
  acceptance=await call('/passport/acceptance');
  if(acceptance.confirmed){message('Confirmed: Para wallet, passport claim, mint event and current ownership all match.');$('evidence').textContent=JSON.stringify(acceptance,null,2);$('evidence').hidden=false;$('download').hidden=false;return;}
  message('Passport registered. Confirmation is pending. '+(!config.ready?'Backend: '+config.status.replaceAll('_',' ')+'.':'This page will check again.'));
  timer=setTimeout(()=>action(refresh),8000);
 }
 $('signin').onclick=()=>action(async()=>{const verifier=base64(crypto.getRandomValues(new Uint8Array(32))),challenge=base64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));sessionStorage.setItem(pkce,verifier);const r=await call('/auth/para/start',{challenge,platform:'web',returnPath:'/arctic-play/passport-check/'});location.assign(r.url);});
 $('issue').onclick=()=>action(async()=>{if(!$('consent').checked)throw Error('Confirm the delivery wallet before issuing your passport.');await call('/passport',{playerName:$('name').value,walletMode:'embedded',souvenir:false,achievementOptIn:false,consentVersion:'antarctic-visa-v2'});await refresh();});
 $('refresh').onclick=()=>action(refresh);
 $('signout').onclick=()=>action(async()=>{try{await call('/logout',{});}finally{clearTimeout(timer);sessionStorage.removeItem(key);sessionStorage.removeItem(pkce);location.replace(location.pathname);}});
 $('download').onclick=()=>{if(!acceptance?.confirmed)return;const url=URL.createObjectURL(new Blob([JSON.stringify(acceptance,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='Antarctic-Passport-Live-Acceptance.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 action(async()=>{const ticket=new URL(location.href).searchParams.get('auth_ticket');if(ticket){history.replaceState(null,'',location.pathname);const verifier=sessionStorage.getItem(pkce);if(!verifier)throw Error('Start this sign-in again in the same browser tab.');const r=await call('/auth/exchange',{ticket,verifier});session=r.session;sessionStorage.setItem(key,session);sessionStorage.removeItem(pkce);}await refresh();});
})();
