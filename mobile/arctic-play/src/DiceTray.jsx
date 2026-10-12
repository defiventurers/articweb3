import React from 'react';
import {seatName} from './games.ts';
const roles={1:'Guard · King',2:'Mammoth',3:'Unicorn',4:'Icebreaker',5:'Guard · King',6:'Icebreaker'};
const dots={1:[[24,24]],2:[[13,13],[35,35]],3:[[13,13],[24,24],[35,35]],4:[[13,13],[35,13],[13,35],[35,35]],5:[[13,13],[35,13],[24,24],[13,35],[35,35]],6:[[13,12],[35,12],[13,24],[35,24],[13,36],[35,36]]};
function Face({value}){return <svg viewBox="0 0 48 48" aria-hidden="true"><rect x="2" y="2" width="44" height="44" rx="10" fill="currentColor"/>{value?(dots[value]||[]).map(([x,y],i)=><circle key={i} cx={x} cy={y} r="3.5" fill="#112238"/>):<text x="24" y="32" textAnchor="middle" fill="#112238" fontSize="28" fontWeight="700">?</text>}</svg>;}
export function DiceTray({state,legal,canAct,onAction}){
  const roll=legal.find(a=>a.kind==='roll'),end=legal.find(a=>a.kind==='end');
  const previous=state.mobileLastRoll;
  return <section className="dice-tray" aria-label="Turn dice">
    <div className="dice-heading"><span><strong>Turn dice</strong><small>{state.dice.rolled?'Each die unlocks one move':'Roll to activate your pieces'}</small></span>{!state.dice.rolled&&<button className="primary" disabled={!canAct||!roll} onClick={()=>onAction(roll)}>Roll both dice</button>}{end&&<button className="secondary" disabled={!canAct} onClick={()=>onAction(end)}>Pass unusable dice</button>}</div>
    <div className="dice-pair">{state.dice.values.map((value,index)=><div className={`die ${state.dice.used[index]?'used':''}`} key={index} aria-label={`Die ${index+1}${value?`: ${value}, ${roles[value]}, ${state.dice.used[index]?'used':'available'}`:', not rolled'}`}><Face value={value}/><span><strong>Die {index+1}{value?` · ${value}`:''}</strong><small>{value?roles[value]:'Not rolled'}{state.dice.used[index]?' · Used':''}</small></span></div>)}</div>
    {previous?.skipped&&<p className="dice-skip" role="status">{seatName('dominion',previous.team)} rolled {previous.values.join(' + ')} with no legal move. Turn passed.</p>}
  </section>;
}
