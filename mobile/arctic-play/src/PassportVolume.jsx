import React,{useState,useEffect,useRef} from 'react';

// Presentation only. The book never writes learning or access records.
export function PassportVolume({page,onTurn,children}){
 const [open,setOpen]=useState(false),[opening,setOpening]=useState(false),[flip,setFlip]=useState(null),[dragProgress,setDragProgress]=useState(null);
 const root=useRef(null),timer=useRef(null),drag=useRef(null),opener=useRef(null),openValue=useRef(false),busy=useRef(false),suppressClick=useRef(false);
 const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 const stop=()=>{clearTimeout(timer.current);busy.current=false;setFlip(null);};
 const focusPage=()=>requestAnimationFrame(()=>root.current?.querySelector('.pp-spread')?.focus({preventScroll:true}));
 function reveal(next){
  if(busy.current)return;
  stop();setDragProgress(null);openValue.current=next;setOpen(next);setOpening(!reduced());
  if(reduced()){setOpening(false);if(next)focusPage();else opener.current?.focus({preventScroll:true});return;}
  busy.current=true;timer.current=setTimeout(()=>{busy.current=false;setOpening(false);if(next)focusPage();else opener.current?.focus({preventScroll:true});},900);
 }
 function turn(next){
  if(busy.current||next===page||next<0||next>3)return;
  if(!openValue.current){onTurn(next);reveal(true);return;}
  if(reduced()){onTurn(next);return;}
  const paper=root.current?.querySelector('.pp-paper');
  if(!paper){onTurn(next);return;}
  busy.current=true;
  // Capture rendered, escaped content so both faces show the actual printed page.
  const html=paper.innerHTML,height=paper.getBoundingClientRect().height;
  setFlip({html,nextHtml:'',height,direction:next>page?'next':'previous',moving:false});onTurn(next);
 }
 useEffect(()=>{
  if(!flip||flip.moving)return;
  const paper=root.current?.querySelector('.pp-paper');
  const raf=requestAnimationFrame(()=>requestAnimationFrame(()=>setFlip(f=>f?{...f,nextHtml:paper?.innerHTML||'',moving:true}:null)));
  timer.current=setTimeout(()=>{setFlip(null);busy.current=false;},780);
  return()=>cancelAnimationFrame(raf);
 },[flip?.direction,flip?.moving,page]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 useEffect(()=>{const listener=e=>turn(Number(e.detail));document.addEventListener('ak-passport-turn',listener);return()=>document.removeEventListener('ak-passport-turn',listener);});
 useEffect(()=>{
  if(!open)return;
  const back=e=>{if(document.querySelector('[role="dialog"],[role="alertdialog"]'))return;e.preventDefault();if(page>0)turn(0);else reveal(false);};
  const key=e=>{if(e.key==='Escape'&&!document.querySelector('[role="dialog"],[role="alertdialog"]')){e.preventDefault();e.stopImmediatePropagation();if(page>0)turn(0);else reveal(false);}};
  document.addEventListener('ak-passport-back',back);document.addEventListener('keydown',key,true);
  return()=>{document.removeEventListener('ak-passport-back',back);document.removeEventListener('keydown',key,true);};
 },[open,page]);
 const snapshot=(html,side)=><div className={'pp-page-imprint '+side} dangerouslySetInnerHTML={{__html:html}}/>;
 return <div className={'pp-volume '+(open?'is-open':'is-closed')+(opening?' is-opening':'')+(dragProgress!==null?' is-dragging':'')} ref={root} data-open={open} style={dragProgress===null?undefined:{'--cover-progress':dragProgress}}>
  <div className="pp-volume-window"><div className="pp-volume-stage">
   <div className="pp-page-stack" aria-hidden="true"/>
   <div className="pp-cover-frame pp-bound-pages" aria-hidden={!open} inert={!open||opening?true:undefined}>
    {children}
    {flip&&<div className={'pp-turn-scene '+flip.direction+(flip.moving?' is-turning':'')} style={{'--leaf-height':flip.height+'px'}} aria-hidden="true" inert={true}>
     <div className="pp-still-leaf">{snapshot(flip.html,flip.direction==='next'?'left':'right')}</div>
     <div className="pp-turn-leaf"><div className="pp-turn-front">{snapshot(flip.html,flip.direction==='next'?'right':'left')}</div><div className="pp-turn-back">{snapshot(flip.nextHtml,flip.direction==='next'?'left':'right')}</div></div>
    </div>}
   </div>
   <div className="pp-front-cover" aria-hidden="true">
    <span className="pp-cover-outside"><img src="art/passport-book-v2/company-passport-cover.webp" width="1024" height="1536" alt="Gold engraved Antarctic Gaming Co. mountain and star logo on a navy passport cover" draggable="false"/></span>
    <span className="pp-cover-inside" aria-hidden="true"><span>ANTARCTIC<br/>GAMING CO.</span><small>A Kingdom of<br/>shared discoveries.</small></span>
   </div>
   <button ref={opener} type="button" className="pp-cover-hit-target" aria-label="Open Antarctic Passport" aria-expanded={open} tabIndex={open?-1:0} disabled={opening||open} onClick={()=>{if(suppressClick.current){suppressClick.current=false;return;}reveal(true);}}
    onPointerDown={e=>{if(open||e.button!==0)return;drag.current={x:e.clientX,y:e.clientY,id:e.pointerId};}}
    onPointerMove={e=>{const d=drag.current;if(!d)return;const dx=d.x-e.clientX,dy=e.clientY-d.y;if(!d.moved&&(Math.abs(dx)<12||Math.abs(dx)<Math.abs(dy)*1.5))return;d.moved=true;e.currentTarget.setPointerCapture?.(e.pointerId);d.progress=Math.max(0,Math.min(1,dx/(root.current.getBoundingClientRect().width*.5)));setDragProgress(d.progress);}}
    onPointerUp={e=>{const d=drag.current;drag.current=null;if(d?.moved){suppressClick.current=true;reveal(d.progress>=.35);}}}
    onPointerCancel={()=>{drag.current=null;setDragProgress(null);}}><span className="pp-sr-only">Open Antarctic Passport</span>
   </button>
  </div></div>
  <div className="pp-book-opening-controls">{open?<button type="button" onClick={()=>reveal(false)} disabled={opening}>Close Passport</button>:<button type="button" onClick={()=>reveal(true)} disabled={opening}>Open your Passport <span aria-hidden="true">↗</span></button>}<span>{open?'Turn a corner. Find a memory.':'Your discoveries, bound together.'}</span></div>
 </div>;
}
