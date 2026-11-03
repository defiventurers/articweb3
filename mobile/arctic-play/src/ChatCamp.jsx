import React,{useMemo} from 'react';
import {ArrowRight,BookOpen,Compass,Home,Play,Sparkles} from 'lucide-react';
import {Board} from './Board.jsx';
import {adventurePosition} from './adventures.js';
import {DailyPuzzleEntry,MemoryShelf} from './CompanionFeatures.jsx';
import {HallSpotlight} from './Gathering.jsx';
import {lanternCount} from './gathering.js';

export function ChatCamp({children,journey,progress,story,onCamp,onMemories,onLearn,onDaily,onMemory,onChallenge,onIntro,onGuide,onPassport,onExplore}){
  const preview=useMemo(()=>adventurePosition('xiangqi','cannon-bridge','one'),[]);
  return <div className="chat-camp">
    <nav className="chat-camp-shortcuts" aria-label="Camp shortcuts">
      <button onClick={onCamp}><Home size={23}/><strong>Your Camp</strong></button>
      <button onClick={onMemories}><Sparkles size={23}/><strong>Discoveries</strong></button>
      <button onClick={onLearn}><BookOpen size={23}/><strong>Learn a game</strong></button>
    </nav>
    <section className="chat-table-section" aria-labelledby="chat-tables-title"><h2 id="chat-tables-title">Your table chats</h2>{children}</section>
    <section className="chat-discover-section" aria-labelledby="chat-discover-title"><h2 id="chat-discover-title">Learn & discover</h2>
      <DailyPuzzleEntry journey={journey} onOpen={onDaily}/>
      <div className="home-first-move"><button className="home-move-button" onClick={()=>onChallenge('xiangqi','cannon-bridge')} aria-label="Try this move in Xiangqi"><span><small>ONE REAL RULE. YOUR OWN MOVE.</small><strong>Try this move.</strong><span>One surprising capture.</span><b>Meet the Xiangqi Cannon <ArrowRight size={15}/></b></span></button><span className="home-real-board" aria-hidden="true" inert=""><Board id="xiangqi" state={preview.state} legal={[]} canAct={false} perspective="red"/></span></div>
      <MemoryShelf journey={journey} onOpen={onMemories} onMemory={onMemory}/>
    </section>
    {story&&<section className="chat-story-section" aria-labelledby="chat-story-title"><h2 id="chat-story-title">Around the Gathering</h2>
      <button className="home-passport-link" onClick={onPassport} aria-label="Your Lantern Passport"><Sparkles size={22}/><span><strong>Your Lantern Passport</strong><small>{lanternCount(progress)} of 7 lights · Discover your next hall</small></span><ArrowRight size={17}/></button>
      <div className="chat-story-links"><button className="secondary" onClick={onIntro}><Play size={18}/> Your 25-second invitation</button><button className="secondary" onClick={onGuide}><Compass size={18}/> The world behind the ice</button></div>
      <HallSpotlight onExplore={onExplore} onChallenge={onChallenge}/>
    </section>}
  </div>;
}
