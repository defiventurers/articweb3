import { useEffect, useMemo, useRef, useState } from 'react';
import { applyAction, atPoint, chooseBotMove, createInitialState, legalActions, airDefenceZones, profileFor, RULE_PROFILES, DEFAULT_PROFILE, TYPES, VERSION } from './rules.js';
import { CoTuLenhClient, getSeat, newSeatToken, saveSeat, inviteUrl } from './onlineClient.js';
import { PenguinHostPair, PenguinHost } from '../../components/PenguinHosts.jsx';
import './coTuLenh.css';

const menu=[{id:'local',label:'Pass & Play',description:'Two players on one device'},
  {id:'bot',label:'Quick Play vs Bot',description:'Easy, Medium or Hard'},
  {id:'practice',label:'Practice & Learn',description:'Undo moves and inspect pieces'},
  {id:'online',label:'Online with Friends',description:'Private code · two players · server validated'}];
const steps=[
  ['Find your Commander','The gold-star Commander controls your side. Capture the opposing Commander to win. It travels along clear orthogonal lines but captures only an adjacent piece.'],
  ['Understand terrain','The dark left lane is sea. The centre river separates the two armies. Some heavy units must use the two shallow fords; ships use sea and coastline.'],
  ['Attack and transport','Artillery may jump to capture, aircraft can return after a bombing strike, and tanks/ships can carry selected friendly units. Beware missile and anti-aircraft danger zones.'],
  ['Try the board','Tap a unit, then a highlighted intersection. Turn on the blue/red defensive-range rings from the board toolbar to see protected airspace; the smaller glowing dots indicate the exact intersections covered.']
];
// Immutable board geometry taken from the user-approved 11-by-12 coordinate master.
const W=1199,H=1312,X=148,Y=183,STEP_X=90.4,STEP_Y=900/11;
const labelFor=p=>p?`${p.team.toUpperCase()} ${TYPES[p.type].label}${p.hero?' ★ Hero':''}`:'';
export default function CoTuLenhApp({onExitToLibrary, assetBase='/assets/co-tu-lenh', wsEndpoint=null, inviteBaseUrl=null}) {
  const graphic=p=>`${assetBase}/pieces/${p.team}-${p.type}.webp`;
  const boardImage=`${assetBase}/board/board-antarctic-11x12.webp`;
  const [mode,setMode]=useState('bot');
  const [difficulty,setDifficulty]=useState('medium');
  const [human,setHuman]=useState('red');
  const [victory,setVictory]=useState(DEFAULT_PROFILE);
  const [state,setState]=useState(()=>createInitialState(DEFAULT_PROFILE));
  const [showDefence,setShowDefence]=useState(false);
  const [selected,setSelected]=useState(null);
  const [notice,setNotice]=useState('Select a piece, then a highlighted intersection.');
  const [guide,setGuide]=useState(-1);
  const [started,setStarted]=useState(false);
  const [undoStack,setUndoStack]=useState([]);
  const [view,setView]=useState('red');
  const [zoom,setZoom]=useState(1);
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
  const defenceZones=useMemo(()=>showDefence?airDefenceZones(state):[],[state,showDefence]);
  const currentProfile=profileFor(state);
  // Rotate around the artwork centre, including its asymmetric decorative margins.
  // The same coordinates drive hit areas, sprites, legal targets and defence dots.
  const point=(x,y)=>{const px=X+x*STEP_X,py=Y+(11-y)*STEP_Y;return view==='red'?{x:px,y:py}:{x:W-px,y:H-py};};
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
    const c=new CoTuLenhClient(wsEndpoint);
    c.onPacket=p=>{if(p.type==='ctl_room_state'&&p.payload?.room&&p.payload.room.roomCode===activeRoomCode.current){setOnline(old=>old?{...old,room:p.payload.room}:old);setState(p.payload.room.gameState);}};
    c.onStatus=setIsConnected;
    return c;
  }
  useEffect(()=>{
    const c=makeClient();client.current=c;
    const code=new URLSearchParams(window.location.search).get('room')?.trim().toUpperCase();
    const saved=code?getSeat(code):null;
    if(saved){activeRoomCode.current=code;setMode('online');setJoinCode(code);void c.request('ctl_room_sync',{roomCode:code,token:saved.token}).then(res=>{setOnline({room:res.room,team:res.team,token:saved.token});setState(res.room.gameState);setView(res.team);setStarted(true);}).catch(e=>setNotice(`Could not restore room: ${e.message}`));}
    return()=>{client.current?.close();client.current=null;};
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
      <div><span className="ctl-kicker">ANTARCTIC GAMING CO · VIETNAMESE STRATEGY</span><h1>Cờ Tư Lệnh <span>Operation Frozen Front</span></h1></div><PenguinHostPair gameId="co-tu-lenh" compact />
      <button className="ctl-ghost" onClick={()=>setGuide(0)}>How to Play</button>
    </header>
    <p className="ctl-disclaimer"><strong>v0.3 research-grade practice.</strong> 2015, 2024 and BGA rules are selectable and labelled. The exact 38 starting locations, two ford coordinates, complex stacked attacks and some interception cases still need official verification. The Antarctic art is a modern visual adaptation. Free play · no wallet required.</p>
    {!started&&<section className="ctl-setup" aria-label="Game setup">
      <h2>Choose your command</h2>
      <div className="ctl-choices">{menu.map(m=><button key={m.id} className={mode===m.id?'active':''} onClick={()=>setMode(m.id)}><b>{m.label}</b><small>{m.description}</small></button>)}</div>
      <div className="ctl-prefs"><label>Rules profile (research draft)<select value={victory} onChange={e=>setVictory(e.target.value)}>{Object.values(RULE_PROFILES).map(profile=><option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>
        {['bot','online'].includes(mode)&&<><label>Your team<select value={human} onChange={e=>setHuman(e.target.value)}><option value="red">Red · First move</option><option value="blue">Blue · Second move</option></select></label>{mode==='bot'&&<label>Bot difficulty<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard (2-ply heuristic)</option></select></label>}</>}
      </div>{mode==='online'?<div className="ctl-online-join"><label>Private room code<input placeholder="Enter six-letter code to join" value={joinCode} maxLength={6} onChange={e=>setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g,''))}/></label><button className="ctl-primary" onClick={()=>openOnline(false)} disabled={joinCode.length!==6}>Join room</button><button className="ctl-primary" onClick={()=>openOnline(true)}>Create private room</button><p role="status">{notice}</p></div>:<button className="ctl-primary" onClick={()=>reset()}>Begin battle</button>}
    </section>}
    {started&&<div className="ctl-play-layout"><section className="ctl-board-wrap" aria-label="Commander Chess board">
      {isOnline&&online&&<div className="ctl-online-bar"><b>Room {online.room.roomCode} · {isConnected?'Connected':'Disconnected'}</b><span>Red: {online.room.seats.red.name||'Waiting'} · Blue: {online.room.seats.blue.name||'Waiting'}</span><button onClick={()=>navigator.clipboard?.writeText(inviteUrl(online.room.roomCode,inviteBaseUrl))}>Copy invite</button>{online.room.status==='waiting'&&<button onClick={startRoom} disabled={!online.room.seats.red.name||!online.room.seats.blue.name}>Start online match</button>}{!isConnected&&<button onClick={async()=>{try{const c=await client.current.request('ctl_room_sync',{roomCode:online.room.roomCode,token:online.token});setOnline(old=>({...old,room:c.room}));setState(c.room.gameState);}catch(e){setNotice(e.message);}}}>Reconnect</button>}</div>}
      <div className="ctl-score"><span>🔴 Red · {remaining.red} units</span><b>{state.winner?`${state.winner.toUpperCase()} WINS — ${state.winReason}`:`${movingTeam.toUpperCase()} TO MOVE${botTurn?' · Bot thinking':''}`}</b><span>🔵 Blue · {remaining.blue} units</span></div>
      <div className="ctl-board-viewport" style={{'--ctl-zoom':zoom}}>
      <svg className="ctl-board" style={{width:`${zoom*100}%`}} viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Cờ Tư Lệnh with 11 columns, 12 ranks, 132 clickable intersections; red and blue Arctic faction pieces">
        <image href={boardImage} x="0" y="0" width={W} height={H} preserveAspectRatio="none" transform={view==='blue'?`rotate(180 ${W/2} ${H/2})`:undefined} pointerEvents="none" />
        {showDefence&&<g className="ctl-defence-zones" pointerEvents="none" aria-hidden="true">
          {defenceZones.map(zone=>{const center=point(zone.x,zone.y);const color=zone.team==='red'?'#ef4658':'#2f9fff';return <g key={`zone-${zone.id}`}>
            <ellipse cx={center.x} cy={center.y} rx={zone.radius*STEP_X} ry={zone.radius*STEP_Y} fill={color} fillOpacity=".055" stroke={color} strokeOpacity=".78" strokeWidth="4" strokeDasharray="12 8" />
            {zone.points.map(pt=>{const pos=point(pt.x,pt.y);return <circle key={`${zone.id}:${pt.x}:${pt.y}`} cx={pos.x} cy={pos.y} r="7" fill={color} fillOpacity=".84" stroke="#fff" strokeOpacity=".8" strokeWidth="1.4" />;})}
          </g>;})}
        </g>}
        {Array.from({length:132},(_,i)=>{const x=i%11,y=Math.floor(i/11),pt=point(x,y),stack=atPoint(state,x,y);
          const top=stack.find(p=>!p.carrier)||stack[0];const legal=actions.filter(a=>a.x===x&&a.y===y);const highlight=legal.length>0;
          const danger=legal.some(a=>a.risk),capture=legal.some(a=>['capture','bomb','fire'].includes(a.kind));
          const isSelected=selectedPiece?.x===x&&selectedPiece?.y===y;
          return <g key={`${x}:${y}`} tabIndex={botTurn||blockedOnline?-1:0} role="button" aria-label={`${x},${y}${top?' — '+labelFor(top):''}${highlight?' — legal target':''}`} onClick={()=>clickPoint(x,y)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();clickPoint(x,y);}}} style={{cursor:'pointer'}}>
            {highlight&&<circle cx={pt.x} cy={pt.y} r="35" fill={capture?'#f47060':'#a0f6ed'} opacity=".6" stroke={danger?'#ffba41':capture?'#e55449':'#177da1'} strokeWidth={danger?5:2}/>}
            {isSelected&&<circle cx={pt.x} cy={pt.y} r="39" fill="none" stroke="#ffd44a" strokeWidth="4"/>}
            <circle cx={pt.x} cy={pt.y} r="40" fill="transparent"/>
            {top&&<><image x={pt.x-33} y={pt.y-33} width="66" height="66" href={graphic(top)} pointerEvents="none"/>{stack.length>1&&<g pointerEvents="none"><circle cx={pt.x+27} cy={pt.y-28} r="12" fill="#08213d" stroke="#effaff"/><text x={pt.x+27} y={pt.y-24} textAnchor="middle" fontSize="11" fontWeight="bold" fill="white">{stack.length}</text></g>}{top.hero&&<text x={pt.x-32} y={pt.y-32} fill="#ffe073" fontSize="16" pointerEvents="none">★</text>}</>}
          </g>;
        })}
      </svg></div>
      <div className="ctl-toolbar"><button type="button" className={showDefence?'ctl-range-toggle is-active':'ctl-range-toggle'} aria-pressed={showDefence} onClick={()=>setShowDefence(v=>!v)}>{showDefence?'◉ Hide air-defence rings':'◎ Show air-defence rings'}</button><button onClick={()=>setZoom(z=>Math.max(1,+(z-0.25).toFixed(2)))} disabled={zoom<=1} aria-label="Zoom board out">− Zoom</button><button onClick={()=>setZoom(z=>Math.min(2.5,+(z+0.25).toFixed(2)))} disabled={zoom>=2.5} aria-label="Zoom board in">+ Zoom</button><button disabled={isOnline||!undoStack.length} onClick={()=>{seq.current++;if(undoStack.length){setState(undoStack.at(-1));setUndoStack(h=>h.slice(0,-1));setSelected(null);}}} >↶ Undo</button>{!isOnline&&<button onClick={()=>reset()}>↻ Reset</button>}<button onClick={()=>setView(v=>v==='red'?'blue':'red')}>⇄ Rotate view</button><button onClick={()=>{setStarted(false);setGuide(-1);seq.current++;if(isOnline){activeRoomCode.current=null;client.current?.close();client.current=makeClient();setOnline(null);const url=new URL(window.location.href);url.searchParams.delete('room');window.history.replaceState({},'',url);}}}>⚙ Setup</button></div>
      {showDefence&&<div className="ctl-defence-key" aria-live="polite"><span className="ctl-red-key">● Red air defence</span><span className="ctl-blue-key">● Blue air defence</span><span>Small dots = exact threatened intersections; dashed ring = approximate visual radius. Anti-aircraft & Navy: 1. Missile: 2.</span></div>}
      <p className="ctl-message" aria-live="polite">{notice}</p>
      </section>
      <aside className="ctl-sidebar"><div className="ctl-panel"><h2>{selectedPiece?TYPES[selectedPiece.type].label:'Field Guide'}</h2>{selectedPiece?<><img src={graphic(selectedPiece)} alt="" className="ctl-preview"/><strong>{TYPES[selectedPiece.type].native}</strong><p>{labelFor(selectedPiece)}</p><p>{actions.length} legal actions. {selectedPiece.carrier?'Currently embarked.':''}</p></>:<p>Tap a unit to learn its identity and review available movement, transport and attack targets.</p>}</div>
        <div className="ctl-panel"><h3>Selected rules profile</h3><strong>{currentProfile.label}</strong><p>{currentProfile.autoDivision?`Win by capturing the Commander, both ships, both aircraft or the entire ${currentProfile.landDivision.length===3?'six':'nine'}-unit land division.`:'Only defeating the enemy Commander ends the untimed match automatically.'}</p><p>Movement basis: {currentProfile.movementBasis}. No tournament timer is enabled in this practice build.</p></div>
        <div className="ctl-panel"><h3>Defensive coverage</h3><p>Anti-aircraft (Cao xạ) and Navy (Hải quân) defend radius 1. Missile (Tên lửa) covers 2 orthogonally and 1 diagonally. Red and blue overlays are optional and do not modify the rules. Engineer air defence remains unresolved and is not displayed.</p><p>Exact initial setup and ford columns are provisional; advanced multi-action stacks, HQ interactions and air interception timing are under review.</p><a href="https://en.doc.boardgamearena.com/Gamehelpcommanderchess" target="_blank" rel="noreferrer">BGA rules reference</a></div>
        <button className="ctl-primary" onClick={()=>setGuide(0)}>Learn with Pengu →</button>
      </aside>
    </div>}
    {guide>=0&&<div className="ctl-modal-overlay" role="presentation"><section className="ctl-modal" role="dialog" aria-modal="true" aria-label="Commander Chess tutorial"><button className="ctl-close" onClick={()=>setGuide(-1)} aria-label="Close tutorial">×</button><div className="ctl-guide-heading"><PenguinHost host="pengu" size="mini"/><div className="ctl-kicker">PENGU ORDER · RULES & ROUTES</div></div><h2>{activeHint[0]}</h2><p>{activeHint[1]}</p><div className="ctl-tutorial-nav"><span>Lesson {guide+1}/{steps.length}</span>{guide>0&&<button onClick={()=>setGuide(i=>i-1)}>Back</button>}<button className="ctl-primary" onClick={()=>setGuide(i=>i===steps.length-1?-1:i+1)}>{guide===steps.length-1?'Play':'Next'}</button></div></section></div>}
    <footer className="ctl-foot">Cờ Tư Lệnh by Nguyễn Quý Hải (Vietnam, 2010). Arctic illustrations are independent adaptations, not official game art. Rules build: {VERSION}; profile: {currentProfile.id} · Research draft, not a verified official edition.</footer>
  </main>;
}
