import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ChevronRight,Heart,MessageCircle,Moon,Settings,Sparkles,X} from 'lucide-react';
import {GUIDES} from './brand.js';
import {read,write} from './storage.js';
import {CHAT_PROMPTS,COMPANION_KEY,companionPreferences,companionLine,companionMood,hostFor,allowCompanionEvent} from './companions.js';

export function useCompanions(context){
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
    const next={id:++sequence.current,host,text:companionLine(event,{...context,...extra},variant,host),mood:companionMood(event),manual,event};
    last.current={at:now,key,event};setMessage(next);setCampHost(host);
    if(manual){setSnoozed(false);dismissedUntil.current=0;setHistory(current=>[...current,{...next,prompt:CHAT_PROMPTS.find(p=>p.id===event)?.label||'Meet your guide'}].slice(-6));}
  },[]);
  const update=useCallback(patch=>{
    const next=companionPreferences({...latest.current.preferences,...patch});
    latest.current.preferences=next;setStored(next);write(COMPANION_KEY,next);
    setMessage(null);last.current=null;dismissedUntil.current=0;
    if(next.mode==='off')setHistory([]);
  },[]);
  const dismiss=()=>{setMessage(null);dismissedUntil.current=Date.now()+60000;};
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
  return {preferences,update,message,history,campHost,meet,talk:(prompt,host=campHost)=>react(prompt,{},true,host),react,dismiss,snoozed,snooze,wake,host:message?.host||fallbackHost};
}

export function MascotPortrait({host,mood='listening',motion=true,large=false,pulse=0}){
  const guide=GUIDES[host];
  return <span key={`${host}:${pulse}`} className={`mascot-portrait host-${host} ${large?'large':''} ${motion?'animated':''} mood-${mood}`} aria-hidden="true" style={{'--host':guide.color}}><span className="mascot-aura"/><img src={guide.image} alt=""/>{mood==='celebrate'&&<Sparkles className="mascot-spark" size={large?28:18}/>}</span>;
}

export function CompanionDock({companion,onOpen,onSettings,inline=false,hidden=false}){
  const {preferences,message,host,snoozed}=companion;
  if(preferences.mode==='off'||hidden)return null;
  const guide=GUIDES[host],text=snoozed?'Taking a quiet moment. Tap to wake me.':message?.text|| (preferences.mode==='quiet'?'Quiet company. Tap when you’d like a chat.':'Here beside you. Tap to visit our camp.');
  return <aside className={`companion-dock ${inline?'inline':'floating'}`} aria-label="Mascot companion" style={{'--host':guide.color}} data-motion={preferences.motion?'on':'off'}>
    <button className="companion-main" aria-label={`Talk with ${guide.name}`} onClick={()=>{if(snoozed)companion.wake();onOpen(host);}}><MascotPortrait host={host} mood={message?.mood} motion={preferences.motion&&!snoozed} pulse={message?.id}/><span><strong>{guide.name} <span>{snoozed?'RESTING':preferences.mode==='quiet'?'QUIET COMPANY':'WITH YOU'}</span></strong><span className="companion-line">{text}</span></span></button>
    <div className="companion-tools"><button aria-label="Mascot settings" onClick={onSettings}><Settings size={16}/></button>{message&&!snoozed?<button aria-label="Dismiss mascot message" onClick={companion.dismiss}><X size={16}/></button>:<button aria-label={snoozed?'Wake mascot':'Snooze mascots for this session'} onClick={snoozed?companion.wake:companion.snooze}><Moon size={16}/></button>}</div>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{message&&!snoozed?`${guide.name}: ${message.text}`:''}</span>
  </aside>;
}

export function CompanionCamp({companion,onSettings,onExplore,onLearn,exploreLabel='Find a game together'}){
  const {preferences,campHost,meet,talk,message,history}=companion,guide=GUIDES[campHost];
  const disabled=preferences.mode==='off';
  const latest=history.filter(item=>item.host===campHost).at(-1);
  return <div className="companion-camp" data-motion={preferences.motion?'on':'off'}>
    <p className="camp-kicker"><Sparkles size={14}/> THE FOUR-FLIPPER CAMP</p>
    <p className="camp-intro">A little company for your next adventure.</p>
    <div className="camp-roster" aria-label="Choose a mascot">{Object.entries(GUIDES).map(([key,host])=><button key={key} aria-label={`Meet ${host.name}`} aria-pressed={campHost===key} onClick={()=>meet(key)} style={{'--host':host.color}}><MascotPortrait host={key} motion={false}/><strong>{host.name}</strong><i/></button>)}</div>
    <section className="camp-stage" style={{'--host':guide.color}} aria-label={`${guide.name}'s corner`}><button className="camp-mascot-touch" aria-label={`High five ${guide.name}`} disabled={disabled} onClick={()=>talk('celebrate',campHost)}><MascotPortrait host={campHost} large mood={message?.host===campHost?message.mood:'listening'} motion={preferences.motion&&!disabled} pulse={message?.id}/><small>Tap for a high five</small></button><div className="camp-identity"><small>{guide.clan}</small><h3>{guide.name}</h3><p>{guide.role}</p></div></section>
    {disabled?<div className="camp-speech"><p>Mascot companions are off. Turn them on whenever you’d like some company.</p><button className="primary full" onClick={()=>companion.update({mode:'lively'})}>Bring the guides back</button></div>:<>
      <div className="camp-speech" role="status" aria-live="polite" aria-atomic="true"><small>{latest?.prompt||'A hello from your guide'}</small><p>{latest?.text||guide.detail}</p></div>
      <div className="camp-prompts" aria-label="Conversation prompts">{CHAT_PROMPTS.map(prompt=><button key={prompt.id} onClick={()=>talk(prompt.id,campHost)}>{prompt.id==='celebrate'?<Heart size={15}/>:prompt.id==='breathe'?<Moon size={15}/>:<MessageCircle size={15}/>} {prompt.label}</button>)}</div>
      <button className="keep-companion" aria-pressed={preferences.guide===campHost} onClick={()=>companion.update({guide:preferences.guide===campHost?'auto':campHost})}><Heart size={17} fill={preferences.guide===campHost?'currentColor':'none'}/>{preferences.guide===campHost?`${guide.name} is your companion`:`Keep ${guide.name} beside me`}<ChevronRight size={17}/></button>
      {preferences.guide!=='auto'&&<button className="text-button" onClick={()=>companion.update({guide:'auto'})}>Let all four guides take turns</button>}
    </>}
    {onLearn&&<button className="primary full camp-learn" onClick={onLearn}><Sparkles size={16}/> Learn together <ChevronRight size={17}/></button>}
    <button className="secondary full" onClick={onExplore}>{exploreLabel} <ChevronRight size={17}/></button>
    <p className="camp-footnote">Choose a prompt for an offline character response. Camp conversations stay on this phone and never appear in table chat.</p>
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
