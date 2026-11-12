import {CompactGamePanel,CompactInfoPanel,CompactRoomPanel} from '../../../shared/compact-panels/CompactGamePanels.jsx';
import {ShanshuiMobile} from './ShanshuiMobile.jsx';
import {CulturalGames,GameIntroduction,InstallWebApp,useLaunchVisit} from './LaunchExperience.jsx';
import {StoryAdventureGallery,AllGamesGallery} from './GamesViews.jsx';
import {PublicKingdomPreview} from './PublicKingdomPreview.jsx';
import {VictoryCelebration} from './VictoryCelebration.jsx';
import {PhysicalCollection} from './PhysicalCollection.jsx';
import {LaunchDashboard} from './LaunchDashboard.jsx';
import {CoTuLenhMobile} from './CoTuLenhMobile.jsx';
import {secureUuid} from './uuid.js';
import {useGameAssetWarmup} from './gameAssets.js';
import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Home,Users,ShoppingBag,Gamepad2,MessageCircle,User,ArrowLeft,ChevronRight,Heart,Plus,Search,X,Send,MoreHorizontal,Share2,Copy,BookOpen,Wifi,WifiOff,RotateCcw,Undo2,Check,Download,LogOut,Settings,Clock,Shield,Play,Volume2,Moon,Sun} from 'lucide-react';
import {GAME_LIST,game,create,actions,apply,result,turn,hand,pieces,inCheck,COLORS,asset,seatName,RULES,VERSION,forfeit} from './games.ts';
import {Board} from './Board.jsx';
import {BoardCalibrator} from './BoardCalibrator.jsx';
import {matchPerspective} from './boardView.js';
import {DiceTray,DominionTurnPrompt,DominionRollGuide,usePostRollHelp,rollActionId} from './DiceTray.jsx';
import {LONG_DICE_PROFILE,needsKingReturn} from './chaturangaLongDice.js';
import {ChaturangaBoardSpace} from './ChaturangaRelease.jsx';
import {roomClient,INVITE_ROOT,WEB_APP_URL,requireServiceFeature,browserRoomLink,bindRoomLifecycle} from './network.js';
import {DOMINION_TEAMS,teamFor,teamName,teamGame} from './dominionTeams.js';
import {read,write,getProfile,saveRoom,forgetRoom} from './storage.js';
import {RuleClient} from './ruleClient.js';
import {CoverArt} from './CoverArt.jsx';
import {AppUpdates} from './AppUpdates.jsx';
import {useRequiredUpdate,RequiredUpdate,HeaderControls,BrowserUpdates} from './RequiredUpdate.jsx';
import {GameTitle} from './GameTitle.jsx';
import {chronologicalGames} from './gameHistory.js';
import {APP_VERSION,GAME_PRESENTATION,describeTransition,parseInvitation} from './presentation.js';
import {BRAND,GUIDES,GAME_HERITAGE,JOURNAL_KEY,recordDiscovery} from './brand.js';
import {KingdomIntro,HostNote,HeritageLabel,HeritageDetails,ArchiveJournal,GuideCollection} from './Kingdom.jsx';
import {HowToPlay} from './HowToPlay.jsx';
import {DailyPuzzleExperience,MemoryArchive,ReactionPicker,ReactionContent,PostcardView} from './CompanionFeatures.jsx';
import {dailyPuzzle,reactionText} from './companionJourney.js';
import {firstSteps,firstProgress,START_KEY} from './firstJourney.js';
import {useCompanions,CompanionDock,CompanionCamp,CompanionSettings,MascotAppearanceContext} from './Companions.jsx';
import {finishCompanionEvent} from './companions.js';
import {ExpeditionEntry,FrozenLibrary,ReplayLibrary,FriendChallenge} from './ExpeditionFeatures.jsx';
import {CollectionEntry,CampCollection} from './CampCollection.jsx';
import {useCollectionAppearance} from './collections.js';
import {CampStudio} from './CampStudio.jsx';
import {illustratedText} from './collectionModel.js';
import {AccountPanel} from './AccountPanel.jsx';
import {FairPlayHub} from './FairPlayHub.jsx';
import {AccountEntry} from './AccountEntry.jsx';
import {AntarcticVisaEntry,useVisaPassport,VisaPassportSummary} from './AntarcticVisaEntry.jsx';
import {usePlayAccess} from './usePlayAccess.js';
import {startCloud,signOutCloud} from './cloud.js';
import {NextDiscovery,DiscoveryJourney,MatchDiscovery,AfterMatchDiscovery} from './DiscoveryJourney.jsx';
import discovery from './discoveryModel.cjs';
import {HomeLanding} from './HomeLanding.jsx';
import {RoomCodeInput} from './RoomCodeInput.jsx';
import {ChatCamp} from './ChatCamp.jsx';
import {PassportHub,PassportIcon} from './PassportBook.jsx';
import {PassportWallet} from './PassportWallet.jsx';
import {CELEBRATION_ART,HALL_ART,festivalStickerText} from './celebration.js';
import {FestivalStickerAlbum} from './FestivalStickers.jsx';
import {HallCard,HallDetail,StoryAdventure,LanternPassport,OpeningStory,GatheringInterlude,EighthLantern,WorldGuide,GatheringSettings} from './Gathering.jsx';
import {useHallAccess,UNLOCKS} from './useHallAccess.js';
import {JourneyBar,LockedHall,FormationRoute,AccessShop,HallOpened} from './HallUnlocks.jsx';
import {FoundationGame} from './FoundationGame.jsx';
import {HALLS,HALL_ORDER,WORLD,GATHERING_KEY,STORY_SETTINGS_KEY,gatheringProgress,visitHall,earnLantern,revealGathering,storySettings,hallPostcard,guestPostcard,hallInvitation} from './gathering.js';

const tabs=[['home','Home',Home],['games','Games',Gamepad2],['shop','Shop',ShoppingBag],['chats','Chats',MessageCircle],['profile','Passport',PassportIcon]];
const openingText=id=>`${seatName(id,game(id).seats[0])} ${id==='dominion'?'rolls':'moves'} first`;
const Avatar=({color='blue',size=42,name='',online=false,gameId})=><span className="avatar" style={{width:size,height:size}}><img src={asset(gameId==='dominion'?`launch-v1/chaturanga-pieces/${color==='yellow'?'pink':color}-frost-king.webp`:`tokens/token-sanguo-${color==='black'?'blue':color}-general.webp`)} alt={name||'Player avatar'}/>{online&&<i/>}</span>;
function DominionSetup({mode,onMode,seat,onSeat}){
  const alliance=teamFor(seat)||teamFor('red');
  const seats=mode==='2v2'?alliance.seats:game('dominion').seats;
  return <div className="dominion-setup"><fieldset><legend>Game mode</legend><div className="seat-choice"><button type="button" aria-pressed={mode==='free-for-all'} className={mode==='free-for-all'?'selected':''} onClick={()=>onMode('free-for-all')}>Four-way</button><button type="button" aria-pressed={mode==='2v2'} className={mode==='2v2'?'selected':''} onClick={()=>onMode('2v2')}>2v2 teams</button></div></fieldset>{mode==='2v2'&&<><fieldset><legend>Your team</legend><div className="seat-choice">{DOMINION_TEAMS.map(team=><button type="button" key={team.id} aria-pressed={alliance.id===team.id} className={alliance.id===team.id?'selected':''} onClick={()=>onSeat(team.seats.includes(seat)?seat:team.seats[0])}>{team.name}</button>)}</div></fieldset><p className="muted">Opposite kingdoms are partners. No friendly captures. Defeat both rival royal Frost Kings to win together.</p></>}<fieldset><legend>Your kingdom</legend><div className="seat-choice">{seats.map(color=><button type="button" key={color} aria-pressed={seat===color} className={seat===color?'selected':''} onClick={()=>onSeat(color)}><i style={{background:COLORS[color]}}/>{seatName('dominion',color)}</button>)}</div></fieldset></div>;
}
function Sheet({title,onClose,children,wide=false,focusId}){
  const panel=useRef(null),close=useRef(onClose);close.current=onClose;
  useEffect(()=>{const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[]);
  useEffect(()=>{
    const previous=document.activeElement;
    (focusId?panel.current?.querySelector('#'+focusId):panel.current?.querySelector('[aria-label="Close"]'))?.focus({preventScroll:true});
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
  },[focusId]);
  return <div className="overlay" role="presentation" onClick={onClose}><section ref={panel} className={`sheet ${wide?'wide':''}`} role="dialog" aria-modal="true" aria-label={title} onClick={e=>e.stopPropagation()}><div className="sheet-grip"/><header><h2>{title}</h2><button className="icon-btn" aria-label="Close" onClick={onClose}><X/></button></header>{children}</section></div>;
}

function App(){
  useLaunchVisit();
  const [introduction,setIntroduction]=useState(null);
  const [publicPreview,setPublicPreview]=useState(()=>!window.Android&&new URLSearchParams(location.search).get('preview')==='1');
  const enterPublicPreview=()=>{if(window.Android)return;const url=new URL(location.href);url.searchParams.set('preview','1');history.replaceState(null,'',url.pathname+url.search+url.hash);setPublicPreview(true);};
  const exitPublicPreview=()=>{const url=new URL(location.href);url.searchParams.delete('preview');history.replaceState(null,'',url.pathname+url.search+url.hash);setPublicPreview(false);};
  const assetStatus=useGameAssetWarmup();
  useEffect(startCloud,[]);
  useEffect(()=>{const update=()=>setJournal(read(JOURNAL_KEY,{}));window.addEventListener('arctic-cloud-progress',update);return()=>window.removeEventListener('arctic-cloud-progress',update);},[]);
  const collection=useCollectionAppearance();
  useEffect(()=>{window.arcticCampRestore=()=>setSheet('collection');return()=>delete window.arcticCampRestore;},[]);
  const [profile,setProfile]=useState(getProfile),[tab,setTab]=useState('home'),[screen,setScreen]=useState('lobby');
  const playAccess=usePlayAccess();
  const visa=useVisaPassport(playAccess);
  const hallAccess=useHallAccess(profile.id,playAccess.offlineEntitlements);
  const goalKey='discovery-target.v1.'+(playAccess.accountId||'device');
  const [discoveryTarget,setDiscoveryTarget]=useState(()=>read(goalKey,null));
  useEffect(()=>setDiscoveryTarget(read(goalKey,null)),[goalKey]);
  function chooseDiscovery(gameId){if(discovery.ORDER.includes(gameId)){setDiscoveryTarget(gameId);write(goalKey,gameId);}}
  function showJourney(){setSheet('journey');}
  const [formationTarget,setFormationTarget]=useState(null),[accessProduct,setAccessProduct]=useState(null),[justOpened,setJustOpened]=useState([]);
  const [pendingInvite,setPendingInvite]=useState(()=>read('hall-pending-invite',null));
  const previousAccess=useRef({scope:hallAccess.scope,progress:hallAccess.progress}),verifiedMatches=useRef(new Set()),proofClient=useRef(null);
  if(!proofClient.current)proofClient.current=new RuleClient();
  function openLocked(gameId){setPicked(gameId);setSheet('unlock');}
  function gate(gameId){if(!playAccess.allowed)return false;if(hallAccess.allowed(gameId).open)return true;openLocked(gameId);return false;}
  function formations(gameId=null){setFormationTarget(gameId);setSheet('formations');}
  function accessShop(product=null){setAccessProduct(product);setSheet('access-shop');}
  function saveInvitation(value){setPendingInvite(value);write('hall-pending-invite',value);}
  useEffect(()=>{const saved=read('hall-pending-invite',null);if(saved?.code)setJoinCode(saved.code);},[]);
  useEffect(()=>{const previous=previousAccess.current;previousAccess.current={scope:hallAccess.scope,progress:hallAccess.progress};if(previous.scope!==hallAccess.scope){setJustOpened([]);return;}const opened=UNLOCKS.GAME_IDS.filter(id=>!UNLOCKS.earned(id,previous.progress)&&UNLOCKS.earned(id,hallAccess.progress));if(opened.length){setJustOpened(opened);setSheet('hall-opened');}},[hallAccess.revision]);
  const [theme,setTheme]=useState(()=>read('theme','dark')==='light'?'light':'dark');
  const update=useRequiredUpdate();
  const toggleTheme=()=>setTheme(current=>current==='dark'?'light':'dark');
  const [shanshuiInvite,setShanshuiInvite]=useState('');
  const [filter,setFilter]=useState('All'),[gamesView,setGamesView]=useState('story'),[favorites,setFavorites]=useState(()=>read('favorites',[]));
  const [challengeId,setChallengeId]=useState(null);
  useEffect(()=>{window.arcticChallenge=value=>{if(/^[A-Za-z0-9_-]{24}$/.test(value)){setChallengeId(value);setSheet('friend-challenge');}};return()=>delete window.arcticChallenge;},[]);
  const [puzzle,setPuzzle]=useState(null),[postcard,setPostcard]=useState(null),reactionAt=useRef(0);
  const [sheet,setSheet]=useState(null),[picked,setPicked]=useState('shogi'),[seat,setSeat]=useState('red');
  useEffect(()=>{const open=()=>setSheet('wallet');window.addEventListener('ak-open-wallet',open);return()=>window.removeEventListener('ak-open-wallet',open);},[]);
  const [boardToolsTarget,setBoardToolsTarget]=useState(null);
  const [dominionConfirm,setDominionConfirm]=useState(false),[dicePending,setDicePending]=useState(false),diceLock=useRef(false),turnPromptSeen=useRef(null),diceContext=useRef(null);
  const [dominionMode,setDominionMode]=useState('2v2'),[roomPostcardDraft,setRoomPostcardDraft]=useState(null);
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
  const [gathering,setGathering]=useState(()=>gatheringProgress(read(GATHERING_KEY,{}),read(JOURNAL_KEY,{})));
  const [storyOptions,setStoryOptions]=useState(()=>storySettings(read(STORY_SETTINGS_KEY,{})));
  const [storyLesson,setStoryLesson]=useState(null);
  const world=useMemo(()=>gatheringProgress(gathering,journal),[gathering,journal]);
  function saveGathering(next){write(GATHERING_KEY,next);setGathering(next);}
  function saveStoryOptions(next){const clean=storySettings(next);write(STORY_SETTINGS_KEY,clean);setStoryOptions(clean);}
  function openHall(gameId){if(!HALLS[gameId]||!gate(gameId))return;saveGathering(visitHall(gatheringProgress(read(GATHERING_KEY,{}),read(JOURNAL_KEY,{})),gameId));setPicked(gameId);setSheet('hall');}
  function openHallChallenge(gameId,mission=HALLS[gameId].challenges[0].mission){if(!gate(gameId))return;setStoryLesson({id:gameId,mission,returnScreen:screen==='story'?storyLesson?.returnScreen||'lobby':screen});setPicked(gameId);setSheet(null);setChatOpen(false);setScreen('story');}
  function closeHallChallenge(){const target=storyLesson?.returnScreen||'lobby';setScreen(target);if(target==='lobby'&&tab==='profile')setSheet(null);else if(storyOptions.enabled)setSheet('hall');}
  function earnedAtTable(gameId){saveGathering(earnLantern(gatheringProgress(read(GATHERING_KEY,{}),read(JOURNAL_KEY,{})),gameId));}
  function openHallPostcard(gameId){if(world.halls[gameId]?.learnedAt){setPostcard(hallPostcard(gameId));setSheet('postcard');}}
  const ruleClient=useRef(null);if(!ruleClient.current)ruleClient.current=new RuleClient();
  const worker=useRef(null),workerSequence=useRef(0),roomRef=useRef(null),sessionRef=useRef(null),backRef=useRef(null),toastTimer=useRef(null),chatEnd=useRef(null);
  const notify=text=>{setNotice(text);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setNotice(''),5000);};
  const online=!!session&&!!room&&(screen==='match'||screen==='learn'&&academy?.returnScreen==='match');
  const id=online?room.tableId:local?.id;
  const state=online?room.gameState:local?.state;
  const definition=id?game(id):null;
  const outcome=state?result(state):null;
  const [victoryDismissed,setVictoryDismissed]=useState(false);
  useEffect(()=>{setVictoryDismissed(false);},[id,outcome?.winner,outcome?.draw,local?.matchId,room?.matchId]);
  const me=room?.players.find(p=>p.id===profile.id);
  const humans=online?room.players.filter(p=>!p.bot).map(p=>p.seat):local?.humans||[];
  const perspective=id?matchPerspective({id,online,seat:me?.seat,mode:local?.mode,humans,turn:state?.turn}):'red';
  const canAct=playAccess.allowed&&!!state&&!outcome&&!busy&&!loadingLegal&&!(online&&room?.fair?.pending)&&(online?connection==='online'&&me?.seat===turn(state):humans.includes(turn(state)));
  const pocket=useMemo(()=>state?hand(id,state):[],[id,state]);
  const visible=useMemo(()=>state?pieces(id,state):[],[id,state]);
  const selectedUnit=visible.find(p=>p.source===selected)||pocket.find(p=>p.source===selected);
  const selectedActions=legal.filter(a=>a.source===selected);
  const turnName=state?seatName(id,turn(state)):'';
  const suggested=local?.guide&&!online&&!selected?legal.find(a=>a.source.startsWith('piece:'))?.source:null;
  const resumable=Object.values(savedRooms).sort((a,b)=>b.at-a.at).find(saved=>game(saved.room.tableId)&&['waiting','playing'].includes(saved.room.status));
  const companion=useCompanions({screen,tab,gameId:id,gameName:definition?.name,online,roomCode:room?.roomCode,name:profile.name,journal,blocked:!!sheet||chatOpen||!!promotion||screen==='learn'||screen==='story'});
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
  useEffect(()=>bindRoomLifecycle(roomClient),[]);
  useEffect(()=>roomClient.listen(value=>{
    if(value.error){notify(value.error);return;}
    if(value.room?.roomCode===roomRef.current?.roomCode){
      receiveRoom(value.room);
    }
  }),[]);
  useEffect(()=>{roomRef.current=room;sessionRef.current=session;},[room,session]);
  useEffect(()=>{if(!session||!room||room.players.filter(p=>!p.bot).length<2)return;const next=gatheringProgress(read(GATHERING_KEY,{}),read(JOURNAL_KEY,{}));if(!next.friendVisitAt){next.friendVisitAt=Date.now();saveGathering(next);}},[session?.roomCode,room?.players.length]);
  useEffect(()=>{if(!id||!state||!outcome)return;const key=online?'room:'+room.roomCode:local?.matchId?'local:'+local.matchId:null;if(key)companion.finished(id,online?room.players.filter(p=>!p.bot).length>1:local?.mode==='hotseat'&&humans.length>1,key);},[id,online,!!outcome,room?.roomCode,local?.matchId]);
  useEffect(()=>{
    if(!outcome||online||local?.mode!=='bots'||local?.progressEligible===false||!local?.actionLog?.length||!UNLOCKS.destinations(id).length||!UNLOCKS.winningSeats(outcome).includes(local.humans?.[0])||verifiedMatches.current.has(local.matchId))return;
    verifiedMatches.current.add(local.matchId);
    const proof={id,matchId:local.matchId,seat:local.humans[0],actions:local.actionLog,eligible:true};
    const expectedScope=hallAccess.scope;
    proofClient.current.call('verify-progress',{proof}).then(value=>hallAccess.award(value.win,proof,expectedScope)).catch(()=>{});
  },[!!outcome,id,local?.matchId,online]);
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
  useLayoutEffect(()=>{document.documentElement.dataset.theme=theme;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#061a32':'#dceffb');window.Android?.setDarkTheme(theme==='dark');write('theme',theme);},[theme]);
  useLayoutEffect(()=>{if(screen==='lobby'){const scroller=document.scrollingElement||document.documentElement;scroller.scrollTop=0;scroller.scrollLeft=0;}},[tab,screen]);
  useEffect(()=>{chatEnd.current?.scrollIntoView({block:'nearest'});},[chatOpen,room?.chat?.length,localChat.length]);
  useEffect(()=>{
    window.arcticBack=()=>{if(document.dispatchEvent(new Event('ak-passport-back',{cancelable:true})))backRef.current?.();return true;};
    window.arcticJoin=code=>{const parsed=parseInvitation(code);if(!parsed){notify('Enter a valid Antarctic Kingdoms invitation.');return;}setJoinCode(parsed);setSheet('join');};
    window.Android?.appReady?.();
    window.ArcticStartup?.ready();
    const query=new URLSearchParams(location.search).get('room');
    if(query){
      const code=parseInvitation(query),saved=code&&read('rooms',{})[code];
      if(!window.Android&&saved?.session?.seatToken&&saved.session.playerId===profile.id){
        setJoinCode(code);run(async()=>{try{await joinRoom(code);}catch(error){setSheet('join');throw error;}});
      }else window.arcticJoin(query.toUpperCase());
    }
    return()=>{delete window.arcticBack;delete window.arcticJoin;};
  },[]);
  backRef.current=()=>{
    if(introduction){setIntroduction(null);return;}
    if(update.required)return;
    const learningClose=[...document.querySelectorAll('[data-learning-dialog] button[aria-label="Close"]')].at(-1);
    if(learningClose){learningClose.click();return;}
    if(promotion){setPromotion(null);return;}
    if(sheet){setSheet(null);return;}
    if(chatOpen){setChatOpen(false);return;}
    if(screen==='story'){closeHallChallenge();return;}
    if(screen==='learn'){setScreen(academy?.returnScreen||'lobby');return;}
    if(screen!=='lobby'){setScreen('lobby');setTab('games');return;}
    if(tab!=='home'){setTab('home');return;}
    window.Android?.backgroundApp();
  };
  useEffect(()=>{
    const sequence=++workerSequence.current;
    if(!playAccess.allowed||!state||online||screen!=='match'||outcome||humans.includes(turn(state))){setThinking(false);return;}
    setThinking(true);
    if(!worker.current)worker.current=new Worker('bot.js');
    const bot=worker.current;
    bot.onmessage=({data})=>{
      if(data.sequence!==workerSequence.current)return;
      setThinking(false);
      if(data.error){notify(data.error);return;}
      if(!data.action){notify('This side has no legal action. Check the match rules.');return;}
      if(data.state){const move=describeTransition(id,state,data.state);if(move)setTrail(move);setLocal(current=>({...current,state:data.state,actionLog:[...(current.actionLog||[]),data.action],history:[...(current.history||[]),current.state].slice(-40)}));}
    };
    const timer=setTimeout(()=>bot.postMessage({id,state,sequence}),420);
    return()=>{clearTimeout(timer);workerSequence.current++;worker.current?.terminate();worker.current=null;};
  },[id,state,online,screen,refresh,playAccess.allowed]);

  const run=async fn=>{if(busy)return;setBusy(true);try{await fn();}catch(error){notify(error.message);}finally{setBusy(false);}};
  const command=async(type,payload={})=>{
    const response=await roomClient.call(type,{...sessionRef.current,...payload});
    if(response.room)receiveRoom(response.room);
    return response;
  };
  function pick(gameId){if(!gate(gameId))return;setPicked(gameId);setSeat('red');setSheet('game');}
  function learn(gameId){openLearning(gameId);}
  function openLearning(gameId=picked,initialTab='start',initialRole,initialMission){
    if(!gate(gameId))return;
    setAcademy({id:gameId,initialTab,initialRole,initialMission,returnScreen:screen==='learn'?academy.returnScreen:screen});setPicked(gameId);setSeat('red');setSheet(null);setChatOpen(false);setScreen('learn');
  }
  function learningDiscovery(gameId,mission){const next=recordDiscovery(read(JOURNAL_KEY,{}),gameId);write(JOURNAL_KEY,next);setJournal(next);saveGathering(earnLantern(gatheringProgress(read(GATHERING_KEY,{}),next),gameId,{mission}));}
  async function share(text,title=BRAND.name){
    if(window.Android?.shareText){window.Android.shareText(title,text);return;}
    if(navigator.share){try{await navigator.share({title,text});return;}catch(error){if(error.name==='AbortError')return;}}
    try{await navigator.clipboard.writeText(text);notify('Copied. Send it to your friend.');}catch{notify(text);}
  }
  async function shareRoom(){if(room)await share(hallInvitation(room.tableId,room.roomCode,INVITE_ROOT+room.roomCode)+(teamGame(room.gameState)?'\n2v2 teams · Green + Pink vs Red + Blue':'')+'\nPlay together in the Android app or open the link in Safari.');}
  async function shareBrowserRoom(){if(!room)return;if(window.Android)await requireServiceFeature('browser-play-v1');await share(`${profile.name} invited you to play ${game(room.tableId).name}.\nRoom: ${room.roomCode}\n${browserRoomLink(room.roomCode)}\nOpen in Safari, enter your name and join. No download needed.`);}
  async function copy(text){try{await navigator.clipboard.writeText(text);notify('Copied.');}catch{await share(text);}}
  function updateProfile(){const name=nameDraft.trim().slice(0,24);if(!name){notify('Enter a display name.');return;}const next={...profile,name};setProfile(next);write('profile',next);setSheet(null);}
  function toggleFavorite(gameId){const next=favorites.includes(gameId)?favorites.filter(x=>x!==gameId):[...favorites,gameId];setFavorites(next);write('favorites',next);}
  async function createRoom(forGame=picked,postcardMemory=null,confirmed=false){
    if(!playAccess.accountId){setSheet('online-account');return;}
    if(!gate(forGame))return;
    if(!UNLOCKS.CATALOG[forGame].starter){await requireServiceFeature('hall-access-v1');await hallAccess.ensureOnline();}
    if(forGame==='dominion'&&!confirmed){if(!game('dominion').seats.includes(seat))setSeat('red');setPicked(forGame);setRoomPostcardDraft(postcardMemory);setSheet('dominion-room');return;}
    if(forGame==='dominion')await requireServiceFeature(LONG_DICE_PROFILE);
    if(UNLOCKS.CATALOG[forGame].starter)await hallAccess.refresh();
    await roomClient.detach();
    const response=await roomClient.call('ap_room_create',{...hallAccess.credentials(),tableId:forGame,name:profile.name,playerId:profile.id,seat:forGame===picked?seat:'red',...(forGame==='dominion'?{teamMode:dominionMode,rulesProfile:LONG_DICE_PROFILE}:{})});
    const saved={roomCode:response.room.roomCode,playerId:profile.id,seatToken:response.seatToken};
    roomClient.useSession(saved);setSession(saved);sessionRef.current=saved;receiveRoom(response.room);
    setPicked(forGame);setLocal(null);setScreen('room');if(postcardMemory){setPostcard({...postcardMemory,withInvitation:true});setSheet('postcard');}else setSheet(null);
  }
  async function joinRoom(code,requestedName=profile.name){
    if(!playAccess.accountId){setSheet('online-account');return;}
    const displayName=requestedName.trim().slice(0,24);if(!displayName)throw new Error('Enter your name before joining.');
    const normalized=parseInvitation(code);if(!normalized)throw new Error('Enter the six-character room code or paste its invitation.');
    const saved=read('rooms',{})[normalized];
    if(!saved?.session?.seatToken||saved.room.status==='waiting'){
      let preview;
      if(saved?.session?.seatToken)preview={tableId:saved.room.tableId};
      else {await requireServiceFeature('hall-access-v1');preview=await roomClient.call('ap_room_preview',{roomCode:normalized});}
      if(['shanshui','shanshui-2v2'].includes(preview.tableId)){setShanshuiInvite(normalized);setSheet(null);setScreen('shanshui');return;}
      if(!hallAccess.allowed(preview.tableId).open){setJoinCode(normalized);saveInvitation({code:normalized,name:displayName,gameId:preview.tableId});openLocked(preview.tableId);return;}
      if(!UNLOCKS.CATALOG[preview.tableId].starter)await hallAccess.ensureOnline();
    }
    await roomClient.detach();
    await hallAccess.refresh();
    const response=await roomClient.call('ap_room_join',{...hallAccess.credentials(),roomCode:normalized,playerId:profile.id,name:displayName,...(saved?.session||{})});
    saveInvitation(null);
    if(displayName!==profile.name){const nextProfile={...profile,name:displayName};setProfile(nextProfile);write('profile',nextProfile);}
    const next={roomCode:normalized,playerId:profile.id,seatToken:response.seatToken||saved?.session.seatToken};
    roomClient.useSession(next);setSession(next);sessionRef.current=next;receiveRoom(response.room);
    setLocal(null);setSheet(null);setChatOpen(false);setScreen(response.room.status==='waiting'?'room':'match');
    if(response.room.players.filter(p=>!p.bot).length>1){const next=gatheringProgress(read(GATHERING_KEY,{}),read(JOURNAL_KEY,{}));next.friendVisitAt ||= Date.now();saveGathering(next);}
  }
  useEffect(()=>{
    const loggedOut=()=>{workerSequence.current++;verifiedMatches.current.clear();roomClient.close();sessionRef.current=null;roomRef.current=null;setSession(null);setRoom(null);setLocal(null);setSelected(null);setPromotion(null);setSheet(null);setChatOpen(false);setLocalChat([]);setNotice('');setScreen('lobby');setTab('home');};
    window.addEventListener('arctic-logout',loggedOut);return()=>window.removeEventListener('arctic-logout',loggedOut);
  },[]);
  async function playJourneyGame(gameId){
    const saved=read('practice.'+gameId,null);
    if(saved?.mode==='bots'&&saved.progressEligible!==false&&!result(saved.state))return resumePractice(gameId);
    return startPractice('bots',false,gameId,'red');
  }
  async function startPractice(mode,guide=false,gameId=picked,humanSeat=seat){
    if(!gate(gameId))return;
    await roomClient.detach();setSession(null);sessionRef.current=null;setRoom(null);roomRef.current=null;
    clearTimeout(toastTimer.current);setNotice('');
    companion.metric('practice_started');
    const match={id:gameId,matchId:secureUuid(),state:create(gameId,{teamMode:gameId==='dominion'?dominionMode:undefined,rulesProfile:gameId==='dominion'?LONG_DICE_PROFILE:undefined}),mode,humans:mode==='hotseat'?game(gameId).seats:[humanSeat],history:[],actionLog:[],progressEligible:mode==='bots',guide};
    write('last-table',{id:gameId,at:Date.now()});setLocal(match);setTrail(null);setLocalChat([]);setSheet(null);setChatOpen(false);setScreen('match');
  }
  async function resumePractice(gameId){
    const saved=read(`practice.${gameId}`,null);if(!saved)return;
    await roomClient.detach();setSession(null);sessionRef.current=null;setRoom(null);roomRef.current=null;write('last-table',{id:gameId,at:Date.now()});setLocal({...saved,matchId:saved.matchId||secureUuid()});setTrail(null);setSheet(null);setScreen('match');
  }
  function openTurnChoices(){setDominionConfirm(false);setSheet('dominion-turn');}
  async function chooseDice(actionId){
    if(diceLock.current||!canAct)return;
    const action=legal.find(a=>a.id===actionId);if(!action)return;
    const expectedContext=diceContext.current;diceLock.current=true;setDicePending(true);
    try{if(online&&state.rulesProfile===LONG_DICE_PROFILE)await requireServiceFeature(LONG_DICE_PROFILE);else if(online&&action.id!=='roll|control:roll')await requireServiceFeature('dominion-flex-dice-v1');if(diceContext.current!==expectedContext)return;setSheet(null);await commit(action);}
    catch(e){notify(e.message);}finally{diceLock.current=false;setDicePending(false);}
  }
  const turnPromptKey=id==='dominion'&&state?`${online?room.matchId:local?.matchId}:${state.mobileTurnNumber||0}:${state.turn}`:null;
  diceContext.current=screen+':'+turnPromptKey+':'+state?.dice?.rolled+':'+sheet;
  usePostRollHelp({id,state,legal,canAct,screen,sheet,matchId:online?room?.matchId:local?.matchId,onOpen:()=>setSheet('dominion-roll-help')});
  useEffect(()=>{
    if(screen==='match'&&id==='dominion'&&canAct&&!state.dice.rolled&&!needsKingReturn(state)&&!sheet&&!chatOpen&&!promotion&&turnPromptSeen.current!==turnPromptKey){turnPromptSeen.current=turnPromptKey;openTurnChoices();}
  },[screen,id,canAct,state?.dice?.rolled,turnPromptKey,sheet,chatOpen,promotion]);
  async function commit(action){
    if(!playAccess.allowed)return;
    setPromotion(null);setSelected(null);
    if(online){await run(async()=>{const response=await command('ap_game_action',{actionId:action.id,revision:room.revision});if(response.room&&describeTransition(id,state,response.room.gameState))earnedAtTable(id);});}
    else {await run(async()=>{const response=await ruleClient.current.call('apply',{id,state,actionId:action.id});const move=describeTransition(id,state,response.state);if(move){setTrail(move);earnedAtTable(id);}if(local.guide&&move){companion.remember([id+':first']);const previous=read(JOURNAL_KEY,{}),next=recordDiscovery(previous,id);write(JOURNAL_KEY,next);setJournal(next);notify('First move saved to your Archive journal.');if(!previous[id])companion.react('discovery',{key:`discovery:${id}`});}setLocal(current=>({...current,state:response.state,actionLog:[...(current.actionLog||[]),action.id],guide:current.guide&&!move,history:[...current.history,current.state].slice(-40)}));});}
  }
  function target(cell){const choices=selectedActions.filter(a=>a.target===cell);if(!choices.length)return;if(choices.length>1)setPromotion(choices);else commit(choices[0]);}
  async function leave(){await command('ap_room_leave');forgetRoom(room.roomCode);setSavedRooms(read('rooms',{}));roomClient.useSession(null);setSession(null);sessionRef.current=null;setRoom(null);roomRef.current=null;setSheet(null);setScreen('lobby');}
  function undo(){if(!local?.history.length)return;const previous=[...local.history];let next=previous.pop();while(previous.length&&!local.humans.includes(turn(next)))next=previous.pop();workerSequence.current++;companionMatch.current=null;setLocal({...local,state:next,history:previous,progressEligible:false,guide:false});setTrail(null);setSheet(null);}
  function restart(){if(!gate(id))return;workerSequence.current++;companionMatch.current=null;setLocal({...local,matchId:secureUuid(),state:create(id,{teamMode:local.state?.teamMode,rulesProfile:id==='dominion'?LONG_DICE_PROFILE:undefined}),history:[],actionLog:[],progressEligible:local.mode==='bots',guide:false});setTrail(null);setSheet(null);setSelected(null);setLocalChat([]);}
  async function postTableText(text){if(online)await command('ap_room_chat',{text});else setLocalChat(current=>[...current,{id:secureUuid(),name:local.mode==='hotseat'?`${turnName} player`:profile.name,seat:turn(state),text,at:new Date().toISOString()}].slice(-100));}
  async function sendChat(e){e.preventDefault();const text=chatText.trim();if(!text)return;await run(async()=>{await postTableText(text);setChatText('');});}
  async function sendReaction(reaction){if(Date.now()-reactionAt.current<1500)return false;if(illustratedText(reaction)&&!collection.entitlements?.['little-victories-v1']?.active)return false;const text=festivalStickerText(reaction)||illustratedText(reaction)||reactionText(companion.preferences.guide==='auto'?companion.host:companion.preferences.guide,reaction);if(!text)return false;reactionAt.current=Date.now();try{await postTableText(text);companion.metric('reaction_sent',illustratedText(reaction)?'little-victories-v1':undefined);return true;}catch(e){notify(e.message);return false;}}
  function openDaily(item=dailyPuzzle()){if(item.gameId&&!gate(item.gameId))return;setPuzzle(item);companion.metric('puzzle_started');setSheet('daily');}
  function openPostcard(memory){setPostcard(memory);setSheet('postcard');}
  function roomPostcard(){if(room)openPostcard({...hallPostcard(room.tableId),key:'invitation:'+room.roomCode,withInvitation:true,title:'Meet me at '+HALLS[room.tableId].name,caption:game(room.tableId).name+' · '+game(room.tableId).players+' seats · A real private table'});}
  async function addPostcardInvite(){if(room&&room.tableId===postcard.gameId&&['waiting','playing'].includes(room.status)&&(!room.gameState||!result(room.gameState)))setPostcard({...postcard,withInvitation:true});else await createRoom(postcard.gameId,postcard);}
  async function sharePostcard({dataUrl,filename,text}){if(window.Android?.sharePostcard){if(window.Android.sharePostcard(dataUrl,text)===false)throw Error('The postcard could not be prepared. Please try again.');companion.metric('postcard_shared');return;}const bytes=Uint8Array.from(atob(dataUrl.split(',')[1]),c=>c.charCodeAt(0)),blob=new Blob([bytes],{type:'image/png'}),file=new File([blob],filename,{type:'image/png'});if(navigator.canShare?.({files:[file]})&&navigator.share){try{await navigator.share({files:[file],title:BRAND.name,text});companion.metric('postcard_shared');}catch(e){if(e.name!=='AbortError')throw e;}return;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);companion.metric('postcard_shared');notify('Postcard saved. You can share it with a friend.');}

  const lastTable=read('last-table',null);
  const practiceId=lastTable&&game(lastTable.id)&&read('practice.'+lastTable.id,null)?lastTable.id:HALL_ORDER.find(key=>read('practice.'+key,null));
  const lessonId=HALL_ORDER.find(key=>{const n=Object.keys(firstProgress(key,read(START_KEY+'.'+key,{}))).length;return n>0&&n<firstSteps(key).length;});
  const homeContinue=resumable?()=>run(()=>joinRoom(resumable.room.roomCode)):practiceId?()=>run(()=>resumePractice(practiceId)):lessonId?()=>openLearning(lessonId):null;
  const continueLabel=resumable?'Continue '+game(resumable.room.tableId).name:practiceId?'Continue '+game(practiceId).name:lessonId?'Continue learning':null;
  const currentChats=online?room.chat||[]:localChat;
  const currentRoomSeats=room?game(room.tableId).seats:[];
  const inviteStatus=connection==='online'?'Connected':connection==='connecting'?'Connecting…':'Reconnecting…';

  const postcardInvitation=postcard?.withInvitation&&room&&room.tableId===postcard.gameId&&['waiting','playing'].includes(room.status)&&(!room.gameState||!result(room.gameState))?{code:room.roomCode,url:INVITE_ROOT+room.roomCode}:null;
  if(!window.Android&&publicPreview)return <PublicKingdomPreview onSignIn={exitPublicPreview}/>;
  if(update.required)return <RequiredUpdate update={update} theme={theme} onTheme={toggleTheme}/>;
  if(!playAccess.owner&&(!visa.record||!playAccess.allowed||playAccess.consentNeeded))return <AntarcticVisaEntry assetStatus={assetStatus} access={playAccess} halls={hallAccess} visa={visa} onPreview={enterPublicPreview} onProfile={name=>{const next={...profile,name};setProfile(next);setNameDraft(name);write('profile',next);}}/>;
  function launchPlay(gameId){setIntroduction(null);if(gameId==='co-tu-lenh')setScreen('co-tu-lenh');else if(gameId==='shanshui-xiangqi'){setShanshuiInvite('');setScreen('shanshui');}else pick(gameId);}
  if(introduction)return <GameIntroduction key={introduction} id={introduction} quiet={companion.preferences.mode==='off'} onClose={()=>setIntroduction(null)} onProceed={()=>launchPlay(introduction)} onLearn={()=>{const target=introduction;setIntroduction(null);if(game(target))openLearning(target);else launchPlay(target);}}/>;
  if(screen==='shanshui')return <ShanshuiMobile initialCode={shanshuiInvite} access={playAccess} profile={profile} credentials={hallAccess.credentials} onExit={()=>{setScreen('lobby');setTab('games');}}/>;
  if(screen==='co-tu-lenh')return <CoTuLenhMobile onExit={()=>{setScreen('lobby');setTab('games');}}/>;
  const headerControls=<HeaderControls theme={theme} onTheme={toggleTheme} onUpdates={()=>setSheet('updates')} checking={update.checking}/>;
  return <MascotAppearanceContext.Provider value={{outfits:{...companion.journey.outfits,...collection.outfits},pin:collection.pin}}><div data-screen={screen} data-game={id||undefined} data-tab={tab} data-match-art={screen==='match'&&id==='dominion'?'approved-v2':undefined} className={`app ${screen==='match'?'battle':''} ${companion.preferences.mode!=='off'&&!['learn','story'].includes(screen)&&!(screen==='lobby'&&['home','games'].includes(tab))?'has-companion':''}`}>
    {screen==='learn'&&academy&&<HowToPlay key={academy.id} id={academy.id} initialTab={academy.initialTab} initialRole={academy.initialRole} initialMission={academy.initialMission} onGame={(gameId,section)=>openLearning(gameId,section||'start')} onLearningEvent={companion.learned} onClose={()=>setScreen(academy.returnScreen)} preferences={companion.preferences} onDiscovery={learningDiscovery} returnToGame={academy.returnScreen==='match'} onPractice={online?null:()=>run(()=>startPractice('bots',true))}/>}
    {screen==='story'&&storyLesson&&<StoryAdventure key={storyLesson.id+storyLesson.mission} id={storyLesson.id} mission={storyLesson.mission} story={storyOptions.enabled} preferences={companion.preferences} onClose={closeHallChallenge} onDiscovery={learningDiscovery} onLearningEvent={companion.learned} onFree={gameId=>openLearning(gameId,'sandbox')} onPlay={gameId=>{setScreen('lobby');pick(gameId);}}/>}
    {screen==='lobby'&&<>
      <header className={tab==='games'?'lobby-header v5914-games-header':'lobby-header discovery-header'}><h1 className={tab==='games'?'v5914-games-heading':'discovery-sr-only'}>{tab==='games'?'Games':'Antarctic Kingdoms'}</h1><button className="discovery-brand" aria-label="Antarctic Kingdoms home" onClick={()=>setTab('home')}><img src={tab==='home'?'art/home-v1/brand-logo.webp':BRAND.icon} alt="Antarctic Gaming Co." width="40" height="40"/><span><small>ANTARCTIC KINGDOMS</small><strong>{{home:'Antarctic Kingdoms',games:'Games',shop:'Shop',chats:'Chats',profile:'Passport',friends:'Friends'}[tab]}</strong></span></button><div className="header-controls">{headerControls}<button className="avatar-btn" onClick={()=>setTab('profile')} aria-label="Open passport"><Avatar color={profile.avatar} size={36}/></button></div></header>
      <main className="lobby-content" data-view={tab}>
        {tab==='games'&&<>
          <div className="filter-row">{['All','2 players','3 players','4 players','Favorites'].map(item=><button className={filter===item?'active':''} key={item} onClick={()=>setFilter(item)}>{item==='Favorites'&&<Heart size={13}/>} {item}</button>)}</div>

          <JourneyBar onJourney={showJourney} access={hallAccess} onFormations={()=>formations()} onPass={()=>accessShop('all-halls-v1')}/>
          <p className="games-chronology">7 halls · Oldest roots first</p>
          <article className="ctl-catalogue-entry" aria-label="Cờ Tư Lệnh — Vietnamese Commander Chess"><img loading="lazy" src="art/co-tu-lenh/board/board-antarctic-11x12.webp" alt="Cờ Tư Lệnh Arctic board with 11 columns and 12 rows"/><div><small>VIETNAM · 2010 · MODERN STRATEGY GAME · RESEARCH DRAFT</small><h2>Cờ Tư Lệnh</h2><p>Command penguin explorers across icy land and sea. Play local, bots, guided practice, or server-validated private rooms. Choose versioned 2015/2024 rules and optional defence-range rings.</p><button className="primary" aria-label="Play Cờ Tư Lệnh" onClick={()=>setScreen('co-tu-lenh')}>Play Commander Chess</button></div></article>
          <article className="shanshui-catalogue-entry"><img src="art/shanshui/starting-position-light.webp" alt="Four armies on the Mountain and River Chess board"/><div><small>NEW · CHINESE XIANGQI ADAPTATION</small><h2>Shanshui Xiangqi</h2><p>Four armies. One shared victory. Two-player teams, four-player 2v2, bots and guided practice.</p><button className="primary" aria-label="Play Shanshui Xiangqi" onClick={()=>{setShanshuiInvite('');setScreen('shanshui');}}>Play Shanshui Xiangqi</button></div></article>
          <div className={'games-grid '+(storyOptions.enabled?'seven-halls-grid':'')}>{chronologicalGames(GAME_LIST).filter(g=>filter==='All'||filter==='Favorites'&&favorites.includes(g.id)||filter===`${g.players} players`).map(g=><HallCard key={g.id} definition={g} access={hallAccess.allowed(g.id)} favorite={favorites.includes(g.id)} onFavorite={toggleFavorite} onPlay={pick} onExplore={openHall} onLearn={gameId=>openLearning(gameId)} onQuickPlay={gameId=>run(()=>startPractice('bots',false,gameId,'red'))} story={storyOptions.enabled}/>)}</div>
          {filter==='Favorites'&&!favorites.length&&<div className="empty"><Heart/><h3>Your favorites belong here</h3><p>Tap a heart on a game to keep it close.</p></div>}
        </>}
        {tab==='home'&&<HomeLanding onChaturanga={()=>pick('dominion')} onBrowse={()=>setTab('games')} onLearn={()=>setTab('games')} onJourney={()=>setTab('profile')} onStory={()=>setSheet('world-guide')} onJoin={()=>{setNameDraft(profile.name);setSheet('join-name');}} onShop={()=>setTab('shop')} onContinue={homeContinue} continueLabel={continueLabel} continueImage={resumable?HALL_ART[resumable.room.tableId]?.card:practiceId?HALL_ART[practiceId]?.card:null} roomCode={joinCode} onRoomCode={setJoinCode} story={storyOptions.enabled} discovery={<NextDiscovery access={hallAccess} target={discoveryTarget} onOpen={showJourney}/>}/>}

        {tab==='shop'&&<PhysicalCollection onLearn={setIntroduction} onDigital={()=>setSheet('collection')}/>}
        {tab==='friends'&&<>
          <div className="friend-intro archive-welcome celebration-friends"><img className="festival-friends-banner" src={CELEBRATION_ART.friends} alt="Friends are welcome at the festival table" width="1200" height="800" loading="lazy"/>{companion.preferences.mode!=='off'&&<img className="archive-guide-art" src="art/launch-v1/hosts/polly.webp" alt="Nova welcomes your friends"/>}<p className="world-eyebrow">BRING SOMEONE TO THE TABLE</p><h2>The festival is better<br/>with a friend.</h2><p>Save a name on your phone, then invite your friend to a particular hall.</p></div>
          <button className="primary full" onClick={()=>setSheet('festival-invite')}><Users size={18}/> Create a hall invitation</button><form className="inline-form" onSubmit={e=>{e.preventDefault();if(!friendDraft.trim())return;const next=[...friends,{id:secureUuid(),name:friendDraft.trim().slice(0,24)}];setFriends(next);write('friends',next);setFriendDraft('');}}><input value={friendDraft} onChange={e=>setFriendDraft(e.target.value)} placeholder="Friend’s name" maxLength={24} aria-label="Friend’s name"/><button className="primary" type="submit"><Plus size={19}/>Add</button></form>
          {friends.map((f,index)=><div className="friend-row" key={f.id}><Avatar color={['blue','green','red'][index%3]}/><span><strong>{f.name}</strong><small>Saved on your phone</small></span><button className="pill blue-pill" onClick={()=>room?shareRoom():setSheet('festival-invite')}>Invite</button><button className="icon-btn" aria-label={`Remove ${f.name}`} onClick={()=>{const next=friends.filter(x=>x.id!==f.id);setFriends(next);write('friends',next);}}><X size={16}/></button></div>)}
          {!friends.length&&<p className="muted center">Add a name above to start your friends list.</p>}
        </>}
        {tab==='chats'&&<>
          <div className="chat-room-actions"><button className="primary" aria-label="Join a room" onClick={()=>setSheet('join')}><Plus size={18}/> Join a room</button><button className="secondary" onClick={()=>setSheet('festival-invite')}><Users size={18}/> Invite friends</button></div>
          <ChatCamp journey={companion.journey} progress={world} story={storyOptions.enabled} onCamp={()=>openCamp(companion.preferences.guide==='auto'?'polly':companion.preferences.guide)} onMemories={()=>setSheet('memories')} onLearn={()=>setSheet('learning-library')} onDaily={openDaily} onMemory={openPostcard} onChallenge={openHallChallenge} onIntro={()=>setSheet('gathering-intro')} onGuide={()=>setSheet('world-guide')} onPassport={()=>setSheet('passport')} onExplore={openHall} onFriends={()=>setTab('friends')}>
            {Object.values(savedRooms).sort((a,b)=>(b.at||0)-(a.at||0)).map(saved=><button className="table-row" key={saved.room.roomCode} onClick={()=>run(async()=>{await joinRoom(saved.room.roomCode);if(saved.room.status==='waiting')setScreen('room');else setChatOpen(true);})}><img src={asset(game(saved.room.tableId).icon)} alt=""/><span><strong>{game(saved.room.tableId).name} · {saved.room.roomCode}</strong><small>{saved.room.chat?.at(-1)?.text||'Say hello at your table'}</small></span><MessageCircle size={21}/></button>)}
            {!Object.keys(savedRooms).length&&<div className="chat-tables-empty"><p>Create or join a room to chat while you play.</p><button className="text-button" onClick={()=>setTab('games')}>Find a game <ChevronRight size={17}/></button></div>}
          </ChatCamp>
        </>}
        {tab==='profile'&&<PassportHub onBrowse={()=>setTab('games')} profile={profile} progress={world} avatar={<Avatar color={profile.avatar} size={48}/>} onEdit={()=>{setNameDraft(profile.name);setSheet('name');}} onHall={openHall} onChallenge={openHallChallenge} onReveal={()=>setSheet('eighth-lantern')} onPostcard={()=>openPostcard(guestPostcard())} onCamp={()=>openCamp(companion.preferences.guide==='auto'?'polly':companion.preferences.guide)} onMemories={()=>setSheet('memories')} onDaily={openDaily}>
          <JourneyBar onJourney={showJourney} access={hallAccess} onFormations={()=>formations()} onPass={()=>accessShop('all-halls-v1')}/>
          <div className="profile-card">{collection.badge&&<span className="supporter-preview">✦ Aurora Companion</span>}<Avatar color={profile.avatar} size={72}/><h2>{profile.name}</h2><p>Ready for one more game</p><div className="profile-session-actions"><button className="pill blue-pill" onClick={()=>{setNameDraft(profile.name);setSheet('name');}}>Edit profile</button><button className="profile-logout-pill" onClick={()=>setSheet('logout')}><LogOut size={15}/> Log out</button></div></div>
          {storyOptions.enabled&&<LanternPassport progress={world} onHall={openHall} onReveal={()=>setSheet('eighth-lantern')} onInterlude={()=>setSheet('gathering-interlude')} onPostcard={()=>openPostcard(guestPostcard())}/>}<div className="profile-options"><button onClick={()=>setSheet('fair-play')}><span className="option-icon"><Shield/></span><span><strong>Fair Play</strong><small>Check moves, dice and onchain receipts</small></span><ChevronRight/></button><button className="profile-logout" onClick={()=>setSheet('logout')}><span className="option-icon"><LogOut/></span><span><strong>Log out</strong><small>Return to welcome · Saved games stay on this phone</small></span><ChevronRight/></button><button onClick={showJourney}><span className="option-icon"><Gamepad2/></span><span><strong>Your discovery journey</strong><small>A glimpse of your next hall</small></span><ChevronRight/></button>{visa.record&&<button onClick={()=>setSheet('antarctic-visa')}><span className="option-icon"><User/></span><span><strong>Your Antarctic Visa</strong><small>Passport and NFT delivery</small></span><ChevronRight/></button>}<button onClick={()=>setSheet('about')}><span className="option-icon"><Settings/></span><span><strong>App information</strong><small>About Antarctic Kingdoms</small></span><ChevronRight/></button>
            <button onClick={()=>setSheet('festival-stickers')}><span className="option-icon"><Heart/></span><span><strong>Festival stickers</strong><small>12 free · Preview, share & celebrate</small></span><ChevronRight/></button><button onClick={()=>setSheet('story-settings')}><span className="option-icon"><BookOpen/></span><span><strong>The Eternal Gathering</strong><small>Story toggle · Opening · World guide</small></span><ChevronRight/></button><button onClick={()=>setSheet('board-positions')}><span className="option-icon"><Settings/></span><span><strong>San You Qi board positions</strong><small>Adjust or import all 156 points</small></span><ChevronRight/></button><button onClick={()=>setSheet('account')}><span className="option-icon"><Shield/></span><span><strong>Progress & recovery</strong><small>Your account · Progress, recovery & offline play</small></span><ChevronRight/></button>
            <button className="theme-control" role="switch" aria-label="Dark mode" aria-checked={theme==='dark'} onClick={()=>setTheme(current=>current==='dark'?'light':'dark')}><span className="option-icon">{theme==='dark'?<Moon/>:<Sun/>}</span><span><strong>Dark mode</strong><small>{theme==='dark'?'On · Night ice':'Off · Glacier daylight'}</small></span><span className={`theme-switch ${theme==='dark'?'on':''}`} aria-hidden="true"><i/></span></button>
            <button onClick={()=>setSheet('mascot-settings')}><span className="option-icon"><MessageCircle/></span><span><strong>Mascot companions</strong><small>{companion.preferences.mode==='off'?'Off · Bring the guides back any time':`${companion.preferences.mode==='quiet'?'Quiet':'Lively'} · ${companion.preferences.guide==='auto'?'All four guides':GUIDES[companion.preferences.guide].name}`}</small></span><ChevronRight/></button>
            {window.Android?.shareApp&&<button onClick={()=>{if(window.Android?.shareApp)window.Android.shareApp();else notify('APK sharing is available inside the installed Android app.');}}><span className="option-icon"><Share2/></span><span><strong>Share the Android app</strong><small>Send the APK directly to a friend</small></span><ChevronRight/></button>}
            <button onClick={()=>run(async()=>{if(window.Android)await requireServiceFeature('browser-play-v1');await share('Play Antarctic Kingdoms with me. Open this link in Safari or any modern browser.\n'+WEB_APP_URL);})}><span className="option-icon"><Share2/></span><span><strong>Share browser link</strong><small>iPhone friends can play in Safari</small></span><ChevronRight/></button>
            {window.Android?<button onClick={()=>setSheet('updates')}><span className="option-icon"><Download/></span><span><strong>App updates</strong><small>Check and download the latest version</small></span><ChevronRight/></button>:<button onClick={()=>location.reload()}><span className="option-icon"><Download/></span><span><strong>Refresh browser game</strong><small>Load the latest version</small></span><ChevronRight/></button>}
            <button onClick={()=>setSheet('join')}><span className="option-icon"><Gamepad2/></span><span><strong>Join a room</strong><small>Enter a six-character invitation code</small></span><ChevronRight/></button>
            <button onClick={()=>setSheet('help')}><span className="option-icon"><BookOpen/></span><span><strong>How to play together</strong><small>Install, invite and start playing</small></span><ChevronRight/></button>
            <button onClick={()=>setSheet('about')}><span className="option-icon"><Shield/></span><span><strong>About Antarctic Kingdoms</strong><small>Version {APP_VERSION} · Seven games</small></span><ChevronRight/></button>
          </div>
        </PassportHub>}
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">{tabs.map(([key,label,Icon])=><button key={key} className={tab===key?'active':''} onClick={()=>setTab(key)} aria-current={tab===key?'page':undefined}><span><Icon size={24} strokeWidth={tab===key?2.6:1.8}/></span><small>{label}</small></button>)}</nav>
      <CompanionDock companion={companion} onOpen={openCamp} onSettings={()=>setSheet('mascot-settings')} hidden={!!sheet||chatOpen||['games','home','profile','chats','friends'].includes(tab)}/>
    </>}

    {screen==='room'&&room&&<>
      <header className="page-header"><button className="icon-btn" aria-label="Back to games" onClick={()=>setScreen('lobby')}><ArrowLeft/></button><h1><GameTitle id={room.tableId}/></h1><div className="header-controls">{headerControls}<button className="icon-btn blue" aria-label="Share invitation" onClick={shareRoom}><Share2/></button></div></header>
      <main className="room-content"><div className={`connection ${connection!=='online'?'waiting':''}`}>{connection==='online'?<Wifi size={15}/>:<WifiOff size={15}/>} {inviteStatus}</div><p className="eyebrow">{HALLS[room.tableId].name} · {game(room.tableId).players} seats</p><button className="room-code" onClick={()=>copy(room.roomCode)} aria-label="Copy room code">{room.roomCode}<Copy size={20}/></button><p className="center muted">Share the invitation link. iPhone friends can tap Play in browser and join in Safari. Empty seats can be filled with casual bots before the host starts.</p><button className="primary full" onClick={shareRoom}><Share2 size={18}/> Invite friends</button><button className="secondary full browser-room-invite" disabled={busy} onClick={()=>run(shareBrowserRoom)}><Share2 size={18}/> Invite iPhone / browser player</button><p className="browser-invite-note">Open the link in Safari · No download needed.</p>
        {room.tableId==='dominion'&&<section className="team-banner"><strong>{teamGame(room.gameState)?'2v2 · Green + Pink vs Red + Blue':'Four-way · Every kingdom for itself'}</strong>{teamGame(room.gameState)&&<p>Your team: {teamName(me?.seat)}. Your kingdom: {seatName('dominion',me?.seat)}.</p>}{room.status==='waiting'&&<fieldset><legend>Choose an open kingdom</legend><div className="seat-choice">{game('dominion').seats.map(color=><button type="button" key={color} aria-pressed={me?.seat===color} className={me?.seat===color?'selected':''} disabled={busy||connection!=='online'||room.players.some(p=>p.id!==profile.id&&p.seat===color)} onClick={()=>run(()=>command('ap_room_seat',{seat:color}))}><i style={{background:COLORS[color]}}/>{seatName('dominion',color)}{teamGame(room.gameState)?` · ${teamName(color)}`:''}</button>)}</div><small>Changing kingdom clears your Ready status.</small></fieldset>}</section>}
        <div className="room-seats">{currentRoomSeats.map(color=>{const player=room.players.find(p=>p.seat===color);return <div className="room-seat" key={color}><Avatar color={color} gameId={room.tableId} size={48} online={!!player?.connected}/><span><strong>{player?.name||'Waiting for a friend'}</strong><small>{seatName(room.tableId,color)}{teamGame(room.gameState)?` · ${teamName(color)}`:''}{player?.id===profile.id?' · You':''}</small></span>{player?.ready?<span className="ready"><Check size={16}/>Ready</span>:player?<span className="not-ready">Not ready</span>:<span className="open-seat">Open</span>}</div>;})}</div>
        {room.status==='waiting'?<div className="room-actions"><button className={me?.ready?'secondary full':'primary full'} disabled={busy||connection!=='online'} onClick={()=>run(()=>command('ap_room_ready',{ready:!me?.ready}))}>{me?.ready?<><Check size={18}/> You’re ready</>:'I’m ready'}</button>{room.hostId===profile.id&&<><button className="primary full" disabled={busy||connection!=='online'||room.players.some(p=>!p.ready)||room.players.length<currentRoomSeats.length} onClick={()=>run(async()=>{await command('ap_room_start');setScreen('match');})}><Play size={18}/> Start game</button>{room.players.length<currentRoomSeats.length&&<button className="text-button" disabled={busy||room.players.some(p=>!p.ready)||connection!=='online'} onClick={()=>run(async()=>{await command('ap_room_start',{fillWithBots:true});setScreen('match');})}>Fill empty seats with bots & start</button>}</>}</div>:<button className="primary full" onClick={()=>setScreen('match')}>Return to the board</button>}
        {room.status!=='waiting'&&<p className="muted center">The match has started. Your seat is saved on this phone.</p>}
        <section className="room-chat"><h3>Campfire · Private table chat</h3>{(room.chat||[]).slice(-6).map(message=><div className="room-chat-message" key={message.id}><strong style={{color:COLORS[message.seat]}}>{message.name}</strong><ReactionContent text={message.text} preferences={companion.preferences}/></div>)}<form className="inline-form" onSubmit={e=>{e.preventDefault();if(!chatText.trim())return;run(async()=>{await command('ap_room_chat',{text:chatText});setChatText('');});}}><input value={chatText} onChange={e=>setChatText(e.target.value)} maxLength={500} placeholder="Say hello…" aria-label="Table message"/><button className="primary" type="submit" disabled={busy||connection!=='online'} aria-label="Send message"><Send size={20}/></button></form></section>
        <CompanionDock companion={companion} onOpen={openCamp} onSettings={()=>setSheet('mascot-settings')} inline hidden={!!sheet||chatOpen}/>
        <button className="text-button danger" onClick={()=>setSheet('leave')}>Leave table</button>
      </main>
    </>}

    {screen==='match'&&state&&<>
      {outcome&&!victoryDismissed&&<VictoryCelebration id={id} title={definition?.name||id} outcome={outcome} visible={visible} isOnline={online} viewerWon={online?UNLOCKS.winningSeats(outcome).includes(me?.seat):!!local?.humans?.some(seat=>UNLOCKS.winningSeats(outcome).includes(seat))} onBack={()=>{setVictoryDismissed(true);setScreen('lobby');setTab('games');}} onPlayAgain={()=>{setVictoryDismissed(true);if(online)setScreen('room');else setSheet('restart');}} onRematch={()=>{setVictoryDismissed(true);setScreen('room');}} onFinalBoard={()=>setVictoryDismissed(true)} onShare={()=>share((outcome.draw?'A remarkable draw in ':((outcome.winningTeam?teamName(outcome.winner):seatName(id,outcome.winner))+' won '))+(definition?.name||id)+' · Antarctic Kingdoms','Antarctic Kingdoms match result')}/>}
      <header className="match-header"><button className="icon-btn" aria-label="Back to games" onClick={()=>{setScreen('lobby');setTab('home');}}><ArrowLeft size={24}/></button><div><h1><GameTitle id={id}/></h1><small>{online?`Room ${room.roomCode} · ${inviteStatus}`:local.mode==='hotseat'?'On this phone':'Bot Practice'}</small></div><div className="header-controls">{headerControls}<button className="fair-mini" aria-label="Open Fair Play" onClick={()=>setSheet('fair-play')}><Shield size={15}/></button><button className="icon-btn" aria-label="Match options" onClick={()=>setSheet('options')}><MoreHorizontal/></button></div></header>
      {online&&room.fair?.pending&&<div className="fair-pending-roll" role="status"><span>Your signed roll is fixed. Waiting for public randomness…</span>{me?.id===room.fair.pending.signed.intent.actor&&<button disabled={busy||connection!=='online'} onClick={()=>run(()=>command('ap_game_action',{revision:room.revision,actionId:room.fair.pending.signed.intent.actionId}))}>Retrieve roll</button>}</div>}{id==='dominion'&&teamGame(state)&&<p className="match-team-banner">2v2 · Green + Pink vs Red + Blue{online?` · You: ${teamName(me?.seat)}`:''}</p>}
      <div className={`players-strip ${definition.players===4?'four-players':''}`}>{(id==='dominion'?['green','blue','red','yellow']:definition.seats).map(color=>{const player=online?room.players.find(p=>p.seat===color):{name:local.mode==='hotseat'?`${seatName(id,color)} player`:local.humans.includes(color)?profile.name:`${seatName(id,color)} bot`,bot:local.mode!=='hotseat'&&!local.humans.includes(color)};const eliminated=state.eliminatedTeams?.includes(color),current=turn(state)===color&&!outcome;return <div className={`player-pill ${current?'current':''} ${eliminated?'eliminated':''}`} key={color}><Avatar color={color} gameId={id} size={36} online={online&&!!player?.connected}/><span><strong>{player?.name||seatName(id,color)}</strong>{id==='dominion'&&teamGame(state)&&<small>{teamName(color)}</small>}<small>{eliminated?'Eliminated':current?(canAct?'Your turn':thinking?'Thinking…':`${seatName(id,color)}’s turn`):player?.bot?'Bot':seatName(id,color)}</small></span></div>;})}</div>
      {online&&connection!=='online'&&<button className="offline-banner" onClick={()=>run(()=>roomClient.connect())}><WifiOff size={15}/> Connection interrupted. Tap to reconnect.</button>}
      {id!=='dominion'&&<p className="board-perspective" role="status"><i style={{background:COLORS[perspective]}}/>{seatName(id,perspective)} at the bottom{!online&&local.mode==='hotseat'?` · Pass the phone to ${seatName(id,perspective)}`:''}</p>}
      <main className={`match-content ${id==='dominion'?'dominion-match':''}`}>{!outcome&&<MatchDiscovery id={id} access={hallAccess} eligible={online||local.progressEligible!==false} onJourney={showJourney}/>}<ChaturangaBoardSpace id={id}><div className={`match-board-wrap personal-table trim-${collection.table}`}><Board id={id} state={state} legal={legal} selected={selected} suggested={suggested} trail={trail} onSelect={setSelected} onTarget={target} canAct={canAct} perspective={perspective} compactControls={id==='dominion'} controlsTarget={id==='dominion'?boardToolsTarget:null}/></div></ChaturangaBoardSpace>{id==='dominion'&&!outcome&&<DiceTray state={state} legal={legal} canAct={canAct} onAction={commit} onChoices={openTurnChoices} onRoll={()=>chooseDice(rollActionId(state))} onSelect={setSelected} onHelp={()=>setSheet('dominion-roll-help')}/>}
        <section className="command-area">
          {id==='dominion'&&<div className={'board-controls-slot '+(outcome?'finished':'')} ref={setBoardToolsTarget}/>}
          {id!=='dominion'&&local?.guide&&!online&&<div className="first-move-guide" role="status">{companion.preferences.mode!=='off'&&<img className="guide-face" src={GUIDES[GAME_HERITAGE[id].host].image} alt={GUIDES[GAME_HERITAGE[id].host].name}/>}<span><strong>{id==='dominion'&&!state.dice.rolled?'1. Roll both dice':selected?`${id==='dominion'?'3':'2'}. Choose a highlighted destination`:`${id==='dominion'?'2':'1'}. Select the piece with the gold ring`}</strong><small>{id==='dominion'&&!state.dice.rolled?'The dice activate pieces for this turn. Each die permits one move.':selected?'Blue dots are empty legal destinations. Orange rings mark captures.':'This is an offline learning table. Every highlighted move follows the real rules.'}</small></span></div>}
          {outcome?<><div className="result-card"><strong>{outcome.draw?'Draw':`${outcome.winningTeam?teamName(outcome.winner):seatName(id,outcome.winner)} wins`}</strong><span>{outcome.reason}</span><button onClick={()=>online?setScreen('room'):setSheet('restart')}>{online?'Return to table':'Play again'}</button><ReactionPicker host={companion.host} preferences={companion.preferences} onReact={sendReaction} disabled={busy||(online&&connection!=='online')}/></div><AfterMatchDiscovery id={id} access={hallAccess} won={UNLOCKS.winningSeats(outcome).includes(online?me?.seat:local.humans?.[0])} eligible={online||local.progressEligible!==false} onJourney={showJourney} onFormations={()=>formations(discovery.destinations(id,hallAccess.state())[0])}/></>:<>
            <div className="turn-line"><span className={`turn-dot ${checked?'check':''}`} style={{background:COLORS[turn(state)]}}/><strong>{checked?`${turnName} is in check`:thinking?'Thinking…':canAct?(online||local.mode!=='hotseat'?'Your turn':`${turnName} to move`):`${turnName} to move`}</strong><button aria-label="Read game rules" onClick={()=>openLearning(id,'full-rules')}><BookOpen size={17}/></button></div>
            <p className="selection-hint">{loadingLegal?'Checking the position…':selectedUnit?`${selectedUnit.label} · ${selectedActions.length} legal ${selectedActions.length===1?'action':'actions'}`:canAct?id==='dominion'&&!state.dice.rolled?'Choose your dice to activate pieces.':'Tap a piece to see its legal moves.':thinking?'Your practice opponent is choosing a move.':'Waiting for the other player.'}</p>
            {id!=='dominion'&&trail&&!selected&&<p className="last-move-note">Last move: {trail.label}. Gold rings mark its move.</p>}
            {pocket.length>0&&<div className="hand-dock" aria-label="Captured pieces in hand">{pocket.map(p=><button className={selected===p.source?'selected':''} key={p.source} disabled={!canAct} onClick={()=>setSelected(p.source)} aria-label={`Drop ${p.label}, ${p.count} in hand`}><img src={p.sprite} alt=""/><small>{p.count>1?`×${p.count}`:p.label}</small></button>)}</div>}
            {selectedActions.some(a=>a.kind==='illuminate')&&<button className="primary" disabled={!canAct} onClick={()=>commit(selectedActions.find(a=>a.kind==='illuminate'))}>Illuminate exposed pieces</button>}
            {id!=='dominion'&&selectedActions.length>0&&<div className="destinations" aria-label="Legal destinations">{selectedActions.filter((a,index,list)=>a.target&&list.findIndex(b=>b.target===a.target)===index).map(a=><button disabled={!canAct} key={a.target} onClick={()=>target(a.target)}>{a.kind==='castle'?'Castle → ':visible.some(p=>p.cell===a.target)?'Capture → ':'Move → '}{a.target}</button>)}</div>}
            {state.alliance&&<p className="alliance-note">Alliance: {state.alliance.map(color=>seatName(id,color)).join(' + ')}</p>}
            {state.hanOwner&&<p className="alliance-note gold">Han is controlled by {seatName(id,state.hanOwner)}. Yellow pieces keep their original artwork.</p>}
          </>}
          <CompanionDock companion={companion} onOpen={openCamp} onSettings={()=>setSheet('mascot-settings')} inline hidden={id==='dominion'||!!sheet||chatOpen||!!promotion}/>
        </section>
      </main>
      <footer className="chat-bar"><button aria-label="Open table chat" onClick={()=>setChatOpen(true)}><MessageCircle size={23}/>{currentChats.length>0&&<i/>}</button><form onSubmit={sendChat}><input value={chatText} onChange={e=>setChatText(e.target.value)} onFocus={()=>setChatOpen(true)} placeholder={online?'Say hello…':'Notes on this phone…'} aria-label="Chat message" maxLength={500}/><button type="submit" disabled={busy||!chatText.trim()||(online&&connection!=='online')} aria-label="Send message"><Send size={23}/></button></form></footer>
    </>}

    {sheet==='fair-play'&&<Sheet title="Fair Play" wide onClose={()=>setSheet(null)}><FairPlayHub room={session?room:null} session={session} client={roomClient} onClose={()=>setSheet(null)}/></Sheet>}
    {chatOpen&&screen==='match'&&<Sheet title={online?'Campfire · Private table chat':'Table notes'} onClose={()=>setChatOpen(false)}><p className="muted">{online?'Only the players in this private room can read this conversation.':'These notes are saved for this session on this phone.'}</p><div className="chat-history">{currentChats.length?currentChats.map(message=><article className={`chat-message ${message.playerId===profile.id?'mine':''}`} key={message.id}><strong style={{color:COLORS[message.seat]}}>{message.name}</strong><ReactionContent text={message.text} preferences={companion.preferences}/><time>{new Date(message.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></article>):<div className="empty compact"><MessageCircle/><p>Say hello and enjoy the game.</p></div>}<div ref={chatEnd}/></div><ReactionPicker host={companion.host} preferences={companion.preferences} onReact={sendReaction} disabled={busy||(online&&connection!=='online')}/><form className="inline-form" onSubmit={sendChat}><input value={chatText} onChange={e=>setChatText(e.target.value)} autoFocus placeholder={online?'Message your table…':'Write a note…'} maxLength={500} aria-label="Chat message"/><button type="submit" className="primary" aria-label="Send message" disabled={busy||!chatText.trim()||(online&&connection!=='online')}><Send size={20}/></button></form></Sheet>}
    {sheet==='game'&&<Sheet title={game(picked).name} onClose={()=>setSheet(null)}>
      <CompactGamePanel id={picked} onPractice={()=>openLearning(picked,'sandbox')}>
      {storyOptions.enabled&&<div className="hall-game-intro"><p className="world-eyebrow">THE ETERNAL GATHERING</p><h3>{HALLS[picked].name}</h3><p>{HALLS[picked].signature}</p><button className="text-button" onClick={()=>openHall(picked)}>Explore this hall <ChevronRight size={16}/></button></div>}<div className="game-sheet-heading"><img src={asset(game(picked).icon)} alt=""/><div><p>{game(picked).subtitle}</p><small>{game(picked).players} players · {openingText(picked)}</small></div></div>
      {read(`practice.${picked}`,null)&&<button className="primary full" onClick={()=>resumePractice(picked)}>Continue saved practice</button>}
      <button className="learn-mode-row" onClick={()=>openLearning(picked)}><BookOpen size={22}/><span><strong>How to play</strong><small>Learn one move at a time</small></span><ChevronRight size={20}/></button>
      {picked==='dominion'&&<DominionSetup mode={dominionMode} onMode={setDominionMode} seat={seat} onSeat={setSeat}/>}
      <button className="mode-row" disabled={busy} onClick={()=>run(createRoom)}><span className="mode-icon"><Users/></span><span><strong>Play with friends</strong><small>Signed moves · Check the record in Fair Play</small></span><ChevronRight/></button>
      {!read(`practice.${picked}`,null)&&<button className="mode-row primary game-play-now" aria-label="Practice with bots" disabled={busy} onClick={()=>run(()=>startPractice('bots'))}><span className="mode-icon warm"><Play/></span><span><strong>Quick play (vs bot)</strong><small>Practice with bots · Offline at your own pace</small></span><ChevronRight/></button>}
      <details className="game-more minimal-detail"><summary>More options <ChevronRight size={15}/></summary>
        <label className="field-label">Your seat</label><div className="seat-choice">{game(picked).seats.map(color=><button key={color} className={seat===color?'selected':''} onClick={()=>setSeat(color)}><i style={{background:COLORS[color]}}/>{seatName(picked,color)}</button>)}</div>
        <button className="mode-row" disabled={busy} onClick={()=>setSheet('join')}><span className="mode-icon"><Gamepad2/></span><span><strong>Join a room</strong><small>Have an invitation? Enter its code</small></span><ChevronRight/></button>
        <button className="mode-row" disabled={busy} onClick={()=>run(()=>startPractice('hotseat'))}><span className="mode-icon warm"><User/></span><span><strong>On this phone</strong><small>Pass the phone between players</small></span><ChevronRight/></button>
        {read(`practice.${picked}`,null)&&<button className="mode-row primary game-play-now" aria-label="Practice with bots" disabled={busy} onClick={()=>run(()=>startPractice('bots'))}><span className="mode-icon warm"><Play/></span><span><strong>Quick play (vs bot)</strong><small>Practice with bots · Offline at your own pace</small></span><ChevronRight/></button>}
        
        <button className="text-button" onClick={()=>openLearning(picked,'full-rules')}><BookOpen size={17}/>Full Rules with the mascots</button>
        <HeritageLabel id={picked} onClick={()=>setSheet('heritage')}/>
      </details>
      </CompactGamePanel>
    </Sheet>}
    {sheet==='dominion-turn'&&id==='dominion'&&state&&!state.dice.rolled&&!needsKingReturn(state)&&<Sheet title={dominionConfirm?'Are you sure?':'Your turn'} focusId={dominionConfirm?'dominion-no-skip':'dominion-roll-both'} onClose={()=>{if(!dicePending)setSheet(null);}}><DominionTurnPrompt state={state} confirm={dominionConfirm} busy={dicePending||busy||!canAct} onBoth={()=>chooseDice(rollActionId(state))} onAskSkip={()=>setDominionConfirm(true)} onSkip={()=>chooseDice('skip|control:skip')}/></Sheet>}
    {sheet==='dominion-roll-help'&&id==='dominion'&&state?.dice?.rolled&&<Sheet title="Your rolled moves" onClose={()=>setSheet(null)}><DominionRollGuide state={state} legal={legal} onClose={()=>setSheet(null)} onSelect={setSelected}/></Sheet>}
    {sheet==='dominion-room'&&<Sheet title="Create Chaturanga table" onClose={()=>setSheet(null)}><CompactRoomPanel><p className="muted">Choose your mode, team and kingdom before inviting friends.</p><DominionSetup mode={dominionMode} onMode={setDominionMode} seat={seat} onSeat={setSeat}/><button className="primary full" disabled={busy} onClick={()=>run(()=>createRoom('dominion',roomPostcardDraft,true))}><Users size={18}/> Create room</button><p className="muted">Friends can join from the Android app or Safari. Empty seats can be filled with bots.</p></CompactRoomPanel></Sheet>}
    {(sheet==='join'||sheet==='join-name')&&<Sheet title={sheet==='join-name'?'Your name':'Join a room'} focusId={sheet==='join-name'?'join-name':undefined} onClose={()=>setSheet(null)}><p className="muted">{sheet==='join-name'&&parseInvitation(joinCode)?<>Joining room <strong className="join-code-summary">{joinCode}</strong>. What should your friends call you? <button type="button" className="text-button join-change-code" onClick={()=>setSheet('join')}>Change room</button></>:'Enter your name and the room code your friend shared.'}</p><form className="join-room-form" onSubmit={e=>{e.preventDefault();run(()=>joinRoom(joinCode,nameDraft));}}><label className="field-label" htmlFor="join-name">Your name</label><input id="join-name" value={nameDraft} onChange={e=>setNameDraft(e.target.value)} maxLength={24} autoComplete="nickname" required/>{(sheet==='join'||!parseInvitation(joinCode))&&<><label className="field-label" htmlFor="room-code-1">Room code</label><RoomCodeInput id="room-code" value={joinCode} onChange={setJoinCode} required onInvalidPaste={()=>notify('Paste a valid room code or Antarctic Kingdoms invitation.')}/></>}<button className="primary full" type="submit" disabled={busy||!parseInvitation(joinCode)||!nameDraft.trim()}>Join table <ChevronRight size={18}/></button></form></Sheet>}
    {sheet==='name'&&<Sheet title="Your profile" onClose={()=>setSheet(null)}><div className="avatar-picker">{['blue','green','red'].map(color=><button className={profile.avatar===color?'selected':''} aria-label={`${color} avatar`} key={color} onClick={()=>{const next={...profile,avatar:color};setProfile(next);write('profile',next);}}><Avatar color={color} size={72}/></button>)}</div><label className="field-label" htmlFor="display-name">Display name</label><input className="text-input" id="display-name" value={nameDraft} onChange={e=>setNameDraft(e.target.value)} maxLength={24} autoComplete="nickname"/><button className="primary full" onClick={updateProfile}>Save profile</button><p className="muted center">Your name is shown to friends at the table.</p></Sheet>}
    {sheet==='heritage'&&<Sheet title="Origins & this edition" onClose={()=>setSheet(null)}><CompactInfoPanel><HeritageDetails id={picked}/><button className="primary full" onClick={()=>openLearning(picked,'quick-rules')}>Learn your first move</button><button className="text-button" onClick={()=>setSheet('game')}>Back to game</button></CompactInfoPanel></Sheet>}
    {sheet==='options'&&<Sheet title="Your game" onClose={()=>setSheet(null)}>{id==='sanyou'&&<button className="mode-row" onClick={()=>setSheet('board-positions')}><Settings/><span><strong>Board positions</strong><small>Adjust points or import your web editor file</small></span><ChevronRight/></button>}<button className="mode-row" onClick={()=>openLearning(id)}><BookOpen/><span><strong>How to play</strong><small>Three guided ways to learn</small></span><ChevronRight/></button>{online?<><button className="mode-row" onClick={()=>{setSheet(null);setScreen('room');}}><Users/><span><strong>Private table</strong><small>Room {room.roomCode}</small></span><ChevronRight/></button><button className="mode-row" onClick={roomPostcard}><Share2/><span><strong>Penguin invitation postcard</strong><small>Preview and share your private table</small></span><ChevronRight/></button><button className="mode-row" onClick={shareRoom}><Share2/><span><strong>Share room invitation</strong><small>Friends can rejoin their saved seats</small></span><ChevronRight/></button><button className="mode-row danger" onClick={()=>setSheet('leave')}><LogOut/><span><strong>Leave this match</strong><small>{['sannin','sanyou','dominion'].includes(id)?'A bot takes over your seat':'Resign from the game'}</small></span><ChevronRight/></button></>:<><button className="mode-row" onClick={undo} disabled={!local.history.length}><Undo2/><span><strong>Undo your last turn</strong><small>Available in offline practice</small></span><ChevronRight/></button><button className="mode-row" onClick={()=>setSheet('restart')}><RotateCcw/><span><strong>New game</strong><small>Start again with the same seats</small></span><ChevronRight/></button>{thinking&&<button className="text-button" onClick={()=>{worker.current?.terminate();worker.current=null;setRefresh(n=>n+1);}}>Retry bot move</button>}</>}</Sheet>}
    {sheet==='leave'&&<Sheet title="Leave this table?" onClose={()=>setSheet(null)}><p>{room?.status==='playing'?['sannin','sanyou','dominion'].includes(room.tableId)?'A casual bot will take over your seat. This cannot be undone.':'You will resign from this match. The other players can continue.':'Your seat will become available to another friend.'}</p><p className="muted">To pause and come back, use the back arrow instead. Your seat stays saved on this phone.</p><button className="primary full danger-bg" disabled={busy} onClick={()=>run(leave)}>Leave table</button><button className="secondary full" onClick={()=>setSheet(null)}>Keep my seat</button></Sheet>}
    {sheet==='restart'&&<Sheet title="Start a new game?" onClose={()=>setSheet(null)}><p>Your current practice position will be replaced.</p><button className="primary full" onClick={restart}>Start new game</button><button className="secondary full" onClick={()=>setSheet(null)}>Keep playing</button></Sheet>}
    {sheet==='help'&&<Sheet title="Play together" onClose={()=>setSheet(null)}><ol className="help-steps"><li>Android players can install the signed APK. iPhone players open the shared invitation in Safari and tap Play in browser. Both join the same table.</li><li>Choose your display name in Profile. Open Games and select a game from the seven-game collection.</li><li>Tap Play with friends. In Chaturanga choose Four-way or 2v2, then your team and kingdom. Share the invitation link or room code.</li><li>Your friends tap Join room and enter the code. Everyone taps I’m ready, then the host starts the game.</li><li>Invite two friends for three-player games, or three friends for Chaturanga. You can fill empty seats with casual bots.</li><li>Use the table chat while playing. Your seat is saved for reconnecting on this phone.</li></ol><p className="muted">Online rooms need an internet connection. The browser needs internet to load; the installed Android app supports offline play with a purchased Offline Access Pass. Share the browser link from Profile, or share an invitation from your private table.</p></Sheet>}
    {sheet==='expedition'&&<Sheet title={hallAccess.allowed('yanyi').open?'The Sleeping Han Court':'Unlock Sanguo Yan Yi Qi'} wide onClose={()=>setSheet(null)}>{hallAccess.allowed('yanyi').open?<FrozenLibrary preferences={companion.preferences} onPractice={()=>run(()=>startPractice('bots',false,'yanyi','red'))} onLearningEvent={companion.learned} onDiscovery={learningDiscovery}/>:<LockedHall id="yanyi" access={hallAccess} onPrerequisite={gameId=>run(()=>playJourneyGame(gameId))} onFormations={formations} onKey={gameId=>{setJustOpened([gameId]);setSheet('hall-opened');}} onPay={accessShop} onPass={()=>accessShop('all-halls-v1')} onRules={gameId=>{setPicked(gameId);setSheet('access-rules');}}/>}</Sheet>}
    {sheet==='replays'&&<Sheet title="Replayable memories" wide onClose={()=>setSheet(null)}><ReplayLibrary preferences={companion.preferences} onAccount={()=>setSheet('account')}/></Sheet>}
    {sheet==='friend-challenge'&&challengeId&&<Sheet title="A discovery from a friend" wide onClose={()=>setSheet(null)}><FriendChallenge key={challengeId} challengeId={challengeId} preferences={companion.preferences} access={hallAccess} onLocked={openLocked}/></Sheet>}
    {sheet==='journey'&&<Sheet title="Your discovery journey" onClose={()=>setSheet(null)}><DiscoveryJourney access={hallAccess} target={discoveryTarget} onTarget={chooseDiscovery} onUnlock={gameId=>{chooseDiscovery(gameId);openLocked(gameId);}} onPlay={gameId=>run(()=>playJourneyGame(gameId))} onFormations={formations} onPass={()=>accessShop('all-halls-v1')} onBrowse={()=>{setSheet(null);setScreen('lobby');setTab('games');}}/></Sheet>}
    {sheet==='logout'&&<Sheet title="Log out on this phone?" onClose={()=>setSheet(null)}><div className="logout-panel"><span className="logout-seal"><LogOut size={27}/></span><h3>See you at the next table.</h3><p>Your saved boards stay on this phone. Account-linked hall access and purchases return when you sign in to the same account.</p><p className="muted">Keep your recovery code if you use one. Your wallet and NFTs stay yours.</p><button className="primary full" disabled={busy} onClick={()=>run(signOutCloud)}>Log out</button><button className="secondary full" onClick={()=>setSheet(null)}>Keep playing</button></div></Sheet>}
    {sheet==='unlock'&&<Sheet title={'Unlock '+game(picked).name} onClose={()=>setSheet(null)}><LockedHall id={picked} access={hallAccess} pendingInvite={pendingInvite?.gameId===picked?pendingInvite:null} onPrerequisite={gameId=>run(()=>playJourneyGame(gameId))} onFormations={formations} onKey={gameId=>{setJustOpened([gameId]);setSheet('hall-opened');}} onPay={accessShop} onPass={()=>accessShop('all-halls-v1')} onRules={gameId=>{setPicked(gameId);setSheet('access-rules');}}/></Sheet>}
    {sheet==='formations'&&<Sheet title="Earn a Lantern Key" onClose={()=>setSheet(null)}><FormationRoute access={hallAccess} target={formationTarget} onFoundation={()=>setSheet('foundation')} onChoose={openLocked} onReturn={()=>{setSheet(null);setScreen('lobby');setTab('games');}}/></Sheet>}
    {sheet==='foundation'&&<Sheet title="Nine Ice Forts" onClose={()=>setSheet('formations')}><FoundationGame access={hallAccess} onKeys={()=>setSheet('formations')} onClose={()=>setSheet('formations')}/></Sheet>}
    {sheet==='access-shop'&&<Sheet title="Hall access" onClose={()=>setSheet(null)}><AccessShop access={hallAccess} selected={accessProduct} onAccount={()=>setSheet('account')} onFormations={()=>formations()}/></Sheet>}
    {sheet==='access-rules'&&<Sheet title={'Basic rules · '+game(picked).name} onClose={()=>openLocked(picked)}><div className="access-basic-rules">{RULES[picked].slice(0,2).map(section=><section key={section.title}><h3>{section.title}</h3>{section.paragraphs.map(p=><p key={p}>{p}</p>)}</section>)}<button className="primary full" onClick={()=>openLocked(picked)}>Choose an unlock route</button></div></Sheet>}
    {sheet==='hall-opened'&&<Sheet title="A new hall is open" onClose={()=>setSheet(null)}><HallOpened access={hallAccess} onJourney={showJourney} ids={justOpened} pendingInvite={pendingInvite&&hallAccess.allowed(pendingInvite.gameId).open?pendingInvite:null} onPlay={gameId=>run(()=>startPractice('bots',false,gameId,'red'))} onInvitation={()=>run(()=>joinRoom(pendingInvite.code,pendingInvite.name))} onHalls={()=>{setSheet(null);setScreen('lobby');setTab('games');}}/></Sheet>}
    {sheet==='collection'&&<Sheet title="Companion collections" onClose={()=>setSheet(null)}><CampCollection preferences={companion.preferences} onAccount={()=>setSheet('account')} onStudio={()=>setSheet('camp-studio')}/></Sheet>}
    {sheet==='camp-studio'&&<Sheet title="Your Camp studio" onClose={()=>setSheet('companions')}><CampStudio journey={companion.journey} host={companion.campHost} preferences={companion.preferences} onMemory={openPostcard}/></Sheet>}
    {sheet==='board-positions'&&<Sheet title="San You Qi board editor" wide onClose={()=>setSheet(null)}><BoardCalibrator onClose={()=>setSheet(null)}/></Sheet>}
    {sheet==='antarctic-visa'&&<Sheet title="Your Antarctic Visa" onClose={()=>setSheet(null)}><VisaPassportSummary visa={visa}/></Sheet>}
    {sheet==='wallet'&&<Sheet title="Wallet" onClose={()=>setSheet(null)}><PassportWallet/></Sheet>}
    {sheet==='online-account'&&<Sheet title="Online account" onClose={()=>setSheet(null)}><AccountEntry access={playAccess} halls={hallAccess} forceSignIn onClose={()=>setSheet(null)}/></Sheet>}
    {sheet==='account'&&<Sheet title="Progress & recovery" onClose={()=>setSheet(null)}><AccountPanel onLogout={()=>setSheet('logout')} onOffline={()=>accessShop('offline-access-v1')} onAccessRefresh={playAccess.refresh}/></Sheet>}
    {sheet==='updates'&&<Sheet title="App updates" onClose={()=>setSheet(null)}>{window.Android?<AppUpdates onRelease={update.accept}/>:<BrowserUpdates/>}</Sheet>}
    {sheet==='daily'&&puzzle&&<Sheet title="A little puzzle with Ziggy" wide onClose={()=>setSheet(null)}><DailyPuzzleExperience puzzle={puzzle} preferences={companion.preferences} onLearningEvent={companion.learned} onDiscovery={learningDiscovery} onClose={()=>setSheet(null)}/></Sheet>}
    {sheet==='memories'&&<Sheet title="Your shared memories" onClose={()=>setSheet(null)}><button className="learn-mode-row" onClick={()=>setSheet('replays')}><Play/><span><strong>Replay my discoveries</strong><small>Watch a move · Challenge a friend</small></span><ChevronRight/></button><MemoryArchive journey={companion.journey} onMemory={openPostcard} onLearn={()=>openLearning()}/></Sheet>}
    {sheet==='learning-library'&&<Sheet title="Your learning library" onClose={()=>setSheet(null)}><ArchiveJournal games={GAME_LIST} journal={journal} onLearn={gameId=>openLearning(gameId,'course')}/></Sheet>}
    {sheet==='postcard'&&postcard&&<Sheet title="Your penguin postcard" onClose={()=>setSheet(null)}><PostcardView frameStyle={collection.frame} memory={postcard} profile={profile} invitation={postcardInvitation} onShare={sharePostcard} onInvite={postcardInvitation?null:()=>run(addPostcardInvite)} onRemoveInvite={()=>setPostcard({...postcard,withInvitation:false})}/></Sheet>}
    {sheet==='companions'&&<Sheet title="Your mascot companions" onClose={()=>setSheet(null)}><div className={collection.camp==='aurora'?'camp-decor aurora-camp':'camp-decor'}><ExpeditionEntry onOpen={()=>setSheet('expedition')}/><CollectionEntry onOpen={()=>setSheet('collection')}/>{world.revealedAt&&<button className="home-passport-link" onClick={()=>openPostcard(guestPostcard())}><span aria-hidden="true">✦</span><span><strong>Gathering Guest</strong><small>Your free Eighth Lantern keepsake</small></span><ChevronRight size={17}/></button>}<CompanionCamp companion={companion} appearance={{...collection,outfits:{...companion.journey.outfits,...collection.outfits}}} onStudio={()=>setSheet('camp-studio')} onMemory={openPostcard} onLearn={()=>openLearning(id||picked)} onSettings={()=>setSheet('mascot-settings')} exploreLabel={screen==='lobby'?'Find a game together':screen==='match'?'Back to my game':'Back to my table'} onExplore={()=>{setSheet(null);if(screen==='lobby')setTab('games');}}/></div></Sheet>}
    {sheet==='mascot-settings'&&<Sheet title="Mascot companions" onClose={()=>setSheet(null)}><CompanionSettings companion={companion} onMeet={()=>openCamp(companion.preferences.guide==='auto'?'polly':companion.preferences.guide)}/></Sheet>}
    {sheet==='about'&&<Sheet title="Antarctic Kingdoms" onClose={()=>setSheet(null)}><div className="about-brand"><img src={BRAND.icon} alt="Antarctic Kingdoms penguin game-piece emblem"/><h3>{BRAND.tagline}</h3><p>{BRAND.company}</p></div><p>The Eternal Gathering is a fictional Antarctic celebration. Lantern Harbor welcomes living traditions, historical variants and modern adaptations. Every game keeps its own origins and chosen rules.</p><p>Shogi, Sannin Shogi, Sanguo Qi, San You Qi, Sanguo Yan Yi Qi, Xiangqi and Chaturanga, in a phone-friendly Android app and browser edition.</p><p>Your profile, favorites and saved boards stay on this phone. The unlock service saves solved formation proofs, key spending and verified game results under your player identity. Complete winning move records are sent to verify offline unlocks when the service is available. Signed-in accounts restore learning progress, hall access and purchases. An account and internet connection are required to play unless this account owns a verified Offline Access Pass. Online room moves and chat are held by the game server. Keep your app data and recovery code to reconnect.</p><p>The app requests internet access. It does not request contacts, location, camera or storage permissions. Sharing uses Android’s share sheet.</p><p>Previously Arctic Play. Your existing profile, favorites, saved games and room invitations continue here. Our four-player Chaturanga edition keeps its existing dice and team rules.</p><p className="muted">Version {APP_VERSION}. {window.Android?'Android 7.0 and newer.':'Browser edition.'} Casual bots are for practice.</p></Sheet>}

    {sheet==='hall'&&<Sheet title={game(picked).name+' · Hall'} onClose={()=>setSheet(null)}><HallDetail key={picked} id={picked} progress={world} preferences={companion.preferences} onChallenge={openHallChallenge} onPlay={pick} onInvite={gameId=>run(()=>createRoom(gameId))} onQuickPlay={gameId=>run(()=>startPractice('bots',false,gameId,'red'))} onRules={gameId=>openLearning(gameId)} onFree={gameId=>openLearning(gameId,'sandbox')} onNext={openHall} onPostcard={openHallPostcard} soundEnabled={storyOptions.sound} onSound={sound=>saveStoryOptions({...storyOptions,sound})}/></Sheet>}
    {sheet==='gathering-intro'&&<Sheet title="Your invitation to the Gathering" onClose={()=>setSheet(null)}><OpeningStory onClose={()=>setSheet(null)} motion={companion.preferences.motion&&!(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)}/></Sheet>}
    {sheet==='kingdom-cover'&&<Sheet title="Antarctic Kingdoms · Lantern Harbor" onClose={()=>setSheet('world-guide')}><img className="kingdom-portrait" src="art/launch-v1/kingdom-portrait-v1.webp" alt="Nova, Rocco, Piko and Ziggy welcome players to icy cultural halls, surrounded by board pieces and worlds from the nine-game collection"/><button className="primary full" onClick={()=>{setSheet(null);setTab('games');}}>Enter the Kingdom</button></Sheet>}
    {sheet==='world-guide'&&<Sheet title="The Eternal Gathering" onClose={()=>setSheet(null)}><button className="secondary full" onClick={()=>setSheet('kingdom-cover')}>See the Kingdom · Portrait cover</button><button className="secondary full" onClick={()=>{setGamesView('story');setSheet('story-adventure');}}>Story Adventure · Nine games</button><WorldGuide preferences={companion.preferences} onHall={openHall}/></Sheet>}
    {sheet==='story-adventure'&&<Sheet title="Story Adventure" onClose={()=>setSheet('world-guide')}>
      <nav className="ak-games-views" aria-label="Story Adventure gallery views" data-testid="games-view-tabs">{[['story','Story Adventure'],['all','All Games'],['halls','Halls']].map(([value,label])=><button key={value} type="button" aria-pressed={gamesView===value} onClick={()=>setGamesView(value)}>{label}</button>)}</nav>
      {gamesView==='story'?<StoryAdventureGallery access={hallAccess} onIntroduce={setIntroduction} onPlay={launchPlay}/>:
      gamesView==='all'?<AllGamesGallery filter="All" favorites={favorites} onFavorite={toggleFavorite} onIntroduce={setIntroduction} onPlay={launchPlay}/>:
      <CulturalGames filter="All" favorites={favorites} onFavorite={toggleFavorite} onIntroduce={setIntroduction} onPlay={launchPlay} onLearn={openLearning} access={hallAccess} progress={world.halls}/>}
      <InstallWebApp/>
    </Sheet>}
    {sheet==='passport'&&<Sheet title="Your Lantern Passport" onClose={()=>setSheet(null)}><LanternPassport progress={world} onHall={openHall} onReveal={()=>setSheet('eighth-lantern')} onInterlude={()=>setSheet('gathering-interlude')} onPostcard={()=>openPostcard(guestPostcard())}/></Sheet>}
    {sheet==='eighth-lantern'&&<Sheet title="The Eighth Lantern" onClose={()=>setSheet(null)}><EighthLantern progress={world} preferences={companion.preferences} onRevealed={()=>saveGathering(revealGathering(world))} onPostcard={()=>openPostcard(guestPostcard())} onInvite={()=>setSheet('festival-invite')}/></Sheet>}
    {sheet==='gathering-interlude'&&<Sheet title="At the Gathering Table" onClose={()=>setSheet(null)}><GatheringInterlude preferences={companion.preferences}/></Sheet>}
    {sheet==='story-settings'&&<Sheet title="Stories & atmosphere" onClose={()=>setSheet(null)}><GatheringSettings settings={storyOptions} onSettings={saveStoryOptions} onIntro={()=>setSheet('gathering-intro')} onGuide={()=>setSheet('world-guide')} onPassport={()=>setSheet('passport')}/></Sheet>}
    {sheet==='festival-stickers'&&<Sheet title="Your festival stickers" onClose={()=>setSheet(null)}><FestivalStickerAlbum preferences={companion.preferences} onShare={sharePostcard}/></Sheet>}
    {sheet==='festival-invite'&&<Sheet title="Bring a friend to the festival" onClose={()=>setSheet(null)}><img className="festival-story-banner" src={CELEBRATION_ART.friends} alt="A celebration is better with a friend" width="1200" height="800" loading="lazy"/><p>Choose a hall to create a real private room, then share its invitation. Friends can use the Android app or Safari with an internet connection.</p>{HALL_ORDER.map(gameId=><button className="mode-row" disabled={busy} key={gameId} onClick={()=>run(()=>createRoom(gameId))}><img className="invite-piece" src={asset(game(gameId).icon)} alt=""/><span><strong>{HALLS[gameId].name}</strong><small>{game(gameId).name} · {game(gameId).players} seats</small></span><ChevronRight size={18}/></button>)}<p className="muted">You can fill empty seats with casual bots. Your saved friend names are local to this phone.</p></Sheet>}
    {promotion&&<Sheet title={id==='dominion'?'Choose your die':'Choose your move'} onClose={()=>setPromotion(null)}><p>This destination has more than one legal action.</p>{promotion.map(a=><button className="primary full" key={a.id} onClick={()=>commit(a)}>{id==='dominion'?`Use die ${a.raw.dieIndex+1} (${state.dice.values[a.raw.dieIndex]})`:a.kind==='castle'?'Castle':a.promote?'Promote':'Keep unpromoted'}</button>)}</Sheet>}
    {notice&&<div className="toast" role="status" onClick={()=>setNotice('')}>{notice}</div>}
    {busy&&<div className="busy-indicator" role="status"><span/> {connection==='connecting'?'Connecting to your table…':'One moment…'}</div>}
  </div></MascotAppearanceContext.Provider>;
}
class StartupBoundary extends React.Component {
  constructor(props){super(props);this.state={failed:false};}
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error){window.ArcticStartup?.fail(error);}
  render(){return this.state.failed?null:this.props.children;}
}
createRoot(document.getElementById('root')).render(<StartupBoundary>{['launch-dashboard','launch-operations'].includes(new URLSearchParams(location.search).get('view'))?<LaunchDashboard operations={new URLSearchParams(location.search).get('view')==='launch-operations'}/>:<App/>}</StartupBoundary>);
