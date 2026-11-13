import fs from 'node:fs/promises';import path from 'node:path';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.resolve(mobile,'../..'),require=createRequire(mobile+'/build-deps/package.json'),{parse}=require('acorn');
export function patchAdventure(source){
 let out=source;const changes=[];const once=(a,b)=>{if(out.split(a).length!==2)throw Error('Unexpected adventure anchor: '+a.slice(0,90));out=out.replace(a,b);changes.push({a,b})};
 once('"Choose an unlock route"','"Unlock"');
 once('className: "games-expedition "','className: "games-expedition adv-reference "');
 once('i===`home`?`art/home-v1/brand-logo.webp`:Qv.icon','i===`home`||i===`games`?`art/home-v1/brand-logo.webp`:Qv.icon');
 once('safe === 0 ? "YOUR EXPEDITION BEGINS" : "THE NEXT FRONTIER"','"EXPEDITION "+String(EXPEDITION_ORDER.indexOf(game.id)+1).padStart(2,"0")+" / "+String(EXPEDITION_ORDER.length).padStart(2,"0")');
 once('className: "exp-region" }, chapter.region)', 'className: "exp-region" }, chapter.region), crown&&__AKVisaH("span",{className:"adv-conquered"},"✓ Conquered")');
 once('__AKVisaH("img", { src: game.image, width: "1200", height: "800"','__AKVisaH("img", { src: game.id==="dominion"?"art/chaturanga-heritage-v1/cover.webp":game.image, width: "1200", height: "800"');
 once('__AKVisaH("div", { className: "expedition-dock",','__AKVisaH("div", {className:"adv-palace","aria-hidden":"true"}), __AKVisaH("div", { className: "expedition-dock",');
 once('role: "status", "aria-label": game.name + (crown ?', 'role: onJourney?"button":"status",tabIndex:onJourney?0:undefined,onClick:onJourney,onKeyDown:e=>{if(onJourney&&(e.key==="Enter"||e.key===" ")){e.preventDefault();onJourney();}}, "aria-label": game.name + (crown ?');
 once('if(target&&AKHeritageUI.storyFor(heritageId))return __AKVisaH(AKHeritageUI.Introduction,{key:heritageId,id:heritageId,game:target,onClose:closeHeritage,onProceed:()=>{setHeritageId(null);onPlay?.(heritageId);},onLearn:()=>{setHeritageId(null);onLearn?.(heritageId);}});', 'if(target&&AKHeritageUI.storyFor(heritageId))return __AKVisaH(x.Fragment,null,__AKVisaH(AKHeritageUI.Introduction,{key:heritageId,id:heritageId,game:target,onClose:closeHeritage,onProceed:()=>{setHeritageId(null);onPlay?.(heritageId);},onLearn:()=>{setHeritageId(null);onLearn?.(heritageId);}}),__AKVisaH("details",{className:"adv-notes"},__AKVisaH("summary",null,"Read the field notes"),__AKVisaH("p",null,EXPEDITION_CHAPTERS[heritageId]?.story),__AKVisaH("p",null,EXPEDITION_CHAPTERS[heritageId]?.field)));');
 parse(out,{ecmaVersion:'latest'});let reversed=out;for(const {a,b}of changes.reverse())reversed=reversed.replace(b,a);if(reversed!==source)throw Error('Unexpected edit outside presentation anchors');return out;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const destination=path.resolve(process.argv[2]||root+'/../games-adventure-preview'),dist=destination+'/dist';await fs.mkdir(dist+'/early',{recursive:true});
 await fs.cp(root+'/frontend/public/early',dist+'/early',{recursive:true});
 const source=await fs.readFile(root+'/frontend/public/early/app.js','utf8'),patched=patchAdventure(source),css=await fs.readFile(root+'/frontend/public/early/app.css','utf8')+'\n'+await fs.readFile(mobile+'/review/adventure-reference.css','utf8');
 await fs.writeFile(dist+'/early/app.js',patched);await fs.writeFile(dist+'/early/app.css',css);
 await fs.mkdir(destination+'/.openai',{recursive:true});await fs.writeFile(destination+'/.openai/hosting.json',JSON.stringify({static:{directory:'dist'}}));
 console.log(JSON.stringify({destination,dist,playerSourceUnchanged:true,patchedBytes:patched.length}));
}
