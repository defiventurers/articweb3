import React,{useMemo,useState} from 'react';
import {ArrowRight,BookOpen,ChevronRight,Search,X} from 'lucide-react';
import {game,create,pieces,RULES} from './games.ts';
import {GAME_HERITAGE} from './brand.js';
import {PIECE_GUIDES,rawUnits,unitRole} from './learning.js';
import {quickRules,searchChapters} from './teaching.js';
import {TeachingHost} from './TeachingHost.jsx';
import {GameAdventure} from './GameAdventure.jsx';
import {ADVENTURES} from './adventures.js';
import {DOMINION_TEAM_RULES} from './dominionTeams.js';

export function Rulebook({id,preferences={mode:'lively',motion:true},onLearn,initialView='quick',compact=false,sectionOnly=false,expandChapters=false}){
  const [view,setView]=useState(initialView),[query,setQuery]=useState(''),[demoMission,setDemoMission]=useState(ADVENTURES[id].missions[0].key),[role,setRole]=useState(PIECE_GUIDES[id][0][0]);
  const quick=quickRules(id),chapters=searchChapters(id==='dominion'?[...RULES[id],{title:'Optional 2v2 teams',paragraphs:[DOMINION_TEAM_RULES]}]:RULES[id],query),chosen=PIECE_GUIDES[id].find(p=>p[0]===role);
  const icons=useMemo(()=>{const state=create(id),raw=rawUnits(id,state),visible=pieces(id,state);return Object.fromEntries(PIECE_GUIDES[id].map(([role])=>{const unit=raw.find(p=>unitRole(id,p)===role);return [role,visible.find(p=>p.id===unit?.id)?.sprite];}));},[id]);
  return <section className={'rulebook friendly-rulebook minimal-rulebook '+(compact?'compact':'')} aria-label={game(id).name+' pocket rules'}>
    {!sectionOnly&&<label className="minimal-field rule-section-picker"><span className="sr-only">Rule section</span><select aria-label="Rule section" value={view} onChange={e=>setView(e.target.value)}><option value="quick">Quick start</option><option value="try">Try a rule</option><option value="pieces">Pieces</option><option value="full">Full rules</option></select></label>}
    <div hidden={view!=='quick'} className="pocket-quick">
      <h3 className="minimal-rule-heading">Your goal</h3>
      <TeachingHost host="polly" preferences={preferences} minimal>{quick.goal}</TeachingHost>
      <h4 className="minimal-rule-heading">One turn</h4><ol className="turn-recipe">{quick.steps.map((step,i)=><li key={step}><span>{i+1}</span><p>{step}</p></li>)}</ol>
      <button className="primary full" onClick={()=>onLearn?onLearn('journey'):setView('try')}>Learn on the board <ArrowRight size={16}/></button>
      <details className="minimal-detail rule-words"><summary>A few useful words <ChevronRight size={15}/></summary><dl>{quick.terms.map(([term,meaning])=><div key={term}><dt>{term}</dt><dd>{meaning}</dd></div>)}</dl><p>{quick.board}</p></details>
    </div>
    <div hidden={view!=='pieces'} className="pocket-pieces">
      <label className="minimal-field">Piece<select aria-label="Rule piece" value={role} onChange={e=>setRole(e.target.value)}>{PIECE_GUIDES[id].map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>
      <article className="pocket-piece"><img src={icons[role]} alt=""/><div><h4>{chosen[1]}</h4><p>{chosen[2]}</p><details><summary>More about this piece</summary><p>{chosen[3]}</p></details></div></article>
      {onLearn&&<button className="primary full" aria-label={'Try '+chosen[1]} onClick={()=>onLearn('pieces',role)}>Try this piece <ArrowRight size={16}/></button>}
    </div>
    <div hidden={view!=='full'} className="pocket-full">
      <label className="rule-search"><Search size={17}/><input aria-label="Find a rule" placeholder="Find a rule…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear rule search" onClick={()=>setQuery('')}><X size={17}/></button>}</label>
      <div className="rule-chapters">{chapters.map((chapter,i)=><details key={id+':'+query+':'+chapter.title} open={query||expandChapters?true:undefined}><summary><span>{String(i+1).padStart(2,'0')}</span><strong>{chapter.title}</strong><ChevronRight size={16}/></summary>{chapter.paragraphs.map((p,n)=><p key={n}>{p}</p>)}</details>)}</div>
      {!chapters.length&&<div className="rule-no-results"><BookOpen size={24}/><p>No matching rule. Try a piece name or a shorter word.</p><button className="text-button" onClick={()=>setQuery('')}>Show all chapters</button></div>}
      <details className="pocket-edition"><summary>About this edition</summary><p>{GAME_HERITAGE[id].origin} · {GAME_HERITAGE[id].kind}</p><p>{GAME_HERITAGE[id].edition}</p></details>
    </div>
    {view==='try'&&<div className="pocket-rule-lab">
      <label className="minimal-field">Rule to try<select aria-label="Rule to try" value={demoMission} onChange={e=>setDemoMission(e.target.value)}>{ADVENTURES[id].missions.map(m=><option key={m.key} value={m.key}>{m.title}</option>)}</select></label>
      <GameAdventure key={id} id={id} preferences={preferences} initialMission={demoMission} onMissionChange={setDemoMission} onFinish={()=>setView('quick')} onOpenLesson={onLearn?()=>onLearn('journey',undefined,demoMission):undefined} compact/>
    </div>}
  </section>;
}
