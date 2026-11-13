// Add introductions to the verified shipped v5.9.15 expedition component.
// This deliberately does not rebuild the older tracked App.jsx over newer UI.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createHeritageUI} from '../src/heritageIntro.js';
const mobile=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(path.join(mobile,'build-deps/package.json'));
const {parse}=require('acorn');
const hash=text=>createHash('sha256').update(text).digest('hex');
function declarations(source,name){
  const found=[];
  function visit(node){
    if(!node||typeof node!=='object')return;
    if(node.type==='FunctionDeclaration'&&node.id?.name===name)found.push(node);
    for(const [key,value] of Object.entries(node)){if(['start','end'].includes(key))continue;if(Array.isArray(value))value.forEach(visit);else visit(value);}
  }
  visit(parse(source,{ecmaVersion:'latest'}));return found;
}
function once(source,before,after){
  if(source.split(before).length!==2)throw Error('Expected one heritage integration anchor: '+before.slice(0,90));
  return source.replace(before,after);
}
export function patchHeritage(source){
  if(source.includes('var AKHeritageUI ='))throw Error('Heritage patch already applied');
  const nodes=declarations(source,'GamesAdventure');
  if(nodes.length!==1)throw Error('Expected one shipped GamesAdventure component');
  const node=nodes[0],original=source.slice(node.start,node.end);
  if(hash(original)!=='4ddbf8dad54e24906fa681a092097af13282d995f431d02df07c0b783a764cb5')throw Error('GamesAdventure differs from verified v5.9.15; review before patching');
  const data=JSON.parse(fs.readFileSync(path.join(mobile,'src/heritageStories.json'),'utf8'));
  let component=once(original,'    const key =','    const [heritageId,setHeritageId]=useState(null),[heritageHall,setHeritageHall]=useState("all");\n    const key =');
  component=once(component,'catalogue.find((e) => e.id === id)).filter(Boolean)','catalogue.find((e) => e.id === id)).filter(Boolean).filter(item=>heritageHall==="all"||AKHeritageUI.storyFor(item.id)?.hall===heritageHall)');
  component=once(component,'    if (!game) return renderGrid?.() || children || null;','    if (!game) return renderGrid?.() || children || null;\n    function closeHeritage(){setHeritageId(null);setTimeout(()=>document.querySelector(".exp-hero[role=button]")?.focus({preventScroll:true}),0);}\n    if(heritageId){const target=catalogue.find(item=>item.id===heritageId);if(target&&AKHeritageUI.storyFor(heritageId))return __AKVisaH(AKHeritageUI.Introduction,{key:heritageId,id:heritageId,game:target,onClose:closeHeritage,onProceed:()=>{setHeritageId(null);onPlay?.(heritageId);},onLearn:()=>{setHeritageId(null);onLearn?.(heritageId);}}); }');
  component=once(component,'}, "Progress ↗")), view === "grid"','}, "Progress ↗")), view!=="grid"&&__AKVisaH(AKHeritageUI.HallTabs,{value:heritageHall,onChange:value=>{setHeritageHall(value);setIndex(0);focusChange.current=true;}}), view === "grid"');
  component=once(component,'renderGrid?.(stamps)','renderGrid?.(stamps,{onIntro:setHeritageId})');
  component=once(component,'{ className: "exp-hero" }','{ className: "exp-hero", role:"button",tabIndex:0,"aria-label":"Discover the story of "+game.name,onClick:()=>setHeritageId(game.id),onKeyDown:event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();event.stopPropagation();setHeritageId(game.id);}} }');
  // Country filtering changes only which existing chapter is displayed. All existing
  // game/access/progress callbacks, save keys and crown predicates remain intact.
  const factory='var AKHeritageUI = ('+createHeritageUI.toString()+')({h:__AKVisaH,useState,useEffect,useRef},'+JSON.stringify(data)+');\n  ';
  let patched=source.slice(0,node.start)+factory+component+source.slice(node.end);
  for(const [name,expected,transform] of [
    ['AKOriginalGamesGrid','0e16fe456c9aa9a562cd862405ea7c1142d6334d8e769ad31d5f1a9d79b9ee15',text=>{
      text=once(text,'conquests:AKConquests={}}','conquests:AKConquests={},onIntro:AKOnIntro}');
      return once(text,'alt:`${e.name} board artwork`','alt:`${e.name} board artwork`,role:`button`,tabIndex:0,"aria-label":`Discover the story of ${e.name}`,onClick:()=>AKOnIntro?.(e.id),onKeyDown:event=>{if(event.key===`Enter`||event.key===` `){event.preventDefault();AKOnIntro?.(e.id);}}');
    }],
    ['BC','ccbbefc1d13a9880b2e165a5bb5b63b0b7c3df146a561bbd0b0e3c20d70afe2e',text=>once(text,'renderGrid:conquests=>__AKVisaH(AKOriginalGamesGrid,{...props,conquests})','renderGrid:(conquests,heritage)=>__AKVisaH(AKOriginalGamesGrid,{...props,conquests,onIntro:heritage.onIntro})')]
  ]){
    const matches=declarations(patched,name);if(matches.length!==1)throw Error('Expected one '+name);
    const match=matches[0],text=patched.slice(match.start,match.end);
    if(hash(text)!==expected)throw Error(name+' differs from verified v5.9.15; review before patching');
    patched=patched.slice(0,match.start)+transform(text)+patched.slice(match.end);
  }
  parse(patched,{ecmaVersion:'latest'});
  return {source:patched,report:{baselineComponentSha256:hash(original),patchedComponentSha256:hash(component),modifiedComponents:['GamesAdventure','AKOriginalGamesGrid','BC'],games:Object.keys(data.games).length,screensPerGame:3}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [input,output]=process.argv.slice(2);
  if(!input||!output)throw Error('Usage: node patch-heritage-v5915.mjs input/app.js output/app.js');
  const result=patchHeritage(fs.readFileSync(input,'utf8'));
  fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,result.source);
  console.log(JSON.stringify(result.report));
}
