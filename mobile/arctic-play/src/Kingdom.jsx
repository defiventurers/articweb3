import React from 'react';
import {ArrowUpRight,BookOpen,ChevronRight,Compass,MountainSnow} from 'lucide-react';
import {BRAND,GUIDES,GAME_HERITAGE,discoveryCount} from './brand.js';
import {MascotFigure} from './Companions.jsx';

export function KingdomIntro({onExplore}){return <section className="kingdom-intro" aria-label="Welcome to Antarctic Kingdoms">
  <div className="kingdom-intro-copy"><p className="kingdom-kicker"><MountainSnow size={14}/> A NEW HOME FOR GREAT GAMES</p><h2>Timeless games.<br/><em>A new world.</em></h2><p>Seven tables. Four guides.<br/>Your next great rivalry.</p><button onClick={onExplore}>Explore the Archive <ArrowUpRight size={16}/></button></div>
  <img className="kingdom-emblem" src={BRAND.icon} alt=""/>
  <span className="clan-colours" aria-hidden="true">{Object.values(GUIDES).map(host=><i key={host.name} style={{background:host.color}}/>)}</span>
</section>;}

export function HostNote({id,hostId=GAME_HERITAGE[id].host,motion=true,children}){const host=GUIDES[hostId];return <aside className="host-note" style={{'--host':host.color}}><MascotFigure id={hostId} motion={motion}/><div><strong>{host.name} · {host.role.replace('Your ','')}</strong><p>{children||'Try your first legal move, then explore the complete rules. Your guide stays beside the board.'}</p></div></aside>;}

export function HeritageLabel({id,onClick}){const item=GAME_HERITAGE[id];return <button className="heritage-label" onClick={onClick} aria-label={`Read ${item.name} origins and edition`}><Compass size={17}/><span><strong>{item.origin}</strong><small>{item.kind}</small></span><ChevronRight size={17}/></button>;}

export function HeritageDetails({id}){const item=GAME_HERITAGE[id];return <div className="heritage-details"><p className="kingdom-kicker">{item.origin} · {item.kind}</p><h3>{item.name}</h3><p>{item.story}</p><h4>Rules in this edition</h4><p>{item.edition}</p><div className="archive-truth"><MountainSnow size={21}/><p>The Antarctic kingdom and its Frozen Archive are fictional. Each game keeps its own name, origins and chosen rules. Some are living traditions, some are historical variants, and others are modern adaptations.</p></div></div>;}

export function ArchiveJournal({games,journal,onLearn}){const count=discoveryCount(journal);return <section className="archive-journal" aria-label="Archive learning journal"><div className="section-title"><h2>Your Archive journal</h2><span>{count} / {games.length} explored</span></div><p>Make a first guided move at each table. Explore in any order; every game is open.</p><progress value={count} max={games.length} aria-label={`${count} of ${games.length} guided first moves completed`}/><div className="journal-list">{games.map(game=>{const learned=Number.isFinite(journal?.[game.id])&&journal[game.id]>0;return <button key={game.id} className={`journal-row ${learned?'explored':''}`} onClick={()=>onLearn(game.id)}><span className="journal-mark"><BookOpen size={18}/></span><span><strong>{game.name}</strong><small>{GAME_HERITAGE[game.id].origin} · {learned?'First move explored':'Discover your first move'}</small></span><ChevronRight size={17}/></button>;})}</div></section>;}
