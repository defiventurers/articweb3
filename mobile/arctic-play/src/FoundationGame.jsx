import {secureUuid} from './uuid.js';
import React,{useEffect,useRef,useState} from 'react';
import {ArrowRight,KeyRound,RotateCcw} from 'lucide-react';
import {NODES,EDGES,createNineIceFortsState,getLegalActions,applyAction,actionKey,getPlayerPhase} from './foundation.js';
import {RuleClient} from './ruleClient.js';
import {read,write} from './storage.js';
const SAVE='nine-ice-forts.foundation.v1';
const fresh=()=>({id:secureUuid(),state:createNineIceFortsState({mode:'bots'}),actions:[]});
function restored(){const saved=read(SAVE,null);return saved?.state?.rulesetVersion==='navakankari-standard-1.0.0'&&Array.isArray(saved.actions)?saved:fresh();}
export function FoundationGame({access,onKeys,onClose}){
  const [match,setMatch]=useState(restored),[selected,setSelected]=useState(null),[thinking,setThinking]=useState(false),[message,setMessage]=useState(''),[reward,setReward]=useState(false),[retry,setRetry]=useState(0);
  const client=useRef(null),processed=useRef(new Set());if(!client.current)client.current=new RuleClient();
  const state=match.state,legal=getLegalActions(state),myTurn=state.currentPlayer==='blue'&&!state.winner;
  useEffect(()=>{if(!write(SAVE,match))setMessage('Phone storage is full. Free space to save this match.');},[match]);
  useEffect(()=>()=>client.current.reset('Foundation game closed.'),[]);
  useEffect(()=>{
    if(state.currentPlayer!=='coral'||state.winner)return;
    let active=true;setThinking(true);
    const timer=setTimeout(()=>client.current.call('foundation-bot',{state}).then(value=>{if(active){setThinking(false);setSelected(null);setMatch(current=>({...current,state:value.state,actions:[...current.actions,value.action]}));}}).catch(e=>{if(active){setThinking(false);setMessage(e.message);}}),420);
    return()=>{active=false;clearTimeout(timer);};
  },[state,retry]);
  useEffect(()=>{
    if(state.winner!=='blue'||processed.current.has(match.id))return;
    processed.current.add(match.id);const proof={id:'nine-ice-forts',matchId:match.id,actions:match.actions};
    client.current.call('verify-foundation',{proof}).then(value=>{const previous=Object.keys(access.progress.foundationWins).length;access.awardFoundation(value.win,proof);const duplicate=!!access.progress.foundationWins[value.win.signature];setReward(!duplicate&&previous<4);setMessage(duplicate?'This winning move record has already earned its key.':previous>=4?'You have earned all four foundation-game keys.':'A verified victory. Your Lantern Key is ready.');}).catch(e=>setMessage(e.message));
  },[state.winner,match.id]);
  function move(node){if(!myTurn||thinking)return;setMessage('');
    if(!state.pendingRemoval&&getPlayerPhase(state)!=='placement'&&state.board[node]==='blue'){setSelected(node);return;}
    const action=legal.find(a=>a.type==='move'?a.from===selected&&a.to===node:a.nodeId===node);
    if(!action){setMessage(state.pendingRemoval?'Choose a removable coral scout. Scouts outside a mill must be removed first.':selected?'Choose a highlighted empty point.':'Choose your blue scout first, then an empty destination.');return;}
    const next=applyAction(state,action);if(next.error){setMessage(next.error);return;}setSelected(null);setMatch({...match,state:next.state,actions:[...match.actions,actionKey(action)]});
  }
  const targets=new Set(myTurn?legal.filter(a=>a.type!=='move'||a.from===selected).map(a=>a.to||a.nodeId):[]),points=Object.fromEntries(NODES.map(p=>[p.id,p]));
  return <section className="foundation-game"><p className="world-eyebrow">FREE FOUNDATION GAME · NAVAKANKARI</p><h2>Nine Ice Forts</h2><p>Nine Men’s Morris against a beginner bot. A verified win earns one Lantern Key, up to four keys from distinct winning games.</p><div className="foundation-score"><span>You · Blue<strong>{state.piecesOnBoard.blue} on board · {9-state.placed.blue} to place</strong></span><span>Beginner bot · Coral<strong>{state.piecesOnBoard.coral} on board · {9-state.placed.coral} to place</strong></span></div>
    <p className="foundation-cue" role="status">{state.winner?state.winner==='draw'?'A draw. Start another game whenever you like.':state.winner==='blue'?'You won!':'The bot won. Try again, or earn a key through short formations.':thinking?'The beginner bot is thinking…':state.pendingRemoval?`${myTurn?'You made a mill! Remove one coral scout.':'The bot made a mill.'}`:myTurn?getPlayerPhase(state)==='placement'?'Place a blue scout on an empty point.':getPlayerPhase(state)==='flying'?'Three scouts remain. Select one and fly to any empty point.':'Select a blue scout, then move along one line.':'The bot is taking its turn.'}</p>
    <div className="formation-board"><svg viewBox="0 0 100 100" role="group" aria-label="Nine Ice Forts board"><title>Nine Men’s Morris · Blue versus beginner coral bot</title>{EDGES.map(([a,b])=><line key={a+b} x1={points[a].x} y1={points[a].y} x2={points[b].x} y2={points[b].y} className="formation-line"/>)}{NODES.map(p=><g key={p.id} role="button" tabIndex={myTurn?0:-1} aria-label={`${p.id}: ${state.board[p.id]||'empty'}${targets.has(p.id)?', legal destination':''}`} aria-disabled={!myTurn} onClick={()=>move(p.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();move(p.id);}}} className={`formation-point ${state.board[p.id]==='blue'?'mine':state.board[p.id]==='coral'?'coral':'empty'} ${selected===p.id?'selected':''} ${targets.has(p.id)?'target':''}`}><circle cx={p.x} cy={p.y} r="4.6"/></g>)}</svg></div>
    {message&&<p role="status" className="formation-feedback">{message}</p>}{reward&&<button className="primary full" onClick={onKeys}><KeyRound size={18}/> Choose a hall for your key <ArrowRight size={17}/></button>}
    <details className="world-detail" open={!match.actions.length}><summary>How to play</summary><p>Place your nine scouts in turn. A straight line of three is a mill: remove one rival scout. Take a scout outside a mill first, unless all rival scouts are in mills.</p><p>Once all nine scouts have been placed, move to adjacent empty points along the lines. With three scouts left, you may fly to any empty point.</p><p>Win by reducing your rival to two scouts or blocking every move. Three repeated positions or 100 turns without a capture draw. Hints from the short formations can help you recognize mills.</p></details>
    {!state.winner&&state.currentPlayer==='coral'&&!thinking&&<button className="secondary full" onClick={()=>setRetry(n=>n+1)}>Retry bot move</button>}<button className="secondary full" onClick={()=>{client.current.reset('Starting a fresh foundation game.');setMatch(fresh());setSelected(null);setThinking(false);setMessage('');setReward(false);}}><RotateCcw size={17}/> New foundation game</button><button className="text-button" onClick={onClose}>Back to formations</button><small className="unlock-footnote">This free foundation game is separate from the seven heritage halls. A draw or unfinished game awards no key. Replaying the same winning move record awards no additional key.</small>
  </section>;
}
