import React from 'react';

// Presentation only: account, recovery and passport authority stay in AntarcticVisaEntry.
export function VisaLandingView({accountId,busy,error,progress,onSignIn,onRecover,onRetry,onSignOut}) {
 const base='art/passport-landing-v1/';
 return <main className="passport-entry" data-testid="antarctic-visa" data-visa-error={error?'true':undefined}>
  <header className="passport-heading"><img src={base+'brand/antarctic-gaming-co-logo.webp'} width="1536" height="350" alt="Antarctic Gaming Co." fetchPriority="high"/><p>WELCOME TO LANTERN HARBOR</p><h1>Your Antarctic passport.</h1><span>Timeless games. Familiar faces.</span></header>
  <div className="passport-entry-hero" aria-hidden="true"><img src={base+'hosts/passport-polly-welcome.webp'} width="768" height="768" alt="" decoding="async"/></div>
  <section className="passport-entry-card" aria-label={accountId?'Passport setup':'Sign in'}>
   <h2>{accountId?'Preparing your passport…':'Take your seat.'}</h2>
   <p id="passport-entry-description">{accountId?'Getting your place at Lantern Harbor ready.':'Sign in to play, learn and gather with friends.'}</p>
   {!accountId?<><button className="passport-primary" type="button" disabled={busy} aria-busy={busy} aria-describedby="passport-entry-description" onClick={onSignIn}>{busy?'Opening sign-in…':'Sign in or create account'}<span aria-hidden="true">→</span></button><button className="passport-secondary" type="button" disabled={busy} onClick={onRecover}>Use a recovery code</button></>:<>{error?<><button className="passport-primary" disabled={busy} onClick={onSignIn}>Connect your game wallet</button><button className="passport-secondary" disabled={busy} onClick={onRetry}>Retry passport setup</button></>:<p role="status">Getting your seat ready…</p>}<button className="passport-secondary" disabled={busy} onClick={onSignOut}>Use another account</button></>}
   {error&&<p className="passport-entry-error" role="alert">{error}</p>}
  </section>
  <footer className="passport-entry-footer"><p role="status" aria-live="polite" aria-atomic="true">{progress}</p><small>A game-world passport · No real travel document.</small></footer>
 </main>;
}
