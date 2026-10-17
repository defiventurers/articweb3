import React,{useMemo,useState} from 'react';
import {ArrowRight,BookOpen,ChevronRight,Hand,Search,Sparkles,Target,X} from 'lucide-react';
import {game,create,pieces,RULES} from './games.ts';
import {GUIDES,GAME_HERITAGE} from './brand.js';
import {PIECE_GUIDES,rawUnits,unitRole} from './learning.js';
import {quickRules,searchChapters} from './teaching.js';
import {MascotPortrait} from './Companions.jsx';
import {GameAdventure} from './GameAdventure.jsx';
import {ADVENTURES} from './adventures.js';

export function Rulebook({id,preferences={mode:'lively',motion:true},onLearn,initialView='quick',compact=false}){
  const [view,setView]=useState(initialView),[query,setQuery]=useState(''),[demoMission,setDemoMission]=useState(null);
  const story=ADVENTURES[id];
  const quick=quickRules(id),chapters=searchChapters(RULES[id],query),enabled=preferences.mode!=='off';
  const icons=useMemo(()=>{const state=create(id),raw=rawUnits(id,state),visible=pieces(id,state);return Object.fromEntries(PIECE_GUIDES[id].map(([role])=>{const unit=raw.find(p=>unitRole(id,p)===role);return [role,visible.find(p=>p.id===unit?.id)?.sprite];}));},[id]);
  return <section className={`rulebook friendly-rulebook ${compact?'compact':''}`} aria-label={`${game(id).name} pocket rules`}>
    {!compact&&<div className="pocket-hero">{enabled&&<MascotPortrait host={story.missions[0].host} motion={preferences.mode==='lively'&&preferences.motion}/>}<div><small>{game(id).name.toUpperCase()} · POCKET GUIDE</small><h3>{story.title}</h3><p>Read a little. Try a little. We’ll be right here.</p></div></div>}
    <nav className="rule-tabs" aria-label="Rule views">{[['quick','Quick guide',Sparkles],['pieces','Pieces',Target],['full','Full rules',BookOpen],['try','Try a rule',Hand]].map(([key,label,Icon])=><button key={key} aria-pressed={view===key} onClick={()=>setView(key)}><Icon size={15}/>{label}</button>)}</nav>
    <div hidden={view!=='quick'} className="pocket-quick">
      <div className="pocket-goal"><span><Target size={14}/> YOUR GOAL</span><h3>{quick.goal}</h3><p>{quick.board}</p></div>
      <h4 className="pocket-subheading">One turn, simply</h4><ol className="turn-recipe">{quick.steps.map((step,i)=><li key={step}><span>{i+1}</span><p>{step}</p></li>)}</ol>
      <h4 className="pocket-subheading">Four little rules to touch</h4><p className="pocket-helper">These scenes are made especially for {game(id).name}. Open one and try its rule right here.</p>
      <div className="pocket-discoveries">{story.missions.map((m,i)=><button key={m.key} onClick={()=>{setDemoMission(m.key);setView('try');}}>{enabled?<img src={GUIDES[m.host].image} alt=""/>:<span>{i+1}</span>}<span><strong>{m.title}</strong><small>Watch · change · try</small></span><ChevronRight size={15}/></button>)}</div>
      <h4 className="pocket-subheading">Tiny words, clear meanings</h4><div className="rule-terms">{quick.terms.map(([term,meaning])=><details key={term}><summary>{term}<ChevronRight size={14}/></summary><p>{meaning}</p></details>)}</div>
      {onLearn&&<button className="primary full" onClick={()=>onLearn('journey')}>Start my little adventure <ArrowRight size={16}/></button>}
    </div>
    <div hidden={view!=='pieces'} className="pocket-pieces"><p className="pocket-helper">One piece, one idea. Tap Try it to see the real movement.</p>{PIECE_GUIDES[id].map(([role,name,move,note])=><article key={role} className="pocket-piece"><img src={icons[role]} alt=""/><div><h4>{name}</h4><p>{move}</p><details><summary>One extra detail</summary><p>{note}</p></details></div>{onLearn&&<button aria-label={`Try ${name}`} onClick={()=>onLearn('pieces',role)}>Try it <ArrowRight size={14}/></button>}</article>)}</div>
    <div hidden={view!=='full'} className="pocket-full">
      <label className="rule-search"><Search size={17}/><input aria-label="Find a rule" placeholder="Find a rule… try Cannon or capture" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear rule search" onClick={()=>setQuery('')}><X size={17}/></button>}</label>
      <p className="pocket-helper">{query?`${chapters.length} matching ${chapters.length===1?'chapter':'chapters'}`:'Every rule is here. Open one chapter at a time.'}</p>
      <div className="rule-chapters">{chapters.map((chapter,i)=><details key={`${id}:${query}:${chapter.title}`} open={query?true:undefined}><summary><span>{String(i+1).padStart(2,'0')}</span><strong>{chapter.title}</strong><ChevronRight size={16}/></summary>{chapter.paragraphs.map((p,n)=><p key={n}>{p}</p>)}</details>)}</div>
      {!chapters.length&&<div className="rule-no-results"><BookOpen size={24}/><p>No chapter has that word yet. Try a piece name or a shorter word.</p><button className="text-button" onClick={()=>setQuery('')}>Show all chapters</button></div>}
      <details className="pocket-edition"><summary>About this edition</summary><p>{GAME_HERITAGE[id].origin} · {GAME_HERITAGE[id].kind}</p><p>{GAME_HERITAGE[id].edition}</p></details>
    </div>
    {view==='try'&&<div className="pocket-rule-lab"><p className="pocket-helper">A little rule you can touch. All four scenes use {game(id).name}’s actual move rules. Your match stays separate.</p><GameAdventure key={id} id={id} preferences={preferences} initialMission={demoMission} onMissionChange={setDemoMission} compact/>{onLearn&&<button className="text-button" onClick={()=>onLearn('journey',undefined,demoMission)}>Open my full adventure <ArrowRight size={15}/></button>}</div>}
  </section>;
}
