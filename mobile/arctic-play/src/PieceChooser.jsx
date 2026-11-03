import React,{useMemo} from 'react';
import {create,pieces} from './games.ts';
import {PIECE_GUIDES,rawUnits,unitRole,owner} from './learning.js';
export function PieceChooser({id,role,onRole}){
 const icons=useMemo(()=>{const state=create(id),raw=rawUnits(id,state),shown=pieces(id,state);return Object.fromEntries(PIECE_GUIDES[id].map(([key])=>{const piece=raw.find(p=>unitRole(id,p)===key&&(owner(id,p)==='red'||key==='emperor'));return[key,shown.find(p=>p.id===piece?.id)?.sprite];}));},[id]);
 return <div className="movement-piece-choices" aria-label="Choose a piece to learn">{PIECE_GUIDES[id].map(([key,name])=><button key={key} type="button" aria-label={'Learn '+name+' movement'} aria-pressed={role===key} onClick={()=>onRole(key)}><img src={icons[key]} alt=""/><span>{name}</span></button>)}</div>;
}
