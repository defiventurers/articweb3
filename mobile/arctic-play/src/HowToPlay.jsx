import React,{useMemo,useState} from 'react';
import {ArrowLeft,BookOpen,ChevronRight,MoreHorizontal} from 'lucide-react';
import {GAME_LIST,game} from './games.ts';
import {TeachingHost} from './TeachingHost.jsx';
import {LearningPanel} from './LearningPanel.jsx';
import {GameAdventure} from './GameAdventure.jsx';
import {FirstJourney} from './FirstJourney.jsx';
import {RuleCourse} from './RuleCourse.jsx';
import {SoloBoard} from './SoloBoard.jsx';
import {PracticeBoard} from './PracticeBoard.jsx';
import {LearningChoices} from './LearningChoices.jsx';
import {courseCards,courseProgress,COURSE_KEY} from './curriculum.js';
import {FIRST_PIECE} from './soloPractice.js';
import {read} from './storage.js';
const sectionFor=value=>({course:'full-rules',free:'movement',pieces:'movement',learn:'quick-rules'})[value]||value;
export function LearningInvitation({onOpen,enabled=true}){return <button className="learning-invitation" onClick={onOpen}><BookOpen size={26}/><span><strong>New here? Learn to play.</strong><small>Three ways to learn, with your mascots.</small></span><ChevronRight size={18}/></button>;}
export function HowToPlay({id,onGame,onClose,onPractice,onDiscovery,preferences,onLearningEvent,initialTab='start',initialRole,initialMission,returnToGame=false}){
 const definition=game(id),cards=useMemo(()=>courseCards(id),[id]);
 const [tab,setTab]=useState(()=>sectionFor(initialTab)),[menu,setMenu]=useState(null),[query,setQuery]=useState(''),[mission,setMission]=useState(initialMission),[courseIndex,setCourseIndex]=useState(()=>courseProgress(id,read(COURSE_KEY+'.'+id,{})).index),[soloRole,setSoloRole]=useState(initialRole||FIRST_PIECE[id]);
 function section(next){setTab(sectionFor(next));setMenu(null);(document.scrollingElement||document.documentElement).scrollTop=0;}
 return <div className="how-to-play minimalist-school learning-hub" data-testid="how-to-play" data-game={id} data-section={tab}>
  <header className="academy-header minimal-header"><button className="icon-btn" aria-label="Back from How to Play" onClick={onClose}><ArrowLeft/></button><div><small>LEARN TO PLAY</small><h1>{definition.name}</h1></div><button className="icon-btn" aria-label="Learning options" onClick={()=>setMenu('options')}><MoreHorizontal/></button></header>
  <main className="academy-content minimal-content">
   {tab!=='start'&&<button className="learning-choices-back" onClick={()=>section('start')}><ArrowLeft size={17}/> Learning choices</button>}
   {returnToGame&&<p className="minimal-return">Your match stays separate from these practice boards.</p>}
   {tab==='start'?<section className="learning-choice-home"><h2>How to play</h2><TeachingHost host="polly" preferences={preferences} minimal>Pick a path. We’ll show you what to do, one step at a time.</TeachingHost><LearningChoices id={id} preferences={preferences} onChoose={section}/></section>:
    tab==='quick-rules'?<FirstJourney id={id} preferences={preferences} onPractice={onPractice} onFinish={()=>section('start')} onDiscovery={onDiscovery} onLearningEvent={onLearningEvent} onFullGuide={()=>section('full-rules')}/>:
    tab==='full-rules'?<RuleCourse id={id} preferences={preferences} index={courseIndex} onIndex={setCourseIndex} onSolo={role=>{setSoloRole(role);section('movement');}} onTopics={()=>setMenu('topics')} onPractice={onPractice} onFinish={()=>section('start')} onDiscovery={onDiscovery} onLearningEvent={onLearningEvent}/>:
    tab==='sandbox'?<PracticeBoard key={id} id={id} preferences={preferences}/>:
    tab==='journey'?<GameAdventure key={id+':'+mission} id={id} preferences={preferences} initialMission={mission} onDiscovery={onDiscovery} onLearningEvent={onLearningEvent} onPractice={onPractice} onFinish={()=>section('start')}/>:
    <SoloBoard key={id+':'+soloRole} id={id} preferences={preferences} initialRole={soloRole}/>
   }
  </main>
  {menu==='options'&&<LearningPanel title="Learning options" onClose={()=>setMenu(null)}><LearningChoices id={id} preferences={preferences} onChoose={section}/><button className="minimal-option" onClick={()=>section('sandbox')}>Build a practice position <ChevronRight size={18}/></button><button className="minimal-option" onClick={()=>{setMission(undefined);section('journey');}}>Board challenges <ChevronRight size={18}/></button><h3>Choose a game</h3><div className="learning-game-buttons">{GAME_LIST.map(g=><button key={g.id} aria-pressed={id===g.id} onClick={()=>onGame(g.id,'start')}>{g.name}<ChevronRight size={17}/></button>)}</div></LearningPanel>}
  {menu==='topics'&&<LearningPanel title="All rules" onClose={()=>setMenu(null)}><p>Choose any rule. Completed steps keep their progress.</p><label className="minimal-field">Find a rule<input aria-label="Find a rule" placeholder="Search rules or pieces…" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="learning-topic-list">{cards.map((card,i)=>({card,i})).filter(({card})=>(card.title+' '+card.cue).toLowerCase().includes(query.toLowerCase())).map(({card,i})=><button key={card.key} aria-current={i===courseIndex?'step':undefined} onClick={()=>{setCourseIndex(i);setMenu(null);}}><span>{i+1}</span><div><strong>{card.title}</strong><small>{card.cue.slice(0,100)}</small></div><ChevronRight size={17}/></button>)}</div></LearningPanel>}
 </div>;
}
