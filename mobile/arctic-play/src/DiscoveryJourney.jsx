import React,{useState} from 'react';
import {ArrowRight,Check,Compass,Eye,KeyRound,LockKeyhole,Play,Sparkles,Ticket} from 'lucide-react';
import {game} from './games.ts';
import {CoverArt} from './CoverArt.jsx';
import {HALLS} from './gathering.js';
import model from './unlockModel.cjs';
import discovery from './discoveryModel.cjs';

export function NextDiscovery({access,target,onOpen}){
  const next=discovery.journey(access.state(),target);
  return <button className="next-discovery" onClick={onOpen} aria-label={next.target?`Your next discovery: ${game(next.target).name}`:'Your discovery journey'}><span className="discovery-compass"><Compass size={22}/></span><span><small>{next.target?'BEYOND YOUR NEXT DOOR':'THE KINGDOM IS OPEN'}</small><strong>{next.target?discovery.TEASERS[next.target].hook:'Seven halls. Which will you visit next?'}</strong></span><ArrowRight size={19}/></button>;
}

export function HallTeaser({id}){
  const [revealed,setRevealed]=useState(false),teaser=discovery.TEASERS[id];
  return <section className="hall-teaser"><span className="teaser-eyebrow"><Sparkles size={14}/> A GLIMPSE INSIDE</span><h3>{teaser.hook}</h3>{revealed?<p className="teaser-reveal" role="status">{teaser.reveal}</p>:<button className="text-button" onClick={()=>setRevealed(true)}><Eye size={16}/> Show me a secret <ArrowRight size={15}/></button>}</section>;
}

export function DiscoveryJourney({access,target,onTarget,onUnlock,onPlay,onFormations,onPass,onBrowse}){
  const state=access.state(),next=discovery.journey(state,target);
  const id=next.target;
  return <section className="discovery-journey"><p className="world-eyebrow">YOUR LANTERN JOURNEY</p><h2>{id?'There is more beyond this door.':'Every door is open.'}</h2><p className="discovery-intro">{id?'Choose what sparks your curiosity. Keep your discoveries, and return whenever you like.':'Your access is ready. Visit a hall, learn a new move or invite a friend.'}</p><div className="discovery-progress"><span><strong>{next.open}</strong> / {next.total} halls permanently open</span><span><KeyRound size={16}/>{next.keys} {next.keys===1?'key':'keys'}</span></div><div className="discovery-lanterns" aria-label={`${next.open} of ${next.total} halls permanently open`}>{model.GAME_IDS.map(key=><i className={discovery.permanent(key,state)?'lit':''} key={key}/>)}</div>
    {id?<article className="discovery-feature" key={id}><div className="discovery-art"><CoverArt id={id} celebration/><span><LockKeyhole size={14}/> Your chosen destination</span></div><div className="discovery-feature-copy"><p className="world-eyebrow">{HALLS[id].name}</p><h3>{game(id).name}</h3><p>{discovery.TEASERS[id].detail}</p><HallTeaser key={id} id={id}/><p className="discovery-goal">{model.requirement(id)}</p>{next.match&&<button className="primary full" onClick={()=>onPlay(next.match)}><Play size={17}/> Play {game(next.match).name}<ArrowRight size={17}/></button>}{next.match&&!model.CATALOG[id].wins?.includes(next.match)&&<small className="discovery-route-note">First open {game(model.CATALOG[id].wins[0]).name}. Its victory can open this hall.</small>}<button className="secondary full" onClick={()=>onUnlock(id)}>See every way to open this hall <ArrowRight size={16}/></button>{next.temporary&&<p className="discovery-route-note">You can visit during the festival now. Earn or purchase access to keep it open.</p>}</div></article>:<button className="primary full" onClick={onBrowse}>Choose a table <ArrowRight size={17}/></button>}
    {next.remaining.length>1&&<section className="discovery-choices"><h3>Another door catch your eye?</h3>{next.remaining.map(key=><button className={id===key?'chosen':''} key={key} aria-pressed={id===key} onClick={()=>onTarget(key)}><span>{game(key).name}<small>{discovery.TEASERS[key].detail}</small></span>{id===key?<Check size={19}/>:<ArrowRight size={17}/>}</button>)}</section>}
    {id&&<section className="discovery-options"><button className="secondary full" onClick={()=>onFormations(id)}><KeyRound size={19}/><span>Prefer a little puzzle?<small>{next.keys?'Your Lantern Key can open a hall now.':`${next.formationsNeeded} more different ${next.formationsNeeded===1?'formation':'formations'} for your next key.`}</small></span><ArrowRight size={16}/></button><button className="text-button" onClick={onPass}><Ticket size={16}/> Explore permanent All Access</button><p>Every hall has a free route. Purchases open doors; achievements stay earned through play.</p></section>}
  </section>;
}

export function MatchDiscovery({id,access,eligible,onJourney}){
  const destinations=discovery.destinations(id,access.state());
  if(!destinations.length)return null;
  return <button className="match-progression discovery-match" onClick={onJourney}><Sparkles size={15}/><span>{eligible?`A victory opens ${destinations.map(next=>game(next).name).join(' and ')}.`:'Practice at your pace. Start a fresh game without undo for a victory unlock.'}</span><Eye size={16}/></button>;
}

export function AfterMatchDiscovery({id,access,won,eligible,onJourney,onFormations}){
  const destinations=discovery.destinations(id,access.state());
  if(!destinations.length)return null;
  return <section className="discovery-after-match"><h3>{won&&eligible?'Where will your next move take you?':'Your next door is still waiting.'}</h3><p>{won&&eligible?'See your journey for the next invitation.':`You can return to ${game(id).name}, or earn a Lantern Key with short formation puzzles. Your earned access stays yours.`}</p><button className="secondary full" onClick={onJourney}>Glimpse the next hall <Eye size={16}/></button>{(!won||!eligible)&&<button className="text-button" onClick={onFormations}><KeyRound size={16}/> Try a short formation</button>}</section>;
}
