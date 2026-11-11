import React,{useState} from 'react';
import {ArrowRight,BookOpen,Heart,Play,Sparkles,LockKeyhole,Compass} from 'lucide-react';
import {CULTURAL_HALLS} from './LaunchExperience.jsx';
import {HALL_ART} from './celebration.js';
import {game} from './games.ts';
import {PenguinAudience} from './PenguinAudience.jsx';
import stories from './heritageStories.json';

export const LAUNCH_GAME_ORDER=['dominion','xiangqi','shogi','sanguo','sanyou','sannin','yanyi','co-tu-lenh','shanshui-xiangqi'];
const image=id=>HALL_ART[id]?.card||(id==='co-tu-lenh'?'art/co-tu-lenh/board/board-antarctic-11x12.webp':'art/shanshui/starting-position-light.webp');
const allOpen=(access,id)=>!game(id)||access.allowed(id).open;
const playerCount=id=>game(id)?.players||(id==='co-tu-lenh'?2:4);
const filterGame=(id,filter,favorites)=>filter==='All'||(filter==='Favorites'?favorites.includes(id):filter===playerCount(id)+' players');

function Chapter({id,index,access,onIntroduce,onPlay,featured=false}){
 const story=stories.games[id],open=allOpen(access,id),group=CULTURAL_HALLS.find(h=>h.ids.includes(id));
 return <article className={'journey-chapter '+(featured?'featured':'')} data-story-id={id}>
   <button type="button" className="journey-cover" onClick={()=>onIntroduce(id)} aria-label={'Discover '+story.title}>
     <img src={image(id)} alt={story.title+' Antarctic game hall'} loading={index?'lazy':'eager'}/><PenguinAudience className="hall-spectators"/>
     <span className="journey-cover-caption"><small>CHAPTER {String(index+1).padStart(2,'0')} · {group?.origin}</small><strong>{story.title}</strong></span>
   </button>
   <div className="journey-chapter-copy"><small className="journey-origin">{story.origin}</small><h3>{story.screens[0].title}</h3><p>{story.screens[0].text}</p>
    <div className="journey-chapter-actions"><button type="button" className="primary" onClick={()=>onIntroduce(id)}><BookOpen size={17}/> Explore the story</button><button type="button" className="secondary" onClick={()=>onPlay(id)}>{open?<Play size={16}/>:<LockKeyhole size={16}/>} {open?'Play':'Unlock'} <ArrowRight size={16}/></button></div>
   </div>
 </article>;
}
export function StoryAdventureGallery({access,onIntroduce,onPlay}){
 const [chapter,setChapter]=useState(0),id=LAUNCH_GAME_ORDER[chapter];
 return <section className="story-adventure-gallery" aria-label="Story Adventure" data-testid="story-adventure-gallery">
  <div className="journey-banner"><span><Sparkles size={17}/> YOUR STORY BEGINS</span><h2>Every kingdom has a story.</h2><p>Travel from an Indian court to rivers, mountains and royal pavilions. Discover nine remarkable strategy games—one chapter at a time.</p><div className="journey-banners-characters" aria-hidden="true">{['polly','retsba','pengu','abster'].map(host=><img key={host} src={'art/launch-v1/hosts/'+host+'.webp'} alt=""/>)}</div></div>
  <nav className="journey-chapters" aria-label="Choose your adventure chapter">{LAUNCH_GAME_ORDER.map((id,i)=><button type="button" key={id} onClick={()=>setChapter(i)} aria-current={i===chapter?'step':undefined} aria-label={'Chapter '+(i+1)+': '+stories.games[id].title}>{i+1}</button>)}</nav>
  <Chapter id={id} index={chapter} access={access} onIntroduce={onIntroduce} onPlay={onPlay} featured/>
  <div className="journey-pagination"><button className="secondary" disabled={chapter===0} onClick={()=>setChapter(n=>Math.max(0,n-1))}>Previous chapter</button><span>{chapter+1} of {LAUNCH_GAME_ORDER.length}</span><button className="secondary" disabled={chapter===LAUNCH_GAME_ORDER.length-1} onClick={()=>setChapter(n=>Math.min(LAUNCH_GAME_ORDER.length-1,n+1))}>Next chapter <ArrowRight size={15}/></button></div>
 </section>;
}
export function AllGamesGallery({filter,favorites,onFavorite,onIntroduce,onPlay}){
 const ids=LAUNCH_GAME_ORDER.filter(id=>filterGame(id,filter,favorites));
 return <section className="all-games-gallery" aria-label="All Games" data-testid="all-games-gallery">
  <div className="catalogue-heading"><Compass size={20}/><div><h2>The complete collection</h2><p>Nine games · Stories, rules and a table for each one</p></div></div>
  {ids.length?<div className="all-games-grid">{ids.map(id=>{const info=stories.games[id],group=CULTURAL_HALLS.find(h=>h.ids.includes(id));return <article key={id} className="all-game-tile"><button className="all-game-image" onClick={()=>onIntroduce(id)} aria-label={'Read the story of '+info.title}><img src={image(id)} alt={info.title+' game illustration'} loading="lazy"/><PenguinAudience className="hall-spectators"/></button><div className="all-game-detail"><small>{group?.origin} · {playerCount(id)} players</small><h3>{info.title}</h3><p>{info.screens[0].title}</p><div className="all-game-actions"><button onClick={()=>onIntroduce(id)}><BookOpen size={16}/> Story</button><button onClick={()=>onPlay(id)}><Play size={16}/> Play</button><button aria-pressed={favorites.includes(id)} aria-label={(favorites.includes(id)?'Remove ':'Add ')+info.title+' favorite'} onClick={()=>onFavorite(id)}><Heart size={16} fill={favorites.includes(id)?'currentColor':'none'}/></button></div></div></article>;})}</div>:<p className="empty" role="status">No games match this filter.</p>}
 </section>;
}
