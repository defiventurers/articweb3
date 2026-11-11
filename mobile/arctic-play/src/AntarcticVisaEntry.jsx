import {openPassportWallet} from './PassportWallet.jsx';
import {VisaLandingView} from './VisaLandingView.jsx';
import React,{useEffect,useRef,useState} from 'react';
import {PassportCard} from '../../../shared/antarctic-visa/AntarcticVisa.jsx';
import {deliveryLabel} from '../../../shared/antarctic-visa/model.js';
import {AccountEntry} from './AccountEntry.jsx';
import {cloudRequest,startParaSignIn,signOutCloud,cloudSnapshot} from './cloud.js';
import {read,write} from './storage.js';

export function useVisaPassport(access){
 const accountId=access.accountId,key='antarctic-visa.v1.'+accountId;
 const [record,setRecord]=useState(()=>accountId?read(key,null):null),[checking,setChecking]=useState(!!accountId),[error,setError]=useState('');
 useEffect(()=>{let live=true;setRecord(accountId?read(key,null):null);setError('');if(!accountId||access.owner){setChecking(false);return;}setChecking(true);cloudRequest('/passport').then(v=>{if(!live)return;setRecord(v.passport);if(v.passport)write(key,v.passport);}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setChecking(false);});return()=>{live=false;};},[accountId,access.owner]);
 return {record,checking,error,setRecord:p=>{write(key,p);setRecord(p);}};
}

export function AntarcticVisaEntry({access,halls,visa,onProfile,onPreview,assetStatus}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0),[recover,setRecover]=useState(false);
 const issuing=useRef(false);
 useEffect(()=>{const failed=e=>setError(e.detail?.message||'Sign-in did not finish. Try again.');window.addEventListener('arctic-auth-error',failed);return()=>window.removeEventListener('arctic-auth-error',failed);},[]);
 useEffect(()=>{let live=true;if(!access.accountId||visa.checking||issuing.current)return;
  if(visa.record){onProfile(visa.record.playerName);return;}
  issuing.current=true;setBusy(true);setError('');
  (async()=>{try{const {identity}=await cloudRequest('/passport');if(identity?.wallet?.provider!=='para')throw Error('Connect your game wallet to finish your visa.');
   let name=String(identity.displayName||'Explorer').normalize('NFKC').replace(/[\u0000-\u001f\u007f<>]/g,'').replace(/\s+/g,' ').trim();name=[...name].slice(0,24).join('');if([...name].length<2)name='Explorer';
   const v=await cloudRequest('/passport',{method:'POST',data:{playerName:name,walletMode:'embedded',wallet:identity.wallet.address,souvenir:false,achievementOptIn:true,consentVersion:'antarctic-visa-v2'}});
   if(live){visa.setRecord(v.passport);onProfile(v.passport.playerName);}
  }catch(e){if(live)setError(e.message);}finally{issuing.current=false;if(live)setBusy(false);}})();return()=>{live=false;};
 },[access.accountId,visa.checking,visa.record?.id,retry]);
 async function signIn(){if(busy)return;setBusy(true);setError('');try{await startParaSignIn();}catch(e){setError(e.message);}finally{setBusy(false);}}
 if(recover&&!access.accountId)return <AccountEntry compact access={access} halls={halls} forceSignIn initialMode="recover" onClose={()=>setRecover(false)} onPreview={onPreview}/>;
 if(visa.record&&(!access.allowed||access.consentNeeded))return <AccountEntry compact access={access} halls={halls} onPreview={onPreview}/>;
 const progress=assetStatus?.total?assetStatus.pending===0?(assetStatus.failed?'Artwork will retry automatically.':'Games ready'):`Loading games in the background · ${Math.floor(assetStatus.percent/10)*10}%`:'Preparing games in the background…';
 return <VisaLandingView accountId={access.accountId} busy={busy} error={error} progress={progress} onPreview={onPreview} onSignIn={signIn} onRecover={()=>setRecover(true)} onRetry={()=>setRetry(v=>v+1)} onSignOut={signOutCloud}/>;
}

export function VisaPassportSummary({visa}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const p=visa.record;
 if(!p)return <p>Your Antarctic visa has not been issued yet.</p>;
 return <section className="av-profile-visa"><PassportCard assets="art/passport-v2" compact name={p.playerName} wallet={p.wallet} passport={p}/><p className="muted">NFT delivery address</p><code className="av-full-wallet">{p.wallet}</code><div className="av-deliveries">{p.deliveries.map(d=><div key={d.kind+':'+(d.achievement||'')}><span>{d.kind==='visa'?'Permanent Antarctic visa':d.kind==='achievement'?(d.title||'Achievement NFT'):'Arrival collectible'}</span><strong>{deliveryLabel(d.status)}</strong>{d.explorerUrl&&<a href={d.explorerUrl} target="_blank" rel="noreferrer">View transaction ↗</a>}</div>)}</div>{cloudSnapshot().session?.wallet?.provider!=='para'&&<button className="secondary full" onClick={()=>startParaSignIn().catch(e=>setError(e.message))}>Connect a Para game wallet</button>}{cloudSnapshot().session?.wallet?.provider==='para'&&<button className="secondary full" onClick={openPassportWallet}>My wallet & NFTs</button>}<button className="primary full" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const v=await cloudRequest('/passport');if(v.passport)visa.setRecord(v.passport);}catch(e){setError(e.message);}finally{setBusy(false);}}}>{busy?'Checking…':'Refresh NFT delivery'}</button>{error&&<p role="alert">{error}</p>}</section>;
}
