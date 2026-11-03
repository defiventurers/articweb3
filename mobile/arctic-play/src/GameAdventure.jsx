import {rememberReplay} from './replays.js';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,Hand,HelpCircle} from 'lucide-react';
import {board,pieces,hand} from './games.ts';
import {ADVENTURES,ADVENTURE_KEY,adventureProgress,recordAdventure,missionFor} from './adventures.js';
import {TeachingHost} from './TeachingHost.jsx';
import {Board} from './Board.jsx';
import {LearningHelp} from './LearningHelp.jsx';
import {RuleClient} from './ruleClient.js';
import {read,write} from './storage.js';
import {LESSONS} from './learning.js';
import {INTRO_KEY,preferredSetup,briefFeedback,nextUntried} from './minimalLearning.js';

export function GameAdventure({id,preferences,initialMission,onMissionChange,onDiscovery,onPractice,onFinish,onOpenLesson,compact=false,single=false,onLearningEvent,finishLabel,eyebrow,hostOverride}){
  const story=initialMission&&!ADVENTURES[id].missions.some(m=>m.key===initialMission)?{...ADVENTURES[id],missions:[missionFor(id,initialMission)]}:ADVENTURES[id],geometry=useMemo(()=>board(id),[id]);
  const [progress,setProgress]=useState(()=>adventureProgress(read(ADVENTURE_KEY,{})));
  const [key,setKey]=useState(()=>story.missions.some(m=>m.key===initialMission)?initialMission:nextUntried(id,adventureProgress(read(ADVENTURE_KEY,{}))));
  const [page,setPage]=useState(()=>compact||initialMission?'lesson':story.missions.every(m=>adventureProgress(read(ADVENTURE_KEY,{}))[id]?.[m.key])?'ready':read(INTRO_KEY(id),false)?'lesson':'intro');
  const mission=story.missions.find(m=>m.key===key),index=story.missions.indexOf(mission);
  const [variant,setVariant]=useState(()=>preferredSetup(id,key)),[position,setPosition]=useState(null),[selected,setSelected]=useState(null);
  const [watching,setWatching]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[feedback,setFeedback]=useState(''),[hint,setHint]=useState(false),[trail,setTrail]=useState(null),[replay,setReplay]=useState(0),[help,setHelp]=useState(false);
  const client=useRef(null),sequence=useRef(0),moves=useRef([]),heading=useRef(null);
  if(!client.current)client.current=new RuleClient('learn.js');
  const completed=story.missions.filter(m=>progress[id]?.[m.key]).length;
  const visible=position?pieces(id,position.state):[],pocket=position?hand(id,position.state):[];
  const choices=position?.legal.filter(a=>a.source===selected)||[],won=position?.complete&&!watching;
  useEffect(()=>{const sync=()=>setProgress(adventureProgress(read(ADVENTURE_KEY,{})));window.addEventListener('arctic-adventure-progress',sync);return()=>window.removeEventListener('arctic-adventure-progress',sync);},[]);
  useEffect(()=>{if(initialMission&&initialMission!==key&&story.missions.some(m=>m.key===initialMission))choose(initialMission);},[initialMission]);
  useEffect(()=>{
    const job=++sequence.current;client.current.reset('A new lesson is opening.');moves.current=[];
    setPosition(null);setLoading(page==='lesson');setSelected(null);setWatching(false);setBusy(false);setFeedback('');setHint(false);setTrail(null);setError('');setHelp(false);
    if(page!=='lesson')return;
    client.current.call('adventure',{id,mission:key,variant,actionIds:[]}).then(p=>{if(sequence.current===job){setPosition(p);setLoading(false);}}).catch(e=>{if(sequence.current===job){setError(e.message);setLoading(false);}});
    return()=>{sequence.current++;client.current.reset('The lesson changed.');};
  },[id,key,variant,replay,page]);
  useEffect(()=>()=>client.current.reset('The lesson closed.'),[]);
  function choose(next){
    const m=story.missions.find(m=>m.key===next);if(!m)return;
    setKey(next);setVariant(preferredSetup(id,next));setReplay(n=>n+1);setPage('lesson');onMissionChange?.(next);
    (document.scrollingElement||document.documentElement).scrollTop=0;
    heading.current?.focus({preventScroll:true});
  }
  async function perform(action,demo=false){
    if(busy||!position||position.complete||watching&&!demo)return;
    const job=sequence.current,from=visible.find(p=>p.source===action.source)?.cell,ids=[...moves.current,action.id];
    setBusy(true);setError('');setFeedback('');if(demo)setWatching(true);
    try{
      const next=await client.current.call('adventure',{id,mission:key,variant,actionIds:ids});
      if(job!==sequence.current)return;
      moves.current=ids;setPosition(next);setTrail({from:from||null,to:action.target});setSelected(null);setHint(false);
      if(next.complete&&!demo){if(variant===preferredSetup(id,key))rememberReplay({id,task:'scene',mission:key},ids);const saved=recordAdventure(read(ADVENTURE_KEY,{}),id,key);write(ADVENTURE_KEY,saved);setProgress(saved);window.dispatchEvent(new Event('arctic-adventure-progress'));onDiscovery?.(id);onLearningEvent?.({id,position:{...next,activity:{kind:'scene',mission:key}},retry:!!feedback,source:'journey'});}
    }catch(e){if(job===sequence.current)setError(e.message);}finally{if(job===sequence.current)setBusy(false);}
  }
  function target(cell){const action=choices.find(a=>a.target===cell);if(action)perform(action);}
  function miss(){if(!watching&&!won)setFeedback(position?.legal.length?mission.hint:mission.variants?.find(v=>v[0]===variant)?.[2]||mission.why);}
  const instruction=won?briefFeedback(mission.after):watching?'Watch the path. Then it is your turn.':feedback||(!position?.legal.length&&position?mission.variants?.find(v=>v[0]===variant)?.[2]||mission.task:position?.stage===1&&key==='two-dice'?'Die 1 is spent. Now move the Unicorn with die 3.':selected?'Choose a blue spot or an orange-ringed rival.':mission.task);
  function next(){if(single){onFinish?.();return;}if(index<story.missions.length-1)choose(story.missions[index+1].key);else if(compact)onFinish?.();else setPage('ready');}
  return <section className={'game-adventure focus-adventure '+(compact?'compact-adventure':'')+' '+(page!=='lesson'?'focus-cover':'')} style={{'--trail':story.accent}} data-testid="game-adventure" data-game={id} data-mission={key} data-variant={variant} data-page={page} data-ready={!!position&&position.missionKey===key&&position.variant===variant&&!loading} data-stage={position?.stage||0} data-watching={watching} data-complete={!!position?.complete}>
    {page==='intro'?<div className="learning-intro">
      <h2>Your goal</h2><TeachingHost host="polly" preferences={preferences} minimal>{LESSONS[id].goal}</TeachingHost>
      <p className="minimal-subtitle">One move at a time. No timer.</p>
      <button className="primary full" onClick={()=>{write(INTRO_KEY(id),true);setPage('lesson');}}>Start learning <ArrowRight size={17}/></button>
    </div>:page==='ready'?<div className="learning-ready">
      <h2>{completed===4?'Ready for a gentle game?':'A lovely start.'}</h2>
      <TeachingHost host="abster" preferences={preferences} minimal success={completed===4}>{completed===4?'You explored four patterns. Let’s try them in a practice game.':completed+' of 4 lessons tried. Let’s take the next little step.'}</TeachingHost>
      <button className="primary full" onClick={()=>completed<4?choose(nextUntried(id,progress)):(onPractice||onFinish)?.()}>{completed<4?'Continue learning':onPractice?'Play a practice game':'Done'} <ArrowRight size={17}/></button>
      <p className="minimal-subtitle">Revisit any lesson in Options.</p>
    </div>:<>
      <div className="discovery-heading focus-heading"><small>{eyebrow||`LESSON ${index+1} OF ${story.missions.length}`}</small><h3 ref={heading} tabIndex={-1}>{mission.title}</h3></div>
      <TeachingHost key={key} host={hostOverride||mission.host} preferences={preferences} minimal success={won} mood={won?'pleased':feedback?'curious':selected?'thinking':'listening'} onTip={won||watching||pocket.some(p=>p.source===position?.focus)?undefined:()=>{setSelected(position?.focus);setHint(true);setFeedback(mission.hint);}}>{instruction}</TeachingHost>
      {position?.practiceDice&&<div className="minimal-dice" aria-label="Fixed practice dice"><span>Practice dice</span>{position.practiceDice.values.map((value,i)=><span key={i} className={position.practiceDice.used[i]||position.stage>i?'spent':''}><b>{value}</b><small>{position.practiceDice.used[i]?'Off':position.stage>i?'Spent':'Ready'}</small></span>)}</div>}
      {loading&&<p className="lesson-loading" role="status">Setting out the pieces…</p>}
      {position&&<>
        <div className="academy-board discovery-board"><Board key={key+':'+variant+':'+replay} id={id} state={position.state} legal={position.legal} selected={selected} suggested={!selected&&!position.complete?position.focus:null} spotlight={!position.complete?position.focus:null} trail={trail} onSelect={value=>{setSelected(value);setFeedback('');}} onTarget={target} canAct={!busy&&!position.complete&&!watching} inspectableSources={position.complete?[]:[position.focus]} onMiss={miss} annotations={position.notice||[]} compactControls perspective="red"/></div>
        <div className="discovery-actions focus-actions">
          {!position.complete&&!watching&&pocket.filter(p=>p.source===position.focus).map(p=><button key={p.source} className={'lesson-hand '+(selected===p.source?'active':'')} onClick={()=>setSelected(p.source)}><img src={p.sprite} alt=""/><span>Piece in hand<strong>{p.label} · tap to drop</strong></span></button>)}
          {hint&&!position.complete&&!watching&&!!choices.length&&<div className="discovery-destinations"><button disabled={busy} onClick={()=>perform(choices[0])}>{choices[0].promote?'Promote · ':visible.some(p=>p.cell===choices[0].target)?'Capture · ':''}{geometry.cells.find(c=>c.id===choices[0].target)?.label||'Try this destination'}</button></div>}
          {won&&<div className="discovery-result"><button className="primary full" onClick={next}>{single?(finishLabel||'Back to rule'):index===3?'Finish':'Next lesson'} <ArrowRight size={16}/></button></div>}
          {watching&&<div className="discovery-demo"><small>Example only · no stamp earned</small><button className="primary full" disabled={busy} onClick={()=>position.complete?setReplay(n=>n+1):perform(position.legal[0],true)}>{position.complete?'Now my turn':'Watch the next move'} <Hand size={16}/></button>{!position.complete&&<button className="text-button" onClick={()=>setReplay(n=>n+1)}>Try it myself</button>}</div>}
          {!watching&&<button className="text-button focus-help" onClick={()=>setHelp(true)} disabled={busy}><HelpCircle size={16}/> Need help?</button>}
        </div>
      </>}
      {error&&<div className="lesson-error" role="alert"><p>{error}</p><button className="secondary" onClick={()=>setReplay(n=>n+1)}>Try again</button></div>}
      {help&&<LearningHelp onClose={()=>setHelp(false)} description={won?mission.after:mission.hint} note={mission.why} markers={position?.notice} variants={mission.variants} variant={variant} onVariant={value=>{setVariant(value);setReplay(n=>n+1);}} onReplay={()=>setReplay(n=>n+1)} onOpenLesson={onOpenLesson} onHint={!position?.complete&&position?.legal.length?()=>{setSelected(position.focus);setHint(true);setFeedback(mission.hint);}:undefined} onWatch={!position?.complete&&position?.legal.length?()=>perform(position.legal[0],true):undefined}/>}
    </>}
  </section>;
}
