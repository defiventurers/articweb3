import { useEffect, useMemo, useRef, useState } from 'react';
import { applyAction, isFinished, canDeploy, applyDeployment, confirmDeployment, startMatch, expireClock, atPoint, chooseBotMove, createInitialState, legalActions, cargoOf, airDefenceZones, profileFor, RULE_PROFILES, DEFAULT_PROFILE, TYPES, VERSION } from './rules.js';
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
  ['Attack and transport','Tap a stack, then choose its carrier or any passenger from the stack panel. Each component may act once in the same turn. Aircraft can drop a passenger and return; ships can attack with both weapons. Use End turn when finished.'],
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
  const [deployment,setDeployment]=useState('standard');
  const [timeLimit,setTimeLimit]=useState(0);
  const [setupTeam,setSetupTeam]=useState('red');
  const [handoff,setHandoff]=useState(false);
  const [conceding,setConceding]=useState(false);
  const [now,setNow]=useState(Date.now());
  const [state,setState]=useState(()=>createInitialState(DEFAULT_PROFILE));
  const [showDefence,setShowDefence]=useState(false);
  const [selected,setSelected]=useState(null);
  const [carryIds,setCarryIds]=useState([]);
  const [actionChoices,setActionChoices]=useState([]);
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
  const arranging=started&&state.phase==='setup';
  const editorTeam=isOnline?online?.team:mode==='bot'?human:setupTeam;
  const blockedOnline=isOnline&&(!online||(arranging?online.room.status!=='setup'||state.setupReady[online.team]:online.room.status!=='playing'||state.turn!==online.team));
  const seq=useRef(0);
  const botTurn=started&&!arranging&&mode==='bot'&&state.turn!==human&&!isFinished(state);
  const actions=useMemo(()=>!selected?[]:arranging?Array.from({length:132},(_,i)=>({id:selected,kind:'deploy',x:i%11,y:Math.floor(i/11)})).filter(a=>canDeploy(state,editorTeam,selected,a.x,a.y)):legalActions(state,selected),[state,selected,arranging,editorTeam]);
  const movingTeam=state.turn;
  const defenceZones=useMemo(()=>showDefence&&!arranging?airDefenceZones(state):[],[state,showDefence,arranging]);
  const currentProfile=profileFor(state);
  const videoRules=currentProfile.videoRules===true;
  const shownPieces=arranging?state.pieces.filter(p=>p.team===editorTeam):state.pieces;
  const shownAt=(x,y)=>shownPieces.filter(p=>p.alive&&p.x===x&&p.y===y);
  const clockLeft=Number.isFinite(state.clock?.deadline)?Math.max(0,Math.ceil((state.clock.deadline-now)/1000)):null;
  const clockLabel=clockLeft===null?'':`${Math.floor(clockLeft/60)}:${String(clockLeft%60).padStart(2,'0')}`;
  const tutorialSteps=videoRules?[
    ['Protect your Commander','Win by defeating the Commander, both aircraft, both Navy ships or all six core land units (two Infantry, two Tanks and two Artillery). Keep your Commander safe; it cannot enter or cross the opposing Commander’s clear row or column.'],
    ['Read the terrain','There are 132 intersections. The sea is on the left. Heavy guns cross the river at the two fords or with an Engineer, and may also capture across it. Ships cannot enter the shallow fords.'],
    ['Split a carrier stack','Board a compatible carrier by moving onto it. Navy carries personnel, Tanks and Aircraft; Aircraft carries Commander, Infantry and Militia. After travel, original stack members can each act once in the same turn. A ship can use its sea and land weapons once each. End turn when finished.'],
    ['Learn with Pengu and Retsba','Checking the Commander promotes the attacker to Hero. The last mobile defender is also promoted. Aircraft can strike and return, but must stay after taking another Aircraft. Optional defence rings show interception points; an attack on a defended target can sacrifice the plane. Try a local practice match.']
  ]:steps;
  // Rotate around the artwork centre, including its asymmetric decorative margins.
  // The same coordinates drive hit areas, sprites, legal targets and defence dots.
  const point=(x,y)=>{const px=X+x*STEP_X,py=Y+(11-y)*STEP_Y;return view==='red'?{x:px,y:py}:{x:W-px,y:H-py};};
  const redraw=next=>{setState(next);setSelected(null);setActionChoices([]);};
  const selectUnit=id=>{setSelected(id);setCarryIds(cargoOf(state,id).map(p=>p.id));setActionChoices([]);};
  function reset(nextMode=mode){
    seq.current++;
    const next=startMatch(createInitialState(victory,{deployment,timeLimitMinutes:timeLimit}),Date.now());
    setMode(nextMode);setUndoStack([]);redraw(next);setSetupTeam('red');setHandoff(false);setConceding(false);
    setStarted(true);setView(nextMode==='bot'?human:'red');setNotice(next.phase==='setup'?'Arrange your army, then confirm deployment.':'Red begins. Select a piece to see legal moves.');
  }
  async function move(action){
    if(botTurn||blockedOnline||arranging||isFinished(state))return;
    if(['move','capture'].includes(action.kind)&&cargoOf(state,action.id).length)action={...action,carryIds};
    setActionChoices([]);setConceding(false);
    if(isOnline){try{await client.current?.request('ctl_game_action',{roomCode:online.room.roomCode,token:online.token,revision:online.room.revision,action});}catch(e){setNotice(e.message);}return;}
    try{
      const next=applyAction(state,action);
      setUndoStack(h=>[...h,state].slice(-60));
      redraw(next);setNotice(action.kind==='end-turn'?'Turn completed.':`${action.kind.toUpperCase()} · ${state.turn.toUpperCase()} → ${action.x},${action.y}${next.turnContext?' · Continue this stack or End turn.':''}`);
    }catch(error){setNotice(error.message);}
  }
  function clickPoint(x,y){
    if(botTurn||blockedOnline||handoff||isFinished(state))return;
    if(arranging){
      const own=shownAt(x,y).find(p=>p.team===editorTeam);
      if(own){selectUnit(own.id);return;}
      if(selected&&canDeploy(state,editorTeam,selected,x,y)){
        if(isOnline){void client.current.request('ctl_setup_move',{roomCode:online.room.roomCode,token:online.token,revision:online.room.revision,action:{id:selected,x,y}}).catch(e=>setNotice(e.message));}
        else redraw(applyDeployment(state,editorTeam,selected,x,y));
      }
      return;
    }
    const here=atPoint(state,x,y),own=here.find(p=>p.team===state.turn&&!p.carrier)||here.find(p=>p.team===state.turn);
    const choices=actions.filter(a=>a.x===x&&a.y===y);
    if(choices.length){
      if(choices.length>1){setActionChoices(choices);return;}
      move(choices[0]);return;
    }
    if(own){selectUnit(own.id);setNotice(labelFor(own));return;}
    setSelected(null);setNotice('Select a friendly piece or a legal target.');
  }
  async function readyDeployment(){
    if(blockedOnline||!arranging||state.setupReady[editorTeam])return;
    try{
      if(isOnline){await client.current.request('ctl_setup_ready',{roomCode:online.room.roomCode,token:online.token,revision:online.room.revision});return;}
      let next=confirmDeployment(state,editorTeam,Date.now());
      if(mode==='bot')next=confirmDeployment(next,human==='red'?'blue':'red',Date.now());
      redraw(next);
      if(next.phase==='setup')setHandoff(true);else{setView('red');setNotice('Both armies revealed. Red begins.');}
    }catch(error){setNotice(error.message);}
  }
  useEffect(()=>{
    if(!started||!Number.isFinite(state.clock?.deadline)||isFinished(state))return;
    const tick=()=>{const t=Date.now();setNow(t);if(!isOnline)setState(old=>expireClock(old,t));};
    tick();const timer=window.setInterval(tick,250);return()=>window.clearInterval(timer);
  },[started,isOnline,state.clock?.deadline,state.finished,state.winner,state.draw]);
  function makeClient(){
    const c=new CoTuLenhClient(wsEndpoint);
    c.onPacket=p=>{if(p.type==='ctl_room_state'&&p.payload?.room&&p.payload.room.roomCode===activeRoomCode.current){setOnline(old=>old?{...old,room:p.payload.room}:old);setState(p.payload.room.gameState);setSelected(null);setActionChoices([]);}};
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
    try{const token=newSeatToken();const res=await client.current.request(create?'ctl_room_create':'ctl_room_join',{team:human,token,name:'Commander',mode:victory,deployment,timeLimitMinutes:timeLimit,...(!create?{roomCode:joinCode}:{} )});
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
  const activeHint=guide>=0?tutorialSteps[guide]:null;
  const stack=selectedPiece?atPoint(state,selectedPiece.x,selectedPiece.y).filter(p=>p.team===(arranging?editorTeam:state.turn)):[];
  const passengers=selectedPiece?cargoOf(state,selectedPiece.id):[];
  const choiceLabel=a=>({move:'Move to this intersection',capture:'Capture and occupy',fire:'Fire and stay here',embark:'Board '+(TYPES[state.pieces.find(p=>p.id===a.carrierId)?.type]?.label||'carrier'),load:'Pick up '+(TYPES[state.pieces.find(p=>p.id===a.passengerId)?.type]?.label||'passenger'),bomb:'Bomb and return',airdrop:'Drop '+(a.dropIds||[]).map(id=>TYPES[state.pieces.find(p=>p.id===id)?.type]?.label).join(', ')+' and return'})[a.kind]||a.kind;
  return <main className="ctl-app">
    <header className="ctl-heading">
      <button className="ctl-ghost" onClick={()=>onExitToLibrary?.()}>← All games</button>
      <div><span className="ctl-kicker">ANTARCTIC GAMING CO · VIETNAMESE STRATEGY</span><h1>Cờ Tư Lệnh <span>Operation Frozen Front</span></h1></div><PenguinHostPair gameId="co-tu-lenh" compact />
      <button className="ctl-ghost" onClick={()=>setGuide(0)}>How to Play</button>
    </header>
    <p className="ctl-disclaimer"><strong>YouTuber Rules · video reviewed · Research Draft.</strong> Modern Vietnamese game (2010). The video’s corrected 38-piece setup and ford locations are included in the new profile. Some advanced transport and combat ordering need clarification. The four earlier profiles remain selectable. Antarctic artwork is a fantasy visual adaptation. Free play · no wallet required.</p>
    {!started&&<section className="ctl-setup" aria-label="Game setup">
      <h2>Choose your command</h2>
      <div className="ctl-choices">{menu.map(m=><button key={m.id} className={mode===m.id?'active':''} onClick={()=>setMode(m.id)}><b>{m.label}</b><small>{m.description}</small></button>)}</div>
      <div className="ctl-prefs"><label>Rules profile<select value={victory} onChange={e=>setVictory(e.target.value)}>{Object.values(RULE_PROFILES).map(profile=><option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>
        {['bot','online'].includes(mode)&&<><label>Your team<select value={human} onChange={e=>setHuman(e.target.value)}><option value="red">Red · First move</option><option value="blue">Blue · Second move</option></select></label>{mode==='bot'&&<label>Bot difficulty<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard (2-ply heuristic)</option></select></label>}</>}
        {RULE_PROFILES[victory]?.videoRules&&<><label>Army deployment<select value={deployment} onChange={e=>setDeployment(e.target.value)}><option value="standard">Video starting positions</option><option value="secret">Secret deployment · advanced</option></select></label><label>Match clock<select value={timeLimit} onChange={e=>setTimeLimit(Number(e.target.value))}><option value={0}>Untimed</option><option value={10}>10 minutes · whole match</option><option value={15}>15 minutes · whole match</option></select></label></>}
      </div>{RULE_PROFILES[victory]?.videoRules&&<p className="ctl-setup-note">YouTuber Rules follows the supplied AncientChess video. Clock length applies to the whole match; tied points draw. Secret deployment uses your own five home rows. These are app choices where the video gives no exact procedure.</p>}{mode==='online'?<div className="ctl-online-join"><label>Private room code<input placeholder="Enter six-letter code to join" value={joinCode} maxLength={6} onChange={e=>setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g,''))}/></label><button className="ctl-primary" onClick={()=>openOnline(false)} disabled={joinCode.length!==6}>Join room</button><button className="ctl-primary" onClick={()=>openOnline(true)}>Create private room</button><p role="status">{notice}</p></div>:<button className="ctl-primary" onClick={()=>reset()}>Begin battle</button>}
    </section>}
    {started&&<div className="ctl-play-layout" inert={handoff?true:undefined}><section className="ctl-board-wrap" aria-label="Commander Chess board">
      {isOnline&&online&&<div className="ctl-online-bar"><b>Room {online.room.roomCode} · {isConnected?'Connected':'Disconnected'}</b><span>Red: {online.room.seats.red.name||'Waiting'} · Blue: {online.room.seats.blue.name||'Waiting'}</span><button onClick={()=>navigator.clipboard?.writeText(inviteUrl(online.room.roomCode,inviteBaseUrl))}>Copy invite</button>{online.room.status==='waiting'&&<button onClick={startRoom} disabled={!online.room.seats.red.name||!online.room.seats.blue.name}>Start online match</button>}{!isConnected&&<button onClick={async()=>{try{const c=await client.current.request('ctl_room_sync',{roomCode:online.room.roomCode,token:online.token});setOnline(old=>({...old,room:c.room}));setState(c.room.gameState);}catch(e){setNotice(e.message);}}}>Reconnect</button>}</div>}
      <div className="ctl-score"><span>🔴 Red · {remaining.red} units{videoRules?` · ${state.scores?.red||0} pts${state.scoreBonus?.red?' +200 bonus':''}`:''}</span><b>{state.draw?'DRAW — equal points':state.winner?`${state.winner.toUpperCase()} WINS — ${state.winReason}`:arranging?`${editorTeam?.toUpperCase()} DEPLOYMENT`:`${movingTeam.toUpperCase()} TO MOVE${botTurn?' · Bot thinking':''}`}{clockLeft!==null&&!isFinished(state)&&<small className="ctl-clock">Match clock {clockLabel}</small>}</b><span>🔵 Blue · {remaining.blue} units{videoRules?` · ${state.scores?.blue||0} pts${state.scoreBonus?.blue?' +200 bonus':''}`:''}</span></div>
      {arranging&&<section className="ctl-compound-turn" aria-label="Secret deployment"><strong>Secret deployment · {editorTeam?.toUpperCase()}</strong><p>Only your army is visible. Tap a piece and an empty legal point in your own five home rows. Navy stays on water or coast; other units stay out of open sea.</p><button className="ctl-primary" disabled={blockedOnline||state.setupReady[editorTeam]} onClick={readyDeployment}>{state.setupReady[editorTeam]?'Ready · waiting for opponent':'Confirm deployment'}</button></section>}
      {state.turnContext&&<section className="ctl-compound-turn" aria-label="Continue stack turn"><strong>{state.turn.toUpperCase()} · Continue this stack</strong><p>Each component can act once. Select a passenger to disembark, or finish the turn. A ship can use its other weapon once.</p><div>{state.turnContext.participants.map(id=>{const p=state.pieces.find(p=>p.id===id);return p?.alive&&<button key={id} aria-label={`Continue with ${TYPES[p.type].label}`} disabled={botTurn||blockedOnline||!legalActions(state,id).length} onClick={()=>selectUnit(id)}>{TYPES[p.type].label}{state.turnContext.spent.includes(id)?' · used':''}</button>;})}</div><button className="ctl-primary" disabled={botTurn||blockedOnline} onClick={()=>move({id:'turn',kind:'end-turn'})}>End turn</button></section>}
      <div className="ctl-board-viewport" style={{'--ctl-zoom':zoom}}>
      <svg className="ctl-board" style={{width:`${zoom*100}%`}} viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Cờ Tư Lệnh with 11 columns, 12 ranks, 132 clickable intersections; red and blue Arctic faction pieces">
        <image href={boardImage} x="0" y="0" width={W} height={H} preserveAspectRatio="none" transform={view==='blue'?`rotate(180 ${W/2} ${H/2})`:undefined} pointerEvents="none" />
        {showDefence&&<g className="ctl-defence-zones" pointerEvents="none" aria-hidden="true">
          {defenceZones.map(zone=>{const center=point(zone.x,zone.y);const color=zone.team==='red'?'#ef4658':'#2f9fff';return <g key={`zone-${zone.id}`}>
            <ellipse cx={center.x} cy={center.y} rx={zone.radius*STEP_X} ry={zone.radius*STEP_Y} fill={color} fillOpacity=".055" stroke={color} strokeOpacity=".78" strokeWidth="4" strokeDasharray="12 8" />
            {zone.points.map(pt=>{const pos=point(pt.x,pt.y);return <circle key={`${zone.id}:${pt.x}:${pt.y}`} cx={pos.x} cy={pos.y} r="7" fill={color} fillOpacity=".84" stroke="#fff" strokeOpacity=".8" strokeWidth="1.4" />;})}
          </g>;})}
        </g>}
        {Array.from({length:132},(_,i)=>{const x=i%11,y=Math.floor(i/11),pt=point(x,y),stack=shownAt(x,y);
          const top=stack.find(p=>!p.carrier)||stack[0];const legal=actions.filter(a=>a.x===x&&a.y===y);const highlight=legal.length>0;
          const danger=legal.some(a=>a.risk),capture=legal.some(a=>['capture','bomb','fire'].includes(a.kind));
          const isSelected=selectedPiece?.x===x&&selectedPiece?.y===y;
          return <g key={`${x}:${y}`} tabIndex={botTurn||blockedOnline||handoff?-1:0} role="button" aria-label={`${x},${y}${top?' — '+labelFor(top):''}${highlight?' — legal target':''}`} onClick={()=>clickPoint(x,y)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();clickPoint(x,y);}}} style={{cursor:'pointer'}}>
            {highlight&&<circle cx={pt.x} cy={pt.y} r="35" fill={capture?'#f47060':'#a0f6ed'} opacity=".6" stroke={danger?'#ffba41':capture?'#e55449':'#177da1'} strokeWidth={danger?5:2}/>}
            {isSelected&&<circle cx={pt.x} cy={pt.y} r="39" fill="none" stroke="#ffd44a" strokeWidth="4"/>}
            <circle cx={pt.x} cy={pt.y} r="40" fill="transparent"/>
            {top&&<><image x={pt.x-33} y={pt.y-33} width="66" height="66" href={graphic(top)} pointerEvents="none"/>{stack.length>1&&<g pointerEvents="none"><circle cx={pt.x+27} cy={pt.y-28} r="12" fill="#08213d" stroke="#effaff"/><text x={pt.x+27} y={pt.y-24} textAnchor="middle" fontSize="11" fontWeight="bold" fill="white">{stack.length}</text></g>}{top.hero&&<text x={pt.x-32} y={pt.y-32} fill="#ffe073" fontSize="16" pointerEvents="none">★</text>}</>}
          </g>;
        })}
      </svg></div>
      <div className="ctl-toolbar"><button type="button" className={showDefence?'ctl-range-toggle is-active':'ctl-range-toggle'} aria-pressed={showDefence} disabled={arranging} onClick={()=>setShowDefence(v=>!v)}>{showDefence?'◉ Hide Defence Ranges':'◎ Show Defence Ranges'}</button><button onClick={()=>setZoom(z=>Math.max(1,+(z-0.25).toFixed(2)))} disabled={zoom<=1} aria-label="Zoom board out">− Zoom</button><button onClick={()=>setZoom(z=>Math.min(2.5,+(z+0.25).toFixed(2)))} disabled={zoom>=2.5} aria-label="Zoom board in">+ Zoom</button><button disabled={isOnline||!undoStack.length} onClick={()=>{seq.current++;if(undoStack.length){setState(undoStack.at(-1));setUndoStack(h=>h.slice(0,-1));setSelected(null);}}} >↶ Undo</button>{!isOnline&&<button onClick={()=>reset()}>↻ Reset</button>}{!arranging&&!isFinished(state)&&<button disabled={botTurn||blockedOnline} onClick={()=>setConceding(true)}>Concede</button>}<button onClick={()=>setView(v=>v==='red'?'blue':'red')}>⇄ Rotate view</button><button onClick={()=>{setStarted(false);setGuide(-1);seq.current++;if(isOnline){activeRoomCode.current=null;client.current?.close();client.current=makeClient();setOnline(null);const url=new URL(window.location.href);url.searchParams.delete('room');window.history.replaceState({},'',url);}}}>⚙ Setup</button></div>
      {showDefence&&<div className="ctl-defence-key" aria-live="polite"><span className="ctl-red-key">● Red air defence</span><span className="ctl-blue-key">● Blue air defence</span><span>Small dots = exact threatened intersections; dashed ring = approximate visual radius. Anti-aircraft & Navy: 1. Missile: 2.</span></div>}
      <p className="ctl-message" aria-live="polite">{notice}</p>
      </section>
      <aside className="ctl-sidebar"><div className="ctl-panel"><h2>{selectedPiece?TYPES[selectedPiece.type].label:'Field Guide'}</h2>{selectedPiece?<><img src={graphic(selectedPiece)} alt="" className="ctl-preview"/><strong>{TYPES[selectedPiece.type].native}</strong><p>{labelFor(selectedPiece)}</p><p>{actions.length} legal actions. {selectedPiece.carrier?'Currently embarked.':''}</p></>:<p>Tap a unit to learn its identity and review available movement, transport and attack targets.</p>}</div>
        {stack.length>1&&<section className="ctl-panel ctl-stack" aria-label="Stack pieces"><h3>Choose a piece in this stack</h3>{stack.map(p=><button key={p.id} aria-label={`Select ${TYPES[p.type].label} in stack`} aria-pressed={selected===p.id} onClick={()=>selectUnit(p.id)} disabled={botTurn||blockedOnline}><img src={graphic(p)} alt=""/><span>{TYPES[p.type].label}{p.carrier?' · passenger':' · carrier'}</span></button>)}</section>}
        {passengers.length>0&&<section className="ctl-panel" aria-label="Passengers for carrier travel"><h3>Passengers for normal travel</h3><p>Checked pieces travel with the carrier. Unchecked pieces remain on a legal point and must form a compatible stack if several stay behind. {videoRules?'Aircraft passengers disembark as their own action; drop-and-return is not part of this video profile.':'To drop from an aircraft and return, choose that action on the destination.'}</p>{passengers.map(p=><label className="ctl-passenger" key={p.id}><input type="checkbox" checked={carryIds.includes(p.id)} onChange={e=>setCarryIds(ids=>e.target.checked?[...ids,p.id]:ids.filter(id=>id!==p.id))}/>{TYPES[p.type].label}</label>)}</section>}
        <div className="ctl-panel"><h3>Selected rules profile</h3><strong>{currentProfile.label}</strong><p>{currentProfile.autoDivision?`Win by capturing the Commander, both ships, both aircraft or the entire ${currentProfile.landDivision.length===3?'six':'nine'}-unit land division.`:'Only defeating the enemy Commander ends the untimed match automatically.'}</p><p>Movement basis: {currentProfile.movementBasis}. {videoRules?'A forced capture may also decide a division. Automatic proof is limited; players can concede an agreed result. Optional timed matches compare captured-unit points.':'No tournament timer is enabled for this profile.'}</p></div>
        <div className="ctl-panel"><h3>Defensive coverage</h3><p>Anti-aircraft (Cao xạ) and Navy (Hải quân) defend radius 1. Missile (Tên lửa) covers 2 orthogonally and 1 diagonally. Red and blue overlays are optional and do not modify the rules. Engineer coverage is not enabled; the video does not grant it.</p>{videoRules?<><p>The video’s final setup (including its late Blue Infantry correction) and two fords are used. Tank and Aircraft carry personnel; Navy also carries Tanks and Aircraft. No invented three-piece stack limit is imposed. Original stack members each act once; Navy uses each weapon once.</p><p>HQ protects the Commander from attackers except Artillery, Aircraft and Navy. Checking promotes a Hero. The last mobile defender is also a Hero. Engineer has no air-defence zone in this profile.</p><p>Research clarifications: normal flight through defence is intercepted; attacking a defended destination can capture then sacrifice the plane. Cargo is lost with a destroyed carrier. Stack actions and Navy’s second shot use their current positions. Exact advanced ordering remains a draft.</p><a href="https://www.youtube.com/watch?v=bdbllE9d4Ok" target="_blank" rel="noreferrer">Source video · YouTuber Rules</a></>:<p>Exact initial setup and ford columns remain provisional for this earlier profile. Compound stack turns, ferrying, passenger selection, drop-and-return and naval dual attacks are enabled. Interception uses the earlier BGA continuous-zone interpretation provisionally.</p>}<a href="https://en.doc.boardgamearena.com/Gamehelpcommanderchess" target="_blank" rel="noreferrer">BGA rules reference</a></div>
        <button className="ctl-primary" onClick={()=>setGuide(0)}>Learn with Pengu →</button>
      </aside>
    </div>}
    {handoff&&<div className="ctl-modal-overlay ctl-handoff"><section className="ctl-modal" role="dialog" aria-modal="true" aria-label="Pass device for secret deployment"><h2>Pass the device to Blue</h2><p>Red’s deployment is hidden. Blue can now arrange its army privately.</p><button className="ctl-primary" onClick={()=>{setSetupTeam('blue');setView('blue');setHandoff(false);setSelected(null);}}>Blue is ready</button></section></div>}
    {conceding&&<div className="ctl-modal-overlay"><section className="ctl-modal" role="dialog" aria-modal="true" aria-label="Confirm concession"><h2>Concede this match?</h2><p>The opposing team wins. Use this when accepting an unavoidable capture or choosing to resign.</p><button className="ctl-primary" onClick={()=>move({id:'turn',kind:'concede'})}>Confirm concession</button><button onClick={()=>setConceding(false)}>Keep playing</button></section></div>}
    {actionChoices.length>0&&<div className="ctl-modal-overlay"><section className="ctl-modal" role="dialog" aria-modal="true" aria-label="Choose your action"><h2>Choose your action</h2><p>Several actions reach this intersection. Choose how to move or attack.</p><div className="ctl-action-choices">{actionChoices.map((a,i)=><button className="ctl-primary" key={i} onClick={()=>move(a)}>{choiceLabel(a)}</button>)}</div><button className="ctl-ghost" onClick={()=>setActionChoices([])}>Cancel</button></section></div>}
    {guide>=0&&<div className="ctl-modal-overlay" role="presentation"><section className="ctl-modal" role="dialog" aria-modal="true" aria-label="Commander Chess tutorial"><button className="ctl-close" onClick={()=>setGuide(-1)} aria-label="Close tutorial">×</button><div className="ctl-guide-heading"><PenguinHost host="pengu" size="mini"/><div className="ctl-kicker">PENGU ORDER · RULES & ROUTES</div></div><h2>{activeHint[0]}</h2><p>{activeHint[1]}</p><div className="ctl-tutorial-nav"><span>Lesson {guide+1}/{tutorialSteps.length}</span>{guide>0&&<button onClick={()=>setGuide(i=>i-1)}>Back</button>}<button className="ctl-primary" onClick={()=>setGuide(i=>i===tutorialSteps.length-1?-1:i+1)}>{guide===tutorialSteps.length-1?'Play':'Next'}</button></div></section></div>}
    <footer className="ctl-foot">Cờ Tư Lệnh by Nguyễn Quý Hải (Vietnam, 2010). Arctic illustrations are independent adaptations, not official game art. Rules build: {VERSION}; profile: {currentProfile.id} · Research draft, not a verified official edition.</footer>
  </main>;
}
