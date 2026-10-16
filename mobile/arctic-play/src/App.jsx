import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Home,Users,Gamepad2,MessageCircle,User,ArrowLeft,ChevronRight,Heart,Plus,Search,X,Send,MoreHorizontal,Share2,Copy,BookOpen,Wifi,WifiOff,RotateCcw,Undo2,Check,Download,LogOut,Settings,Clock,Shield,Play,Volume2,Moon,Sun} from 'lucide-react';
import {GAME_LIST,game,create,actions,apply,result,turn,hand,pieces,inCheck,COLORS,asset,seatName,RULES,VERSION,forfeit} from './games.ts';
import {Board} from './Board.jsx';
import {DiceTray} from './DiceTray.jsx';
import {roomClient,INVITE_ROOT} from './network.js';
import {read,write,getProfile,saveRoom,forgetRoom} from './storage.js';
import {RuleClient} from './ruleClient.js';
import {CoverArt} from './CoverArt.jsx';
import {AppUpdates} from './AppUpdates.jsx';
import {APP_VERSION,GAME_PRESENTATION,describeTransition,parseInvitation} from './presentation.js';
import {BRAND,GUIDES,GAME_HERITAGE,JOURNAL_KEY,recordDiscovery} from './brand.js';
import {KingdomIntro,HostNote,HeritageLabel,HeritageDetails,ArchiveJournal,GuideCollection} from './Kingdom.jsx';
import {HowToPlay,LearningInvitation} from './HowToPlay.jsx';
import {useCompanions,CompanionDock,CompanionCamp,CompanionSettings} from './Companions.jsx';
import {finishCompanionEvent} from './companions.js';

const tabs=[['home','Discover',Home],['friends','Friends',Users],['games','Games',Gamepad2],['chats','Chats',MessageCircle],['profile','Profile',User]];
const openingText=id=>`${seatName(id,game(id).seats[0])} ${id==='dominion'?'rolls':'moves'} first`;
const Avatar=({color='blue',size=42,name='',online=false,gameId})=><span className="avatar" style={{width:size,height:size}}><img src={asset(gameId==='dominion'?`dominion/${color==='yellow'?'pink':color}-frost-king.webp`:`tokens/token-sanguo-${color==='black'?'blue':color}-general.webp`)} alt={name||'Player avatar'}/>{online&&<i/>}</span>;
function Sheet({title,onClose,children,wide=false}){
  const panel=useRef(null),close=useRef(onClose);close.current=onClose;
  useEffect(()=>{
    const previous=document.activeElement;
    panel.current?.querySelector('[aria-label="Close"]')?.focus({preventScroll:true});
    const key=event=>{
      if(event.key==='Escape'){event.preventDefault();close.current();}
      if(event.key!=='Tab')return;
      const controls=[...panel.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')].filter(node=>node.getClientRects().length);
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    const element=panel.current;element.addEventListener('keydown',key);
    return()=>{element.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus({preventScroll:true});};
  },[]);
  return <div className="overlay" role="presentation" onClick={onClose}><section ref={panel} className={`sheet ${wide?'wide':''}`} role="dialog" aria-modal="true" aria-label={title} onClick={e=>e.stopPropagation()}><div className="sheet-grip"/><header><h2>{title}</h2><button className="icon-btn" aria-label="Close" onClick={onClose}><X/></button></header>{children}</section></div>;
}
function GameCard({definition,favorite,onFavorite,onPlay,featured=false}){return <article className={`game-card ${featured?'featured':''}`} style={{'--accent':definition.accent}}>
  <button className="game-open" onClick={()=>onPlay(definition.id)} aria-label={`Play ${definition.name}`}><CoverArt id={definition.id}/><span className="card-seats"><Users size={12}/>{definition.players} players</span><span className="card-caption"><strong>{definition.name}</strong><small>{GAME_PRESENTATION[definition.id].tag}</small><span className="card-origin">{GAME_HERITAGE[definition.id].origin}</span></span></button>
  <button className="card-favorite" aria-pressed={favorite} aria-label={`${favorite?'Unfavorite':'Favorite'} ${definition.name}`} onClick={()=>onFavorite(definition.id)}><Heart size={18} fill={favorite?'currentColor':'none'}/></button>
</article>;}
function App(){
  const [profile,setProfile]=useState(getProfile),[tab,setTab]=useState('games'),[screen,setScreen]=useState('lobby');
  const [theme,setTheme]=useState(()=>read('theme','dark')==='light'?'light':'dark');
  const [filter,setFilter]=useState('All'),[favorites,setFavorites]=useState(()=>read('favorites',[]));
  const [sheet,setSheet]=useState(null),[picked,setPicked]=useState('shogi'),[seat,setSeat]=useState('red');
  const [local,setLocal]=useState(null),[room,setRoom]=useState(null),[session,setSession]=useState(null);
  const [busy,setBusy]=useState(false),[connection,setConnection]=useState(roomClient.status),[notice,setNotice]=useState('');
  const [chatOpen,setChatOpen]=useState(false),[chatText,setChatText]=useState(''),[joinCode,setJoinCode]=useState('');
  const [nameDraft,setNameDraft]=useState(profile.name),[promotion,setPromotion]=useState(null),[selected,setSelected]=useState(null),[thinking,setThinking]=useState(false);
  const [savedRooms,setSavedRooms]=useState(()=>read('rooms',{})),[friends,setFriends]=useState(()=>read('friends',[]));
  const [friendDraft,setFriendDraft]=useState(''),[localChat,setLocalChat]=useState([]),[refresh,setRefresh]=useState(0);
  const [legal,setLegal]=useState([]),[loadingLegal,setLoadingLegal]=useState(false),[checked,setChecked]=useState(false);
  const [trail,setTrail]=useState(null);
  const [journal,setJournal]=useState(()=>read(JOURNAL_KEY,{}));
  const [academy,setAcademy]=useState(null);
  const ruleClient=useRef(null);if(!ruleClient.current)ruleClient.current=new RuleClient();
  const worker=useRef(null),workerSequence=useRef(0),roomRef=useRef(null),sessionRef=useRef(null),backRef=useRef(null),toastTimer=useRef(null),chatEnd=useRef(null);
  const notify=text=>{setNotice(text);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setNotice(''),5000);};
  const online=!!session&&!!room&&(screen==='match'||screen==='learn'&&academy?.returnScreen==='match');
  const id=online?room.tableId:local?.id;
  const state=online?room.gameState:local?.state;
  const definition=id?game(id):null;
  const outcome=state?result(state):null;
  const me=room?.players.find(p=>p.id===profile.id);
  const humans=online?room.players.filter(p=>!p.bot).map(p=>p.seat):local?.humans||[];
  const canAct=!!state&&!outcome&&!busy&&!loadingLegal&&(online?connection==='online'&&me?.seat===turn(state):humans.includes(turn(state)));
  const pocket=useMemo(()=>state?hand(id,state):[],[id,state]);
  const visible=useMemo(()=>state?pieces(id,state):[],[id,state]);
  const selectedUnit=visible.find(p=>p.source===selected)||pocket.find(p=>p.source===selected);
  const selectedActions=legal.filter(a=>a.source===selected);
  const turnName=state?seatName(id,turn(state)):'';
  const suggested=local?.guide&&!online&&!selected?legal.find(a=>a.source.startsWith('piece:'))?.source:null;
  const resumable=Object.values(savedRooms).sort((a,b)=>b.at-a.at).find(saved=>game(saved.room.tableId)&&['waiting','playing'].includes(saved.room.status));
  const companion=useCompanions({screen,tab,gameId:id,gameName:definition?.name,online,roomCode:room?.roomCode,name:profile.name,journal,blocked:!!sheet||chatOpen||!!promotion||screen==='learn'});
  const companionMatch=useRef(null),companionEvent=useRef(0);
  function openCamp(host){if(host)companion.meet(host);setSheet('companions');}
  const receiveRoom=next=>{
    const before=roomRef.current;
    if(before?.roomCode===next.roomCode){if(JSON.stringify(before.gameState)!==JSON.stringify(next.gameState)){const move=describeTransition(next.tableId,before.gameState,next.gameState);if(move)setTrail(move);}}
    else setTrail(null);
    setRoom(next);roomRef.current=next;
    if(sessionRef.current){saveRoom(sessionRef.current,next);setSavedRooms(read('rooms',{}));}
  };

  useEffect(()=>roomClient.onStatus(setConnection),[]);
  useEffect(()=>roomClient.listen(value=>{
    if(value.error){notify(value.error);return;}
    if(value.room?.roomCode===roomRef.current?.roomCode){
      receiveRoom(value.room);
    }
  }),[]);
  useEffect(()=>{roomRef.current=room;sessionRef.current=session;},[room,session]);
  useEffect(()=>{
    if(screen!=='match'||!state){companionMatch.current=null;return;}
    const previous=companionMatch.current;
    companionMatch.current={id,state};
    if(!previous||previous.id!==id||previous.state===state||JSON.stringify(previous.state)===JSON.stringify(state)||result(previous.state))return;
    const key=`game-event:${++companionEvent.current}`;
    if(outcome){companion.react(finishCompanionEvent({outcome,online,seat:me?.seat,humans,hotseat:local?.mode==='hotseat'}),{key});return;}
    const move=describeTransition(id,previous.state,state);
    if(move){
      const capture=pieces(id,state).length<pieces(id,previous.state).length;
      const myTurn=color=>online?color===me?.seat:humans.includes(color);
      companion.react(capture?'capture':myTurn(turn(state))&&!myTurn(turn(previous.state))?'turn':'move',{key});
    }else if(id==='dominion'&&state.dice?.rolled&&!previous.state.dice?.rolled)companion.react('dice',{key});
  },[screen,id,state]);
  useEffect(()=>{if(screen==='match'&&!loadingLegal&&checked&&canAct)companion.react('check',{key:`check:${id}:${companionEvent.current}`});},[checked,loadingLegal,canAct,screen,id]);
  useEffect(()=>{if(online&&connection==='offline')companion.react('connection',{key:`connection:${room?.roomCode}:${companionEvent.current}`});},[online,connection]);
  useEffect(()=>{if(room?.status==='playing')setScreen(current=>current==='room'?'match':current);},[room?.status]);
  useEffect(()=>{if(local)write(`practice.${local.id}`,local);},[local]);
  useLayoutEffect(()=>{setSelected(null);setPromotion(null);},[state]);
  useLayoutEffect(()=>{
    let current=true;
    if(!id||!state||screen!=='match'){setLegal([]);setLoadingLegal(false);return;}
    if(ruleClient.current.pending.size)ruleClient.current.reset('The position has been updated.');
    setLegal([]);setLoadingLegal(true);
    ruleClient.current.call('legal',{id,state}).then(data=>{if(current){setLegal(data.legal);setChecked(data.checked);setLoadingLegal(false);}}).catch(error=>{if(current){setLoadingLegal(false);notify(error.message);}});
    return()=>{current=false;};
  },[id,state,screen,refresh]);
  useLayoutEffect(()=>{document.documentElement.dataset.theme=theme;window.Android?.setDarkTheme(theme==='dark');write('theme',theme);},[theme]);
  useLayoutEffect(()=>{if(screen==='lobby'){const scroller=document.scrollingElement||document.documentElement;scroller.scrollTop=0;scroller.scrollLeft=0;}},[tab,screen]);
  useEffect(()=>{chatEnd.current?.scrollIntoView({block:'nearest'});},[chatOpen,room?.chat?.length,localChat.length]);
  useEffect(()=>{
    window.arcticBack=()=>{backRef.current?.();return true;};
    window.arcticJoin=code=>{const parsed=parseInvitation(code);if(!parsed){notify('Enter a valid Antarctic Kingdoms invitation.');return;}setJoinCode(parsed);setSheet('join');};
    window.Android?.appReady?.();
    const query=new URLSearchParams(location.search).get('room');if(query)window.arcticJoin(query.toUpperCase());
    return()=>{delete window.arcticBack;delete window.arcticJoin;};
  },[]);
  backRef.current=()=>{
    if(promotion){setPromotion(null);return;}
    if(sheet){setSheet(null);return;}
    if(chatOpen){setChatOpen(false);return;}
    if(screen==='learn'){setScreen(academy?.returnScreen||'lobby');return;}
    if(screen!=='lobby'){setScreen('lobby');setTab('games');return;}
    if(tab!=='games'){setTab('games');return;}
    window.Android?.backgroundApp();
  };
  useEffect(()=>{
    const sequence=++workerSequence.current;
    if(!state||online||screen!=='match'||outcome||humans.includes(turn(state))){setThinking(false);return;}
    setThinking(true);
    if(!worker.current)worker.current=new Worker('bot.js');
    const bot=worker.current;
    bot.onmessage=({data})=>{
      if(data.sequence!==workerSequence.current)return;
      setThinking(false);
      if(data.error){notify(data.error);return;}
      if(!data.action){notify('This side has no legal action. Check the match rules.');return;}
      if(data.state){const move=describeTransition(id,state,data.state);if(move)setTrail(move);setLocal(current=>({...current,state:data.state,history:[...(current.history||[]),current.state].slice(-40)}));}
    };
    const timer=setTimeout(()=>bot.postMessage({id,state,sequence}),420);
    return()=>{clearTimeout(timer);workerSequence.current++;worker.current?.terminate();worker.current=null;};
  },[id,state,online,screen,refresh]);

  const run=async fn=>{if(busy)return;setBusy(true);try{await fn();}catch(error){notify(error.message);}finally{setBusy(false);}};
  const command=async(type,payload={})=>{
    const response=await roomClient.call(type,{...sessionRef.current,...payload});
    if(response.room)receiveRoom(response.room);
    return response;
  };
  function pick(gameId){setPicked(gameId);setSeat(game(gameId).seats[0]);setSheet('game');}
  function learn(gameId){setPicked(gameId);setSeat(game(gameId).seats[0]);setSheet('quickstart');}
  function openLearning(gameId=picked,initialTab='learn'){
    setAcademy({id:gameId,initialTab,returnScreen:screen==='learn'?academy.returnScreen:screen});setPicked(gameId);setSeat(game(gameId).seats[0]);setSheet(null);setChatOpen(false);setScreen('learn');
  }
  function learningDiscovery(gameId){const next=recordDiscovery(read(JOURNAL_KEY,{}),gameId);write(JOURNAL_KEY,next);setJournal(next);}
  async function share(text,title=BRAND.name){
    if(window.Android?.shareText){window.Android.shareText(title,text);return;}
    if(navigator.share){try{await navigator.share({title,text});return;}catch(error){if(error.name==='AbortError')return;}}
    try{await navigator.clipboard.writeText(text);notify('Copied. Send it to your friend.');}catch{notify(text);}
  }
  async function shareRoom(){if(room)await share(`Join me for ${game(room.tableId).name} on Antarctic Kingdoms. Room: ${room.roomCode}\n${INVITE_ROOT}${room.roomCode}`);}
  async function copy(text){try{await navigator.clipboard.writeText(text);notify('Copied.');}catch{await share(text);}}
  function updateProfile(){const name=nameDraft.trim().slice(0,24);if(!name){notify('Enter a display name.');return;}const next={...profile,name};setProfile(next);write('profile',next);setSheet(null);}
  function toggleFavorite(gameId){const next=favorites.includes(gameId)?favorites.filter(x=>x!==gameId):[...favorites,gameId];setFavorites(next);write('favorites',next);}
  async function createRoom(){
    await roomClient.detach();
    const response=await roomClient.call('ap_room_create',{tableId:picked,name:profile.name,playerId:profile.id,seat});
    const saved={roomCode:response.room.roomCode,playerId:profile.id,seatToken:response.seatToken};
    roomClient.useSession(saved);setSession(saved);sessionRef.current=saved;receiveRoom(response.room);
    setLocal(null);setSheet(null);setScreen('room');
  }
  async function joinRoom(code){
    const normalized=parseInvitation(code);if(!normalized)throw new Error('Enter the six-character room code or paste its invitation.');
    const saved=read('rooms',{})[normalized];await roomClient.detach();
    const response=await roomClient.call('ap_room_join',{roomCode:normalized,playerId:profile.id,name:profile.name,...(saved?.session||{})});
    const next={roomCode:normalized,playerId:profile.id,seatToken:response.seatToken||saved?.session.seatToken};
    roomClient.useSession(next);setSession(next);sessionRef.current=next;receiveRoom(response.room);
    setLocal(null);setSheet(null);setChatOpen(false);setScreen(response.room.status==='waiting'?'room':'match');
  }
  async function startPractice(mode,guide=false){
    await roomClient.detach();setSession(null);sessionRef.current=null;setRoom(null);roomRef.current=null;
    clearTimeout(toastTimer.current);setNotice('');
    const match={id:picked,state:create(picked),mode,humans:mode==='hotseat'?game(picked).seats:[seat],history:[],guide};
    setLocal(match);setTrail(null);setLocalChat([]);setSheet(null);setChatOpen(false);setScreen('match');
  }
  async function resumePractice(gameId){
    const saved=read(`practice.${gameId}`,null);if(!saved)return;
    await roomClient.detach();setSession(null);sessionRef.current=null;setRoom(null);roomRef.current=null;setLocal(saved);setTrail(null);setSheet(null);setScreen('match');
  }
  async function commit(action){
    setPromotion(null);setSelected(null);
    if(online){await run(()=>command('ap_game_action',{actionId:action.id,revision:room.revision}));}
    else {await run(async()=>{const response=await ruleClient.current.call('apply',{id,state,actionId:action.id});const move=describeTransition(id,state,response.state);if(move)setTrail(move);if(local.guide&&move){const previous=read(JOURNAL_KEY,{}),next=recordDiscovery(previous,id);write(JOURNAL_KEY,next);setJournal(next);notify('First move saved to your Archive journal.');if(!previous[id])companion.react('discovery',{key:`discovery:${id}`});}setLocal(current=>({...current,state:response.state,guide:current.guide&&!move,history:[...current.history,current.state].slice(-40)}));});}
  }
  function target(cell){const choices=selectedActions.filter(a=>a.target===cell);if(!choices.length)return;if(choices.length>1)setPromotion(choices);else commit(choices[0]);}
  async function leave(){await command('ap_room_leave');forgetRoom(room.roomCode);setSavedRooms(read('rooms',{}));roomClient.useSession(null);setSession(null);sessionRef.current=null;setRoom(null);roomRef.current=null;setSheet(null);setScreen('lobby');}
  function undo(){if(!local?.history.length)return;const previous=[...local.history];let next=previous.pop();while(previous.length&&!local.humans.includes(turn(next)))next=previous.pop();workerSequence.current++;companionMatch.current=null;setLocal({...local,state:next,history:previous,guide:false});setTrail(null);setSheet(null);}
  function restart(){workerSequence.current++;companionMatch.current=null;setLocal({...local,state:create(id),history:[],guide:false});setTrail(null);setSheet(null);setSelected(null);setLocalChat([]);}
  async function sendChat(e){e.preventDefault();const text=chatText.trim();if(!text)return;
    if(online){await run(async()=>{await command('ap_room_chat',{text});setChatText('');});}
    else {setLocalChat(current=>[...current,{id:crypto.randomUUID(),name:local.mode==='hotseat'?`${turnName} player`:profile.name,seat:turn(state),text,at:new Date().toISOString()}].slice(-100));setChatText('');}
  }
  const currentChats=online?room.chat||[]:localChat;
  const currentRoomSeats=room?game(room.tableId).seats:[];
  const inviteStatus=connection==='online'?'Connected':connection==='connecting'?'Connecting…':'Reconnecting…';

  return <div className={`app ${screen==='match'?'battle':''} ${companion.preferences.mode!=='off'&&screen!=='learn'?'has-companion':''}`}>
    {screen==='learn'&&academy&&<HowToPlay key={academy.id} id={academy.id} initialTab={academy.initialTab} onGame={gameId=>openLearning(gameId)} onClose={()=>setScreen(academy.returnScreen)} preferences={companion.preferences} onDiscovery={learningDiscovery} returnToGame={academy.returnScreen==='match'} onPractice={online?null:()=>run(()=>startPractice('bots'))}/>}
    {screen==='lobby'&&<>
      <header className="lobby-header"><button className="avatar-btn" onClick={()=>{setNameDraft(profile.name);setSheet('name');}} aria-label="Edit profile"><Avatar color={profile.avatar} online={connection==='online'}/></button><h1 className={tab==='games'||tab==='home'?'brand-wordmark':''}>{tab==='games'||tab==='home'?<><span>ANTARCTIC</span><strong>KINGDOMS</strong></>:tabs.find(t=>t[0]===tab)?.[1]}</h1><button className="icon-btn blue" onClick={()=>setSheet(tab==='profile'?'about':'join')} aria-label={tab==='profile'?'App information':'Join a room'}>{tab==='profile'?<Settings/>:<Plus/>}</button></header>
      <main className="lobby-content">
        {tab==='games'&&<>
          <KingdomIntro onExplore={()=>setTab('home')}/>
          <LearningInvitation enabled={companion.preferences.mode!=='off'} onOpen={()=>openLearning()}/>
          <div className="filter-row">{['All','2 players','3 players','4 players','Favorites'].map(item=><button className={filter===item?'active':''} key={item} onClick={()=>setFilter(item)}>{item==='Favorites'&&<Heart size={13}/>} {item}</button>)}</div>
          <div className="quick-invite"><span><strong>Play with your people</strong><small>Private tables. Easy invitations.</small></span><button onClick={()=>setSheet('join')}>Join room <ChevronRight size={17}/></button></div>
          {resumable&&<button className="resume-table" disabled={busy} onClick={()=>run(()=>joinRoom(resumable.room.roomCode))}><Play size={19}/><span><strong>Resume {game(resumable.room.tableId).name}</strong><small>Your saved table · {resumable.room.roomCode}</small></span><ChevronRight size={19}/></button>}
          <div className="games-grid">{GAME_LIST.filter(g=>filter==='All'||filter==='Favorites'&&favorites.includes(g.id)||filter===`${g.players} players`).map(g=><GameCard key={g.id} definition={g} featured={g.id==='dominion'||filter==='All'&&['shogi','xiangqi'].includes(g.id)} favorite={favorites.includes(g.id)} onFavorite={toggleFavorite} onPlay={pick}/>)}</div>
          {filter==='Favorites'&&!favorites.length&&<div className="empty"><Heart/><h3>Your favorites belong here</h3><p>Tap a heart on a game to keep it close.</p></div>}
          <p className="lobby-footnote">{BRAND.company} · {GAME_LIST.length} games, one Antarctic home.</p>
        </>}
        {tab==='home'&&<>
          <section className="archive-story"><p className="kingdom-kicker">THE FROZEN ARCHIVE</p><h2>The world’s games.<br/>A kingdom of possibilities.</h2><p>In our imagined Antarctic kingdom, Polly, Retsba, Pengu and Abster welcome you to a meeting place for strategy, stories and friends.</p><p>Discover living traditions, historical variants and modern adaptations. Every game keeps its own origins.</p><button className="text-button" onClick={()=>setTab('games')}>Find your table <ChevronRight size={17}/></button></section>
          <div className="welcome"><Avatar color={profile.avatar} size={64}/><div><h2>Hello, {profile.name}</h2><p>Your next discovery is one move away.</p></div></div>
          <LearningInvitation enabled={companion.preferences.mode!=='off'} onOpen={()=>openLearning()}/><ArchiveJournal games={GAME_LIST} journal={journal} onLearn={learn}/><GuideCollection onMeet={openCamp}/>
          <div className="section-title"><h2>Your tables</h2><button onClick={()=>setSheet('join')}>Join room</button></div>
          {Object.values(savedRooms).filter(saved=>['waiting','playing'].includes(saved.room.status)).length?Object.values(savedRooms).filter(saved=>['waiting','playing'].includes(saved.room.status)).map(saved=><button key={saved.room.roomCode} className="table-row" onClick={()=>run(()=>joinRoom(saved.room.roomCode))}><img src={asset(game(saved.room.tableId).icon)} alt=""/><span><strong>{game(saved.room.tableId).name}</strong><small>{saved.room.status==='waiting'?'Waiting for friends':turn(saved.room.gameState)===saved.room.players.find(p=>p.id===profile.id)?.seat?'Your turn':'In progress'} · {saved.room.roomCode}</small></span><ChevronRight/></button>):<div className="empty compact"><Gamepad2/><h3>Your next game starts here</h3><p>Create a private table and invite a friend.</p><button className="primary" onClick={()=>setTab('games')}>Find a game</button></div>}
          <div className="section-title"><h2>Continue practice</h2></div>
          {GAME_LIST.filter(g=>read(`practice.${g.id}`,null)).map(g=><button className="table-row" key={g.id} onClick={()=>resumePractice(g.id)}><img src={asset(g.icon)} alt=""/><span><strong>{g.name}</strong><small>Saved on this phone</small></span><ChevronRight/></button>)}
          <div className="share-banner"><h3>Bring your friends along</h3><p>Share the APK from your profile. No account or payment is needed.</p><button onClick={()=>setTab('profile')}>Share Antarctic Kingdoms <Share2 size={16}/></button></div>
        </>}
        {tab==='friends'&&<>
          <div className="friend-intro"><Users size={38}/><h2>Good games. Better company.</h2><p>Keep a list of your friends here, then share a room invitation through your favorite messaging app.</p></div>
          <form className="inline-form" onSubmit={e=>{e.preventDefault();if(!friendDraft.trim())return;const next=[...friends,{id:crypto.randomUUID(),name:friendDraft.trim().slice(0,24)}];setFriends(next);write('friends',next);setFriendDraft('');}}><input value={friendDraft} onChange={e=>setFriendDraft(e.target.value)} placeholder="Friend’s name" maxLength={24} aria-label="Friend’s name"/><button className="primary" type="submit"><Plus size={19}/>Add</button></form>
          {friends.map((f,index)=><div className="friend-row" key={f.id}><Avatar color={['blue','green','red'][index%3]}/><span><strong>{f.name}</strong><small>Saved on your phone</small></span><button className="pill blue-pill" onClick={()=>room?shareRoom():notify('Create a room from Games, then share its invitation.')}>Invite</button><button className="icon-btn" aria-label={`Remove ${f.name}`} onClick={()=>{const next=friends.filter(x=>x.id!==f.id);setFriends(next);write('friends',next);}}><X size={16}/></button></div>)}
          {!friends.length&&<p className="muted center">Add a name above to start your friends list.</p>}
        </>}
        {tab==='chats'&&<>
          <p className="tab-intro">Your private table conversations</p>
          {Object.values(savedRooms).map(saved=><button className="table-row" key={saved.room.roomCode} onClick={()=>run(async()=>{await joinRoom(saved.room.roomCode);if(saved.room.status==='waiting')setScreen('room');else setChatOpen(true);})}><img src={asset(game(saved.room.tableId).icon)} alt=""/><span><strong>{game(saved.room.tableId).name} · {saved.room.roomCode}</strong><small>{saved.room.chat?.at(-1)?.text||'Say hello at your table'}</small></span><MessageCircle size={21}/></button>)}
          {!Object.keys(savedRooms).length&&<div className="empty"><MessageCircle/><h3>The conversation starts at the table</h3><p>Create or join a room to chat while you play.</p></div>}
        </>}
        {tab==='profile'&&<>
          <div className="profile-card"><Avatar color={profile.avatar} size={94}/><h2>{profile.name}</h2><p>Ready for one more game</p><button className="pill blue-pill" onClick={()=>{setNameDraft(profile.name);setSheet('name');}}>Edit profile</button></div>
          <div className="profile-options">
            <button className="theme-control" role="switch" aria-label="Dark mode" aria-checked={theme==='dark'} onClick={()=>setTheme(current=>current==='dark'?'light':'dark')}><span className="option-icon">{theme==='dark'?<Moon/>:<Sun/>}</span><span><strong>Dark mode</strong><small>{theme==='dark'?'On · Dark across the app':'Off · Light appearance'}</small></span><span className={`theme-switch ${theme==='dark'?'on':''}`} aria-hidden="true"><i/></span></button>
            <button onClick={()=>setSheet('mascot-settings')}><span className="option-icon"><MessageCircle/></span><span><strong>Mascot companions</strong><small>{companion.preferences.mode==='off'?'Off · Bring the guides back any time':`${companion.preferences.mode==='quiet'?'Quiet':'Lively'} · ${companion.preferences.guide==='auto'?'All four guides':GUIDES[companion.preferences.guide].name}`}</small></span><ChevronRight/></button>
            <button onClick={()=>{if(window.Android?.shareApp)window.Android.shareApp();else notify('APK sharing is available inside the installed Android app.');}}><span className="option-icon"><Share2/></span><span><strong>Share the Android app</strong><small>Send the APK directly to a friend</small></span><ChevronRight/></button>
            <button onClick={()=>setSheet('updates')}><span className="option-icon"><Download/></span><span><strong>App updates</strong><small>Check and download the latest version</small></span><ChevronRight/></button>
            <button onClick={()=>setSheet('join')}><span className="option-icon"><Gamepad2/></span><span><strong>Join a room</strong><small>Enter a six-character invitation code</small></span><ChevronRight/></button>
            <button onClick={()=>setSheet('help')}><span className="option-icon"><BookOpen/></span><span><strong>How to play together</strong><small>Install, invite and start playing</small></span><ChevronRight/></button>
            <button onClick={()=>setSheet('about')}><span className="option-icon"><Shield/></span><span><strong>About Antarctic Kingdoms</strong><small>Version {APP_VERSION} · Seven games</small></span><ChevronRight/></button>
          </div>
        </>}
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">{tabs.map(([key,label,Icon])=><button key={key} className={tab===key?'active':''} onClick={()=>setTab(key)} aria-current={tab===key?'page':undefined}><span><Icon size={24} strokeWidth={tab===key?2.6:1.8}/></span><small>{label}</small></button>)}</nav>
      <CompanionDock companion={companion} onOpen={openCamp} onSettings={()=>setSheet('mascot-settings')} hidden={!!sheet||chatOpen}/>
    </>}

    {screen==='room'&&room&&<>
      <header className="page-header"><button className="icon-btn" aria-label="Back to games" onClick={()=>setScreen('lobby')}><ArrowLeft/></button><h1>{game(room.tableId).name}</h1><button className="icon-btn blue" aria-label="Share invitation" onClick={shareRoom}><Share2/></button></header>
      <main className="room-content"><div className={`connection ${connection!=='online'?'waiting':''}`}>{connection==='online'?<Wifi size={15}/>:<WifiOff size={15}/>} {inviteStatus}</div><p className="eyebrow">YOUR PRIVATE TABLE</p><button className="room-code" onClick={()=>copy(room.roomCode)} aria-label="Copy room code">{room.roomCode}<Copy size={20}/></button><p className="center muted">Send this code to your friends, or share the invitation.</p><button className="primary full" onClick={shareRoom}><Share2 size={18}/> Invite friends</button>
        <div className="room-seats">{currentRoomSeats.map(color=>{const player=room.players.find(p=>p.seat===color);return <div className="room-seat" key={color}><Avatar color={color} gameId={room.tableId} size={48} online={!!player?.connected}/><span><strong>{player?.name||'Waiting for a friend'}</strong><small>{seatName(room.tableId,color)}{player?.id===profile.id?' · You':''}</small></span>{player?.ready?<span className="ready"><Check size={16}/>Ready</span>:player?<span className="not-ready">Not ready</span>:<span className="open-seat">Open</span>}</div>;})}</div>
        {room.status==='waiting'?<div className="room-actions"><button className={me?.ready?'secondary full':'primary full'} disabled={busy||connection!=='online'} onClick={()=>run(()=>command('ap_room_ready',{ready:!me?.ready}))}>{me?.ready?<><Check size={18}/> You’re ready</>:'I’m ready'}</button>{room.hostId===profile.id&&<><button className="primary full" disabled={busy||connection!=='online'||room.players.some(p=>!p.ready)||room.players.length<currentRoomSeats.length} onClick={()=>run(async()=>{await command('ap_room_start');setScreen('match');})}><Play size={18}/> Start game</button>{room.players.length<currentRoomSeats.length&&<button className="text-button" disabled={busy||room.players.some(p=>!p.ready)||connection!=='online'} onClick={()=>run(async()=>{await command('ap_room_start',{fillWithBots:true});setScreen('match');})}>Fill empty seats with bots & start</button>}</>}</div>:<button className="primary full" onClick={()=>setScreen('match')}>Return to the board</button>}
        {room.status!=='waiting'&&<p className="muted center">The match has started. Your seat is saved on this phone.</p>}
        <section className="room-chat"><h3>Table chat</h3>{(room.chat||[]).slice(-6).map(message=><p key={message.id}><strong style={{color:COLORS[message.seat]}}>{message.name}: </strong>{message.text}</p>)}<form className="inline-form" onSubmit={e=>{e.preventDefault();if(!chatText.trim())return;run(async()=>{await command('ap_room_chat',{text:chatText});setChatText('');});}}><input value={chatText} onChange={e=>setChatText(e.target.value)} maxLength={500} placeholder="Say hello…" aria-label="Table message"/><button className="primary" type="submit" disabled={busy||connection!=='online'} aria-label="Send message"><Send size={20}/></button></form></section>
        <CompanionDock companion={companion} onOpen={openCamp} onSettings={()=>setSheet('mascot-settings')} inline hidden={!!sheet||chatOpen}/>
        <button className="text-button danger" onClick={()=>setSheet('leave')}>Leave table</button>
      </main>
    </>}

    {screen==='match'&&state&&<>
      <header className="match-header"><button className="icon-btn" aria-label="Back to games" onClick={()=>{setScreen('lobby');setTab('home');}}><ArrowLeft size={24}/></button><div><h1>{definition.name}</h1><small>{online?`Room ${room.roomCode} · ${inviteStatus}`:local.mode==='hotseat'?'On this phone':'Practice with casual bots'}</small></div><button className="icon-btn" aria-label="Match options" onClick={()=>setSheet('options')}><MoreHorizontal/></button></header>
      <div className={`players-strip ${definition.players===4?'four-players':''}`}>{definition.seats.map(color=>{const player=online?room.players.find(p=>p.seat===color):{name:local.mode==='hotseat'?`${seatName(id,color)} player`:local.humans.includes(color)?profile.name:`${seatName(id,color)} bot`,bot:local.mode!=='hotseat'&&!local.humans.includes(color)};const eliminated=state.eliminatedTeams?.includes(color),current=turn(state)===color&&!outcome;return <div className={`player-pill ${current?'current':''} ${eliminated?'eliminated':''}`} key={color}><Avatar color={color} gameId={id} size={36} online={online&&!!player?.connected}/><span><strong>{player?.name||seatName(id,color)}</strong><small>{eliminated?'Eliminated':current?(canAct?'Your turn':thinking?'Thinking…':`${seatName(id,color)}’s turn`):player?.bot?'Bot':seatName(id,color)}</small></span></div>;})}</div>
      {online&&connection!=='online'&&<button className="offline-banner" onClick={()=>run(()=>roomClient.connect())}><WifiOff size={15}/> Connection interrupted. Tap to reconnect.</button>}
      <main className={`match-content ${id==='dominion'?'dominion-match':''}`}>{id==='dominion'&&!outcome&&<DiceTray state={state} legal={legal} canAct={canAct} onAction={commit}/>}<div className="match-board-wrap"><Board id={id} state={state} legal={legal} selected={selected} suggested={suggested} trail={trail} onSelect={setSelected} onTarget={target} canAct={canAct}/></div>
        <section className="command-area">
          {local?.guide&&!online&&<div className="first-move-guide" role="status">{companion.preferences.mode!=='off'&&<img className="guide-face" src={GUIDES[GAME_HERITAGE[id].host].image} alt={GUIDES[GAME_HERITAGE[id].host].name}/>}<span><strong>{id==='dominion'&&!state.dice.rolled?'1. Roll both dice':selected?`${id==='dominion'?'3':'2'}. Choose a highlighted destination`:`${id==='dominion'?'2':'1'}. Select the piece with the gold ring`}</strong><small>{id==='dominion'&&!state.dice.rolled?'The dice activate pieces for this turn. Each die permits one move.':selected?'Blue dots are empty legal destinations. Orange rings mark captures.':'This is an offline learning table. Every highlighted move follows the real rules.'}</small></span></div>}
          {outcome?<div className="result-card"><strong>{outcome.draw?'Draw':`${seatName(id,outcome.winner)} wins`}</strong><span>{outcome.reason}</span><button onClick={()=>online?setScreen('room'):setSheet('restart')}>{online?'Return to table':'Play again'}</button></div>:<>
            <div className="turn-line"><span className={`turn-dot ${checked?'check':''}`} style={{background:COLORS[turn(state)]}}/><strong>{checked?`${turnName} is in check`:thinking?'Thinking…':canAct?(online||local.mode!=='hotseat'?'Your turn':`${turnName} to move`):`${turnName} to move`}</strong><button aria-label="Read game rules" onClick={()=>{setPicked(id);setSheet('rules');}}><BookOpen size={17}/></button></div>
            <p className="selection-hint">{loadingLegal?'Checking the position…':selectedUnit?`${selectedUnit.label} · ${selectedActions.length} legal ${selectedActions.length===1?'action':'actions'}`:canAct?id==='dominion'&&!state.dice.rolled?'Roll both dice to activate your pieces.':'Tap a piece to see its legal moves.':thinking?'Your practice opponent is choosing a move.':'Waiting for the other player.'}</p>
            {trail&&!selected&&<p className="last-move-note">Last move: {trail.label}. Gold rings mark its move.</p>}
            {pocket.length>0&&<div className="hand-dock" aria-label="Captured pieces in hand">{pocket.map(p=><button className={selected===p.source?'selected':''} key={p.source} disabled={!canAct} onClick={()=>setSelected(p.source)} aria-label={`Drop ${p.label}, ${p.count} in hand`}><img src={p.sprite} alt=""/><small>{p.count>1?`×${p.count}`:p.label}</small></button>)}</div>}
            {selectedActions.some(a=>a.kind==='illuminate')&&<button className="primary" disabled={!canAct} onClick={()=>commit(selectedActions.find(a=>a.kind==='illuminate'))}>Illuminate exposed pieces</button>}
            {selectedActions.length>0&&<div className="destinations" aria-label="Legal destinations">{selectedActions.filter((a,index,list)=>a.target&&list.findIndex(b=>b.target===a.target)===index).map(a=><button disabled={!canAct} key={a.target} onClick={()=>target(a.target)}>{a.kind==='castle'?'Castle → ':visible.some(p=>p.cell===a.target)?'Capture → ':'Move → '}{a.target}</button>)}</div>}
            {state.alliance&&<p className="alliance-note">Alliance: {state.alliance.map(color=>seatName(id,color)).join(' + ')}</p>}
            {state.hanOwner&&<p className="alliance-note gold">Han is controlled by {seatName(id,state.hanOwner)}. Yellow pieces keep their original artwork.</p>}
          </>}
          <CompanionDock companion={companion} onOpen={openCamp} onSettings={()=>setSheet('mascot-settings')} inline hidden={!!sheet||chatOpen||!!promotion}/>
        </section>
      </main>
      <footer className="chat-bar"><button aria-label="Open table chat" onClick={()=>setChatOpen(true)}><MessageCircle size={23}/>{currentChats.length>0&&<i/>}</button><form onSubmit={sendChat}><input value={chatText} onChange={e=>setChatText(e.target.value)} onFocus={()=>setChatOpen(true)} placeholder={online?'Say hello…':'Notes on this phone…'} aria-label="Chat message" maxLength={500}/><button type="submit" disabled={busy||!chatText.trim()||(online&&connection!=='online')} aria-label="Send message"><Send size={23}/></button></form></footer>
    </>}

    {chatOpen&&screen==='match'&&<Sheet title={online?'Table chat':'Table notes'} onClose={()=>setChatOpen(false)}><p className="muted">{online?'Only the players in this private room can read this conversation.':'These notes are saved for this session on this phone.'}</p><div className="chat-history">{currentChats.length?currentChats.map(message=><article className={`chat-message ${message.playerId===profile.id?'mine':''}`} key={message.id}><strong style={{color:COLORS[message.seat]}}>{message.name}</strong><p>{message.text}</p><time>{new Date(message.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></article>):<div className="empty compact"><MessageCircle/><p>Say hello and enjoy the game.</p></div>}<div ref={chatEnd}/></div><form className="inline-form" onSubmit={sendChat}><input value={chatText} onChange={e=>setChatText(e.target.value)} autoFocus placeholder={online?'Message your table…':'Write a note…'} maxLength={500} aria-label="Chat message"/><button type="submit" className="primary" aria-label="Send message" disabled={busy||!chatText.trim()||(online&&connection!=='online')}><Send size={20}/></button></form></Sheet>}
    {sheet==='game'&&<Sheet title={game(picked).name} onClose={()=>setSheet(null)}><HeritageLabel id={picked} onClick={()=>setSheet('heritage')}/><div className="game-sheet-heading"><img src={asset(game(picked).icon)} alt=""/><div><p>{game(picked).subtitle}</p><small>{game(picked).players} players · {openingText(picked)}</small></div></div><button className="learn-mode-row" onClick={()=>openLearning(picked)}><BookOpen size={22}/><span><strong>How to play</strong><small>Learn with the mascots · try the pieces</small></span><ChevronRight size={20}/></button><label className="field-label">Your seat</label><div className="seat-choice">{game(picked).seats.map(color=><button key={color} className={seat===color?'selected':''} onClick={()=>setSeat(color)}><i style={{background:COLORS[color]}}/>{seatName(picked,color)}</button>)}</div><button className="mode-row" disabled={busy} onClick={()=>run(createRoom)}><span className="mode-icon"><Users/></span><span><strong>Play with friends</strong><small>Create a private room and share the code</small></span><ChevronRight/></button><button className="mode-row" disabled={busy} onClick={()=>setSheet('join')}><span className="mode-icon"><Gamepad2/></span><span><strong>Join a room</strong><small>Have an invitation? Enter its code</small></span><ChevronRight/></button><button className="mode-row" disabled={busy} onClick={()=>run(()=>startPractice('bots'))}><span className="mode-icon warm"><Play/></span><span><strong>Practice with bots</strong><small>Play offline at your own pace</small></span><ChevronRight/></button><button className="mode-row" disabled={busy} onClick={()=>run(()=>startPractice('hotseat'))}><span className="mode-icon warm"><User/></span><span><strong>On this phone</strong><small>Pass the phone between players</small></span><ChevronRight/></button>{read(`practice.${picked}`,null)&&<button className="text-button" onClick={()=>resumePractice(picked)}>Continue saved practice</button>}<button className="text-button" onClick={()=>setSheet('quickstart')}><BookOpen size={17}/>Quick start & first move</button><button className="text-button" onClick={()=>setSheet('rules')}><BookOpen size={17}/>Read the rules</button></Sheet>}
    {sheet==='join'&&<Sheet title="Join a room" onClose={()=>setSheet(null)}><p className="muted">Enter the room code, or paste the full invitation your friend shared.</p><form onSubmit={e=>{e.preventDefault();run(()=>joinRoom(joinCode));}}><label className="field-label" htmlFor="room-code">Room code</label><input className="code-input" id="room-code" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6))} autoCapitalize="characters" autoCorrect="off" spellCheck="false" autoComplete="off" placeholder="ABC234" maxLength={6} onPaste={e=>{e.preventDefault();const code=parseInvitation(e.clipboardData.getData('text'));if(code)setJoinCode(code);else notify('Paste a valid room code or Antarctic Kingdoms invitation.');}}/><button className="primary full" type="submit" disabled={busy||joinCode.length!==6}>Join table <ChevronRight size={18}/></button></form><p className="muted center">Your name at the table: <strong>{profile.name}</strong></p></Sheet>}
    {sheet==='name'&&<Sheet title="Your profile" onClose={()=>setSheet(null)}><div className="avatar-picker">{['blue','green','red'].map(color=><button className={profile.avatar===color?'selected':''} aria-label={`${color} avatar`} key={color} onClick={()=>{const next={...profile,avatar:color};setProfile(next);write('profile',next);}}><Avatar color={color} size={72}/></button>)}</div><label className="field-label" htmlFor="display-name">Display name</label><input className="text-input" id="display-name" value={nameDraft} onChange={e=>setNameDraft(e.target.value)} maxLength={24} autoComplete="nickname"/><button className="primary full" onClick={updateProfile}>Save profile</button><p className="muted center">No sign-up. Just a name and a game.</p></Sheet>}
    {sheet==='quickstart'&&<Sheet title={`${game(picked).name}: quick start`} onClose={()=>setSheet(null)}><HostNote id={picked} enabled={companion.preferences.mode!=='off'}/><button className="learn-mode-row" onClick={()=>openLearning(picked)}><BookOpen size={22}/><span><strong>How to play with the mascots</strong><small>Little lessons, piece guides and a free board</small></span><ChevronRight size={20}/></button><div className="quickstart-cover"><CoverArt id={picked} boardPreview/><span>{GAME_PRESENTATION[picked].shape}</span></div><p className="quickstart-goal"><strong>Your goal</strong>{GAME_PRESENTATION[picked].goal}</p><ol className="quickstart-steps">{GAME_PRESENTATION[picked].tips.map(tip=><li key={tip}>{tip}</li>)}</ol><button className="primary full" disabled={busy} onClick={()=>run(()=>startPractice('hotseat',true))}>Try your first move</button><button className="text-button" onClick={()=>setSheet('rules')}>Read the complete rules <ChevronRight size={17}/></button></Sheet>}
    {sheet==='heritage'&&<Sheet title="Origins & this edition" onClose={()=>setSheet(null)}><HeritageDetails id={picked}/><button className="primary full" onClick={()=>setSheet('quickstart')}>Learn your first move</button><button className="text-button" onClick={()=>setSheet('game')}>Back to game</button></Sheet>}
    {sheet==='rules'&&<Sheet title={`${game(picked).name} rules`} onClose={()=>setSheet(null)} wide><HeritageLabel id={picked} onClick={()=>setSheet('heritage')}/><button className="learn-mode-row" onClick={()=>openLearning(picked)}><BookOpen size={22}/><span><strong>Try the little lessons</strong><small>Learn on a separate teaching board</small></span><ChevronRight size={20}/></button><div className="rulebook">{RULES[picked].map(chapter=><section key={chapter.title}><h3>{chapter.title}</h3>{chapter.paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}</section>)}<p className="muted">This app uses the same rule engines as Arctic Dominion’s Heritage Arcade. Legal highlights include all restrictions and special actions.</p></div></Sheet>}
    {sheet==='options'&&<Sheet title="Your game" onClose={()=>setSheet(null)}><button className="mode-row" onClick={()=>openLearning(id)}><BookOpen/><span><strong>How to play</strong><small>Lessons, pieces and a separate free board</small></span><ChevronRight/></button><button className="mode-row" onClick={()=>{setPicked(id);setSheet('rules');}}><BookOpen/><span><strong>Rules & piece guide</strong><small>{definition.name}</small></span><ChevronRight/></button>{online?<><button className="mode-row" onClick={()=>{setSheet(null);setScreen('room');}}><Users/><span><strong>Private table</strong><small>Room {room.roomCode}</small></span><ChevronRight/></button><button className="mode-row" onClick={shareRoom}><Share2/><span><strong>Share room invitation</strong><small>Friends can rejoin their saved seats</small></span><ChevronRight/></button><button className="mode-row danger" onClick={()=>setSheet('leave')}><LogOut/><span><strong>Leave this match</strong><small>{['sannin','sanyou','dominion'].includes(id)?'A bot takes over your seat':'Resign from the game'}</small></span><ChevronRight/></button></>:<><button className="mode-row" onClick={undo} disabled={!local.history.length}><Undo2/><span><strong>Undo your last turn</strong><small>Available in offline practice</small></span><ChevronRight/></button><button className="mode-row" onClick={()=>setSheet('restart')}><RotateCcw/><span><strong>New game</strong><small>Start again with the same seats</small></span><ChevronRight/></button>{thinking&&<button className="text-button" onClick={()=>{worker.current?.terminate();worker.current=null;setRefresh(n=>n+1);}}>Retry bot move</button>}</>}</Sheet>}
    {sheet==='leave'&&<Sheet title="Leave this table?" onClose={()=>setSheet(null)}><p>{room?.status==='playing'?['sannin','sanyou','dominion'].includes(room.tableId)?'A casual bot will take over your seat. This cannot be undone.':'You will resign from this match. The other players can continue.':'Your seat will become available to another friend.'}</p><p className="muted">To pause and come back, use the back arrow instead. Your seat stays saved on this phone.</p><button className="primary full danger-bg" disabled={busy} onClick={()=>run(leave)}>Leave table</button><button className="secondary full" onClick={()=>setSheet(null)}>Keep my seat</button></Sheet>}
    {sheet==='restart'&&<Sheet title="Start a new game?" onClose={()=>setSheet(null)}><p>Your current practice position will be replaced.</p><button className="primary full" onClick={restart}>Start new game</button><button className="secondary full" onClick={()=>setSheet(null)}>Keep playing</button></Sheet>}
    {sheet==='help'&&<Sheet title="Play together" onClose={()=>setSheet(null)}><ol className="help-steps"><li>Install the signed Antarctic Kingdoms APK on each Android phone. Allow your file or messaging app to install it when Android asks.</li><li>Choose your display name in Profile. Open Games and select a game from the seven-game collection.</li><li>Tap Play with friends. Share the invitation or the six-character room code.</li><li>Your friends tap Join room and enter the code. Everyone taps I’m ready, then the host starts the game.</li><li>Invite two friends for three-player games, or three friends for Arctic Dominion. You can fill empty seats with casual bots.</li><li>Use the table chat while playing. Your seat is saved for reconnecting on this phone.</li></ol><p className="muted">Online rooms need an internet connection. Practice and games on one phone work offline. Share the APK from Profile → Share the Android app.</p></Sheet>}
    {sheet==='updates'&&<Sheet title="App updates" onClose={()=>setSheet(null)}><AppUpdates/></Sheet>}
    {sheet==='companions'&&<Sheet title="Your mascot companions" onClose={()=>setSheet(null)}><CompanionCamp companion={companion} onSettings={()=>setSheet('mascot-settings')} exploreLabel={screen==='lobby'?'Find a game together':screen==='match'?'Back to my game':'Back to my table'} onExplore={()=>{setSheet(null);if(screen==='lobby')setTab('games');}}/></Sheet>}
    {sheet==='mascot-settings'&&<Sheet title="Mascot companions" onClose={()=>setSheet(null)}><CompanionSettings companion={companion} onMeet={()=>openCamp(companion.preferences.guide==='auto'?'polly':companion.preferences.guide)}/></Sheet>}
    {sheet==='about'&&<Sheet title="Antarctic Kingdoms" onClose={()=>setSheet(null)}><div className="about-brand"><img src={BRAND.icon} alt="Antarctic Kingdoms penguin game-piece emblem"/><h3>{BRAND.tagline}</h3><p>{BRAND.company}</p></div><p>The Frozen Archive is a fictional Antarctic home for the world’s strategy games. Our penguin guides help you discover them; each game keeps its own origins and chosen rules.</p><p>Shogi, Sannin Shogi, Sanguo Qi, San You Qi, Sanguo Yan Yi Qi, Xiangqi and Arctic Dominion (Chaturanga), in a separate Android app designed for phones.</p><p>Your display name, avatar, saved seats, favorites and practice games stay in the app’s storage. Online room moves and messages are held by the game server. Room credentials authenticate your seat; keep your phone’s app data to reconnect.</p><p>The app requests internet access. It does not request contacts, location, camera or storage permissions. Sharing uses Android’s share sheet.</p><p>Previously Arctic Play. Your existing profile, favorites, saved games and room invitations continue here. Arctic Dominion remains the name of our four-kingdom game.</p><p className="muted">Version {APP_VERSION}. Android 7.0 and newer. Casual bots are for practice.</p></Sheet>}
    {promotion&&<Sheet title={id==='dominion'?'Choose your die':'Choose your move'} onClose={()=>setPromotion(null)}><p>This destination has more than one legal action.</p>{promotion.map(a=><button className="primary full" key={a.id} onClick={()=>commit(a)}>{id==='dominion'?`Use die ${a.raw.dieIndex+1} (${state.dice.values[a.raw.dieIndex]})`:a.kind==='castle'?'Castle':a.promote?'Promote':'Keep unpromoted'}</button>)}</Sheet>}
    {notice&&<div className="toast" role="status" onClick={()=>setNotice('')}>{notice}</div>}
    {busy&&<div className="busy-indicator" role="status"><span/> {connection==='connecting'?'Connecting to your table…':'One moment…'}</div>}
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
