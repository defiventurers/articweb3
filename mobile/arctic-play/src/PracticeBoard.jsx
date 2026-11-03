import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Plus,Trash2,Undo2,X} from 'lucide-react';
import {board,seatName,COLORS} from './games.ts';
import {Board} from './Board.jsx';
import {TeachingHost} from './TeachingHost.jsx';
import {LearningPanel} from './LearningPanel.jsx';
import {RuleClient} from './ruleClient.js';
export function PracticeBoard({id,preferences}){
 const[position,setPosition]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('Start with an empty board. Tap Add a piece, choose one, then tap an empty point to place it.'),[palette,setPalette]=useState(false),[faction,setFaction]=useState('red'),[placing,setPlacing]=useState(null),[history,setHistory]=useState([]),[promotions,setPromotions]=useState(null);
 const geometry=useMemo(()=>board(id),[id]),client=useRef(null),sequence=useRef(0),boardElement=useRef(null);
 if(!client.current)client.current=new RuleClient('learn.js');
 async function run(op,extra={},remember=false){
  const job=++sequence.current;setBusy(true);setError('');setPromotions(null);
  try{
   const next=await client.current.call('practice',{id,op,state:position?.state,...extra});if(job!==sequence.current)return;
   if(remember&&position)setHistory(list=>[...list,position.state].slice(-60));
   setPosition(next);
   if(op==='place'){setPlacing(null);setMessage('Placed! Tap a blue destination to make a legal move, or add another piece.');}
   if(op==='move')setMessage(next.state.hanOwner?'Han is active. The yellow pieces now follow their controller’s movement rules.':next.captured?'Captured! Keep exploring the new legal destinations.':'A legal move. The destinations have updated.');
   if(op==='remove')setMessage('Piece removed. Add another piece or undo.');
  }catch(e){if(job===sequence.current)setError(e.message);}finally{if(job===sequence.current)setBusy(false);}
 }
 useEffect(()=>{run('empty');return()=>{sequence.current++;client.current.reset('The practice board closed.');};},[id]);
 const units=position?.units||[],selected=position?.selected,moving=units.find(p=>p.source===selected),available=position?.stock.filter(p=>!units.some(u=>u.id===p.id)&&(id!=='yanyi'||!position.state.activationUsed||p.role!=='emperor'))||[];
 const chosen=position?.stock.find(p=>p.id===placing),factions=[...new Set((position?.stock||[]).map(p=>p.faction))],roles=[...new Set((position?.stock||[]).filter(p=>p.faction===faction).map(p=>p.role))];
 const emptyCells=geometry.cells.filter(c=>!units.some(p=>p.cell===c.id)).map(c=>c.id);
 const allLegal=[...units.map(p=>({source:p.source,target:null})),...(position?.legal||[])];
 function select(source){if(!source)return;setPlacing(null);setMessage('');run('select',{source});}
 function target(cell){const options=position.legal.filter(a=>a.target===cell);if(options.length>1)setPromotions(options);else if(options.length)run('move',{source:selected,actionId:options[0].id},true);}
 function place(cell){if(placing)run('place',{prototypeId:placing,cell},true);}
 function choose(piece){setPlacing(piece.id);setPalette(false);setMessage('');requestAnimationFrame(()=>boardElement.current?.scrollIntoView({block:'center',behavior:'auto'}));}
 function undo(){const state=history.at(-1);if(!state)return;setHistory(list=>list.slice(0,-1));setPlacing(null);setMessage('One step back. Continue with legal moves.');run('select',{state,source:null});}
 const guide=chosen?'Place your '+chosen.label+': tap an empty point. After placement, its movement rules apply.':moving?moving.origin==='han'&&!moving.owner?'Han is waiting for activation. A Horse and the Emperor can demonstrate it.':position.legal.length?'Your '+moving.label+' is selected. Move to a blue destination; an orange ring is a capture.':moving.label+' has no legal move here. Add another piece, remove it, or undo.':message||'Tap a placed piece to see its legal moves, or add another piece.';
 return <section className="practice-builder" data-ready={!!position&&!busy} data-piece-count={units.length} data-selected={selected||''}>
  <div className="focus-heading"><small>YOUR OWN PRACTICE POSITION</small><h2>Place pieces. Try their moves.</h2></div>
  <TeachingHost host="abster" preferences={preferences} minimal mood={chosen?'thinking':'listening'}>{guide}</TeachingHost>
  <p className="practice-scope">Piece movement, blockers and captures apply. No turn limit{id==='dominion'?' or dice':''}.{id==='yanyi'?' After the opening round.':''} Full Rules teaches match play.</p>
  <div className="practice-builder-actions"><button className="primary" disabled={busy||!available.length} onClick={()=>setPalette(true)}><Plus size={20}/> Add a piece</button>{placing&&<button className="secondary" onClick={()=>setPlacing(null)}><X size={17}/> Cancel placement</button>}{history.length>0&&<button className="secondary" disabled={busy} onClick={undo}><Undo2 size={18}/> Undo</button>}</div>
  {position?<div ref={boardElement} className="academy-board practice-position-board"><Board id={id} state={position.state} positionPieces={units} legal={placing?units.map(p=>({source:p.source,target:null})):allLegal} selected={placing?null:selected} trail={position.trail} onSelect={select} onTarget={target} placementCells={placing?emptyCells:[]} onInspect={place} onMiss={()=>setError(placing?'Choose an empty point for this new piece.':'That point is not a legal destination. Tap a piece, then a highlighted point.')} canAct={!busy} compactControls perspective="red"/></div>:<p role="status">Preparing an empty board…</p>}
  {!units.length&&<p className="practice-empty-note">Empty board · Add one piece or build a bigger position.</p>}
  <div className="practice-edit-actions">{moving&&<button className="text-button" disabled={busy} onClick={()=>run('remove',{source:selected},true)}><Trash2 size={17}/> Remove selected piece</button>}<button className="text-button" disabled={busy||!units.length} onClick={()=>{setPlacing(null);setMessage('Empty again. Choose pieces to build a new position.');run('empty',{},true);}}><Trash2 size={17}/> Clear board</button></div>
  {error&&<p className="lesson-error" role="alert">{error}</p>}
  {palette&&<LearningPanel title="Add a piece" onClose={()=>setPalette(false)}><p>Choose an army and a piece. Then tap an empty point on the board.</p><div className="practice-armies" aria-label="Piece army">{factions.map(color=><button key={color} aria-pressed={color===faction} onClick={()=>setFaction(color)}><i style={{background:color==='han'?'#e4b848':COLORS[color]}}/>{color==='han'?'Han':seatName(id,color)}</button>)}</div><div className="practice-piece-list">{roles.map(role=>{const all=position.stock.filter(p=>p.faction===faction&&p.role===role),stock=available.filter(p=>p.faction===faction&&p.role===role),piece=stock[0]||all[0];return <button key={role} aria-label={'Add '+(faction==='han'?'Han':seatName(id,faction))+' '+piece.label} disabled={!stock.length} onClick={()=>choose(piece)}><img src={piece.sprite} alt=""/><span><strong>{piece.label}</strong><small>{stock.length} available</small></span></button>;})}</div></LearningPanel>}
  {promotions&&<LearningPanel title="Choose promotion" onClose={()=>setPromotions(null)}><TeachingHost host="pengu" preferences={preferences} minimal>Both choices are legal here. Promotion changes how this piece moves.</TeachingHost>{promotions.map(a=><button className={a.promote?'primary full':'secondary full'} key={a.id} onClick={()=>run('move',{source:selected,actionId:a.id},true)}>{a.promote?'Promote':'Keep unpromoted'}</button>)}</LearningPanel>}
 </section>;
}
