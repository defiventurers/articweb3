import React,{useState} from 'react';
import {VictoryCelebration} from './VictoryCelebration.jsx';
export * from './DiceTray.jsx';
export * from './chaturangaLongDice.js';
export {createDominion,dominionActions,applyDominion} from './dominion.js';
export {HomeLanding} from './HomeLanding.jsx';
export * from './chaturangaHeritage.js';
export async function requireLongDiceService(){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const r=await fetch('https://articweb3.onrender.com/arctic-play/health',{cache:'no-store',credentials:'omit',signal:controller.signal});if(!r.ok||!(await r.json()).capabilities?.includes('chaturanga-long-dice-v1'))throw Error('Online Chaturanga is awaiting its long-dice service update. Bots and on-this-phone play are ready.');}finally{clearTimeout(timer);}}
export function ChaturangaBoardSpace({id,children}){return id==='dominion'?<div className="ch-board-space">{children}</div>:children;}

export {calibrateChaturangaGeometry} from './chaturangaArtworkGeometry.js';
// The retained web runtime predates the shared result overlay. Preserve its callbacks.
export function ChaturangaVictory(props){
 const [closed,setClosed]=useState(false);
 if(closed)return <div className="result-card ch-final-result"><strong>{props.outcome.draw?'Draw':'Match complete'}</strong><button onClick={()=>setClosed(false)}>Show match result</button><button onClick={props.onPlayAgain}>{props.isOnline?'Return to room':'Play again'}</button></div>;
 return <VictoryCelebration {...props} id="dominion" onFinalBoard={()=>setClosed(true)} onPlayAgain={()=>{setClosed(true);props.onPlayAgain?.();}} onRematch={()=>{setClosed(true);props.onRematch?.();}}/>;
}
