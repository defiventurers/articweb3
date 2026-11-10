import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,Download,Heart,Shield,X} from 'lucide-react';
import stories from './heritageStories.json';
import {GUIDES} from './brand.js';
import {game,asset,create,pieces} from './games.ts';
import {HALL_ART} from './celebration.js';
import {cloudRequest} from './cloud.js';
import {read} from './storage.js';
import {DOWNLOAD_ROOT,APP_VERSION} from './updates.js';
export const CULTURAL_HALLS=[
 {id:'subcontinent',title:'The Lotus Court',origin:'Indian subcontinent',art:'india',ids:['dominion'],text:'Early chess roots, reimagined in an icy court.'},
 {id:'china',title:'The River & Mountain Hall',origin:'China',art:'china',ids:['xiangqi','sanguo','sanyou','yanyi','shanshui-xiangqi'],text:'Living Xiangqi traditions, historical variants and clearly labelled modern designs.'},
 {id:'japan',title:'The Pavilion of Returning Pieces',origin:'Japan',art:'japan',ids:['shogi','sannin'],text:'Shogi and its twentieth-century three-player relative.'},
 {id:'vietnam',title:'The Lantern Coast',origin:'Vietnam',art:'vietnam',ids:['co-tu-lenh'],text:'A modern combined-forces strategy game, created in Vietnam.'}
];
const ORDER=['dominion','xiangqi','shogi','sanguo','sanyou','sannin','yanyi','co-tu-lenh','shanshui-xiangqi'];
const title=id=>stories.games[id]?.title||game(id)?.name||id;
const imageFor=id=>HALL_ART[id]?.card||(id==='co-tu-lenh'?'art/co-tu-lenh/board/board-antarctic-11x12.webp':'art/shanshui/starting-position-light.webp');
const iconFor=id=>game(id)?asset(game(id).icon):imageFor(id);
function cinemaPieces(id){if(id==='dominion')return ['red','blue','green','pink'].map(team=>'art/launch-v1/chaturanga-pieces/'+team+'-frost-king.webp');if(game(id)){const all=pieces(id,create(id)),seen=new Set();return all.filter(p=>{const key=p.label;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,4).map(p=>p.sprite);}if(id==='co-tu-lenh')return ['red-commander','blue-aircraft','red-navy'].map(p=>'art/co-tu-lenh/pieces/'+p+'.webp');return ['purple-king','purple-horse','purple-cannon'].map(p=>'art/shanshui/pieces/'+p+'.webp');}
export function CulturalGames({filter='All',favorites=[],onFavorite,onIntroduce,onPlay,onLearn,access,progress}){
 const [hall,setHall]=useState('all'),[index,setIndex]=useState(0),[activity,setActivity]=useState(null),[activityError,setActivityError]=useState(false);const touch=useRef(null);
 const ids=ORDER.filter(id=>(hall==='all'||CULTURAL_HALLS.find(h=>h.id===hall)?.ids.includes(id))&&(filter==='All'||filter==='Favorites'&&favorites.includes(id)||filter===`${game(id)?.players||(id==='co-tu-lenh'?2:4)} players`));
 const safeIndex=Math.min(index,Math.max(0,ids.length-1)),id=ids[safeIndex],story=stories.games[id],group=CULTURAL_HALLS.find(h=>h.ids.includes(id));
 useEffect(()=>{let live=true;const refresh=()=>cloudRequest('/launch/activity',{auth:false}).then(v=>{if(live){setActivity(v);setActivityError(false);}}).catch(()=>{if(live)setActivityError(true);});refresh();const t=setInterval(refresh,45000);return()=>{live=false;clearInterval(t);};},[]);
 useEffect(()=>setIndex(0),[filter,hall]);
 function next(direction){setIndex(n=>Math.max(0,Math.min(ids.length-1,n+direction)));}
 if(!id)return <div className="empty"><Heart/><h3>No games in this selection yet.</h3><button className="secondary" onClick={()=>setHall('all')}>Browse every hall</button></div>;
 const grant=game(id)?access.allowed(id):{open:true},win=access.progress?.wins?.[id],conquered=!!win;
 return <section className="cultural-games" aria-label="Explore the cultural halls">
  <nav className="culture-tabs" aria-label="Cultural halls"><button aria-pressed={hall==='all'} onClick={()=>setHall('all')}>All halls</button>{CULTURAL_HALLS.map(h=><button key={h.id} aria-pressed={hall===h.id} onClick={()=>setHall(h.id)}>{h.origin}<small>{h.ids.length} {h.ids.length===1?'game':'games'}</small></button>)}</nav>
  <div className="cultural-hall-heading"><span>{group.origin} · {group.title}</span><small>{activityError?'Activity unavailable':activity?`${activity.halls?.[group.id]?.players||0} players seated at active tables`:'Checking live tables…'}</small></div>
  <article className="expedition-game" key={id} onTouchStart={e=>touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY}} onTouchEnd={e=>{if(!touch.current)return;const dx=e.changedTouches[0].clientX-touch.current.x,dy=e.changedTouches[0].clientY-touch.current.y;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.5)next(dx<0?1:-1);touch.current=null;}}>
   <button className="expedition-hero" onClick={()=>onIntroduce(id)} aria-label={`Discover the story of ${title(id)}`}><img src={imageFor(id)} alt={`${title(id)} pieces and game world`}/><span>{story.edition}</span><strong>{title(id)}</strong></button>
   <div className="expedition-copy"><p className="world-eyebrow">DISCOVERY {safeIndex+1} OF {ids.length} · {story.origin}</p><h2>{story.screens[0].title}</h2><p>{story.screens[0].text}</p><div className="expedition-small-art"><img src={`art/launch-v1/${group.art}-hall.webp`} alt={`${group.origin}-inspired Antarctic hall`}/><button onClick={()=>onIntroduce(id)}><img src={iconFor(id)} alt=""/><span>Meet the pieces <ArrowRight size={15}/></span></button></div><p className="hall-culture-note">{group.text}</p><div className="expedition-actions"><button className="primary" onClick={()=>onIntroduce(id)}>Enter the story <ArrowRight size={17}/></button><button className="secondary" onClick={()=>onPlay(id)}>{grant.open?'Play now':'Unlock routes'}</button>{game(id)&&<button className="icon-btn" aria-pressed={favorites.includes(id)} aria-label={`${favorites.includes(id)?'Unfavorite':'Favorite'} ${title(id)}`} onClick={()=>onFavorite(id)}><Heart/></button>}</div>{game(id)&&<button className="text-button" onClick={()=>onLearn(id)}><BookOpen size={16}/> How to play</button>}</div>
   {conquered&&<div className="conquest-stamp"><span aria-hidden="true">♛</span> Conquered <small>{new Date(win.at).toLocaleDateString()}</small></div>}
  </article>
  <div className="expedition-pagination"><button disabled={safeIndex===0} onClick={()=>next(-1)} aria-label="Previous game"><ArrowLeft/></button><span>{safeIndex+1} / {ids.length}<small>{safeIndex===0&&hall==='all'?'8 more games to discover':'Swipe or use the arrows to explore'}</small></span><button disabled={safeIndex===ids.length-1} onClick={()=>next(1)} aria-label="Next game"><ArrowRight/></button></div>
 </section>;
}
export function GameIntroduction({id,onClose,onProceed,onLearn,quiet=false}){
 const [page,setPage]=useState(0),[paused,setPaused]=useState(false);const story=stories.games[id],heading=useRef(null),screen=story.screens[page],host=GUIDES[story.host];const group=CULTURAL_HALLS.find(h=>h.id===story.hall);
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[page]);
 const sprites=cinemaPieces(id);
 return <section className={'heritage-intro '+(paused?'paused':'')} aria-label={`${story.title} introduction`}>
  <header><small>{story.title} · {page+1} / 3</small><button className="text-button" onClick={onProceed}>Skip to game <ArrowRight size={16}/></button><button className="icon-btn" aria-label="Close introduction" onClick={onClose}><X/></button></header>
  <div className="intro-cinema" aria-label="Artistic interpretation, not historical footage"><img className="intro-hall-backdrop" src={`art/launch-v1/${group.art}-hall.webp`} alt=""/><div className="intro-pieces" aria-hidden="true">{sprites.map((sprite,n)=><img key={sprite} src={sprite} style={{'--piece-delay':n*.25+'s'}} alt=""/>)}</div><span>ARTISTIC INTERPRETATION</span><button className="intro-pause" aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?'Play atmosphere':'Pause atmosphere'}</button></div>
  <div className="intro-story-copy"><p className="world-eyebrow">{screen.label}</p><h2 tabIndex={-1} ref={heading}>{screen.title}</h2><p>{screen.text}</p>{!quiet&&<div className="intro-host"><img src={host.image} alt=""/><p><strong>{host.name}</strong><small>{host.role}</small></p></div>}<details><summary>Sources & edition</summary><p>{story.origin} · {story.edition}</p>{screen.sourceIds.map(key=><a key={key} href={stories.sources[key].url} target="_blank" rel="noreferrer">{stories.sources[key].title} ↗</a>)}</details></div>
  <footer><button className="secondary" disabled={page===0} onClick={()=>setPage(v=>v-1)}>Back</button><div aria-label="Introduction progress">{story.screens.map((s,n)=><button key={n} aria-label={`Story screen ${n+1}`} aria-current={page===n?'step':undefined} onClick={()=>setPage(n)}>{n+1}</button>)}</div><button className="primary" onClick={()=>page<2?setPage(v=>v+1):onProceed()}>{page<2?'Continue':'Take your seat'} <ArrowRight size={16}/></button></footer>{page===2&&onLearn&&<button className="text-button intro-learn" onClick={onLearn}>Learn the rules with {host.name}</button>}
 </section>;
}
export function InstallWebApp(){const [prompt,setPrompt]=useState(null),[tip,setTip]=useState(false),[installed,setInstalled]=useState(()=>window.matchMedia?.('(display-mode: standalone)').matches);useEffect(()=>{if(window.Android||!('serviceWorker' in navigator))return;const capture=e=>{e.preventDefault();setPrompt(e);},done=()=>{setInstalled(true);setPrompt(null);};window.addEventListener('beforeinstallprompt',capture);window.addEventListener('appinstalled',done);navigator.serviceWorker.register('pwa-sw.js',{scope:'./'}).catch(()=>{});return()=>{window.removeEventListener('beforeinstallprompt',capture);window.removeEventListener('appinstalled',done);};},[]);if(window.Android||installed)return null;return <aside className="web-install"><span>Keep the Kingdom close.</span><button onClick={async()=>{if(prompt){await prompt.prompt();setPrompt(null);}else setTip(v=>!v);}}><Download size={15}/> Install web app</button><a href={DOWNLOAD_ROOT+`ArcticPlay-v${APP_VERSION}.apk`}>Android APK</a>{tip&&<p>On iPhone: Safari → Share → Add to Home Screen. On Android: browser menu → Install app / Add to Home screen. Online sign-in is required; caching alone does not grant paid offline access.</p>}</aside>;}
export function useLaunchVisit(){useEffect(()=>{if(window.Android||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true)return;try{if(sessionStorage.getItem('ak-visit-counted'))return;let id=sessionStorage.getItem('ak-visit-id');if(!id){id=crypto.randomUUID();sessionStorage.setItem('ak-visit-id',id);}cloudRequest('/launch/visit',{method:'POST',auth:false,data:{sessionId:id}}).then(()=>sessionStorage.setItem('ak-visit-counted','1')).catch(()=>{});}catch{}},[]);}
