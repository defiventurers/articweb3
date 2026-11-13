import React,{useMemo,useEffect,useRef} from 'react';
import {ArrowLeft,BookOpen,RotateCcw,Share2,Home,Users,Eye} from 'lucide-react';
import {DOMINION_TEAMS} from './dominionTeams.js';
import {seatName} from './games.ts';

export function victorySeats(outcome,id){
 if(!outcome||outcome.draw)return [];
 const own=Array.isArray(outcome.winners)?outcome.winners.filter(Boolean):[];
 if(id==='dominion'&&outcome.winningTeam){
  const matched=DOMINION_TEAMS.find(team=>team.id===outcome.winner||team.seats.includes(outcome.winner)||team.seats.some(seat=>own.includes(seat)));
  return matched?[...matched.seats]:own;
 }
 if(own.length)return own;
 return typeof outcome.winner==='string'?[outcome.winner]:[];
}

export function VictoryCelebration({id,title,outcome,visible=[],isOnline=false,viewerWon=true,onBack,onPlayAgain,onRematch,onFinalBoard,onShare}){
 const panel=useRef(null),close=useRef(onFinalBoard);close.current=onFinalBoard;
 useEffect(()=>{
  const previous=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';panel.current?.querySelector('button')?.focus();
  const key=e=>{if(e.key==='Escape'){e.preventDefault();close.current?.();}if(e.key==='Tab'){const buttons=[...panel.current.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};
  const node=panel.current;node?.addEventListener('keydown',key);return()=>{document.body.style.overflow=overflow;node?.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus();};
 },[]);
 const winners=victorySeats(outcome,id);
 const winningPieces=useMemo(()=>visible.filter(piece=>winners.includes(piece.owner)).slice(0,36),[visible,winners.join('|')]);
 const resultLabel=outcome?.draw?'A remarkable draw':outcome?.winningTeam?winners.map(seat=>seat==='yellow'?'Pink':seatName(id,seat)).join(' + ')+' are victorious!':(winners.map(seat=>seatName(id,seat)).join(' + ')||'A player')+' is victorious!';
 return <section ref={panel} className="victory-overlay" role="dialog" aria-modal="true" aria-labelledby="victory-heading" data-testid="victory-celebration" data-game={id}>
  <div className="victory-canvas" aria-hidden="true"><span className="victory-snowflake snow-1">✧</span><span className="victory-snowflake snow-2">✧</span><span className="victory-snowflake snow-3">✦</span></div>
  <div className="victory-scroll">
   <div className="victory-top"><span>ANTARCTIC KINGDOMS · THE ROYAL RESULT</span><button onClick={onFinalBoard} className="victory-close" aria-label="View final board"><Eye size={20}/></button></div>
   <p className="victory-crest" aria-hidden="true">♛</p>
   <h1 id="victory-heading">{outcome?.draw?'A Worthy Draw':viewerWon?'VICTORY!':'MATCH COMPLETE'}</h1>
   <h2>{resultLabel}</h2>
   <p className="victory-game">{title}</p>
   <div className="victory-army" aria-label={outcome?.draw?'Final position':'Winning army celebration'}>
    <div className="victory-sky" aria-hidden="true">✦ ✧ ✦</div>
    {winningPieces.length?winningPieces.map((piece,i)=><img key={piece.id||piece.source||i} src={piece.sprite} alt={piece.label||'Victorious piece'} className="victory-sprite" style={{'--victory-delay':Math.min(i*.05,1.5)+'s'}}/>):
      <div className="victory-drawn" aria-hidden="true">{['polly','retsba','pengu','abster'].map(host=><img key={host} src={'art/launch-v1/hosts/'+host+'.webp'} alt=""/>)}</div>}
   </div>
   <p className="victory-reason">{outcome?.reason||'A glorious game in the frozen kingdom.'}</p>
   <p className="victory-heritage-note">{outcome?.draw?'Each move carried its own courage.':'The royal halls celebrate another chapter of strategy.'}</p>
   <div className="victory-actions">
    <button className="victory-primary" onClick={onPlayAgain}><RotateCcw size={19}/> Play again</button>
    {isOnline&&<button onClick={onRematch}><Users size={18}/> Return to room</button>}
    <button onClick={onFinalBoard}><BookOpen size={18}/> View final board</button>
    <button onClick={onBack}><Home size={18}/> Back to Games</button>
    <button onClick={onShare}><Share2 size={18}/> Share result</button>
   </div>
   <button className="victory-bottom" onClick={onFinalBoard}><ArrowLeft size={15}/> Return to the final position</button>
  </div>
 </section>;
}
