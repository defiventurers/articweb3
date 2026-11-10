import React,{createContext,useContext,useCallback,useEffect,useRef,useState} from 'react';
import {ChevronRight,Heart,MessageCircle,Moon,Settings,Sparkles,X} from 'lucide-react';
import {GUIDES} from './brand.js';
import {read,write} from './storage.js';
import {useCompanionJourney} from './useCompanionJourney.jsx';
import {portraitFor} from './collectionModel.js';
import {CampScene,MemoryPin} from './CampStudio.jsx';
import {bond,OUTFITS,hostMemories,rememberedGreeting} from './companionJourney.js';
export const MascotAppearanceContext=createContext({outfits:{}});
import {CHAT_PROMPTS,COMPANION_KEY,companionPreferences,companionLine,companionMood,hostFor,allowCompanionEvent} from './companions.js';

export function useCompanions(context){
  const progress=useCompanionJourney(),progressRef=useRef(progress);progressRef.current=progress;
  const [preferences,setStored]=useState(()=>companionPreferences(read(COMPANION_KEY,null)));
  const [message,setMessage]=useState(null),[campHost,setCampHost]=useState('polly'),[snoozed,setSnoozed]=useState(false),[history,setHistory]=useState([]);
  const latest=useRef({});latest.current={context,preferences,snoozed};
  const last=useRef(null),dismissedUntil=useRef(0),sequence=useRef(0),variants=useRef({});
  const react=useCallback((event,extra={},manual=false,override)=>{
    const {context,preferences,snoozed}=latest.current;
    if(preferences.mode==='off')return;
    const now=Date.now(),key=extra.key||`${event}:${context.screen}:${context.tab}:${context.gameId||''}`;
    if(!manual&&!allowCompanionEvent({preferences,last:last.current,event,now,key,visible:document.visibilityState!=='hidden',blocked:context.blocked||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName),snoozed,dismissedUntil:dismissedUntil.current}))return;
    const host=override||hostFor(event,context,preferences),variantKey=`${host}:${event}`,variant=variants.current[variantKey]||0;
    variants.current[variantKey]=variant+1;
    const next={id:++sequence.current,host,text:(event==='welcome'?rememberedGreeting(progressRef.current.journey,host):null)||companionLine(event,{...context,...extra},variant,host),mood:companionMood(event),manual,event};
    last.current={at:now,key,event};setMessage(next);setCampHost(host);
    if(manual){setSnoozed(false);dismissedUntil.current=0;setHistory(current=>[...current,{...next,prompt:CHAT_PROMPTS.find(p=>p.id===event)?.label||'Meet your guide'}].slice(-6));}
  },[]);
  const update=useCallback(patch=>{
    const next=companionPreferences({...latest.current.preferences,...patch});
    latest.current.preferences=next;setStored(next);write(COMPANION_KEY,next);
    setMessage(null);last.current=null;dismissedUntil.current=0;
    if(next.mode==='off')setHistory([]);
  },[]);
  const dismiss=()=>{progressRef.current.metric('mascot_dismissed');setMessage(null);dismissedUntil.current=Date.now()+60000;};
  const snooze=()=>{setSnoozed(true);setMessage(null);};
  const wake=()=>{setSnoozed(false);latest.current.snoozed=false;react('hello',{},true);};
  const meet=host=>{setCampHost(host);react('hello',{},true,host);};

  useEffect(()=>{
    const pause=()=>{document.documentElement.dataset.mascotsPaused=document.visibilityState==='hidden'?'true':'false';};
    pause();document.addEventListener('visibilitychange',pause);
    return()=>{document.removeEventListener('visibilitychange',pause);delete document.documentElement.dataset.mascotsPaused;};
  },[]);

  useEffect(()=>{
    const event=context.screen==='match'?'match':context.screen==='room'?'room':context.tab==='games'?'welcome':'navigate';
    react(event,{key:`route:${context.screen}:${context.tab}:${context.gameId||''}:${context.roomCode||''}`});
  },[context.screen,context.tab,context.gameId,context.roomCode,preferences.mode,react]);
  useEffect(()=>{
    if(preferences.mode!=='lively'||snoozed||context.screen==='match'||context.blocked)return;
    let activeAt=Date.now();
    const activity=()=>{activeAt=Date.now();};
    const visibility=()=>{activeAt=Date.now();};
    window.addEventListener('pointerdown',activity,{passive:true});window.addEventListener('keydown',activity);document.addEventListener('visibilitychange',visibility);
    const timer=setInterval(()=>{
      if(document.visibilityState==='hidden'||Date.now()-activeAt<75000)return;
      react('idle',{key:`idle:${++sequence.current}`});activeAt=Date.now();
    },15000);
    return()=>{clearInterval(timer);window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',activity);document.removeEventListener('visibilitychange',visibility);};
  },[preferences.mode,snoozed,context.screen,context.blocked,react]);
  const fallbackHost=hostFor('navigate',context,preferences);
  return {...progress,preferences,update,message,history,campHost,meet,talk:(prompt,host=campHost)=>react(prompt,{},true,host),react,dismiss,snoozed,snooze,wake,host:message?.host||fallbackHost};
}

export function MascotPortrait({host,mood='listening',motion=true,large=false,pulse=0}){const guide=GUIDES[host],appearance=useContext(MascotAppearanceContext),pose=({calm:'listening',wave:'wave',celebrate:'celebrate',curious:'curious',thinking:'thinking',pleased:'pleased'})[mood]||'listening',outfit=appearance.outfits?.[host]||'none';return <span key={`${host}:${pose}:${pulse}`} className={`mascot-portrait director-mascot host-${host} ${large?'large':''} ${motion?'animated':''} mood-${pose}`} data-pose={pose} data-outfit={outfit} aria-hidden="true" style={{'--host':guide.color}}><img src={`art/launch-v1/${host==='pengu'?'hosts':'host-cutouts'}/${host}.webp`} alt="" draggable="false"/>{outfit!=='none'&&!portraitFor(host,outfit)&&<svg className="mascot-outfit" viewBox="0 0 100 100" aria-hidden="true">{outfit==='scarf'?<g fill={guide.color} stroke="#18324b" strokeWidth="1.3"><path d="M29 48 Q50 55 71 48 L70 55 Q50 62 30 55Z"/><path d="M57 56 L67 55 L68 75 L59 74Z"/></g>:outfit==='beanie'?<g fill={guide.color} stroke="#18324b" strokeWidth="1.3"><path d="M28 18 Q29 3 50 3 Q71 3 72 18Z"/><rect x="27" y="16" width="46" height="7" rx="3"/><circle cx="50" cy="3" r="5"/></g>:<g><path d="M39 51 L50 65 L61 51" fill="none" stroke={guide.color} strokeWidth="5"/><circle cx="50" cy="67" r="7" fill="#ffd477" stroke="#ad792f" strokeWidth="1.2"/><path d="m50 62 1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5L45 65.5l3.5-.5Z" fill="#fff0b8"/></g>}</svg>}<MemoryPin id={appearance.pin}/></span>;}

export function CompanionDock({companion,onOpen,onSettings,inline=false,hidden=false}){
  const {preferences,message,host,snoozed}=companion;
  if(preferences.mode==='off'||hidden)return null;
  const guide=GUIDES[host],text=snoozed?'Taking a quiet moment. Tap to wake me.':message?.text|| (preferences.mode==='quiet'?'Quiet company. Tap when you’d like a chat.':'Here beside you. Tap to visit our camp.');
  return <aside className={`companion-dock ${inline?'inline':'floating'}`} aria-label="Mascot companion" style={{'--host':guide.color}} data-motion={preferences.motion?'on':'off'}>
    <button className="companion-main" aria-label={`Talk with ${guide.name}`} onClick={()=>{if(snoozed)companion.wake();onOpen(host);}}><MascotPortrait host={host} mood={message?.mood} motion={preferences.motion&&!snoozed} pulse={message?.id}/><span><strong>{guide.name} <span>{snoozed?'RESTING':preferences.mode==='quiet'?'QUIET COMPANY':'WITH YOU'}</span></strong><span className="companion-line">{text}</span></span></button>
    <div className="companion-tools">{message&&!snoozed?<button aria-label="Dismiss mascot message" onClick={companion.dismiss}><X size={16}/></button>:<button aria-label="Mascot settings" onClick={onSettings}><Settings size={16}/></button>}</div>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{message&&!snoozed?`${guide.name}: ${message.text}`:''}</span>
  </aside>;
}

export function CompanionCamp({companion,onSettings,onExplore,onLearn,onMemory,appearance={},onStudio,exploreLabel='Find a game together'}){
  const {preferences,campHost,meet,talk,message,history}=companion,guide=GUIDES[campHost];
  const disabled=preferences.mode==='off',friendship=bond(companion.journey,campHost),memories=hostMemories(companion.journey,campHost),lastMemory=memories.at(-1);
  const latest=history.filter(item=>item.host===campHost).at(-1);
  return <div className="companion-camp" data-motion={preferences.motion?'on':'off'}>
    <p className="camp-kicker"><Sparkles size={14}/> THE FOUR-FLIPPER CAMP</p>
    <p className="camp-intro">A little company for your next adventure.</p>
    <div className="camp-roster" aria-label="Choose a mascot">{Object.entries(GUIDES).map(([key,host])=><button key={key} aria-label={`Meet ${host.name}`} aria-pressed={campHost===key} onClick={()=>meet(key)} style={{'--host':host.color}}><MascotPortrait host={key} motion={false}/><strong>{host.name}</strong><i/></button>)}</div>
    <CampScene appearance={appearance} host={campHost} showHost={!disabled} mood={message?.host===campHost?message.mood:'listening'} motion={preferences.motion&&!disabled} pulse={message?.id} onHost={disabled?null:()=>talk('celebrate',campHost)} onMemory={onMemory}/><div className="camp-room-identity camp-identity"><h3>{guide.name}</h3><span>{guide.role}</span></div>{onStudio&&<button className="secondary full camp-studio-entry" onClick={onStudio}>Make Camp yours <ChevronRight size={16}/></button>}
    <div className="camp-bond"><strong>{friendship.level}</strong><span>{friendship.count} shared {friendship.count===1?'memory':'memories'}</span></div>{lastMemory&&<p className="camp-last-memory">We remember: {lastMemory.title}.</p>}<details className="camp-personalise"><summary>Make camp yours</summary><p>Memories stay earned whenever you take a break.</p><div className="outfit-choices">{OUTFITS.map(item=><button key={item.id} disabled={friendship.count<item.need} aria-pressed={companion.journey.outfits[campHost]===item.id} onClick={()=>companion.outfit(campHost,item.id)}>{item.label}<small>{friendship.count<item.need?`${item.need} memories`:companion.journey.outfits[campHost]===item.id?'Wearing':'Unlocked'}</small></button>)}</div><div className="camp-mementos" aria-label="Camp keepsakes">{memories.slice(-4).map(m=><button key={m.key} aria-label={`Remember ${m.title}`} onClick={()=>onMemory?.(m)} style={{color:GUIDES[m.host].color}}><Sparkles size={19}/><span>{m.title}</span></button>)}</div></details>
    {disabled?<div className="camp-speech"><p>Mascot companions are off. Turn them on whenever you’d like some company.</p><button className="primary full" onClick={()=>companion.update({mode:'lively'})}>Bring the guides back</button></div>:<>
      <div className="camp-speech" role="status" aria-live="polite" aria-atomic="true"><small>{latest?.prompt||'A hello from your guide'}</small><p>{latest?.text||guide.detail}</p></div>
      <details className="camp-conversations"><summary>Have a little chat</summary><div className="camp-prompts" aria-label="Conversation prompts">{CHAT_PROMPTS.map(prompt=><button key={prompt.id} onClick={()=>talk(prompt.id,campHost)}>{prompt.id==='celebrate'?<Heart size={15}/>:prompt.id==='breathe'?<Moon size={15}/>:<MessageCircle size={15}/>} {prompt.label}</button>)}</div></details>
      <button className="keep-companion" aria-pressed={preferences.guide===campHost} onClick={()=>companion.update({guide:preferences.guide===campHost?'auto':campHost})}><Heart size={17} fill={preferences.guide===campHost?'currentColor':'none'}/>{preferences.guide===campHost?`${guide.name} is your companion`:`Keep ${guide.name} beside me`}<ChevronRight size={17}/></button>
      {preferences.guide!=='auto'&&<button className="text-button" onClick={()=>companion.update({guide:'auto'})}>Let all four guides take turns</button>}
    </>}
    {onLearn&&<button className="primary full camp-learn" onClick={onLearn}><Sparkles size={16}/> Learn together <ChevronRight size={17}/></button>}
    <button className="secondary full" onClick={onExplore}>{exploreLabel} <ChevronRight size={17}/></button>
    <p className="camp-footnote">Your camp chats stay on this phone and never appear in table chat.</p>
    <button className="text-button" onClick={onSettings}><Settings size={16}/> Companion settings</button>
  </div>;
}

export function CompanionSettings({companion,onMeet}){
  const {preferences,update,snoozed}=companion;
  return <div className="companion-settings"><p>Your four guides, at your pace. Changes are saved on this phone.</p>
    <div className="companion-modes" role="radiogroup" aria-label="Mascot interaction level" onKeyDown={event=>{if(!['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(event.key))return;event.preventDefault();const modes=['lively','quiet','off'],next=(modes.indexOf(preferences.mode)+(['ArrowDown','ArrowRight'].includes(event.key)?1:2))%3;update({mode:modes[next]});event.currentTarget.querySelectorAll('[role="radio"]')[next].focus();}}>{[['lively','Lively','Greetings, game reactions and occasional company.'],['quiet','Quiet','A companion stays beside you. Chats only when tapped.'],['off','Off','Hide companions and stop their automatic messages.']].map(([mode,title,detail])=><button key={mode} role="radio" tabIndex={preferences.mode===mode?0:-1} aria-checked={preferences.mode===mode} onClick={()=>update({mode})}><span className="mode-radio"/><span><strong>{title}</strong><small>{detail}</small></span></button>)}</div>
    <button className="companion-motion" role="switch" aria-label="Mascot motion" aria-checked={preferences.motion} onClick={()=>update({motion:!preferences.motion})}><span><strong>Gentle motion</strong><small>Your phone’s Reduce motion setting also takes priority.</small></span><span className={`theme-switch ${preferences.motion?'on':''}`} aria-hidden="true"><i/></span></button>
    <label className="field-label" htmlFor="preferred-mascot">Who keeps you company?</label><select id="preferred-mascot" value={preferences.guide} onChange={event=>update({guide:event.target.value})}><option value="auto">All four · take turns</option>{Object.entries(GUIDES).map(([key,guide])=><option key={key} value={key}>{guide.name} · {guide.role.replace('Your ','')}</option>)}</select>
    {preferences.mode!=='off'&&<><button className="secondary full" onClick={snoozed?companion.wake:companion.snooze}>{snoozed?'Wake the mascots':'Snooze until I reopen the app'}</button><button className="text-button" onClick={onMeet}>Visit the four-flipper camp <ChevronRight size={17}/></button></>}
    <p className="camp-footnote">Companions stay outside the board. Reactions use accepted game events; they don’t make moves or send messages to other players. No sound or notifications.</p>
  </div>;
}
