// Presentation only. Injected with the approved runtime's existing React hooks.
// No engine, catalogue, storage, wallet or access-control implementation is bundled here.
export function createHeritageUI({h,useState,useEffect,useRef},data){
  const storyFor=id=>data.games[id==='shanshui'?'shanshui-xiangqi':id];
  function HallTabs({value,onChange}){
    const hall=data.halls.find(item=>item.id===value)||data.halls[0];
    return h('section',{className:'heritage-halls','aria-label':'Cultural halls'},
      h('div',{className:'heritage-hall-tabs',role:'group','aria-label':'Explore a cultural hall'},data.halls.map(item=>h('button',{key:item.id,type:'button','aria-pressed':item.id===hall.id,onClick:()=>onChange(item.id)},item.title))),
      h('div',{className:'heritage-hall-note'+(hall.image?' heritage-hall-illustrated':''),'data-hall':hall.id},hall.image&&h('img',{className:'heritage-hall-background',src:hall.image,alt:'',loading:'lazy',decoding:'async'}),h('div',{className:'heritage-hall-text'},h('strong',null,hall.subtitle),h('p',null,hall.detail))));
  }
  function Introduction({id,game,onClose,onProceed,onLearn}){
    const story=storyFor(id),[page,setPage]=useState(0),[paused,setPaused]=useState(false),heading=useRef(null);
    const screen=story.screens[page],final=page===story.screens.length-1;
    useEffect(()=>{heading.current?.focus({preventScroll:true});heading.current?.closest('.lobby-content')?.scrollTo({top:0,behavior:'instant'});},[page]);
    useEffect(()=>{
      const onKey=event=>{if(event.key==='Escape'){event.preventDefault();onClose();}};
      window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
    },[onClose]);
    return h('section',{className:'heritage-introduction'+(paused?' heritage-paused':''),'aria-label':story.title+' welcome'},
      h('header',null,h('button',{type:'button',className:'heritage-quiet',onClick:onClose},'← Back to games'),h('span',null,(page+1)+' / '+story.screens.length),h('button',{type:'button',className:'heritage-quiet',onClick:onProceed},'Skip to game →')),
      h('div',{className:'heritage-cinema','aria-label':'Illustrated Antarctic interpretation'},
        h('img',{className:'heritage-backdrop',src:game.image,alt:'',decoding:'async'}),
        h('span',{className:'heritage-art-label'},'ANTARCTIC INTERPRETATION'),
        h('div',{className:'heritage-pieces','aria-hidden':'true'},story.pieces.map((src,i)=>h('img',{key:src,src,alt:'',style:{'--heritage-delay':i*100+'ms'},decoding:'async'}))),
        h('button',{type:'button',className:'heritage-motion','aria-pressed':paused,onClick:()=>setPaused(value=>!value)},paused?'Play motion':'Pause motion')),
      h('div',{className:'heritage-copy'},h('p',{className:'heritage-eyebrow'},screen.label),h('h2',{ref:heading,tabIndex:-1},screen.title),h('p',null,screen.text),
        h('p',{className:'heritage-edition'},story.origin+' · '+story.edition),
        h('details',null,h('summary',null,'Sources and this edition'),h('p',null,'The Antarctic scene is fiction. Historical evidence, modern designs and this app’s chosen rules are kept separate.'),
          screen.sourceIds.length?screen.sourceIds.map(key=>{const source=data.sources[key];return h('p',{key},h('a',{href:source.url,target:'_blank',rel:'noopener noreferrer'},source.title+' ↗'),h('small',null,source.kind+'. '+source.supports));}):h('p',null,'This page describes the selected app edition. It is not a claim about an original historical ruleset.'))),
      h('footer',null,h('button',{type:'button',className:'heritage-secondary',disabled:page===0,onClick:()=>setPage(value=>Math.max(0,value-1))},'Previous'),h('nav',{'aria-label':'Introduction pages'},story.screens.map((item,i)=>h('button',{key:i,type:'button','aria-label':'Page '+(i+1),'aria-current':page===i?'step':undefined,onClick:()=>setPage(i)},i+1))),h('button',{type:'button',className:'heritage-primary',onClick:final?onProceed:()=>setPage(value=>value+1)},final?'Proceed to game →':'Continue →')),
      onLearn&&h('button',{type:'button',className:'heritage-learn',onClick:onLearn},'Learn the moves first'));
  }
  return {Introduction,HallTabs,storyFor};
}
