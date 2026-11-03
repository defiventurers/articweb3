import React,{useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';

const layers=[],originals=new Map();let originalOverflow='';
function restore(node,value){node.inert=value.inert;if(value.hidden===null)node.removeAttribute('aria-hidden');else node.setAttribute('aria-hidden',value.hidden);}
function syncLayers(){
  for(let i=layers.length-1;i>=0;i--)if(!layers[i].isConnected)layers.splice(i,1);
  if(!layers.length){for(const [node,value] of originals)if(node.isConnected)restore(node,value);originals.clear();document.body.style.overflow=originalOverflow;return;}
  document.body.style.overflow='hidden';
  const top=layers.at(-1);
  for(const node of document.body.children){
    if(!originals.has(node))originals.set(node,{inert:node.inert,hidden:node.getAttribute('aria-hidden')});
    if(node===top)restore(node,originals.get(node));else{node.inert=true;node.setAttribute('aria-hidden','true');}
  }
}

export function LearningPanel({title,onClose,children,wide=false}){
  const panel=useRef(null),overlay=useRef(null),close=useRef(onClose);close.current=onClose;
  useEffect(()=>{
    const previous=document.activeElement,layer=overlay.current;if(!layers.length)originalOverflow=document.body.style.overflow;
    layers.push(layer);syncLayers();
    panel.current?.querySelector('[aria-label="Close"]')?.focus({preventScroll:true});
    const handle=event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close.current();return;}
      if(event.key!=='Tab')return;
      const controls=[...panel.current.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled),a[href],summary,[tabindex="0"]')].filter(n=>n.getClientRects().length);
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    const node=panel.current;node.addEventListener('keydown',handle);
    return()=>{node.removeEventListener('keydown',handle);const at=layers.indexOf(layer);if(at>=0)layers.splice(at,1);syncLayers();if(previous?.isConnected&&!previous.closest('[inert]'))previous.focus({preventScroll:true});};
  },[]);
  return createPortal(<div ref={overlay} className="overlay learning-overlay" onClick={onClose}><section ref={panel} className={`sheet learning-panel ${wide?'wide':''}`} role="dialog" aria-modal="true" aria-label={title} data-learning-dialog onClick={e=>e.stopPropagation()}><div className="sheet-grip"/><header><h2>{title}</h2><button className="icon-btn" aria-label="Close" onClick={onClose}><X/></button></header>{children}</section></div>,document.body);
}
