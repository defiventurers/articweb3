import React,{useEffect,useState} from 'react';
import {harborConnection} from './harborConnection.js';

// Account authority remains in AntarcticVisaEntry. Artwork never grants access.
export function VisaLandingView({accountId,busy,error,progress,onSignIn,onRecover,onRetry,onSignOut}) {
 const [connection,setConnection]=useState(harborConnection.snapshot);
 useEffect(()=>{const off=harborConnection.subscribe(setConnection);setConnection(harborConnection.snapshot());harborConnection.ensureReady().catch(()=>{});return off;},[]);
 const base='art/onboarding-v2/',warming=connection.phase==='warming',failed=['error','offline','cancelled'].includes(connection.phase),voyage=warming||failed;
 const retry=()=>harborConnection.ensureReady({force:true}).catch(()=>{});
 return <main className={'passport-entry harbor-entry '+(voyage?'harbor-voyage':'')} data-testid="antarctic-visa" data-connection={connection.phase} data-visa-error={error?'true':undefined}>
  <header className="passport-heading"><img src={base+'brand-logo.webp'} width="2048" height="700" alt="Antarctic Gaming Co." fetchPriority="high"/><p>WELCOME TO LANTERN HARBOR</p><h1>{voyage?<>On the way to<br/>Lantern Harbor</>:<>Get your Antarctic<br/>Passport</>}</h1><span>{voyage?'A warm welcome awaits beyond the ice.':'Timeless games. New friends. Step inside.'}</span></header>
  <div className="passport-entry-hero" aria-hidden="true">{!voyage&&<><img className="harbor-friends" src={base+'friends-at-arch.webp'} width="1536" height="1024" alt=""/><img className="harbor-nova" src={base+(error?'nova-reassure.webp':accountId?'nova-passport-stamp.webp':'nova-welcome.webp')} width="1254" height="1254" alt=""/><span className="harbor-greeting">Welcome ashore!<br/>I’m Nova.</span></>}</div>
  <section className="passport-entry-card" aria-label={voyage?'Connection status':accountId?'Passport setup':'Sign in'}>
   <h2>{warming?'Getting the harbor ready…':failed?'Let’s get you there.':accountId?'Preparing your passport…':'Take your seat.'}</h2>
   <p id="passport-entry-description">{warming?'Connecting securely. This can take about a minute when the harbor is waking up.':failed?connection.message:accountId?'Getting your place at Lantern Harbor ready.':'Sign in to play, learn and gather with friends.'}</p>
   {warming&&<div className="harbor-connection-status"><span className="harbor-spinner" aria-hidden="true"/><span role="status" aria-live="polite">{connection.elapsedMs>=60000?'Still connecting. Thanks for your patience.':'Finding a route through the ice…'}</span><small aria-hidden="true">{Math.floor(connection.elapsedMs/1000)}s elapsed</small></div>}
   {failed?<><button className="passport-primary" type="button" onClick={retry}>Try connecting again <span aria-hidden="true">→</span></button>{accountId&&<button className="passport-secondary" onClick={onSignOut}>Use another account</button>}</>:!accountId?<><button className="passport-primary" type="button" disabled={busy} aria-busy={busy} aria-describedby="passport-entry-description" onClick={onSignIn}>{busy?(warming?'Waiting for Lantern Harbor…':'Opening secure sign-in…'):warming?'Sign in when ready':'Sign in or create account'}<span aria-hidden="true">→</span></button><button className="passport-secondary" type="button" disabled={busy} onClick={onRecover}>Use a recovery code</button></>:<>{error?<><button className="passport-primary" disabled={busy} onClick={onSignIn}>Continue sign-in</button><button className="passport-secondary" disabled={busy} onClick={onRetry}>Retry passport setup</button></>:<p role="status">Getting your seat ready…</p>}<button className="passport-secondary" disabled={busy} onClick={onSignOut}>Use another account</button></>}
   {warming&&<button className="passport-secondary" type="button" onClick={()=>harborConnection.cancel()}>Cancel connection check</button>}
   {failed&&!accountId&&<button className="passport-secondary" type="button" disabled={busy} onClick={onRecover}>Use a recovery code</button>}
   {error&&!warming&&<p className="passport-entry-error" role="alert">{error}</p>}
  </section>
  <footer className="passport-entry-footer"><p role="status" aria-live="polite" aria-atomic="true">{progress}</p><small>Your game-world passport · No real travel document.</small></footer>
 </main>;
}
