import React,{useLayoutEffect} from 'react';

// Presentation only. Routes, saved-game authority and unlocks stay owned by App.
export function HomeLanding({onBrowse,onChaturanga,onLearn,onShop,onSearch,onJoin,onContinue,continueLabel,continueImage,story=true,onStory,gameCount=9,onJourney,discovery}){
 useLayoutEffect(()=>{document.documentElement.classList.add('home-v2-active');return()=>document.documentElement.classList.remove('home-v2-active');},[]);
 const base='art/home-v1/',resume=typeof onContinue==='function',lesson=resume&&/learning|lesson/i.test(continueLabel||'');
 const detail=lesson?'Your last lesson':String(continueLabel||'Your saved game').replace(/^Continue\s+/i,'');
 const image=resume&&typeof continueImage==='string'&&continueImage.startsWith('art/')?continueImage:null;
 const chaturanga=!resume||/chaturanga/i.test(continueLabel||'');
 const Arrow=()=> <svg className="home-gold-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>;
 return <section className="home-landing home-v2 home-heritage" aria-labelledby="home-v2-title">
  <section className="home-v2-hero" aria-label="Welcome to Lantern Harbor">
   <div className="home-v2-scene" aria-hidden="true"/>
   <div className="home-heritage-frame" aria-hidden="true"><span>✦</span></div>
   <img className="home-v2-hosts" src={base+'home-hosts-welcome.webp'} width="1200" height="800" alt="Nova, Rocco, Piko and Ziggy welcome you to Lantern Harbor" fetchPriority="high"/>
   <div className="home-v2-copy"><p>LANTERN HARBOR</p><h2 id="home-v2-title" className="home-v2-title">Antarctic<br/><em>Kingdoms</em></h2><span>Timeless games.<br/>A world of stories.</span></div>
   <p className="home-heritage-signature"><span aria-hidden="true">✧</span> YOUR SEAT IN THE STORY <span aria-hidden="true">✧</span></p>
  </section>
  <div className="home-play-actions home-v2-actions">
   <button type="button" className={'home-v2-primary '+(resume?'home-resume':'home-explore')+(chaturanga?' home-chaturanga':'')} onClick={resume?onContinue:(onChaturanga||onBrowse)} aria-label={resume?(continueLabel||'Continue playing'):'Enter Chaturanga'}>
    <span><em>{chaturanga?'INDIAN ROOTS · ICY COURT':'YOUR NEXT MOVE'}</em><strong>{resume?(lesson?'Continue learning':'Continue playing'):'Chaturanga'}</strong><small>{resume?detail:'Four kingdoms · Two long dice'}</small></span>
    <img src={chaturanga?'art/chaturanga-heritage-v1/cover.webp':image||base+'hall-discovery.webp'} className={chaturanga||image?'home-v2-resume-cover':'home-v2-hall'} width="180" height="120" alt="" decoding="async"/>
    <Arrow/>
   </button>
  </div>
  <div className="home-v2-secondary" aria-label="Learn and play together">
   <button type="button" className="home-v2-tile" onClick={onLearn||onBrowse}><em>THE ACADEMY</em><strong>Learn a game</strong><small>One piece at a time</small><img src={base+'learn-pengu.webp'} width="822" height="900" alt="" decoding="async"/><span className="home-tile-arrow" aria-hidden="true">↗</span></button>
   <button type="button" className="home-v2-tile home-v2-friends" onClick={onJoin}><em>THE GATHERING</em><strong>Join friends</strong><small>Play with a room code</small><img src={base+'join-friends.webp'} width="985" height="900" alt="" decoding="async"/><span className="home-tile-arrow" aria-hidden="true">↗</span></button>
  </div>
  {onJourney?<button type="button" className="home-v2-journey" onClick={onJourney}><img src={base+'passport-journey.webp'} width="1200" height="600" alt="" decoding="async"/><span><em>COLLECT YOUR DISCOVERIES</em><strong>Your Antarctic Passport</strong><small>A new hall. A new chapter.</small></span><Arrow/></button>:discovery}
  {onShop&&<button type="button" className="home-v2-shop" onClick={onShop}><span><strong>Bring the game home</strong><small>Physical boards · Concept preview</small></span><img src={base+'physical-board-preview.webp'} width="1200" height="800" alt="" decoding="async"/><Arrow/></button>}
  {story&&onStory&&<button type="button" className="home-v2-story" onClick={onStory}><span aria-hidden="true">✦</span> The story of Lantern Harbor <span aria-hidden="true">✦</span></button>}
 </section>;
}
