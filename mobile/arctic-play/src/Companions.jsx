import React,{useEffect,useRef,useState} from 'react';
import {Check,ChevronRight,Compass,Heart,Settings,Sparkles} from 'lucide-react';
import {GUIDES} from './brand.js';
import {PERSONALITIES,PORTRAITS,companionId,companionLine,reactionPriority} from './companions.js';

export function MascotFigure({id,motion=true,idle=true,reaction='welcome',reactionKey=0}){
  const host=GUIDES[id],portrait=PORTRAITS[id],element=useRef(null);
  const [visible,setVisible]=useState(true),[foreground,setForeground]=useState(()=>!document.hidden);
  useEffect(()=>{const handler=()=>setForeground(!document.hidden);document.addEventListener('visibilitychange',handler);return()=>document.removeEventListener('visibilitychange',handler);},[]);
  useEffect(()=>{if(typeof IntersectionObserver==='undefined')return;const observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting));observer.observe(element.current);return()=>observer.disconnect();},[]);
  return <span ref={element} className={`mascot-figure mascot-${id}`} data-animate={motion&&visible&&foreground?'yes':'no'} data-idle={idle?'yes':'no'} aria-hidden="true"><span className="mascot-shadow"/>
    <span className={`mascot-reaction reaction-${reaction}`} key={reactionKey}><span className="mascot-portrait"><img src={host.image} alt="" draggable="false"/><svg className="mascot-eyes" viewBox={`0 0 ${portrait.width} ${portrait.height}`} focusable="false"><g className="mascot-eyelids">{portrait.eyes.map(([x,y,rx,ry],index)=><g key={index}><ellipse cx={x} cy={y} rx={rx+3} ry={ry+3} fill={portrait.face}/><path d={`M ${x-rx*.7} ${y} Q ${x} ${y+ry*.48} ${x+rx*.7} ${y}`} fill="none" stroke="#171d27" strokeWidth={portrait.stroke} strokeLinecap="round"/></g>)}</g></svg></span></span>
    <span className="mascot-spark mascot-spark-one">{PERSONALITIES[id].symbol}</span><span className="mascot-spark mascot-spark-two">✧</span></span>;
}

export function CompanionPanel({preferences,onPreferences,gameId,moment,context='lobby',onSettings}){
  const id=companionId(preferences,gameId),host=GUIDES[id],personality=PERSONALITIES[id];
  const [speech,setSpeech]=useState({kind:'welcome',variant:0,key:0,manual:false});
  const count=useRef(0),hold=useRef({until:0,priority:0});
  useEffect(()=>{hold.current={until:0,priority:0};setSpeech({kind:'welcome',variant:0,key:++count.current,manual:false});},[id,gameId,context,preferences.comments]);
  useEffect(()=>{
    if(!preferences.comments||!moment||moment.gameId!==gameId)return;
    const priority=reactionPriority(moment.kind),deliberate=['undo','restart','finish','draw'].includes(moment.kind);
    if(!deliberate&&Date.now()<hold.current.until&&priority<=hold.current.priority)return;
    hold.current={until:Date.now()+(deliberate?0:priority===3?5000:priority===2?2200:1400),priority};
    setSpeech({kind:moment.kind,variant:moment.sequence,key:++count.current,manual:false});
  },[moment,id,gameId,preferences.comments]);
  const speak=kind=>{const variant=count.current++;hold.current={until:Date.now()+3000,priority:2};setSpeech({kind,variant,key:count.current,manual:true});};
  const talking=preferences.comments||speech.manual,celebrate=talking&&['tap','discovery','finish','draw'].includes(speech.kind);
  return <section className={`companion-panel companion-${context}`} style={{'--host':host.color}} data-host={id} data-moment={talking?speech.kind:'quiet'} aria-label={`${host.name}, your companion`}>
    <div className="companion-stage"><button className={`companion-touch ${celebrate?'celebrating':''}`} aria-label={`Say hello to ${host.name}`} onClick={()=>speak('tap')}><MascotFigure id={id} motion={preferences.motion} idle={context!=='match'} reaction={talking?speech.kind:'welcome'} reactionKey={speech.key}/><span className="companion-tap-label">Tap to say hi</span></button>
      <div className="companion-speech"><div className="companion-heading"><div><strong>{host.name}</strong><small>{context==='match'?'Beside your board':personality.trait}</small></div>{onSettings&&<button className="icon-btn" aria-label="Companion settings" onClick={onSettings}><Settings size={17}/></button>}</div><p role="status" aria-live="polite" aria-atomic="true">{talking?companionLine(id,speech.kind,speech.variant):'A little quiet. Tap me whenever you’d like a hello or an idea.'}</p><button className="companion-ask" onClick={()=>speak('tip')}><Sparkles size={13}/>Ask {host.name} for an idea</button></div>
    </div>
    {context==='lobby'&&<div className="companion-mini-crew" aria-label="Choose your companion">{Object.entries(GUIDES).map(([key,guide])=><button key={key} aria-label={`Travel with ${guide.name}`} aria-pressed={id===key} onClick={()=>onPreferences({guide:key})}><span style={{background:guide.color}}/>{guide.name}{id===key&&<Check size={11}/>}</button>)}</div>}
  </section>;
}

export function GuideCollection({preferences,onPreferences,onSettings}){const active=companionId(preferences);return <section className="guide-collection"><div className="section-title"><h2>Four guides. Your crew.</h2><Compass size={18}/></div><p className="guide-footnote">Tap a penguin to say hello. Choose a companion to travel with you.</p><CompanionPanel preferences={preferences} onPreferences={onPreferences} context="lounge" onSettings={onSettings}/><div className="guide-grid">{Object.entries(GUIDES).map(([key,host])=><button type="button" className={`guide-card living-guide ${active===key?'chosen':''}`} key={key} style={{'--host':host.color}} aria-label={`Choose ${host.name} as your companion`} aria-pressed={active===key} onClick={()=>onPreferences({guide:key})}><MascotFigure id={key} motion={preferences.motion}/><div><h3>{host.name}</h3><small>{PERSONALITIES[key].trait}</small></div><p>“{PERSONALITIES[key].signature}”</p><span className="guide-gesture">{PERSONALITIES[key].gesture}</span><span className="guide-choose">{active===key?<><Check size={13}/>Your companion</>:<>Travel with {host.name}<ChevronRight size={13}/></>}</span></button>)}</div><p className="guide-footnote">Your hosts stay beside the games. Every game keeps its own pieces and cultural identity.</p></section>;}

export function CompanionSettings({preferences,onPreferences}){return <div className="companion-settings"><p className="muted">Your companion brings a little personality to the Archive. All dialogue works offline.</p><button className={`companion-auto ${preferences.guide==='auto'?'selected':''}`} aria-pressed={preferences.guide==='auto'} onClick={()=>onPreferences({guide:'auto'})}><Compass size={22}/><span><strong>Follow each game’s guide</strong><small>Polly in the lobby; the game’s host at each table.</small></span>{preferences.guide==='auto'&&<Check size={17}/>}</button><div className="settings-crew">{Object.entries(GUIDES).map(([key,host])=><button className={preferences.guide===key?'selected':''} key={key} aria-pressed={preferences.guide===key} onClick={()=>onPreferences({guide:key})}><img src={host.image} alt=""/><span>{host.name}</span>{preferences.guide===key&&<Check size={14}/>}</button>)}</div>{[['motion','Mascot motion','Blinks, gentle idle poses and short tap reactions. Respects your device’s reduced motion setting.'],['comments','Automatic reactions','Short comments after moves and discoveries. Turn off for quiet play; you can still tap to ask.'],['inGame','Companion beside the board','Show your companion below the board during play.']].map(([key,title,detail])=><button key={key} className="companion-setting" role="switch" aria-label={title} aria-checked={preferences[key]} onClick={()=>onPreferences({[key]:!preferences[key]})}><span><strong>{title}</strong><small>{detail}</small></span><span className={`theme-switch ${preferences[key]?'on':''}`} aria-hidden="true"><i/></span></button>)}<p className="companion-local-note"><Heart size={15}/>Your choice is saved on this phone. Change companions whenever you like.</p></div>;}
