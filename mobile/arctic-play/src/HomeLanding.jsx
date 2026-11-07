import React,{useLayoutEffect} from 'react';

// Presentation only. All routes and resume authority remain owned by App.
export function HomeLanding({onBrowse,onLearn,onShop,onSearch,onJoin,onContinue,continueLabel,continueImage,story=true,onStory,gameCount=9,onJourney,discovery}){
 useLayoutEffect(()=>{document.documentElement.classList.add('home-v2-active');return()=>document.documentElement.classList.remove('home-v2-active');},[]);
 const base='art/home-v1/',resume=typeof onContinue==='function',lesson=resume&&/learning|lesson/i.test(continueLabel||'');
 const detail=lesson?'Your last lesson':String(continueLabel||'Your saved game').replace(/^Continue\s+/i,'');
 const image=resume&&typeof continueImage==='string'&&continueImage.startsWith('art/')?continueImage:null;
 return <section className="home-landing home-v2" aria-labelledby="home-v2-title">
  <h2 id="home-v2-title" className="home-v2-title">Antarctic Kingdoms</h2>
  <section className="home-v2-hero" aria-label="Welcome to Lantern Harbor">
   <div className="home-v2-scene" aria-hidden="true"/>
   <img className="home-v2-hosts" src={base+'home-hosts-welcome.webp'} width="1536" height="1024" alt="Nova, Retsba, Pengu and Abster welcome you to Lantern Harbor" fetchPriority="high"/>
   <div className="home-v2-copy"><p>LANTERN HARBOR</p><h3>Take your<br/>seat.</h3><span>Great games.<br/>Even better company.</span></div>
  </section>
  <div className="home-play-actions home-v2-actions">
   <button type="button" className={'home-v2-primary '+(resume?'home-resume':'home-explore')} onClick={resume?onContinue:onBrowse} aria-label={resume?(continueLabel||'Continue playing'):'Explore the Games'}>
    <span><strong>{resume?(lesson?'Continue learning':'Continue playing'):'Explore the Games'}</strong><small>{resume?detail:<>{gameCount} games to discover · Find your next favourite</>}</small></span>
    <img src={image||base+'hall-discovery.webp'} className={image?'home-v2-resume-cover':'home-v2-hall'} width="180" height="120" alt="" decoding="async"/>
   </button>
  </div>
  <div className="home-v2-secondary" aria-label="Learn and play together">
   <button type="button" className="home-v2-tile" onClick={onLearn||onBrowse}><strong>Learn a game</strong><small>One piece at a time</small><img src={base+'learn-pengu.webp'} width="1199" height="1312" alt="" decoding="async"/></button>
   <button type="button" className="home-v2-tile home-v2-friends" onClick={onJoin}><strong>Join friends</strong><small>Join with a room code</small><img src={base+'join-friends.webp'} width="1312" height="1199" alt="" decoding="async"/></button>
  </div>
  {onShop&&<button type="button" className="home-v2-shop" onClick={onShop}><span><strong>Physical boards</strong><small>Preview the collection</small><em>CONCEPT PREVIEW</em></span><img src={base+'physical-board-preview.webp'} width="1536" height="1024" alt="" decoding="async"/></button>}
  {onJourney?<button type="button" className="home-v2-journey" onClick={onJourney}><img src={base+'passport-journey.webp'} width="1774" height="887" alt="" decoding="async"/><span><strong>Your Antarctic Passport</strong><small>Discover your next hall</small></span></button>:discovery}
  {story&&onStory&&<button type="button" className="home-v2-story" onClick={onStory}>Discover the story of Lantern Harbor</button>}
 </section>;
}
