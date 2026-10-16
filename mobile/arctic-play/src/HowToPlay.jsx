import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,ChevronRight,Hand,Lightbulb,Play,RotateCcw,Sparkles,Trash2,Undo2} from 'lucide-react';
import {GAME_LIST,game,create,pieces,hand,board,RULES,seatName} from './games.ts';
import {GUIDES,GAME_HERITAGE} from './brand.js';
import {MascotPortrait} from './Companions.jsx';
import {Board} from './Board.jsx';
import {RuleClient} from './ruleClient.js';
import {Rulebook} from './Rulebook.jsx';
import {GUIDE_TIPS,TURN_STEPS,LESSON_CUES} from './teaching.js';
import {read,write} from './storage.js';
import {LESSONS,PIECE_GUIDES,LEARNING_KEY,CHALLENGES,PRACTICE_LINKS,learningProgress,recordLesson,initialFreeBoard,freeBoardMove,rawUnits,unitRole} from './learning.js';

const stepNames=['Welcome','First move','Capture','Special move','Ready'];
const specialNames={shogi:'Bring a piece back',sannin:'A captured helper',sanguo:'One Cannon screen',sanyou:'Two steps for a Flag',yanyi:'Wake the Han army',xiangqi:'One Cannon screen',dominion:'An L-shaped leap'};
function TeachingHost({host,preferences,children,success=false,compact=false}){
  const enabled=preferences.mode!=='off',guide=GUIDES[host];
  const [response,setResponse]=useState(''),[pulse,setPulse]=useState(0),[five,setFive]=useState(false);
  useEffect(()=>{setResponse('');setFive(false);},[host,success]);
  return <aside className={`teaching-host ${success?'success':''}`} style={{'--host':guide.color}} data-motion={preferences.motion?'on':'off'} aria-label={enabled?`${guide.name} guides you`:'Lesson instructions'}>
    {enabled&&<button className="mentor-touch" aria-label={compact&&!success?`Ask ${guide.name} for a tiny tip`:`Flipper five with ${guide.name}`} onClick={()=>{setPulse(p=>p+1);setFive(!compact||success);setResponse(compact&&!success?GUIDE_TIPS[host][pulse%GUIDE_TIPS[host].length]:'Flippers up! A little cheer for your curiosity.');}}><MascotPortrait host={host} mood={success||five?'celebrate':'listening'} pulse={pulse} large motion={preferences.mode==='lively'&&preferences.motion}/>{compact&&!success&&<small>tap for a tip</small>}</button>}
    <div><strong>{enabled?guide.name:success?'Nicely done':'One little idea'}<span>{success?'NICE LITTLE DISCOVERY':host==='pengu'?'ONE CLEAR STEP':host==='retsba'?'A FRIENDLY CHALLENGE':host==='abster'?'ROOM TO EXPLORE':'RIGHT HERE WITH YOU'}</span></strong><p>{children}</p>{enabled&&!compact&&<button className="mentor-tip" onClick={()=>{setFive(false);setPulse(p=>p+1);setResponse(GUIDE_TIPS[host][pulse%GUIDE_TIPS[host].length]);}}><Lightbulb size={13}/> A tiny tip</button>}{response&&enabled&&<p className="mentor-response" role="status" aria-live="polite">{response}</p>}</div>
  </aside>;
}

export function LearningInvitation({onOpen,enabled=true}){return <button className="learning-invitation" onClick={onOpen}><span className="learning-flippers" aria-hidden="true">{enabled?['polly','pengu'].map(host=><img key={host} src={GUIDES[host].image} alt=""/>):<BookOpen size={28}/>}</span><span><strong>Little lessons. Big adventures.</strong><small>How to play · piece guides · free boards</small></span><ChevronRight size={18}/></button>;}

export function HowToPlay({id,onGame,onClose,onPractice,onDiscovery,preferences,initialTab='learn',initialRole,returnToGame=false}){
  const info=LESSONS[id],definition=game(id);
  const [tab,setTab]=useState(initialTab),[step,setStep]=useState(0),[role,setRole]=useState(PIECE_GUIDES[id].some(p=>p[0]===initialRole)?initialRole:PIECE_GUIDES[id][0][0]);
  const [progress,setProgress]=useState(()=>learningProgress(read(LEARNING_KEY,{})));
  const [sample,setSample]=useState(null),[selected,setSelected]=useState(null),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [success,setSuccess]=useState(false),[trail,setTrail]=useState(null),[hint,setHint]=useState(false),[replay,setReplay]=useState(0);
  const client=useRef(null),sequence=useRef(0),title=useRef(null);
  if(!client.current)client.current=new RuleClient('learn.js');
  const kind=step>0&&step<4?CHALLENGES[step-1]:null;
  const done=CHALLENGES.filter(k=>progress[id]?.[k]).length;
  const host=tab==='pieces'?'pengu':step===0?'polly':step===1?'pengu':step===2?'retsba':step===4?'abster':id==='dominion'?'polly':id==='yanyi'?'retsba':'pengu';
  const initial=useMemo(()=>create(id),[id]);
  const geometry=useMemo(()=>board(id),[id]);
  const pieceIcons=useMemo(()=>{
    const raw=rawUnits(id,initial),visible=pieces(id,initial);
    return Object.fromEntries(PIECE_GUIDES[id].map(([role])=>{const p=raw.find(p=>unitRole(id,p)===role);return [role,visible.find(v=>v.id===p?.id)?.sprite];}));
  },[id,initial]);
  const chosenGuide=PIECE_GUIDES[id].find(p=>p[0]===role);
  const visible=sample?pieces(id,sample.state):[],pocket=sample?hand(id,sample.state):[];
  const focused=visible.find(p=>p.source===sample?.focus)||pocket.find(p=>p.source===sample?.focus);
  const choices=sample?.legal.filter(a=>a.source===selected)||[];
  const challengeActive=tab==='pieces'||tab==='learn'&&kind;
  useEffect(()=>{
    title.current?.focus({preventScroll:true});
    (document.scrollingElement||document.documentElement).scrollTop=0;
  },[tab,step,role]);
  useEffect(()=>{
    const job=++sequence.current;
    setSelected(null);setSample(null);setSuccess(false);setTrail(null);setError('');setHint(false);setBusy(false);
    client.current.reset('The lesson changed.');
    if(!challengeActive){setLoading(false);return;}
    setLoading(true);
    client.current.call(tab==='pieces'?'piece':'lesson',{id,role,kind}).then(position=>{if(sequence.current===job){setSample(position);setLoading(false);}}).catch(e=>{if(sequence.current===job){setError(e.message);setLoading(false);}});
    return()=>{sequence.current++;client.current.reset('The lesson changed.');};
  },[id,tab,step,role,replay]);
  useEffect(()=>()=>client.current.reset('The lesson closed.'),[]);
  async function move(action){
    if(busy||success||!sample)return;
    const job=sequence.current,from=visible.find(p=>p.source===action.source)?.cell;
    setBusy(true);setError('');
    try{
      const result=await client.current.call('lesson-apply',{id,position:sample,actionId:action.id});
      if(sequence.current!==job)return;
      setSample(current=>({...current,state:result.state}));setTrail({from:from||null,to:action.target});setSelected(null);setSuccess(true);
      if(tab==='learn'){
        const next=recordLesson(read(LEARNING_KEY,{}),id,kind);write(LEARNING_KEY,next);setProgress(next);onDiscovery(id);
      }
    }catch(e){if(sequence.current===job)setError(e.message);}finally{if(sequence.current===job)setBusy(false);}
  }
  function target(cell){const action=choices.find(a=>a.target===cell);if(action)move(action);}
  const instruction=tab==='pieces'?'Tap the glowing piece, then a blue dot. Let’s try one real move.':LESSON_CUES[id][step-1];
  const successText=tab==='pieces'?`That was a legal ${chosenGuide[1]} move in this example. Try another piece, or replay to look again.`:info.cheer[step-1];

  return <div className="how-to-play" data-testid="how-to-play" data-lesson={tab==='learn'&&kind||undefined}>
    <header className="academy-header"><button className="icon-btn" aria-label="Back from How to Play" onClick={onClose}><ArrowLeft/></button><div><small>LITTLE FLIPPER SCHOOL</small><h1>How to play</h1></div>{preferences.mode!=='off'?<span className="school-friends" aria-hidden="true">{['polly','pengu','retsba','abster'].map(host=><img key={host} src={GUIDES[host].image} alt=""/>)}</span>:<BookOpen size={22}/>}</header>
    <main className="academy-content">
      <label className="sr-only" htmlFor="learning-game">Learning game</label><select id="learning-game" value={id} onChange={e=>onGame(e.target.value)}>{GAME_LIST.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select>
      {returnToGame&&<p className="academy-return-note">Learning uses its own board. {onPractice?'Your practice game stays saved.':'Your live table continues while you learn.'}</p>}
      <nav className="academy-tabs" aria-label="Learning sections">{[['learn','Little lessons',BookOpen],['pieces','Meet the pieces',Sparkles],['free','Free board',Hand]].map(([key,label,Icon])=><button key={key} aria-current={tab===key?'page':undefined} onClick={()=>setTab(key)}><Icon size={17}/><span>{label}</span></button>)}</nav>
      <h2 ref={title} tabIndex={-1} className="academy-title">{tab==='learn'?(kind?(step===3?specialNames[id]:step===1?'One tiny move.':'A clever little capture.'):step===4?'Look how far you’ve come.':'Small steps. Happy flippers.'):tab==='pieces'?'Meet your little team.':'A board for your curiosity.'}</h2>
      {tab==='free'?<FreeBoard id={id} preferences={preferences}/>:<>
        {tab==='learn'?<>
          <div className="lesson-progress"><span>{done} / 3 little challenges tried</span><span>All lessons open</span></div><progress aria-label={`${done} of 3 ${definition.name} challenges tried`} value={done} max={3}/>
          <nav className="lesson-steps" aria-label="Lesson steps">{stepNames.map((name,index)=><button key={name} aria-label={name} className={step===index?'active':''} aria-current={step===index?'step':undefined} onClick={()=>setStep(index)}><span className="step-dot">{index>0&&index<4&&progress[id]?.[CHALLENGES[index-1]]?<Check size={14}/>:index+1}</span><small>{['Hello','Move','Capture','Special','Play'][index]}</small></button>)}</nav>
          {(step===0||step===4)&&<h3 className="lesson-heading">{step===0?`Let’s meet ${definition.name}`:'A warm-up, then a real game'}</h3>}
        </>:<>
          <p className="academy-subtitle">Choose a piece. See its paths. Try one move.</p>
          <div className="piece-roster" aria-label="Choose a piece to learn">{PIECE_GUIDES[id].map(([key,name])=><button key={key} aria-pressed={role===key} onClick={()=>setRole(key)}>{pieceIcons[key]&&<img src={pieceIcons[key]} alt=""/>}<span>{name}</span></button>)}</div>
          <article className="piece-description"><h3>{chosenGuide[1]}</h3><p>{chosenGuide[2]}</p><details className="piece-extra"><summary>One extra detail <ChevronRight size={13}/></summary><small>{chosenGuide[3]}</small></details></article>
        </>}
        {tab==='learn'&&step===0?<>
          <TeachingHost host="polly" preferences={preferences}>Flippers ready? We’ll learn {definition.name} together. No timer, no pressure. Just three tiny things to try.</TeachingHost>
          <div className="lesson-goal"><span>YOUR LITTLE MISSION</span><h3>{info.goal}</h3><p>{info.board}</p></div>
          <div className="academy-board"><Board id={id} state={initial} canAct={false}/></div>
          <p className="lesson-turn"><strong>Your turn, simply</strong>{info.turn}</p>
          <ol className="turn-recipe school-recipe">{TURN_STEPS[id].map((text,i)=><li key={text}><span>{i+1}</span><p>{text}</p></li>)}</ol>
          <button className="primary full" onClick={()=>setStep(1)}>Let’s try a move <ArrowRight size={17}/></button>
        </>:tab==='learn'&&step===4?<>
          <TeachingHost host="abster" preferences={preferences} success={done===3}>{done===3?'You tried a move, a capture and something special. Keep exploring at your own pace. I’ll be cheering for your curiosity!':'A little practice helps. You can replay any challenge, or start a game whenever you feel ready.'}</TeachingHost>
          {done===3&&<div className="curious-flipper"><Sparkles size={25}/><span><strong>Curious Flipper</strong><small>Three little challenges explored</small></span><Check size={20}/></div>}
          <div className="ready-checklist">{CHALLENGES.map((k,index)=><button key={k} onClick={()=>setStep(index+1)}><span className={progress[id]?.[k]?'tried':''}>{progress[id]?.[k]?<Check size={17}/>:index+1}</span><span>{index===0?'I tried moving':index===1?'I tried a capture':specialNames[id]}<small>{progress[id]?.[k]?'Tried on the teaching board':'Try this little challenge'}</small></span><ChevronRight size={17}/></button>)}</div>
          <h3 className="lesson-heading">Three things to keep close</h3><ul className="lesson-reminders">{info.remember.map(text=><li key={text}>{text}</li>)}</ul>
          <button className="secondary full" onClick={()=>setTab('free')}><Hand size={17}/> Explore the free board</button>
          {returnToGame&&<button className="primary full" onClick={onClose}>Back to my game <ArrowRight size={17}/></button>}
          {onPractice&&<button className="primary full" onClick={onPractice}><Play size={17}/> Play a gentle bot game</button>}
          <button className="text-button" onClick={()=>setTab('pieces')}>Keep learning the pieces <ChevronRight size={17}/></button>
        </>:<>
          <TeachingHost key={`${tab}:${step}:${role}`} host={host} preferences={preferences} success={success} compact><span role="status" aria-live="polite">{success?successText:instruction}</span></TeachingHost>
          <div className="lesson-example-label">{id==='dominion'?`Practice dice: ${tab==='pieces'?'one active piece die':step===3?'3 + 4':'1 + 3'} · fixed for this example`:tab==='pieces'?'Arranged piece example · real move rules':step===1?'Starting board · real move rules':'Arranged little puzzle · real move rules'}</div>
          {loading&&<p className="lesson-loading" role="status">Pengu is setting out the pieces…</p>}
          {sample&&<>
            <div className="academy-board"><Board key={`${tab}:${step}:${role}:${replay}`} id={id} state={sample.state} legal={success?[]:sample.legal} selected={selected} suggested={!selected&&!success?sample.focus:null} spotlight={!success?sample.focus:null} trail={trail} onSelect={setSelected} onTarget={target} canAct={!busy&&!success}/></div>
            {!success&&<div className="lesson-controls">
              {pocket.filter(p=>p.source===sample.focus).map(p=><button key={p.source} className={`lesson-hand ${selected===p.source?'active':''}`} onClick={()=>setSelected(p.source)}><img src={p.sprite} alt=""/><span>Piece in hand<strong>{p.label} · tap to drop</strong></span></button>)}
              <p className="lesson-tap-hint">{busy?'Checking your move…':selected?'Now choose a highlighted destination.':sample.legal.length?`Tap ${focused?.label||'the piece'} with the gold ring.`:id==='yanyi'&&role==='emperor'?'The Emperor waits for a Horse. He has no moves of his own.':'This piece has no legal move from this example. Read its guide, or try another piece.'}</p>
              {!!choices.length&&<div className="lesson-targets" aria-label="Lesson destinations">{choices.slice(0,4).map((a,index)=><button key={a.id} disabled={busy} onClick={()=>move(a)}>{a.promote?'Promote · ':''}{geometry.cells.find(c=>c.id===a.target)?.label||`Destination ${index+1}`}</button>)}</div>}
              {!!sample.legal.length&&<button className="text-button" onClick={()=>{setHint(true);setSelected(sample.focus);}}><Lightbulb size={16}/> Show me the choices</button>}
            </div>}
            <details className="lesson-why"><summary>One extra explanation <ChevronRight size={14}/></summary><p>{tab==='pieces'?chosenGuide[3]:info[kind]}</p></details>
            {(success||tab==='pieces')&&<button className="text-button" onClick={()=>setReplay(n=>n+1)}><RotateCcw size={16}/> Replay this example</button>}
          </>}
          {error&&<div className="lesson-error" role="alert"><p>{error}</p><button className="secondary" onClick={()=>setReplay(n=>n+1)}>Try again</button></div>}
          {tab==='learn'&&<button className={success?'primary full':'secondary full'} onClick={()=>setStep(s=>Math.min(4,s+1))}>{success?'Next little step':'Explore the next lesson'}<ArrowRight size={17}/></button>}
        </>}
      </>}
      {PRACTICE_LINKS[id]&&<a className="external-practice" href={PRACTICE_LINKS[id]} target="_blank" rel="noopener noreferrer">Open the extra practice board <ArrowRight size={16}/></a>}
      <details className="school-pocket-rules"><summary><BookOpen size={18}/><span>Keep the rules nearby<small>Your pocket guide, pieces and full rules</small></span><ChevronRight size={16}/></summary><Rulebook key={id} id={id} preferences={preferences} initialView="full" compact onLearn={(nextTab,nextRole)=>{setTab(nextTab);if(nextRole)setRole(nextRole);if(nextTab==='learn')setStep(0);}}/></details>
    </main>
  </div>;
}

function FreeBoard({id,preferences}){
  const key=`free-board.v1.${id}`,geometry=useMemo(()=>board(id),[id]);
  const [units,setUnits]=useState(()=>initialFreeBoard(id,read(key,null))),[history,setHistory]=useState([]),[selected,setSelected]=useState(null),[trail,setTrail]=useState(null),[message,setMessage]=useState('Tap any piece, then any point. Occupied points swap pieces.');
  useEffect(()=>{write(key,units.map(({id,cell})=>({id,cell})));},[key,units]);
  const moving=units.find(p=>p.source===selected);
  const legal=useMemo(()=>[...units.map(p=>({source:p.source,target:null})),...(selected?geometry.cells.filter(c=>c.id!==moving?.cell).map(c=>({source:selected,target:c.id})):[])],[units,selected,geometry,moving]);
  function change(next,note,nextTrail=null){setHistory(h=>[...h,units].slice(-30));setUnits(next);setSelected(null);setTrail(nextTrail);setMessage(note);}
  function target(cell){if(!moving)return;const other=units.find(p=>p.cell===cell);change(freeBoardMove(id,units,selected,cell),other?'Swapped! You can rearrange every army here.':'A new spot to explore. This move was not checked against game rules.',{from:moving.cell,to:cell});}
  function undo(){if(!history.length)return;setUnits(history.at(-1));setHistory(h=>h.slice(0,-1));setSelected(null);setTrail(null);setMessage('One step back. There’s always room to try again.');}
  return <section className="free-board-section">
    <TeachingHost host="abster" preferences={preferences}>What happens if this piece goes over there? Let’s find out. This is your little space to arrange, undo and try again.</TeachingHost>
    <p className="free-board-badge"><Hand size={16}/> FREE BOARD · NORMAL MOVE RULES ARE OFF</p><p className="free-board-explanation">Move any army, any time. Pieces can go to any point on this board. This is for exploring a setup; use Little lessons or a practice game to learn legal moves.</p>
    <div className="academy-board"><Board id={id} positionPieces={units} legal={legal} selected={selected} trail={trail} onSelect={setSelected} onTarget={target} canAct destinationLabel="free-board destination"/></div>
    <p className="free-board-status" role="status" aria-live="polite">{moving?`${moving.label} selected. Tap any destination; occupied points swap.`:message}</p>
    <div className="free-board-tools"><button className="secondary" disabled={!history.length} onClick={undo}><Undo2 size={17}/> Undo</button><button className="secondary" onClick={()=>change(initialFreeBoard(id),'Starting pieces are back. Your last setup can still be undone.')}><RotateCcw size={17}/> Reset</button><button className="secondary" disabled={!moving} onClick={()=>change(units.filter(p=>p.id!==moving.id),'Piece removed. Undo brings it back.')}><Trash2 size={17}/> Remove</button></div>
    <label className="free-piece-select">Find a piece<select aria-label="Select a free-board piece" value={selected||''} onChange={e=>setSelected(e.target.value||null)}><option value="">Choose a piece…</option>{units.map(p=><option key={p.id} value={p.source}>{seatName(id,p.origin||p.owner)} · {p.label} · {geometry.cells.find(c=>c.id===p.cell)?.label}</option>)}</select></label>
    {moving&&<label className="free-piece-select">Choose any destination<select aria-label="Choose a free-board destination" value="" onChange={e=>{if(e.target.value)target(e.target.value);}}><option value="">Choose a board point…</option>{geometry.cells.filter(c=>c.id!==moving.cell).map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>}
    <p className="academy-subtitle">Your setup stays on this phone. It does not change a saved practice game, a friend’s table or lesson progress.</p>
  </section>;
}
