import React,{useEffect,useRef,useState} from 'react';
import './royal-result.css';

/**
 * Presentation only. Callers pass their engine/server-authoritative outcome and
 * unchanged piece sprites. Decorative citizens never claim to be online users.
 */
export function RoyalResult({title,kind='win',winnerLabel='',reason='',pieces=[],viewerWon=null,
  onBack,onPlayAgain,onViewBoard,onRematch,onShare,rematchLabel='Rematch'}){
 const dialog=useRef(null);
 const [shareError,setShareError]=useState('');
 useEffect(()=>{
  const previouslyFocused=document.activeElement;
  dialog.current?.focus({preventScroll:true});
  const onKey=e=>{
   if(e.key==='Escape'){e.preventDefault();onViewBoard();}
   if(e.key!=='Tab')return;
   const buttons=[...dialog.current?.querySelectorAll('button:not(:disabled)')||[]];
   if(!buttons.length)return;
   if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus();}
   else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus();}
  };
  document.addEventListener('keydown',onKey);
  return ()=>{document.removeEventListener('keydown',onKey);previouslyFocused?.focus?.({preventScroll:true});};
 },[onViewBoard]);
 const isDraw=kind==='draw',isUnresolved=kind==='ended';
 const headline=isUnresolved?'MATCH COMPLETE':isDraw?'A WORTHY DRAW':viewerWon===false?'MATCH COMPLETE':'ROYAL VICTORY';
 const caption=isUnresolved?'Review the recorded result on the final board.':isDraw?'Two worthy sides have shared the field.':viewerWon===false?'The winning army has claimed the crown.':'The royal halls salute their champions.';
 async function share(){
  if(!onShare)return;
  try{setShareError('');await onShare();}catch{setShareError('Sharing is unavailable on this device.');}
 }
 return <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={headline} className={'ak-royal-result '+(isDraw?'is-draw':'')} data-testid="royal-result">
  <div className="ak-royal-sky" aria-hidden="true"><i>✧</i><i>❄</i><i>✦</i></div>
  <div className="ak-royal-scroll">
   <header className="ak-royal-header"><span>ANTARCTIC KINGDOMS</span><button type="button" onClick={onViewBoard} aria-label="Close celebration and view the final board">✕</button></header>
   <svg className="ak-royal-crown" viewBox="0 0 160 95" role="presentation" aria-hidden="true"><defs><linearGradient id="ak-crown-metal" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#fff0b4"/><stop offset=".42" stopColor="#dca74a"/><stop offset="1" stopColor="#8d5a20"/></linearGradient></defs><path d="M13 29 39 52 80 9 121 52 147 29 135 77 25 77Z" fill="url(#ak-crown-metal)" stroke="#fbe8a5" strokeWidth="4" strokeLinejoin="round"/><rect x="26" y="77" width="108" height="11" rx="4" fill="#d29d45" stroke="#ffdf8f" strokeWidth="3"/><circle cx="80" cy="52" r="8" fill="#2d769d" stroke="#fff4cb" strokeWidth="3"/></svg>
   <p className="ak-royal-eyebrow">THE WINTER COURT · FINAL RESULT</p>
   <h1>{headline}</h1>
   <h2>{isDraw?'An honourable encounter':winnerLabel}</h2>
   <p className="ak-royal-game">{title}</p>
   <div className={"ak-royal-army "+(pieces.length>18?"crowded":"")} aria-label={isDraw?'Celebratory game pieces':'Surviving pieces of the victorious army'}>
    <div className="ak-royal-aurora" aria-hidden="true"/>
    <p className="ak-royal-skyline" aria-hidden="true">✦ ❄ ✧ ❄ ✦</p>
    {pieces.length ? pieces.map((p,i)=><img className="ak-royal-unit" key={p.key||i} src={p.src} alt={p.alt||'Surviving game piece'} loading={i>16?'lazy':'eager'} style={{'--ak-delay':(i%12)*.09+'s'}}/>):<span className="ak-royal-no-pieces">A match to remember</span>}
   </div>
   <p className="ak-royal-caption">{caption}</p>
   {reason&&<p className="ak-royal-reason">{reason}</p>}
   <div className="ak-royal-actions">
    {onPlayAgain&&<button className="ak-royal-primary" type="button" onClick={onPlayAgain}>♛ Play again</button>}
    {onRematch&&<button type="button" onClick={onRematch}>↻ {rematchLabel}</button>}
    <button type="button" onClick={onViewBoard}>▦ View final board</button>
    <button type="button" onClick={onBack}>⌂ Back to Games</button>
    {onShare&&<button type="button" onClick={share}>♢ Share result</button>}
   </div>
   {shareError&&<p role="alert">{shareError}</p>}
   <small className="ak-royal-disclaimer">Official result from the game rules · celebrations do not change the final position</small>
  </div>
 </section>;
}
