import { useEffect, useMemo, useRef, useState } from 'react';
import { applyAction, atPoint, chooseBotMove, createInitialState, legalActions, TYPES, VERSION } from './rules.js';
import { CoTuLenhClient, getSeat, newSeatToken, saveSeat, inviteUrl } from './onlineClient.js';
import './coTuLenh.css';

const ROOT='/assets/co-tu-lenh/pieces/';
const menu=[{id:'local',label:'Pass & Play',description:'Two players on one device'},
  {id:'bot',label:'Quick Play vs Bot',description:'Easy, Medium or Hard'},
  {id:'practice',label:'Practice & Learn',description:'Undo moves and inspect pieces'},
  {id:'online',label:'Online with Friends',description:'Private code · two players · server validated'}];
const steps=[
  ['Find your Commander','The gold-star Commander controls your side. Capture the opposing Commander to win. It travels along clear orthogonal lines but captures only an adjacent piece.'],
  ['Understand terrain','The dark left lane is sea. The centre river separates the two armies. Some heavy units must use the two shallow fords; ships use sea and coastline.'],
  ['Attack and transport','Artillery may jump to capture, aircraft can return after a bombing strike, and tanks/ships can carry selected friendly units. Beware missile and anti-aircraft danger zones.'],
  ['Try the board','Tap one of your units, then a highlighted intersection. A dotted circle means movement; a red outline means attack; orange indicates an air-defence risk.']
];
const W=752,H=824,X=78,Y=80,S=58;
const graphic=(p)=>(`${ROOT}${p.team}-${p.type}.svg`);
const labelFor=p=>p?`${p.team.toUpperCase()} ${TYPES[p.type].label}${p.hero?' ★ Hero':''}`:'';
export default function CoTuLenhApp({onExitToLibrary}) {
  const [mode,setMode]=useState('bot');
  const [difficulty,setDifficulty]=useState('medium');
  const [human,setHuman]=useState('red');
  const [victory,setVictory]=useState('division');
  const [state,setState]=useState(()=>createInitialState('division'));
  const [selected,setSelected]=useState(null);
  const [notice,setNotice]=useState('Select a piece, then a highlighted intersection.');
  const [guide,setGuide]=useState(-1);
  const [started,setStarted]=useState(false);
  const [undoStack,setUndoStack]=useState([]);
  const [view,setView]=useState('red');
  const [joinCode,setJoinCode]=useState(()=>new URLSearchParams(window.location.search).get('room')?.toUpperCase()||'');
  const [online,setOnline]=useState(null);
  const [isConnected,setIsConnected]=useState(false);
  const client=useRef(null);
  const activeRoomCode=useRef(null);
  const isOnline=mode==='online';
  const blockedOnline=isOnline&&(!online||online.room.status!=='playing'||state.turn!==online.team);
  const seq=useRef(0);
  const botTurn=started&&mode==='bot'&&state.turn!==human&&!state.winner;
  const actions=useMemo(()=>selected?legalActions(state,selected):[],[state,selected]);
  const movingTeam=state.turn;
  const point=(x,y)=>view==='red'?{x:X+x*S,y:Y+(11-y)*S}:{x:X+(10-x)*S,y:Y+y*S};
  const redraw=next=>{setState(next);setSelected(null);};
  function reset(nextMode=mode){
    seq.current++;
    setMode(nextMode);setUndoStack([]);redraw(createInitialState(victory));
    setStarted(true);setView(nextMode==='bot'?human:'red');setNotice('Red begins. Select a piece to see legal moves.');
  }
  async function move(action){
    if(botTurn||blockedOnline)return;
    if(isOnline){try{await client.current?.request('ctl_game_action',{roomCode:online.room.roomCode,token:online.token,revision:online.room.revision,action});}catch(e){setNotice(e.message);}return;}
    try{
      const next=applyAction(state,action);
      setUndoStack(h=>[...h,state].slice(-60));
      redraw(next);setNotice(`${action.kind.toUpperCase()} · ${state.turn.toUpperCase()} → ${action.x},${action.y}`);
    }catch(error){setNotice(error.message);}
  }
  function clickPoint(x,y){
    if(botTurn||blockedOnline)return;
    const here=atPoint(state,x,y),own=here.find(p=>p.team===state.turn&&!p.carrier)||here.find(p=>p.team===state.turn);
    const choices=actions.filter(a=>a.x===x&&a.y===y);
    if(choices.length){
      const capture=choices.find(a=>a.kind==='capture')||choices.find(a=>a.kind==='fire')||choices.find(a=>a.kind==='embark')||choices[0];
      if(choices.some(a=>a.kind==='bomb')&&choices.some(a=>a.kind==='capture')){
        const bomb=window.confirm('Bomb and return to base? OK = return after attack, Cancel = occupy destination.');
        const selectedAction=choices.find(a=>a.kind===(bomb?'bomb':'capture'));
        if(selectedAction){move(selectedAction);return;}
      }
      move(capture);return;
    }
    if(own){setSelected(own.id);setNotice(labelFor(own));return;}
    setSelected(null);setNotice('Select a friendly piece or a legal target.');
  }
  function makeClient(){
    const c=new CoTuLenhClient();
    c.onPacket=p=>{if(p.type==='ctl_room_state'&&p.payload?.room&&p.payload.room.roomCode===activeRoomCode.current){setOnline(old=>old?{...old,room:p.payload.room}:old);setState(p.payload.room.gameState);}};
    c.onStatus=setIsConnected;
    return c;
  }
  useEffect(()=>{
    const c=makeClient();client.current=c;
    const code=new URLSearchParams(window.location.search).get('room')?.trim().toUpperCase();
    const saved=code?getSeat(code):null;
    if(saved){activeRoomCode.current=code;setMode('online');setJoinCode(code);void c.request('ctl_room_sync',{roomCode:code,token:saved.token}).then(res=>{setOnline({room:res.room,team:res.team,token:saved.token});setState(res.room.gameState);setView(res.team);setStarted(true);}).catch(e=>setNotice(`Could not restore room: ${e.message}`));}
    return()=>{c.close();client.current=null;};
  },[]);
  async function openOnline(create){
    try{const token=newSeatToken();const res=await client.current.request(create?'ctl_room_create':'ctl_room_join',{team:human,token,name:'Commander',mode:victory,...(!create?{roomCode:joinCode}:{} )});
      const code=res.room.roomCode;activeRoomCode.current=code;saveSeat({roomCode:code,token,team:res.team});
      setOnline({room:res.room,team:res.team,token});setState(res.room.gameState);setView(res.team);setStarted(true);setNotice(`Connected to room ${code}.`);
      const url=new URL(window.location.href);url.searchParams.set('game','co-tu-lenh');url.searchParams.set('room',code);window.history.replaceState({},'',url);
    }catch(error){setNotice(error.message);}
  }
  async function startRoom(){if(!online)return;try{await client.current.request('ctl_room_start',{roomCode:online.room.roomCode,token:online.token});}catch(e){setNotice(e.message);}}
  useEffect(()=>{
    if(!botTurn)return;
    const captured=++seq.current;
    const id=window.setTimeout(()=>{
      if(seq.current!==captured)return;
      const action=chooseBotMove(state,difficulty);
      if(!action){setNotice('No legal moves remain.');return;}
      try{const next=applyAction(state,action);setUndoStack(h=>[...h,state].slice(-60));redraw(next);setNotice(`Bot ${action.kind} to ${action.x},${action.y}`);}catch(error){setNotice(error.message);}
    },450);
    return()=>window.clearTimeout(id);
  },[botTurn,state,difficulty]);
  const remaining={red:state.pieces.filter(p=>p.alive&&p.team==='red').length,blue:state.pieces.filter(p=>p.alive&&p.team==='blue').length};
  const selectedPiece=state.pieces.find(p=>p.alive&&p.id===selected);
  const activeHint=guide>=0?steps[guide]:null;
  return <main className="ctl-app">
    <header className="ctl-heading">
      <button className="ctl-ghost" onClick={()=>onExitToLibrary?.()}>← All games</button>
      <div><span className="ctl-kicker">ANTARCTIC GAMING CO · VIETNAMESE STRATEGY</span><h1>Cờ Tư Lệnh <span>Operation Frozen Front</span></h1></div>
      <button className="ctl-ghost" onClick={()=>setGuide(0)}>How to Play</button>
    </header>
    <p className="ctl-disclaimer"><strong>Working reconstruction</strong> based on published Commander Chess descriptions. Initial unit identities, exact transport interactions and certain air-defence edge cases are pending primary-source validation. Free play · no wallet required.</p>
    {!started&&<section className="ctl-setup" aria-label="Game setup">
      <h2>Choose your command</h2>
      <div className="ctl-choices">{menu.map(m=><button key={m.id} className={mode===m.id?'active':''} onClick={()=>setMode(m.id)}><b>{m.label}</b><small>{m.description}</small></button>)}</div>
      <div className="ctl-prefs"><label>Victory mode<select value={victory} onChange={e=>setVictory(e.target.value)}><option value="division">Commander or destroy a division</option><option value="commander">Commander capture only</option></select></label>
        {['bot','online'].includes(mode)&&<><label>Your team<select value={human} onChange={e=>setHuman(e.target.value)}><option value="red">Red · First move</option><option value="blue">Blue · Second move</option></select></label>{mode==='bot'&&<label>Bot difficulty<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard (2-ply heuristic)</option></select></label>}</>}
      </div>{mode==='online'?<div className="ctl-online-join"><label>Private room code<input placeholder="Enter six-letter code to join" value={joinCode} maxLength={6} onChange={e=>setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g,''))}/></label><button className="ctl-primary" onClick={()=>openOnline(false)} disabled={joinCode.length!==6}>Join room</button><button className="ctl-primary" onClick={()=>openOnline(true)}>Create private room</button><p role="status">{notice}</p></div>:<button className="ctl-primary" onClick={()=>reset()}>Begin battle</button>}
    </section>}
    {started&&<div className="ctl-play-layout"><section className="ctl-board-wrap" aria-label="Commander Chess board">
      {isOnline&&online&&<div className="ctl-online-bar"><b>Room {online.room.roomCode} · {isConnected?'Connected':'Disconnected'}</b><span>Red: {online.room.seats.red.name||'Waiting'} · Blue: {online.room.seats.blue.name||'Waiting'}</span><button onClick={()=>navigator.clipboard?.writeText(inviteUrl(online.room.roomCode))}>Copy invite</button>{online.room.status==='waiting'&&<button onClick={startRoom} disabled={!online.room.seats.red.name||!online.room.seats.blue.name}>Start online match</button>}{!isConnected&&<button onClick={async()=>{try{const c=await client.current.request('ctl_room_sync',{roomCode:online.room.roomCode,token:online.token});setOnline(old=>({...old,room:c.room}));setState(c.room.gameState);}catch(e){setNotice(e.message);}}}>Reconnect</button>}</div>}
      <div className="ctl-score"><span>🔴 Red · {remaining.red} units</span><b>{state.winner?`${state.winner.toUpperCase()} WINS — ${state.winReason}`:`${movingTeam.toUpperCase()} TO MOVE${botTurn?' · Bot thinking':''}`}</b><span>🔵 Blue · {remaining.blue} units</span></div>
      <svg className="ctl-board" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="11 files by 12 ranks, 38 starting units">
        <defs><linearGradient id="ctlIce" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f0fbff"/><stop offset="1" stopColor="#b2dbe7"/></linearGradient><linearGradient id="ctlWater"><stop stopColor="#1d6595"/><stop offset="1" stopColor="#123d78"/></linearGradient></defs>
        <rect width={W} height={H} fill="#08213d" rx="22"/>
        <text x={W/2} y="41" fontSize="16" fill="#d2f5ff" textAnchor="middle" fontWeight="bold">COMMANDER CHESS · TƯ LỆNH</text>
        <rect x={X-14} y={Y-14} width={10*S+28} height={11*S+28} rx="10" fill="url(#ctlIce)"/>
        <rect x={view==='red'?X-14:X+8*S-14} y={Y-14} width={2*S+28} height={11*S+28} fill="url(#ctlWater)" opacity=".98"/>
        <rect x={X-14} y={Y+5*S} width={10*S+28} height={S} fill="#65cadd" opacity=".65"/>
        {[5,7].map(f=>{const t=point(f,5);return <rect key={f} x={t.x-18} y={Y+5*S+3} width="36" height={S-6} rx="5" fill="#dbe3ca" stroke="#77aaba" strokeDasharray="4 4"/>;})}
        {Array.from({length:11},(_,i)=><line key={`v${i}`} x1={X+i*S} y1={Y} x2={X+i*S} y2={Y+11*S} stroke="#315a75" strokeWidth="1.8"/>)}
        {Array.from({length:12},(_,i)=><line key={`h${i}`} x1={X} y1={Y+i*S} x2={X+10*S} y2={Y+i*S} stroke="#315a75" strokeWidth="1.8"/>)}
        {Array.from({length:11},(_,i)=><text key={`file${i}`} x={X+i*S} y={Y+11*S+28} textAnchor="middle" fill="#bce5f1" fontSize="13">{view==='red'?i:10-i}</text>)}
        {Array.from({length:12},(_,i)=><text key={`rank${i}`} x={X-33} y={Y+i*S+4} textAnchor="middle" fill="#bce5f1" fontSize="13">{view==='red'?11-i:i}</text>)}
        {Array.from({length:132},(_,i)=>{const x=i%11,y=Math.floor(i/11),pt=point(x,y),stack=atPoint(state,x,y);
          const top=stack.find(p=>!p.carrier)||stack[0];const legal=actions.filter(a=>a.x===x&&a.y===y);const highlight=legal.length>0;
          const danger=legal.some(a=>a.risk),capture=legal.some(a=>['capture','bomb','fire'].includes(a.kind));
          const isSelected=selectedPiece?.x===x&&selectedPiece?.y===y;
          return <g key={`${x}:${y}`} tabIndex={botTurn||blockedOnline?-1:0} role="button" aria-label={`${x},${y}${top?' — '+labelFor(top):''}${highlight?' — legal target':''}`} onClick={()=>clickPoint(x,y)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();clickPoint(x,y);}}} style={{cursor:'pointer'}}>
            {highlight&&<circle cx={pt.x} cy={pt.y} r="24" fill={capture?'#f47060':'#a0f6ed'} opacity=".6" stroke={danger?'#ffba41':capture?'#e55449':'#177da1'} strokeWidth={danger?5:2}/>}
            {isSelected&&<circle cx={pt.x} cy={pt.y} r="26" fill="none" stroke="#ffd44a" strokeWidth="4"/>}
            <circle cx={pt.x} cy={pt.y} r="28" fill="transparent"/>
            {top&&<><image x={pt.x-23} y={pt.y-23} width="46" height="46" href={graphic(top)} pointerEvents="none"/>{stack.length>1&&<g pointerEvents="none"><circle cx={pt.x+20} cy={pt.y-18} r="10" fill="#08213d" stroke="#effaff"/><text x={pt.x+20} y={pt.y-14} textAnchor="middle" fontSize="11" fontWeight="bold" fill="white">{stack.length}</text></g>}{top.hero&&<text x={pt.x-21} y={pt.y-23} fill="#ffe073" fontSize="16" pointerEvents="none">★</text>}</>}
          </g>;
        })}
        <text x={W/2} y={H-14} textAnchor="middle" fill="#a4d6e4" fontSize="13">SEA ◀ · SHALLOW FORDS ▥ · 11 × 12 INTERSECTIONS</text>
      </svg>
      <div className="ctl-toolbar"><button disabled={isOnline||!undoStack.length} onClick={()=>{seq.current++;if(undoStack.length){setState(undoStack.at(-1));setUndoStack(h=>h.slice(0,-1));setSelected(null);}}} >↶ Undo</button>{!isOnline&&<button onClick={()=>reset()}>↻ Reset</button>}<button onClick={()=>setView(v=>v==='red'?'blue':'red')}>⇄ Rotate view</button><button onClick={()=>{setStarted(false);setGuide(-1);seq.current++;if(isOnline){activeRoomCode.current=null;client.current?.close();client.current=makeClient();setOnline(null);const url=new URL(window.location.href);url.searchParams.delete('room');window.history.replaceState({},'',url);}}}>⚙ Setup</button></div>
      <p className="ctl-message" aria-live="polite">{notice}</p>
      </section>
      <aside className="ctl-sidebar"><div className="ctl-panel"><h2>{selectedPiece?TYPES[selectedPiece.type].label:'Field Guide'}</h2>{selectedPiece?<><img src={graphic(selectedPiece)} alt="" className="ctl-preview"/><strong>{TYPES[selectedPiece.type].native}</strong><p>{labelFor(selectedPiece)}</p><p>{actions.length} legal actions. {selectedPiece.carrier?'Currently embarked.':''}</p></>:<p>Tap a unit to learn its identity and review available movement, transport and attack targets.</p>}</div>
        <div className="ctl-panel"><h3>Victory condition</h3><p>{state.mode==='division'?'Capture the enemy Commander, both naval ships, both aircraft, or all six infantry/tank/artillery units.':'Capture the enemy Commander.'}</p></div>
        <div className="ctl-panel"><h3>Rules status</h3><p>Reconstructed movement. Set-up identities, hero promotion timing, stack multi-attacks, and certain aircraft AA encounters require adjudication.</p><a href="https://en.boardgamearena.com/gamepanel?game=commanderchess" target="_blank" rel="noreferrer">Published game reference</a></div>
        <button className="ctl-primary" onClick={()=>setGuide(0)}>Learn with Pengu →</button>
      </aside>
    </div>}
    {guide>=0&&<div className="ctl-modal-overlay" role="presentation"><section className="ctl-modal" role="dialog" aria-modal="true" aria-label="Commander Chess tutorial"><button className="ctl-close" onClick={()=>setGuide(-1)} aria-label="Close tutorial">×</button><div className="ctl-kicker">PENGU ORDER · RULES & ROUTES</div><h2>{activeHint[0]}</h2><p>{activeHint[1]}</p><div className="ctl-tutorial-nav"><span>Lesson {guide+1}/{steps.length}</span>{guide>0&&<button onClick={()=>setGuide(i=>i-1)}>Back</button>}<button className="ctl-primary" onClick={()=>setGuide(i=>i===steps.length-1?-1:i+1)}>{guide===steps.length-1?'Play':'Next'}</button></div></section></div>}
    <footer className="ctl-foot">Cờ Tư Lệnh by Nguyễn Quý Hải (Vietnam, 2010). Arctic illustrations are independent adaptations, not official game art. Rules profile: {VERSION}.</footer>
  </main>;
}

