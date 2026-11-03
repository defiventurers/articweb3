import React,{useRef} from 'react';
import {parseInvitation} from './presentation.js';

export function RoomCodeInput({id,value='',onChange,onEnter,onInvalidPaste,required=false,label='Room code'}){
  const inputs=useRef([]);
  const characters=Array.from({length:6},(_,index)=>/^[A-Z2-9]$/i.test(value[index]||'')?value[index].toUpperCase():'');
  function commit(next,focus){
    onChange?.(next.map(character=>character||' ').join('').trimEnd());
    if(focus!==undefined){inputs.current[focus]?.focus();inputs.current[focus]?.select();}
  }
  function enter(index,text){
    const clean=text.toUpperCase().replace(/[^A-Z2-9]/g,'');
    const next=[...characters];
    if(!clean){next[index]='';commit(next);return;}
    for(let offset=0;offset<clean.length&&index+offset<6;offset++)next[index+offset]=clean[offset];
    commit(next,Math.min(index+clean.length,5));
  }
  function key(event,index){
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();const next=Math.max(0,Math.min(5,index+(event.key==='ArrowLeft'?-1:1)));
      inputs.current[next]?.focus();inputs.current[next]?.select();
    }else if(event.key==='Backspace'||event.key==='Delete'){
      event.preventDefault();const next=[...characters];const target=event.key==='Backspace'&&!characters[index]&&index>0?index-1:index;
      next[target]='';commit(next,target);
    }else if(event.key==='Enter'&&onEnter){event.preventDefault();onEnter();}
  }
  function paste(event){
    event.preventDefault();const text=event.clipboardData.getData('text').trim();const compact=text.replace(/[-\s]/g,'');const invitation=parseInvitation(text)||(/^[A-Z2-9]{6}$/i.test(compact)?compact.toUpperCase():null);
    if(invitation){commit(invitation.split(''),5);return;}
    if(/^[A-Z2-9]{1,6}$/i.test(text)){enter(Number(event.target.dataset.codeIndex)||0,text);return;}
    onInvalidPaste?.();
  }
  return <div id={id} className="room-code-fields" role="group" aria-label={label} data-code={value} onPaste={paste}>
    {characters.map((character,index)=><React.Fragment key={index}>
      <input ref={element=>{inputs.current[index]=element;}} id={`${id}-${index+1}`} className="room-code-character" aria-label={`${label}, character ${index+1} of 6`} data-code-index={index} value={character} onChange={event=>enter(index,event.target.value)} onKeyDown={event=>key(event,index)} onFocus={event=>event.target.select()} maxLength={1} inputMode="text" autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck="false" enterKeyHint={onEnter?'go':'next'} required={required}/>
      {index<5&&<span className="room-code-hyphen" aria-hidden="true">-</span>}
    </React.Fragment>)}
  </div>;
}
