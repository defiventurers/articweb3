import React,{useId,useState,useEffect,useRef} from 'react';
import {isLongDiceState,LONG_DICE_ROLES,HERITAGE_NAMES,LONG_DICE_ACTION,needsKingReturn} from './chaturangaLongDice.js';
import {asset,seatName,COLORS} from './games.ts';
import {DICE_ROLES,PIECE_NAMES,pieceArt} from './dominion.js';
const roles={1:'Guard or King',2:'Mammoth',3:'Unicorn',4:'Icebreaker',5:'Guard or King',6:'Icebreaker'};
const pips={1:[[78,41]],2:[[49,41],[108,41]],3:[[38,41],[78,41],[118,41]],4:[[47,32],[109,32],[47,49],[109,49]],5:[[43,31],[113,31],[78,40],[43,49],[113,49]],6:[[35,32],[78,32],[121,32],[35,49],[78,49],[121,49]]};
export function LongIceDie({value,label,spent=false}){
 const id=useId().replace(/:/g,'');return <svg className={'long-ice-die '+(spent?'spent':'')} viewBox="0 0 180 70" data-shape="four-sided-pasa" role="img" aria-label={label||`Long ice die${value?': '+value:': not rolled'}`}><title>{label||'Oblong ice die'}</title><defs><linearGradient id={id+'face'} x2=".3" y2="1"><stop stopColor="var(--long-die-light,#effdff)"/><stop offset=".5" stopColor="var(--long-die-face,#b9ebfa)"/><stop offset="1" stopColor="var(--long-die-bottom,#6ec3df)"/></linearGradient><linearGradient id={id+'top'} x2="1" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#b3e8f8"/></linearGradient><linearGradient id={id+'end'} x2=".5" y2="1"><stop stopColor="#abdff4"/><stop offset="1" stopColor="#458bad"/></linearGradient></defs><path d="M14 24 30 8H158L144 24Z" fill={`url(#${id}top)`} stroke="#e5fbff" strokeWidth="1.4"/><path d="M144 24 158 8 174 20V48L144 60Z" fill={`url(#${id}end)`} stroke="#75b9d4" strokeWidth="1.5"/><path d="M14 24H144V60H14Q6 58 6 51V33Q6 26 14 24Z" fill={`url(#${id}face)`} stroke="#79b9d0" strokeWidth="1.6"/><path d="M13 24H25V60H13Z M132 24H144V60H132Z" fill="#b68b3d" stroke="#f8df8e" strokeWidth="1"/><path d="m17 34 4 7-4 7m120-14 4 7-4 7" fill="none" stroke="#fff0b9" strokeWidth="1.4"/><path d="M15 28H139M15 56H137M27 12H151" stroke="#fff" strokeOpacity=".75" strokeWidth="1.7" fill="none"/><path d="m19 29 15 24m42-25-10 27m66-26 8 17m13-25 13 17" stroke="#fff" strokeOpacity=".28" strokeWidth="1" fill="none"/>{value?(pips[value]||[]).map(([x,y],i)=><g key={i} className="die-pip"><circle cx={x} cy={y} r="4.7" fill="none" stroke="var(--long-die-ink,#15546e)" strokeWidth="1.5"/><circle cx={x} cy={y} r="2.2" fill="var(--long-die-ink,#15546e)"/></g>):<text x="78" y="50" textAnchor="middle" fontFamily="Georgia,serif" fontSize="27" fontWeight="700" fill="var(--long-die-ink,#15546e)">?</text>}</svg>;
}

// The four-sided historical die values are represented with familiar pip faces.
// The pips read state.dice.values and never generate randomness or affect legal moves.
const HERITAGE_PIP_CELLS={2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8]};
export function ChaturangaResultPips({value}){
 const cells=HERITAGE_PIP_CELLS[value]||[];
 return <span className="ch-v2-result-pips" aria-hidden="true">{value==null?<span className="ch-v2-await-roll">?</span>:Array.from({length:9},(_,i)=><span key={i} className={cells.includes(i)?'ch-v2-pip on':'ch-v2-pip'}/>)}</span>;
}
function ChaturangaDiePieces({state,types}){
 return <span className="ch-v2-die-pieces" aria-hidden="true">{types.map(type=><img key={type} src={asset(pieceArt(state.turn,type))} alt="" loading="eager"/>)}</span>;
}
export const rollActionId=state=>isLongDiceState(state)?LONG_DICE_ACTION:'roll|control:roll';
const helpKey='arctic-play.v1.chaturanga-roll-help.v1';
export function rollHelpEnabled(){try{return localStorage.getItem(helpKey)!=='false';}catch{return true;}}
export function setRollHelp(enabled){try{localStorage.setItem(helpKey,JSON.stringify(!!enabled));}catch{}window.dispatchEvent(new CustomEvent('ak-chaturanga-roll-help',{detail:!!enabled}));}
function useHelpPreference(){const [enabled,setEnabled]=useState(rollHelpEnabled);useEffect(()=>{const update=()=>setEnabled(rollHelpEnabled());window.addEventListener('ak-chaturanga-roll-help',update);return()=>window.removeEventListener('ak-chaturanga-roll-help',update);},[]);return enabled;}
export function usePostRollHelp({id,state,legal,canAct,screen,sheet,matchId,onOpen}){
 const enabled=useHelpPreference(),seen=useRef(null),open=useRef(onOpen);open.current=onOpen;
 const signature=state?`${matchId}:${state.turn}:${state.mobileTurnNumber||0}:${state.dice?.values?.join(',')}`:'';
 useEffect(()=>{if(enabled&&screen==='match'&&id==='dominion'&&canAct&&legal?.some(a=>['move','pass','end'].includes(a.kind))&&state?.dice?.rolled&&!state.revivalPassRequired&&!sheet&&seen.current!==signature){seen.current=signature;open.current();}},[enabled,screen,id,legal,canAct,state?.dice?.rolled,state?.revivalPassRequired,sheet,signature]);
}
function HelpSwitch(){const enabled=useHelpPreference();return <label className="ch-roll-help-toggle"><input type="checkbox" checked={enabled} onChange={e=>setRollHelp(e.target.checked)}/><span>Show move guide after rolling</span></label>;}
const activeRoles=state=>isLongDiceState(state)?LONG_DICE_ROLES:DICE_ROLES;
const roleName=(state,type)=>isLongDiceState(state)?HERITAGE_NAMES[type]:PIECE_NAMES[type];
export function DiceTray({state,legal,canAct,onAction,onChoices,onRoll,onSelect,onHelp}){
 const end=legal.find(a=>a.kind==='end'),long=isLongDiceState(state),returning=needsKingReturn(state);
 const roll=()=>{if(canAct&&!state.dice.rolled)(onRoll||onChoices)?.();};
 if(returning)return <section className="dice-tray long-dice-tray ch-king-return" aria-label="Return your King"><strong>Your partner has released your King</strong><p>Place it on any empty square. Then pass your second move.</p><button type="button" className="primary" disabled={!canAct} onClick={()=>onSelect?.('control:revive')}>Place returning King</button></section>;
 return <section className="dice-tray long-dice-tray ch-heritage-dice" aria-label="Turn dice">
  <div className="ch-v2-dice-stage">
  <div className="dice-heading"><span><strong>{state.revivalPassRequired?'King returned':state.dice.rolled?'Your long dice':'Chaturanga dice'}</strong><small>{state.revivalPassRequired?'Pass the second move to continue':long?'Two four-sided dice · 2, 3, 4, 5':'Legacy saved match · Original dice rules'}</small></span>{!state.dice.rolled&&<button type="button" className="primary" disabled={!canAct} onClick={roll}>Roll both</button>}</div>
  {!state.revivalPassRequired&&<div className="dice-pair">{[0,1].map(index=>{
   const value=state.dice.values[index],used=state.dice.used[index],types=activeRoles(state)[value]||[],pass=legal.find(a=>a.kind==='pass'&&a.raw.index===index);
   return <div className={`die ${used?'used':''}`} key={index} aria-label={`Die ${index+1}${value?`: ${value}, ${types.map(t=>roleName(state,t)).join(' or ')}, ${used?'used':'available'}`:', not rolled'}`}>
    {index===0?<button type="button" className="ch-die-face" aria-label="Roll both long dice" disabled={!canAct||state.dice.rolled} onClick={roll}><LongIceDie value={value} spent={used}/><ChaturangaResultPips value={value}/><ChaturangaDiePieces state={state} types={types}/></button>:<div className="ch-die-face"><LongIceDie value={value} spent={used}/><ChaturangaResultPips value={value}/><ChaturangaDiePieces state={state} types={types}/></div>}
    <span className="long-die-legend"><strong>{used?'Used':value?`${value} · ${types.map(t=>roleName(state,t)).join(' / ')}`:`Die ${index+1}`}</strong>{value?<span className="dice-activation-images">{types.map(type=><img key={type} src={asset(pieceArt(state.turn,type))} alt={roleName(state,type)} width="26" height="26"/>)}</span>:<small>{index===0?'Tap to roll both':'Paired with the left die'}</small>}</span>

   </div>;
  })}</div>}
  </div>
  <div className="ch-v2-dice-actions">
  {state.dice.rolled&&!state.revivalPassRequired&&[0,1].map(index=>{const pass=legal.find(a=>a.kind==='pass'&&a.raw.index===index);return pass?<button key={index} type="button" className="ch-pass-die" disabled={!canAct} onClick={()=>onAction(pass)}>Pass die {index+1}</button>:null;})}
  {end&&<button type="button" className="secondary dice-end-turn" disabled={!canAct} onClick={()=>onAction(end)}>{state.revivalPassRequired?'Pass second move':'Pass remaining'}</button>}
  {state.dice.rolled&&!state.revivalPassRequired&&onHelp&&<button type="button" className="ch-dice-quick-help" onClick={onHelp}>✦ Show my moves &amp; dice guide</button>}
  <HelpSwitch/>
  {state.frozenTeams?.length>0&&<p className="ch-frozen-note" role="status">Frozen: {state.frozenTeams.map(t=>seatName('dominion',t)).join(', ')}. Their pieces stay on the board.</p>}
  </div>
 </section>;
}
export function DominionTurnPrompt({state,confirm,busy,onBoth,onSkip,onAskSkip}){
 const color=seatName('dominion',state.turn);
 return <div className="dominion-turn-prompt ch-heritage-prompt"><div className="dominion-turn-color"><i style={{background:COLORS[state.turn]}}/><strong>{confirm?`${color} kingdom`:`Your turn · ${color}`}</strong></div>{confirm?<><p>Pass {color}’s turn without rolling?</p><div className="skip-confirm-actions"><button type="button" className="primary full" id="dominion-no-skip" disabled={busy} onClick={onBoth}>No, roll both dice</button><button type="button" className="secondary full danger" disabled={busy} onClick={onSkip}>Yes, pass turn</button></div></>:<><p className="ch-dice-origin">{isLongDiceState(state)?'Four-sided pasa · An Indian dice tradition, reimagined in ice':'Long ice dice · Legacy rules for this saved match'}</p><div className="turn-dice-preview"><button type="button" className="ch-die-face" disabled={busy} aria-label="Roll both long dice" onClick={onBoth}><LongIceDie label="Left long die · Tap to roll both"/></button><LongIceDie label="Right long die · Rolls with the left die"/></div><button type="button" className="primary full" id="dominion-roll-both" disabled={busy} onClick={onBoth}>{busy?'Rolling…':'Roll both dice'}</button><button type="button" className="text-button full skip-turn-choice" disabled={busy} onClick={onAskSkip}>Pass turn</button><HelpSwitch/></>}</div>;
}
export function DominionRollGuide({state,legal,onClose,onSelect}){
 return <section className="ch-roll-guide" aria-label="What you can move"><h3>Two dice. Two choices.</h3><p>Your long dice each grant one move. You may use either die first. A matching pair can move the same piece twice when both moves are legal.</p><div className="ch-guide-dice">{[0,1].filter(i=>state.dice.values[i]!=null).map(index=>{
  const value=state.dice.values[index],used=state.dice.used[index],types=activeRoles(state)[value]||[];
  return <section className="ch-guide-die" key={index}><div><LongIceDie value={value} spent={used}/><strong>Die {index+1} · {value}{used?' · Used':''}</strong></div>{types.map(type=>{
   const moves=legal.filter(a=>a.kind==='move'&&a.raw.dieIndex===index&&state.board[a.raw.fromRow]?.[a.raw.fromCol]?.type===type),sources=[...new Set(moves.map(a=>a.source))];
   return <button type="button" className="ch-guide-piece" key={type} disabled={used||!moves.length} onClick={()=>{onSelect?.(sources[0]);onClose();}}><img src={asset(pieceArt(state.turn,type))} alt=""/><span><strong>{roleName(state,type)}</strong><small>{used?'Die already spent':sources.length?`${sources.length} ${sources.length===1?'piece':'pieces'} · ${moves.length} legal moves`:'No legal move · Pass this die'}</small></span>{!!moves.length&&<span aria-hidden="true">→</span>}</button>;
  })}</section>;
 })}</div><p className="ch-guide-tip">Tap an available piece above to highlight it on the board. You may also pass one die or the remaining turn.</p><HelpSwitch/><button type="button" className="primary full" onClick={onClose}>Continue to the board</button></section>;
}
