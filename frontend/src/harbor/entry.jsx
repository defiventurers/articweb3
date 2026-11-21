import React, {useEffect, useLayoutEffect, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import {HOST_META} from "../components/PenguinHosts.jsx";
import {ARRIVAL, HALLS, ROOM_ENTRY, door} from "./world.js";
import "./harbor.css";

const portraits=import.meta.glob("./portraits/*.webp",{eager:true,import:"default"});
const CATALOG="/?collection=strategy";
const returnHall=HALLS.find(h=>h.key===new URLSearchParams(location.search).get("return"));
function read(key, fallback){try{return localStorage.getItem("ak.harbor."+key)??fallback;}catch{return fallback;}}
function write(key,value){try{localStorage.setItem("ak.harbor."+key,value);}catch{/* Private browsing can still explore. */}}
function preferredAvatar(){const id=read("avatar","polly");return Object.hasOwn(HOST_META,id)?id:"polly";}
function Icon({type}) {
  const paths={
    compass:<><circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/></>,
    menu:<><path d="M4 6h16M4 12h16M4 18h16"/></>,
    back:<path d="m11 5-7 7 7 7M4 12h16"/>,
    enter:<><path d="M13 4h7v16h-7M3 12h12m-5-5 5 5-5 5"/></>,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

function Dialog({title,onClose,children}) {
  const el=useRef(null);
  useLayoutEffect(()=>{
    const previous=document.activeElement;
    const dialog=el.current;dialog.showModal();
    return ()=>{dialog.close();if(previous?.isConnected)previous.focus();};
  },[]);
  return <dialog ref={el} className="sheet" aria-labelledby="sheet-title" onCancel={e=>{e.preventDefault();onClose();}}>
    <section><div className="sheet-heading"><h2 id="sheet-title">{title}</h2><button onClick={onClose} aria-label="Close panel">×</button></div>{children}</section>
  </dialog>;
}

function World(){
  const [avatar,setAvatar]=useState(preferredAvatar),[started,setStarted]=useState(Boolean(returnHall));
  const [room,setRoom]=useState(false),[visit,setVisit]=useState(0),[panel,setPanel]=useState(null);
  const [near,setNear]=useState(null),[status,setStatus]=useState("loading");
  const [low,setLow]=useState(()=>read("quality","standard")==="low");
  const [reduced,setReduced]=useState(()=>read("motion",matchMedia("(prefers-reduced-motion: reduce)").matches?"reduce":"full")==="reduce");
  const [sound,setSound]=useState(()=>read("sound","off")==="on");
  const position=useRef(returnHall?door(returnHall):{...ARRIVAL}),canvas=useRef(null);
  const input=useRef({paused:false,touch:new Set()}),preferences=useRef({}),action=useRef(null),audio=useRef(null);
  preferences.current={low,reduced};
  input.current.paused=Boolean(panel);
  const fallback=status==="fallback";
  const hall=HALLS.find(h=>h.key===panel);
  const activeHall=HALLS.find(h=>h.key===near);
  const interactLabel=activeHall?"Enter "+activeHall.name:({table:"Visit game table",heritage:"Read heritage plaque",tutorial:"Learn piece movement",exit:"Exit to harbor"}[near]);
  function chime(){
    if(!sound)return;
    try{
      const ctx=audio.current ||= new (window.AudioContext||window.webkitAudioContext)();
      void ctx.resume().catch(()=>{});
      const osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.frequency.setValueAtTime(660,ctx.currentTime);osc.frequency.setValueAtTime(880,ctx.currentTime+.08);
      gain.gain.setValueAtTime(.055,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.22);
      osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.23);
    }catch{/* Audio is optional. */}
  }
  function menu(value){input.current.release?.();input.current.paused=Boolean(value);setPanel(value);}
  function arrive(inside,p){
    input.current.release?.();position.current={...p};
    setRoom(inside);setNear(null);setStatus("loading");setVisit(v=>v+1);menu(null);
  }
  function visitHall(h){
    chime();
    if(fallback){menu(h.key);return;}
    if(h.key==="temple"){arrive(true,ROOM_ENTRY);return;}
    if(room)arrive(false,door(h));
    else Object.assign(position.current,door(h));
    menu(h.key);
  }
  function interact(id){
    if(!id)return;
    const h=HALLS.find(item=>item.key===id);
    if(h){visitHall(h);return;}
    if(id==="exit"){chime();arrive(false,door(HALLS[0]));return;}
    if(id==="tutorial"){location.assign("/?game=arctic-dominion&movement=1&fromHarbor=temple");return;}
    chime();menu("temple");
  }
  action.current={interact,menu};
  useEffect(()=>{
    if(!started || !canvas.current)return;
    let alive=true,dispose;
    const element=canvas.current;
    const fail=()=>{if(alive){input.current.release?.();setStatus("fallback");setPanel("halls");}};
    Promise.all([import("./renderer.js"),room?import("./interior.js"):import("./exterior.js")]).then(([{mountWorld},{buildScene}])=>{
      if(!alive)return;
      dispose=mountWorld(element,{buildScene,room,avatar,position,input,preferences,onNear:setNear,
        onInteract:id=>action.current.interact(id),onMenu:()=>action.current.menu("menu"),onFailure:fail});
      if(alive)setStatus("ready");
    }).catch(fail);
    return ()=>{alive=false;dispose?.();};
  },[started,room,avatar,visit]);
  useEffect(()=>()=>{audio.current?.close().catch(()=>{});},[]);
  function enter(){write("avatar",avatar);chime();setStarted(true);setStatus("loading");}
  function changePenguin(){menu(null);setStarted(false);setRoom(false);position.current={...ARRIVAL};setNear(null);}
  const hallList=<div className="hall-list">{HALLS.map(h=><button key={h.key} onClick={()=>visitHall(h)}>{h.name}<Icon type="enter"/></button>)}</div>;
  if(!started)return <main className="arrival">
    <header className="arrival-top"><span>Antarctic Kingdoms</span><a href={CATALOG}>Quick Play <span aria-hidden="true">↗</span></a></header>
    <section className="boarding"><p className="place">Lantern Harbor</p><h1>Choose your penguin</h1>
      <div className="roster" role="group" aria-label="Penguin avatars">{Object.entries(HOST_META).map(([id,host])=>
        <button key={id} aria-pressed={avatar===id} onClick={()=>setAvatar(id)}>
          <img src={portraits["./portraits/"+id+".webp"]} width="150" height="200" alt=""/><strong>{host.short}</strong>
        </button>)}</div>
      <p className="note">Approved portraits · Prototype walking models</p>
      <button className="gold" onClick={enter}>Enter Lantern Harbor <Icon type="enter"/></button>
    </section></main>;

  return <main className="harbor" aria-label="Explore the Kingdoms">
    {!fallback&&<canvas key={visit} ref={canvas} aria-label={room?"Walkable Chaturanga Temple interior":"Walkable Lantern Harbor waterfront"} />}
    <header className="hud"><div><p className="place">Antarctic Kingdoms</p><h1>{room?"Chaturanga Temple":"Lantern Harbor"}</h1></div>
      <nav><button onClick={()=>menu("halls")}><Icon type="compass"/> Halls</button><button onClick={()=>menu("menu")} aria-label="World menu"><Icon type="menu"/></button></nav></header>
    {status==="loading"&&<p className="loading" role="status">Opening {room?"the temple":"Lantern Harbor"}…</p>}
    {fallback&&<section className="offline"><h2>Harbor directory</h2><p>The 3D view is unavailable on this device.</p>{hallList}<a href={CATALOG}>Quick Play · Game catalogue</a></section>}
    {status==="ready"&&<>
      <div className="pad" role="group" aria-label="Movement controls">{[["up","↑","forward"],["left","←","left"],["down","↓","back"],["right","→","right"]].map(([k,label,name])=>
        <button key={k} className={"pad-"+k} aria-label={"Walk "+name} onPointerDown={e=>{if(!panel){e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);input.current.touch.add(k);}}}
          onLostPointerCapture={()=>input.current.touch.delete(k)} onPointerCancel={()=>input.current.touch.delete(k)}
          onPointerUp={()=>input.current.touch.delete(k)}>{label}</button>)}</div>
      <div className="interact" aria-live="polite">{interactLabel&&<button className="gold" onClick={()=>interact(near)}><Icon type="enter"/>{interactLabel}</button>}</div>
      <p className="hint">WASD or arrows to walk · Drag to look · E to enter</p></>}
    {panel&&<Dialog key={panel} title={hall?.name || (panel==="halls"?"Hall directory":"World menu")} onClose={()=>menu(null)}>
      {hall?<><p>{hall.note}</p>{hall.source&&<p><a href={hall.source} target="_blank" rel="noreferrer">Heritage source · National Museums Scotland ↗</a></p>}
        <div className="hall-list">{hall.actions.map(([label,query])=><a key={query} href={"/?"+query+"&fromHarbor="+hall.key}>{label}<Icon type="enter"/></a>)}</div>
        <button className="subtle" onClick={()=>fallback?menu("halls"):arrive(false,door(hall))}><Icon type="back"/>Return to harbor</button>
      </>:panel==="halls"?<>{fallback&&<p>The 3D view is unavailable. Choose a hall to open its games.</p>}{hallList}<a className="subtle" href={CATALOG}>Quick Play · Game catalogue</a></>:<>
        <p>Walk with the arrows or WASD. Drag the scene to turn the camera. At a doorway or table, tap its name or press E.</p>
        <div className="settings">
          <label><input type="checkbox" checked={low} onChange={e=>{setLow(e.target.checked);write("quality",e.target.checked?"low":"standard");}}/>Low graphics</label>
          <label><input type="checkbox" checked={reduced} onChange={e=>{setReduced(e.target.checked);write("motion",e.target.checked?"reduce":"full");}}/>Reduced motion</label>
          <label><input type="checkbox" checked={sound} onChange={e=>{setSound(e.target.checked);write("sound",e.target.checked?"on":"off");}}/>Interaction sounds</label>
        </div><div className="hall-list"><button onClick={()=>arrive(false,ARRIVAL)}>Return to arrival dock</button>
          <button onClick={changePenguin}>Choose another penguin</button><a href={CATALOG}>Quick Play · Game catalogue</a></div>
      </>}
    </Dialog>}
  </main>;
}

createRoot(document.getElementById("harbor-root")).render(<World/>);
