import React,{useState} from 'react';
import {GUIDES} from './brand.js';
import {GATHERING_KEY} from './gathering.js';
import {MascotAppearanceContext,MascotPortrait} from './Companions.jsx';
import {read} from './storage.js';
import {useCollectionAppearance,saveAppearance} from './collections.js';
import {SCENES,DECORATIONS,PINS,earnedPins,appearanceFor,availableDecoration,ownsProduct,portraitFor} from './collectionModel.js';
import {memoryList,memoryDefinition} from './companionJourney.js';
import {measure} from './cloud.js';

export function MemoryPin({id}){const p=PINS.find(p=>p.id===id);return p?<span className="memory-pin" title={p.label} aria-label={p.label}>{p.symbol}</span>:null;}
export function CampScene({appearance={},host='polly',preview=false,showHost=true,onHost,onMemory,mood='listening',motion=false,pulse=0}){
 const scene=SCENES[appearance.camp]||SCENES.classic,portrait=portraitFor(host,appearance.outfits?.[host])||`art/brand/hosts-director-v1/${host}/listening.webp`,memory=appearance.memory&&memoryDefinition(appearance.memory);
 return <div className={`camp-room camp-stage scene-${appearance.camp||'classic'}`} style={scene.image?{backgroundImage:`url('${scene.image}')`}:undefined} aria-label={`${scene.name}${preview?' preview':''}`}>
   {preview&&<span className="preview-watermark">PREVIEW · NOT EQUIPPED</span>}
   {showHost&&<MascotAppearanceContext.Provider value={{outfits:appearance.outfits||{},pin:appearance.pin}}>{onHost?<button className="room-host" aria-label={`High five ${GUIDES[host].name}`} onClick={onHost}><MascotPortrait host={host} mood={mood} large motion={motion} pulse={pulse}/></button>:<span className="room-host"><MascotPortrait host={host} mood={mood} large motion={false}/></span>}</MascotAppearanceContext.Provider>}
   {['left','right'].map(slot=>{const id=appearance.decorations?.[slot],d=DECORATIONS[id];if(!d?.image)return null;const item=<><img src={d.image} alt={d.name}/>{id==='pedestal'&&memory&&<span className="pedestal-memory" title={memory.title}>✦</span>}</>;return id==='pedestal'&&memory&&onMemory?<button key={slot} className={`room-object ${slot}`} onClick={()=>onMemory(memory)} aria-label={`Remember ${memory.title}`}>{item}</button>:<span key={slot} className={`room-object ${slot}`}>{item}</span>;})}
   {memory&&appearance.decorations&&Object.values(appearance.decorations).includes('pedestal')&&<span className="room-memory-caption">{memory.title}</span>}
 </div>;
}
export function CampStudio({journey,host='polly',preferences,onMemory}){
 const current=useCollectionAppearance(),[draft,setDraft]=useState(()=>({...current})),[message,setMessage]=useState(''),chapter=read('frozen-library.v1',{}),pins=earnedPins(journey),memories=memoryList(journey);
 const accepted=appearanceFor(draft,current.entitlements,chapter,journey,read(GATHERING_KEY,{})),locked=accepted.camp!==draft.camp||['left','right'].some(s=>(draft.decorations?.[s]||'none')!==accepted.decorations[s])||accepted.table!==draft.table;
 function change(patch){setDraft(v=>({...v,...patch}));setMessage('');}
 function save(){if(locked)return;if(saveAppearance(draft)){measure('camp_saved',null,SCENES[draft.camp]?.product);setMessage('Your Camp is saved on this device.');}else setMessage('Your device could not save Camp. Free some storage and try again.');}
 const owns=id=>!id||ownsProduct(current.entitlements,id),availability=d=>d.gathering?availableDecoration('guest-lantern',current.entitlements,chapter,read(GATHERING_KEY,{}))?' · Earned':' · Complete The Eighth Lantern':d.earned?availableDecoration('earned-lantern',current.entitlements,chapter)?' · Earned':' · Finish the Library chapter':d.product&&!owns(d.product)?' · Preview':'';
 return <div className="camp-studio"><p className="studio-intro">A little place that feels like you. Try any room; save the things you own or earned.</p><CampScene appearance={{...draft,outfits:{...journey.outfits,...draft.outfits}}} host={host} preview={locked} showHost={preferences.mode!=='off'} onMemory={onMemory}/>
 <label className="minimal-field">Room<select aria-label="Camp room" value={draft.camp} onChange={e=>change({camp:e.target.value})}>{Object.entries(SCENES).map(([id,s])=><option key={id} value={id}>{s.name}{!owns(s.product)?' · Preview':''}</option>)}</select></label>
 {['left','right'].map(slot=><label className="minimal-field" key={slot}>{slot==='left'?'Left keepsake':'Right keepsake'}<select aria-label={`${slot} Camp decoration`} value={draft.decorations?.[slot]||'none'} onChange={e=>{const id=e.target.value;change({decorations:{...draft.decorations,[slot]:id,...(id!=='none'&&draft.decorations?.[slot==='left'?'right':'left']===id?{[slot==='left'?'right':'left']:'none'}:{})}});}}>{Object.entries(DECORATIONS).map(([id,d])=><option key={id} value={id}>{d.name}{availability(d)}</option>)}</select></label>)}
 {Object.values(draft.decorations||{}).includes('pedestal')&&<label className="minimal-field">Display a memory<select aria-label="Pedestal memory" value={draft.memory||''} onChange={e=>change({memory:e.target.value||null})}><option value="">Choose later</option>{memories.map(m=><option key={m.key} value={m.key}>{m.title}</option>)}</select></label>}
 <details className="minimal-detail"><summary>Personal details</summary><p className="muted">Pins come from your memories, on free and paid outfits alike. They stay earned when you take a break.</p><label className="minimal-field">Companion pin<select aria-label="Companion memory pin" value={draft.pin||'none'} onChange={e=>change({pin:e.target.value})}><option value="none">No pin</option>{PINS.map(p=><option key={p.id} value={p.id} disabled={!pins.some(v=>v.id===p.id)}>{p.label}{pins.some(v=>v.id===p.id)?' · Earned':' · Discover together'}</option>)}</select></label><label className="minimal-field">Table trim<select aria-label="Personal table trim" value={draft.table||'classic'} onChange={e=>change({table:e.target.value})}><option value="classic">Classic</option><option value="aurora">Aurora{!owns('founding-explorers-v1')?' · Preview':''}</option><option value="court">Lantern{!owns('lantern-court-v1')?' · Preview':''}</option></select></label><div className={`table-trim-sample trim-${draft.table||'classic'}`}>Your game stays clear.</div><p className="muted">Trim appears around your match board on this device. Your friends keep their own style.</p></details>
 <button className="primary full" disabled={locked} onClick={save}>Save my Camp</button>{locked&&<p className="muted center">Preview only. Choose owned or earned items to save.</p>}<button className="text-button focus-help" onClick={()=>{setDraft({...current});setMessage('Back to your saved Camp.');}}>Reset preview</button>{message&&<p role="status">{message}</p>}
 </div>;
}
