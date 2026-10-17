import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,Check,ChevronRight,Eye,Hand,Lightbulb,Play,RotateCcw,Sparkles} from 'lucide-react';
import {board,game,pieces,hand,inCheck,seatName} from './games.ts';
import {ADVENTURES,ADVENTURE_KEY,adventureProgress,recordAdventure} from './adventures.js';
import {TeachingHost} from './TeachingHost.jsx';
import {Board} from './Board.jsx';
import {RuleClient} from './ruleClient.js';
import {read,write} from './storage.js';
import {LESSONS} from './learning.js';

export function GameAdventure({id,preferences,initialMission,onMissionChange,onDiscovery,onPractice,onFree,onPieces,compact=false}){
  const story=ADVENTURES[id],definition=game(id),geometry=useMemo(()=>board(id),[id]);
  const [progress,setProgress]=useState(()=>adventureProgress(read(ADVENTURE_KEY,{})));
  const [key,setKey]=useState(()=>story.missions.some(m=>m.key===initialMission)?initialMission:story.missions.find(m=>!adventureProgress(read(ADVENTURE_KEY,{}))[id]?.[m.key])?.key||story.missions[0].key);
  const mission=story.missions.find(m=>m.key===key),index=story.missions.indexOf(mission);
  const [variant,setVariant]=useState(mission.variants?.[0][0]||'default'),[position,setPosition]=useState(null),[selected,setSelected]=useState(null);
  const [watching,setWatching]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[feedback,setFeedback]=useState(''),[hint,setHint]=useState(false),[trail,setTrail]=useState(null),[replay,setReplay]=useState(0);
  const client=useRef(null),sequence=useRef(0),moves=useRef([]),heading=useRef(null);
  if(!client.current)client.current=new RuleClient('learn.js');
  const completed=story.missions.filter(m=>progress[id]?.[m.key]).length;
  const visible=position?pieces(id,position.state):[],pocket=position?hand(id,position.state):[];
  const choices=position?.legal.filter(a=>a.source===selected)||[],focused=visible.find(p=>p.source===position?.focus)||pocket.find(p=>p.source===position?.focus);
  const won=position?.complete&&!watching,activeVariant=mission.variants?.find(v=>v[0]===variant);
  const checked=position&&inCheck(id,position.state);
  useEffect(()=>{const sync=()=>setProgress(adventureProgress(read(ADVENTURE_KEY,{})));window.addEventListener('arctic-adventure-progress',sync);return()=>window.removeEventListener('arctic-adventure-progress',sync);},[]);
  useEffect(()=>{if(initialMission&&initialMission!==key&&story.missions.some(m=>m.key===initialMission))choose(initialMission);},[initialMission]);
  useEffect(()=>{
    const job=++sequence.current;client.current.reset('A new discovery is opening.');moves.current=[];
    setPosition(null);setLoading(true);setSelected(null);setWatching(false);setBusy(false);setFeedback('');setHint(false);setTrail(null);setError('');
    client.current.call('adventure',{id,mission:key,variant,actionIds:[]}).then(p=>{if(sequence.current===job){setPosition(p);setLoading(false);}}).catch(e=>{if(sequence.current===job){setError(e.message);setLoading(false);}});
    return()=>{sequence.current++;client.current.reset('The discovery changed.');};
  },[id,key,variant,replay]);
  useEffect(()=>()=>client.current.reset('The discovery closed.'),[]);
  function choose(next){
    const m=story.missions.find(m=>m.key===next);if(!m)return;
    setKey(next);setVariant(m.variants?.[0][0]||'default');setReplay(n=>n+1);
    onMissionChange?.(next);
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
      if(next.complete&&!demo){const saved=recordAdventure(read(ADVENTURE_KEY,{}),id,key);write(ADVENTURE_KEY,saved);setProgress(saved);window.dispatchEvent(new Event('arctic-adventure-progress'));onDiscovery?.(id);}
    }catch(e){if(job===sequence.current)setError(e.message);}finally{if(job===sequence.current)setBusy(false);}
  }
  function target(cell){const action=choices.find(a=>a.target===cell);if(action)perform(action);}
  function miss(){if(!watching&&!won)setFeedback(position?.legal.length?mission.hint:`${activeVariant?.[2]||mission.why} Try another setup above.`);}
  const instruction=position?.stage===1&&!position.complete&&key==='two-dice'?'Die 1 is spent. Now move the glowing Unicorn with die 3. Green is still taking its turn.':mission.task;
  const dice=position?.practiceDice;
  return <section className={`game-adventure ${compact?'compact-adventure':''}`} style={{'--trail':story.accent}} data-testid="game-adventure" data-game={id} data-mission={key} data-variant={variant} data-ready={!!position&&position.missionKey===key&&position.variant===variant&&!loading} data-stage={position?.stage||0} data-watching={watching} data-complete={!!position?.complete}>
    {!compact&&<><div className="adventure-postcard"><img src={`art/${definition.icon}`} alt=""/><div><small>YOUR {definition.name.toUpperCase()} ADVENTURE</small><h3>{story.title}</h3><p><strong>Your aim:</strong> {LESSONS[id].goal}</p></div></div><details className="adventure-first-look"><summary>New here? One turn, simply <ChevronRight size={15}/></summary><p>{LESSONS[id].turn}</p><small>{LESSONS[id].board}</small><p>In these scenes, tap the gold-ringed piece, then a blue destination or an orange-ringed rival. A little nudge or Watch once can help.</p></details></>}
    <div className="adventure-progress"><span><Sparkles size={14}/> {completed} of {story.missions.length} discoveries tried</span><small>Every stop is open</small></div>
    <nav className="discovery-map" aria-label={`${definition.name} discoveries`}>{story.missions.map((m,i)=><button key={m.key} aria-current={m.key===key?'step':undefined} aria-label={`${i+1}. ${m.title}${progress[id]?.[m.key]?' · tried':''}`} onClick={()=>choose(m.key)}><span className={progress[id]?.[m.key]?'stamped':''}>{progress[id]?.[m.key]?<Check size={15}/>:i+1}</span><small>{m.short}</small></button>)}</nav>
    <div className="discovery-heading"><small>DISCOVERY {index+1} / {story.missions.length}</small><h3 ref={heading} tabIndex={-1}>{mission.title}</h3></div>
    <TeachingHost key={key} host={mission.host} preferences={preferences} compact success={won} tips={[mission.hint,mission.why]}><span role="status" aria-live="polite">{won?'You tried it! A little discovery to keep.':watching?'Watch the path. This is an example; your turn comes next.':instruction}</span></TeachingHost>
    {mission.variants&&<fieldset className="discovery-variants" disabled={busy||loading}><legend>Change one little thing</legend><div>{mission.variants.map(([value,label])=><button key={value} type="button" aria-pressed={variant===value} onClick={()=>{setVariant(value);setReplay(n=>n+1);}}>{label}</button>)}</div><p aria-live="polite">{activeVariant?.[2]}</p></fieldset>}
    {loading&&<p className="lesson-loading" role="status">Setting out a little scene…</p>}
    {position&&<>
      <div className="discovery-context"><span>{seatName(id,position.state.turn)}{position.complete?' · after the move':' · teaching army'}</span><span>{checked?'King / General is in check':id==='dominion'?'No check restriction':'Real move rules'}</span></div>
      {dice&&<div className="teaching-dice" aria-label="Fixed practice dice"><small>FIXED PRACTICE DICE</small><div>{dice.values.map((value,i)=><span key={i} className={dice.used[i]||position.stage>i?'spent':''}><b>{value}</b><span>{({1:'Guard / King',2:'Mammoth',3:'Unicorn',4:'Icebreaker',5:'Guard / King',6:'Icebreaker'})[value]}<small>{dice.used[i]?'Not used here':position.stage>i?'Spent':'Ready'}</small></span></span>)}</div></div>}
      <p className="discovery-snapshot">A tiny arranged scene · separate from your game</p>
      <div className="academy-board discovery-board"><Board key={`${key}:${variant}:${replay}`} id={id} state={position.state} legal={position.legal} selected={selected} suggested={!selected&&!position.complete?position.focus:null} spotlight={!position.complete?position.focus:null} trail={trail} onSelect={setSelected} onTarget={target} canAct={!busy&&!position.complete&&!watching} inspectableSources={position.complete?[]:[position.focus]} onMiss={miss} annotations={position.notice||[]}/></div>
      {!!position.notice?.length&&<ol className="discovery-notices" aria-label="Scene markers">{position.notice.map((n,i)=><li key={n.cell}><span>{i+1}</span>{n.label}</li>)}</ol>}
      {!position.complete&&!watching&&<div className="discovery-actions">
        {pocket.filter(p=>p.source===position.focus).map(p=><button key={p.source} className={`lesson-hand ${selected===p.source?'active':''}`} onClick={()=>setSelected(p.source)}><img src={p.sprite} alt=""/><span>A helper in hand<strong>{p.label} · tap to drop</strong></span></button>)}
        <p className="discovery-cue" role="status">{busy?'Checking your little move…':!position.legal.length?'This discovery’s destination is unavailable in this setup. Change one little thing above.':selected?'Choose a blue destination or an orange-ringed rival.':pocket.some(p=>p.source===position.focus)?'Choose the helper in hand below the board.':`Tap the gold-ringed ${focused?.label||'piece'}.`}</p>
        {feedback&&<p className="discovery-feedback" aria-live="polite">{feedback}</p>}
        {!!position.legal.length&&<div className="discovery-help"><button className="text-button" onClick={()=>{setHint(true);setSelected(position.focus);setFeedback(mission.hint);}}><Lightbulb size={16}/> A little nudge</button><button className="text-button" disabled={busy} onClick={()=>perform(position.legal[0],true)}><Eye size={16}/> Watch once</button></div>}
        {hint&&!!choices.length&&<div className="discovery-destinations" aria-label="Try a discovery destination">{choices.slice(0,4).map((a,i)=><button key={a.id} disabled={busy} onClick={()=>perform(a)}>{a.promote?'Promote · ':visible.some(p=>p.cell===a.target)?'Capture · ':''}{geometry.cells.find(c=>c.id===a.target)?.label||`Choice ${i+1}`}</button>)}</div>}
      </div>}
      {watching&&<div className="discovery-demo" role="status"><strong><Eye size={17}/> Example only · no stamp earned</strong><p>{position.complete?mission.after:key==='two-dice'?'Die 1 is spent. The same Green turn still has die 3 for a Unicorn.':mission.why}</p><div>{!position.complete&&<button className="secondary" disabled={busy} onClick={()=>perform(position.legal[0],true)}>Next demo move <ChevronRight size={16}/></button>}<button className="primary" onClick={()=>setReplay(n=>n+1)}>Now my turn <Hand size={16}/></button></div></div>}
      {won&&<div className="discovery-result" role="status"><span><Check size={18}/> Discovery tried</span><p>{mission.after}</p><button className="primary full" onClick={()=>choose(story.missions[(index+1)%story.missions.length].key)}>{index===story.missions.length-1?'Revisit the first discovery':'Next discovery'} <ArrowRight size={16}/></button></div>}
      <details className="discovery-why"><summary><Lightbulb size={15}/> Why does that happen?<ChevronRight size={14}/></summary><p>{mission.why}</p></details>
      <button className="text-button discovery-replay" onClick={()=>setReplay(n=>n+1)}><RotateCcw size={15}/> Try this scene again</button>
    </>}
    {error&&<div className="lesson-error" role="alert"><p>{error}</p><button className="secondary" onClick={()=>setReplay(n=>n+1)}>Set it out again</button></div>}
    {!compact&&completed===story.missions.length&&<><div className="adventure-keepsake"><Sparkles size={25}/><div><strong>{story.stamp}</strong><p>Four patterns explored. You can replay any scene, meet more pieces or begin a gentle game.</p></div>{onPieces&&<button className="secondary full" onClick={onPieces}><Sparkles size={16}/> Meet the rest of my team</button>}{onPractice&&<button className="primary full" onClick={onPractice}><Play size={16}/> Try a gentle bot game</button>}{onFree&&<button className="secondary full" onClick={onFree}><Hand size={16}/> Arrange a free board</button>}</div><details className="adventure-first-look"><summary>Keep these close in a full game <ChevronRight size={15}/></summary><ul>{LESSONS[id].remember.map(text=><li key={text}>{text}</li>)}</ul><p>Your complete rules are in the pocket guide below.</p></details></>}
  </section>;
}
