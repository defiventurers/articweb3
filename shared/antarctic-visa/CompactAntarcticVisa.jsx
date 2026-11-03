import React,{useEffect,useRef,useState} from 'react';
import {addressShape,playerName,shortWallet,deliveryLabel} from './model.js';

// Small, fixed-height steps keep the Android entry flow readable without a
// second page below the fold. Provider handoffs and issuance use the same API.
export function CompactAntarcticVisa({gateway,assets,session,passport,onIssued,onGoogle,onRecover,onSignOut,providerReady=true,providerChecking=false,providerMessage='',onRetryProviders,onPrivy,privyReady=false,demo=false,assetStatus}){
 const [step,setStep]=useState(passport?'ready':session?'name':'welcome');
 const [name,setName]=useState(passport?.playerName||session?.displayName||'');
 const [wallet,setWallet]=useState(passport?.wallet||session?.wallet?.address||'');
 const [walletMode,setWalletMode]=useState(session?.wallet?.provider==='privy'?'privy':'external');
 const [souvenir,setSouvenir]=useState(false),[achievements,setAchievements]=useState(true),[consent,setConsent]=useState(false);
 const [issued,setIssued]=useState(passport),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [height,setHeight]=useState(()=>typeof window==='undefined'?null:window.visualViewport?.height||window.innerHeight);
 const title=useRef(null),running=useRef(false),account=useRef(session?.accountId);
 useEffect(()=>{
  const resize=()=>setHeight(window.visualViewport?.height||window.innerHeight);
  window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
  return()=>{window.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('resize',resize);};
 },[]);
 useEffect(()=>{
  if(account.current!==session?.accountId){account.current=session?.accountId;setName(session?.displayName||'');setWallet(session?.wallet?.address||'');setWalletMode(session?.wallet?.provider==='privy'?'privy':'external');setConsent(false);setIssued(null);setError('');setStep(session?'name':'welcome');}
  else if(session){setName(n=>n||session.displayName||'');setStep(s=>s==='welcome'?'name':s);}
 },[session?.accountId,session?.displayName]);
 useEffect(()=>{if(session?.wallet?.provider==='privy'){setWallet(session.wallet.address);setWalletMode('privy');setConsent(false);}},[session?.wallet?.address]);
 useEffect(()=>{if(passport){setIssued(passport);setName(passport.playerName);setWallet(passport.wallet);setStep('ready');}},[passport?.id]);
 useEffect(()=>{title.current?.focus({preventScroll:true});},[step]);
 function go(next){setError('');setStep(next);}
 async function run(fn){if(running.current)return;running.current=true;setBusy(true);setError('');try{await fn();}catch(e){setError(e.message||'Please try again.');}finally{running.current=false;setBusy(false);}}
 function nextName(e){e.preventDefault();try{setName(playerName(name));go('wallet');}catch(e){setError(e.message);}}
 function nextWallet(e){e.preventDefault();if(!addressShape(wallet)){setError('Enter an EVM receive address beginning with 0x.');return;}setWallet(wallet.trim());setConsent(false);go('options');}
 async function connect(){if(!gateway.connectWallet)throw Error('Copy your EVM receive address from your wallet app, then paste it here.');const value=await gateway.connectWallet();if(!addressShape(value))throw Error('Your wallet did not return an EVM address.');setWallet(value);setWalletMode('external');setConsent(false);}
 async function issue(){
  if(!session||!consent)throw Error('Sign in and confirm your delivery address first.');
  const data={playerName:playerName(name),wallet:wallet.trim(),walletMode,achievementOptIn:achievements,souvenir,consentVersion:'antarctic-visa-v2'};
  if(!addressShape(data.wallet))throw Error('Enter a valid EVM receive address.');
  const p=await gateway.issue(data);setIssued(p);go('ready');
 }
 const back={name:'welcome',wallet:'name',options:'wallet',review:'options',privacy:'welcome'}[step];
 const stage=step==='welcome'||step==='privacy'?0:step==='ready'?2:1;
 return <main className="av-screen cv-screen" data-testid="antarctic-visa" data-visa-step={step} data-visa-error={error||providerMessage?'true':undefined} style={height?{'--visa-height':`${height}px`}:undefined}>
  <div className="av-sky cv-sky" style={{backgroundImage:`url(${assets}/arrival-harbor.webp)`}}/>
  <header className="cv-header"><div className="cv-brand"><img src={`${assets}/passport-seal.svg`} alt=""/><span>ANTARCTIC<strong>GAMING CO.</strong></span></div>{back&&step!=='name'&&<button className="cv-link cv-back" disabled={busy} onClick={()=>go(back)}>← Back</button>}{step==='name'&&onSignOut&&<button className="cv-link cv-back" disabled={busy} onClick={()=>run(onSignOut)}>Switch account</button>}{demo&&<span className="cv-demo">Preview</span>}</header>
  <section className="cv-card" aria-label="Get your Antarctic visa">
   <nav className="cv-progress" aria-label="Visa progress">{['Sign in','Passport','Play'].map((label,i)=><span key={label} aria-current={stage===i?'step':undefined} className={i<=stage?'cv-current':''}><i aria-hidden="true"/>{label}</span>)}</nav>
   <div className="cv-content">
    {step==='welcome'?<>
     <img className="cv-mascot" src={`${assets}/polly.webp`} alt="Nova welcomes you"/>
     <h1 ref={title} tabIndex="-1">Get your Antarctic visa.</h1>
     <p className="cv-subtitle">Your passport to seven timeless games.</p>
     <div className="cv-actions">
      <button className="cv-button cv-google" disabled={busy||!providerReady} onClick={()=>run(onGoogle)}><img src={`${assets}/google-g.png`} alt=""/>{busy?'Opening sign-in…':'Continue with Google'}</button>
      {onPrivy&&<button className="cv-button cv-primary" disabled={busy||!privyReady} onClick={()=>run(onPrivy)}>Continue with email <span aria-hidden="true">→</span></button>}
      {onRecover&&<button className="cv-link" disabled={busy} onClick={onRecover}>Use a recovery code</button>}
     </div>
     {(providerChecking||providerMessage)&&<p className="cv-status" role="status">{providerMessage||(providerChecking?'Connecting to sign-in…':'')}{providerMessage&&onRetryProviders&&<button className="cv-link" disabled={providerChecking||busy} onClick={onRetryProviders}>Retry connection</button>}</p>}
     <button className="cv-link cv-about" onClick={()=>go('privacy')}>No wallet? No problem. Learn how it works</button>
    </>:step==='privacy'?<>
     <h1 ref={title} tabIndex="-1">A passport to play.</h1>
     <p className="cv-subtitle">Sign in, choose your name, then confirm your wallet.</p>
     <p className="cv-note">Email sign-in uses Privy to create a game wallet. You can also use an existing EVM receive address.</p>
     <p className="cv-note">We never ask for a wallet password or recovery phrase. Your visa is a game collectible, not a travel document.</p>
     <button className="cv-button cv-primary" onClick={()=>go('welcome')}>Back to sign in</button>
    </>:step==='name'?<form onSubmit={nextName}>
     <h1 ref={title} tabIndex="-1">What shall we call you?</h1><p className="cv-subtitle">The name your friends see at the table.</p>
     <label className="cv-label" htmlFor="cv-name">Player name</label><input id="cv-name" value={name} maxLength="48" autoComplete="nickname" required onChange={e=>setName(e.target.value)} placeholder="Your explorer name"/>
     {session?.displayName&&name!==session.displayName&&<button type="button" className="cv-link" onClick={()=>setName(session.displayName)}>Use my sign-in name</button>}
     <button className="cv-button cv-primary" type="submit">Continue <span aria-hidden="true">→</span></button>
    </form>:step==='wallet'?<form onSubmit={nextWallet}>
     <h1 ref={title} tabIndex="-1">Your game wallet.</h1><p className="cv-subtitle">A home for your visa and achievements.</p>
     {walletMode==='privy'?<div className="cv-wallet"><strong>Your Privy wallet is ready</strong><code>{shortWallet(wallet)}</code><button className="cv-link" type="button" onClick={()=>{setWalletMode('external');setWallet('');setConsent(false);}}>Use an existing wallet instead</button></div>:<>
      {onPrivy&&<button type="button" className="cv-button" disabled={busy||!privyReady} onClick={()=>run(onPrivy)}>Create a wallet with Privy</button>}
      <label className="cv-label" htmlFor="cv-wallet">Or paste your EVM receive address</label><input id="cv-wallet" className="cv-address-input" value={wallet} autoComplete="off" autoCapitalize="none" spellCheck="false" maxLength="42" required onChange={e=>{setWallet(e.target.value);setConsent(false);}} placeholder="0x…"/>
      <button type="button" className="cv-link" disabled={busy} onClick={()=>run(connect)}>Connect an existing wallet</button>
     </>}
     <button className="cv-button cv-primary" type="submit" disabled={busy}>Continue <span aria-hidden="true">→</span></button>
    </form>:step==='options'?<>
     <h1 ref={title} tabIndex="-1">Make it yours.</h1><p className="cv-subtitle">Your permanent visa is included.</p>
     <label className="cv-check"><input type="checkbox" checked={achievements} onChange={e=>setAchievements(e.target.checked)}/><span>Send my earned achievement NFTs<small>Automatic delivery to this wallet.</small></span></label>
     <label className="cv-check"><input type="checkbox" checked={souvenir} onChange={e=>setSouvenir(e.target.checked)}/><span>Add an arrival collectible<small>Optional · Transferable souvenir.</small></span></label>
     <p className="cv-note">The visa is non-transferable. You pay no gas to receive NFTs; the issuer covers delivery.</p>
     <button className="cv-button cv-primary" onClick={()=>go('review')}>Review my passport <span aria-hidden="true">→</span></button>
    </>:step==='review'?<>
     <h1 ref={title} tabIndex="-1">One last look.</h1>
     <dl className="cv-review"><dt>Player name</dt><dd>{name}</dd><dt>NFT delivery address</dt><dd className="cv-address">{wallet}</dd></dl>
     <label className="cv-check cv-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I agree to receive my visa and selected NFTs at this address.<small>The address cannot be changed after issue. Wallet addresses and transactions are public; my email and player name stay offchain.</small></span></label>
     <button className="cv-button cv-primary" disabled={busy||!consent} onClick={()=>run(issue)}>{busy?'Issuing your passport…':'Stamp my passport'} <span aria-hidden="true">✦</span></button>
    </>:<>
     <img className="cv-ready-badge" src={`${assets}/visa-badge.webp`} alt="Antarctic visa issued"/>
     <h1 ref={title} tabIndex="-1">Welcome, {issued?.playerName||name}.</h1><p className="cv-subtitle">Your passport is ready. Your seat is waiting.</p>
     <p className="cv-note" role="status">{demo?'Preview only · No NFT minted':deliveryLabel(issued?.deliveries?.find(d=>d.kind==='visa')?.status||'awaiting_setup')}</p>
     <p className="cv-note">NFT delivery runs separately. Check its status later in your profile.</p>
     <button className="cv-button cv-primary" onClick={()=>onIssued(issued)}>Enter Lantern Harbor <span aria-hidden="true">→</span></button>
    </>}
    {error&&<p className="cv-error" role="alert">{error}</p>}
   </div>
  </section>
  <footer className="cv-footer">{assetStatus?.total>0&&<span role="status">{assetStatus.pending?`Preparing games · ${assetStatus.percent}%`:assetStatus.failed?'Artwork retries automatically':'Your games are ready'}</span>}<span>A game-world passport · No real travel document</span></footer>
 </main>;
}
