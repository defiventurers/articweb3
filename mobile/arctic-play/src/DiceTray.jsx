import React,{useState,useEffect,useRef} from 'react';
import {isLongDiceState,LONG_DICE_ROLES,HERITAGE_NAMES,LONG_DICE_ACTION,needsKingReturn} from './chaturangaLongDice.js';
import {automaticPassPlan,chaturangaRollKey} from './chaturangaAutoPass.js';
import {asset,seatName,COLORS} from './games.ts';
import {DICE_ROLES,PIECE_NAMES,pieceArt} from './dominion.js';
const roles={1:'Guard or King',2:'Mammoth',3:'Unicorn',4:'Icebreaker',5:'Guard or King',6:'Icebreaker'};
const pips={1:[[78,41]],2:[[49,41],[108,41]],3:[[38,41],[78,41],[118,41]],4:[[47,32],[109,32],[47,49],[109,49]],5:[[43,31],[113,31],[78,40],[43,49],[113,49]],6:[[35,32],[78,32],[121,32],[35,49],[78,49],[121,49]]};
export function LongIceDie({value,label,spent=false}){
 return <svg className={'long-ice-die '+(spent?'spent':'')} viewBox="0 0 309 90" data-shape="four-sided-pasa" data-faces="2,3,4,5" role="img" aria-label={label||`Four-sided long ice die${value?': '+value:': not rolled'}`}><title>{label||'Four-sided long ice die · 2, 3, 4, 5'}</title><image href={asset('launch-v1/chaturanga-match/approved-151658.jpg')} x="-105" y="-1271" width="865" height="1536" preserveAspectRatio="none"/>{value?(pips[value]||[]).map(([x,y],i)=><g key={i} className="die-pip"><circle cx={(x-78)*1.4+154.5} cy={(y-41)*1.2+45} r="5" fill="#153e58"/></g>):<text x="154.5" y="62" textAnchor="middle" fontFamily="Georgia,serif" fontSize="55" fontWeight="700" fill="#153e58">?</text>}</svg>;
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
export function usePostRollHelp({id,state,legal,canAct,screen,sheet,matchId,onOpen,onAction,blocked=false}){
 const enabled=useHelpPreference(),seen=useRef(null),previousSheet=useRef(null),open=useRef(onOpen),latest=useRef(null),fired=useRef(null);
 const [acknowledged,setAcknowledged]=useState(null),[countdown,setCountdown]=useState(null),[visible,setVisible]=useState(()=>document.visibilityState!=='hidden');
 open.current=onOpen;
 const signature=chaturangaRollKey(matchId,state),position=JSON.stringify([signature,state?.board,state?.dice,state?.revivalPassRequired,state?.gameOver,state?.mobileResult]);
 const legalKey=(legal||[]).map(a=>a.id).join('|');
 const eligible=id==='dominion'&&screen==='match'&&canAct&&legal?.some(a=>['move','pass','end'].includes(a.kind))&&state?.dice?.rolled&&!state.revivalPassRequired&&!state.gameOver&&!state.mobileResult;
 latest.current={state,legal,eligible,blocked,sheet,position,onAction};
 useEffect(()=>{const change=()=>setVisible(document.visibilityState!=='hidden');document.addEventListener('visibilitychange',change);return()=>document.removeEventListener('visibilitychange',change);},[]);
 useEffect(()=>{
  if(previousSheet.current==='dominion-roll-help'&&sheet!=='dominion-roll-help'&&eligible)setAcknowledged(signature);
  previousSheet.current=sheet;
 },[sheet,signature,eligible]);
 useEffect(()=>{
  if(enabled&&eligible&&!sheet&&!blocked&&seen.current!==signature){seen.current=signature;open.current?.();}
 },[enabled,eligible,sheet,blocked,signature]);
 useEffect(()=>{
  setCountdown(null);
  if(!eligible||blocked||sheet||!visible||!onAction||(enabled&&acknowledged!==signature)||fired.current===position)return;
  const plan=automaticPassPlan(state,legal);if(!plan)return;
  let remaining=4;setCountdown({...plan,remaining});
  const timer=setInterval(()=>{
   const current=latest.current;
   if(!current.eligible||current.blocked||current.sheet||current.position!==position||document.visibilityState==='hidden'){clearInterval(timer);setCountdown(null);return;}
   remaining--;if(remaining>0){setCountdown({...plan,remaining});return;}
   clearInterval(timer);setCountdown(null);
   const fresh=automaticPassPlan(current.state,current.legal);
   if(!fresh||fresh.action.id!==plan.action.id)return;
   fired.current=position;Promise.resolve(current.onAction(fresh.action)).catch(()=>{});
  },1000);
  return()=>clearInterval(timer);
 },[eligible,blocked,sheet,visible,enabled,acknowledged,signature,position,legalKey]);
 return countdown;
}
function HelpSwitch(){const enabled=useHelpPreference();return <label className="ch-roll-help-toggle"><input type="checkbox" checked={enabled} onChange={e=>setRollHelp(e.target.checked)}/><span>Show move guide after rolling</span></label>;}
const activeRoles=state=>isLongDiceState(state)?LONG_DICE_ROLES:DICE_ROLES;
const roleName=(state,type)=>isLongDiceState(state)?HERITAGE_NAMES[type]:PIECE_NAMES[type];
export function DiceTray({state,legal,canAct,onAction,onChoices,onRoll,onSelect,onHelp,autoPass}){
 const end=legal.find(a=>a.kind==='end'),long=isLongDiceState(state),returning=needsKingReturn(state);
 const roll=()=>{if(canAct&&!state.dice.rolled)(onRoll||onChoices)?.();};
 if(returning)return <section className="dice-tray long-dice-tray ch-king-return" aria-label="Return your King"><strong>Your partner has released your King</strong><p>Place it on any empty square. Then pass your second move.</p><button type="button" className="primary" disabled={!canAct} onClick={()=>onSelect?.('control:revive')}>Place returning King</button></section>;
 return <section className="dice-tray long-dice-tray ch-heritage-dice" aria-label="Turn dice">
  <div className="dice-heading"><span><strong>{state.revivalPassRequired?'King returned':state.dice.rolled?'Your long dice':'Chaturanga dice'}</strong><small>{state.revivalPassRequired?'Pass the second move to continue':long?'Two four-sided dice · 2, 3, 4, 5':'Legacy saved match · Original dice rules'}</small></span>{!state.dice.rolled&&<button type="button" className="primary" disabled={!canAct} onClick={roll}>Roll both</button>}{end&&<button type="button" className="secondary dice-end-turn" disabled={!canAct} onClick={()=>onAction(end)}>{state.revivalPassRequired?'Pass second move':'Pass remaining'}</button>}</div>
  {!state.revivalPassRequired&&<div className="dice-pair">{[0,1].map(index=>{
   const value=state.dice.values[index],used=state.dice.used[index],types=activeRoles(state)[value]||[],pass=legal.find(a=>a.kind==='pass'&&a.raw.index===index);
   return <div className={`die ${used?'used':''}`} key={index} aria-label={`Die ${index+1}${value?`: ${value}, ${types.map(t=>roleName(state,t)).join(' or ')}, ${used?'used':'available'}`:', not rolled'}`}>
    {index===0?<button type="button" className="ch-die-face" aria-label="Roll both long dice" disabled={!canAct||state.dice.rolled} onClick={roll}><LongIceDie value={value} spent={used}/><ChaturangaResultPips value={value}/><ChaturangaDiePieces state={state} types={types}/></button>:<div className="ch-die-face"><LongIceDie value={value} spent={used}/><ChaturangaResultPips value={value}/><ChaturangaDiePieces state={state} types={types}/></div>}
    <span className="long-die-legend"><strong>{used?'Used':value?`${value} · ${types.map(t=>roleName(state,t)).join(' / ')}`:`Die ${index+1}`}</strong>{value?<span className="dice-activation-images">{types.map(type=><img key={type} src={asset(pieceArt(state.turn,type))} alt={roleName(state,type)} width="26" height="26"/>)}</span>:<small>{index===0?'Tap to roll both':'Paired with the left die'}</small>}</span>
    {pass&&<button type="button" className="ch-pass-die" disabled={!canAct} onClick={()=>onAction(pass)}>Pass die {index+1}</button>}
   </div>;
  })}</div>}
  {state.dice.rolled&&!state.revivalPassRequired&&onHelp&&<button type="button" className="ch-dice-quick-help" onClick={onHelp}>✦ Show my moves &amp; dice guide</button>}
  {!state.dice.rolled&&legal.some(a=>a.kind==='skip')&&<button type="button" className="ch-skip-turn" disabled={!canAct} onClick={()=>onChoices?.('skip')}>Pass turn</button>}
  {autoPass&&<p className="ch-auto-pass" role="status" aria-live="polite">{autoPass.wholeTurn?'No valid moves · Passing turn':`Die ${autoPass.dice[0]+1} has no possible move · Passing die`} in {autoPass.remaining}s</p>}
  <HelpSwitch/>
  {state.frozenTeams?.length>0&&<p className="ch-frozen-note" role="status">Frozen: {state.frozenTeams.map(t=>seatName('dominion',t)).join(', ')}. Their pieces stay on the board.</p>}
 </section>;
}
export function DominionTurnPrompt({state,confirm,busy,onBoth,onSkip,onAskSkip,onClose}){
 const color=seatName('dominion',state.turn);
 return <div className="dominion-turn-prompt ch-heritage-prompt"><div className="dominion-turn-color"><i style={{background:COLORS[state.turn]}}/><strong>{confirm?`${color} kingdom`:`Your turn · ${color}`}</strong></div>{confirm?<><p>Pass {color}’s turn without rolling?</p><div className="skip-confirm-actions"><button type="button" className="primary full" id="dominion-no-skip" disabled={busy} onClick={onBoth}>No, roll both dice</button><button type="button" className="secondary full danger" disabled={busy} onClick={onSkip}>Yes, pass turn</button></div></>:<><p>Roll both dice on the game screen.</p><div className="turn-dice-preview" aria-hidden="true"><LongIceDie/><LongIceDie/></div><button type="button" className="primary full" id="dominion-back-board" disabled={busy} onClick={onClose}>Back to the board</button></>}</div>;
}
export function DominionRollGuide({state,legal,onClose,onSelect}){
 return <section className="ch-roll-guide" aria-label="What you can move"><h3>Two dice. Two choices.</h3><p>Your long dice each grant one move. You may use either die first. A matching pair can move the same piece twice when both moves are legal.</p><div className="ch-guide-dice">{[0,1].filter(i=>state.dice.values[i]!=null).map(index=>{
  const value=state.dice.values[index],used=state.dice.used[index],types=activeRoles(state)[value]||[];
  return <section className="ch-guide-die" key={index}><div><LongIceDie value={value} spent={used}/><strong>Die {index+1} · {value}{used?' · Used':''}</strong></div>{types.map(type=>{
   const moves=legal.filter(a=>a.kind==='move'&&a.raw.dieIndex===index&&state.board[a.raw.fromRow]?.[a.raw.fromCol]?.type===type),sources=[...new Set(moves.map(a=>a.source))];
   return <button type="button" className="ch-guide-piece" key={type} disabled={used||!moves.length} onClick={()=>{onSelect?.(sources[0]);onClose();}}><img src={asset(pieceArt(state.turn,type))} alt=""/><span><strong>{roleName(state,type)}</strong><small>{used?'Die already spent':sources.length?`${sources.length} ${sources.length===1?'piece':'pieces'} · ${moves.length} legal moves`:'No legal move yet'}</small></span>{!!moves.length&&<span aria-hidden="true">→</span>}</button>;
  })}</section>;
 })}</div><p className="ch-guide-tip">Tap an available piece above to highlight it on the board. Blocked dice are rechecked after every move. A die is kept if your other move could unlock it.</p><p className="ch-guide-timer-note">Back to the board starts a 4-second countdown for dice with no possible move this turn.</p><HelpSwitch/><button type="button" className="primary full" onClick={onClose}>Back to the board</button></section>;
}
