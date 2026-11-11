import React,{useMemo,useState} from 'react';
import {ArrowLeft,BookOpen,Gamepad2,Home,LockKeyhole,Play,ShieldCheck,Users} from 'lucide-react';
import {StoryAdventureGallery,AllGamesGallery} from './GamesViews.jsx';
import {CulturalGames,GameIntroduction} from './LaunchExperience.jsx';
import CoTuLenhApp from '../../../frontend/src/games/co-tu-lenh/CoTuLenhApp.jsx';
import {ShanshuiApp} from '../../../frontend/src/games/shanshui-xiangqi/ShanshuiApp.jsx';
import stories from './heritageStories.json';

// This browser-only educational route never grants account access, purchases,
// saved passport progress, online rooms or backend privileges.
const PREVIEW_ACCESS=Object.freeze({allowed:()=>({open:false}),progress:{wins:{}}});
const SHANSHUI_ASSETS=Object.freeze({root:'art/shanshui',yanYiRoot:'art/yanyi/pieces'});
const MODES=[['story','Story Adventure'],['all','All Games'],['halls','Halls']];

export function PublicKingdomPreview({onSignIn}){
 const [view,setView]=useState('story'),[filter,setFilter]=useState('All'),[favorites,setFavorites]=useState([]);
 const [introduction,setIntroduction]=useState(null),[activeGame,setActiveGame]=useState(null),[signInPrompt,setSignInPrompt]=useState(null);
 const [notice,setNotice]=useState('');
 const toggleFavorite=id=>setFavorites(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);
 const enterGame=id=>{
  setIntroduction(null);
  if(id==='shanshui-xiangqi'||id==='co-tu-lenh'){setActiveGame(id);setSignInPrompt(null);}
  else setSignInPrompt(id);
 };
 const closeGame=()=>{setActiveGame(null);setNotice('');};
 const intro=useMemo(()=>introduction?[introduction]:[],[introduction]);

 if(activeGame==='shanshui-xiangqi')return <div className="kingdom-preview-standalone" data-testid="guest-local-game" data-game="shanshui-xiangqi">
  <div className="kingdom-preview-ribbon"><span><ShieldCheck size={14}/> Guest local game · Nothing is submitted online</span><button type="button" onClick={closeGame}>Back to preview</button></div>
  <ShanshuiApp onExit={closeGame} assets={SHANSHUI_ASSETS} workerUrl="shanshui-bot.js" onOnline={()=>setNotice('Sign in to create a verified online table.')}/>
  {notice&&<p className="kingdom-preview-alert" role="status">{notice} <button onClick={onSignIn}>Sign in</button></p>}
 </div>;
 if(activeGame==='co-tu-lenh')return <div className="kingdom-preview-standalone" data-testid="guest-local-game" data-game="co-tu-lenh">
  <div className="kingdom-preview-ribbon"><span><ShieldCheck size={14}/> Guest local game · Online tables require an account</span><button type="button" onClick={closeGame}>Back to preview</button></div>
  <CoTuLenhApp onExitToLibrary={closeGame} assetBase="art/co-tu-lenh" allowOnline={false}/>
 </div>;

 if(intro.length)return <div className="kingdom-preview-intro" data-testid="guest-introduction">
  <GameIntroduction key={introduction} id={introduction} quiet={false}
    onClose={()=>setIntroduction(null)} onProceed={()=>enterGame(introduction)}
    onLearn={()=>enterGame(introduction)}/>
 </div>;

 return <main className="kingdom-preview" data-testid="public-kingdom-preview">
  <header className="kingdom-preview-header">
   <div className="kingdom-preview-brand"><span className="kingdom-preview-crown" aria-hidden="true">♛</span><div><small>ANTARCTIC GAMING CO.</small><h1>Antarctic Kingdoms</h1></div></div>
   <button type="button" className="kingdom-preview-signin" onClick={onSignIn}>Sign in <LockKeyhole size={14}/></button>
  </header>
  <section className="kingdom-preview-guest-note"><strong><ShieldCheck size={17}/> Explore the Kingdom</strong><p>Discover all nine stories without waiting for sign-in. Try local Commander Chess or Shanshui Xiangqi. Passport achievements, saved progress and online matches remain securely behind your account.</p></section>
  <nav className="ak-games-views" aria-label="Explore Games" data-testid="guest-games-view-tabs">
   {MODES.map(([id,label])=><button key={id} type="button" aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}
  </nav>
  {view!=='story'&&<div className="filter-row">{['All','2 players','3 players','4 players','Favorites'].map(label=><button key={label} type="button" className={filter===label?'active':''} onClick={()=>setFilter(label)}>{label}</button>)}</div>}
  {view==='story'?<StoryAdventureGallery access={PREVIEW_ACCESS} onIntroduce={setIntroduction} onPlay={enterGame}/>:
   view==='all'?<AllGamesGallery filter={filter} favorites={favorites} onFavorite={toggleFavorite} onIntroduce={setIntroduction} onPlay={enterGame}/>:
   <CulturalGames filter={filter} favorites={favorites} onFavorite={toggleFavorite} onIntroduce={setIntroduction} onPlay={enterGame}
     onLearn={setIntroduction} access={PREVIEW_ACCESS} progress={{}} enableLiveActivity={false}/>}
  {signInPrompt&&<div className="kingdom-preview-prompt" role="dialog" aria-modal="true" aria-labelledby="guest-play-heading">
   <section><h2 id="guest-play-heading">{stories.games[signInPrompt].title}</h2>
    <p>The story is yours to explore. Sign in to play this game's full modes and save your Antarctic Passport progress.</p>
    <button type="button" className="primary" onClick={onSignIn}><Play size={16}/> Sign in to play</button>
    <button type="button" className="secondary" onClick={()=>{setSignInPrompt(null);setIntroduction(signInPrompt);}}><BookOpen size={16}/> Return to the story</button>
    <button type="button" className="text-button" onClick={()=>setSignInPrompt(null)}><ArrowLeft size={16}/> Continue exploring</button>
   </section>
  </div>}
  <footer className="kingdom-preview-footer"><span><Gamepad2 size={14}/> Public heritage preview · no wallet required</span><button type="button" onClick={onSignIn}>Sign in to join friends <Users size={14}/></button></footer>
 </main>;
}
