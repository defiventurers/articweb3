import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const [input,output,esbuildRoot]=process.argv.slice(2),require=createRequire(path.join(esbuildRoot,'package.json'));
const esbuild=require(esbuildRoot),acorn=require('acorn'),src=path.resolve(import.meta.dirname,'../src');
let code=fs.readFileSync(input,'utf8');
const tree=acorn.parse(code,{ecmaVersion:'latest',sourceType:'script'}),functions={};
function visit(n){if(!n||typeof n!=='object')return;if(n.type==='FunctionDeclaration'&&['ew','ow'].includes(n.id?.name)){if(functions[n.id.name])throw Error('Duplicate function');functions[n.id.name]=n;}for(const [k,v]of Object.entries(n)){if(k==='start'||k==='end')continue;if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v);}}
visit(tree);if(!functions.ew||!functions.ow)throw Error('Expected v5.9.4 presentation functions');
const source=fs.readFileSync(path.join(src,'PassportBook.jsx'),'utf8').replace(/^import React.*?;\n/,'const React=d;const {useState,useEffect,useRef}=d;\n');
const compiled=esbuild.buildSync({stdin:{contents:source,resolveDir:src,loader:'jsx'},bundle:true,write:false,format:'iife',globalName:'AKPassportUI',target:'es2020',jsxFactory:'__AKVisaH',jsxFragment:'x.Fragment',charset:'utf8'}).outputFiles[0].text;
const chat=esbuild.transformSync(fs.readFileSync(path.join(src,'ChatCamp.jsx'),'utf8').replace(/^import React.*?;\n/,'').replace('export function ChatCamp','function ow'),{loader:'jsx',target:'es2020',jsxFactory:'__AKVisaH',jsxFragment:'x.Fragment',charset:'utf8'}).code;
const replacements=[{...functions.ew,text:compiled+'\nfunction ew(props){return __AKVisaH(AKPassportUI.PassportBook,props);}'},{...functions.ow,text:chat}];
for(const change of replacements.sort((a,b)=>b.start-a.start))code=code.slice(0,change.start)+change.text+code.slice(change.end);
function once(from,to){if(code.split(from).length!==2)throw Error('Unexpected bundle anchor: '+from);code=code.replace(from,to);}
once('i===`profile`&&/* @__PURE__ */ (0,x.jsxs)(x.Fragment,{children:[','i===`profile`&&/* @__PURE__ */ (0,x.jsxs)(AKPassportUI.PassportHub,{onBrowse:()=>a(`games`),profile:n,progress:Gt,avatar:(0,x.jsx)(Vw,{color:n.avatar,size:48}),onEdit:()=>{at(n.name);H(`name`)},onChallenge:Yt,onHall:Jt,onReveal:()=>H(`eighth-lantern`),onPostcard:()=>tr(kb()),onCamp:()=>Tn(J.preferences.guide===`auto`?`polly`:J.preferences.guide),onMemories:()=>H(`memories`),onDaily:er,children:[');
once('onPassport:()=>H(`passport`),onExplore:Jt,children:','onPassport:()=>a(`profile`),onExplore:Jt,onFriends:()=>a(`friends`),children:');
once('gameCount:PC.length,onJourney:g','gameCount:PC.length,onJourney:()=>a(`profile`)');
once('[`profile`,`Profile`,Rl]','[`profile`,`Passport`,AKPassportUI.PassportIcon]');
once('[`chats`,`friends`].includes(i)&&','i===`friends`&&');
once('` Chats & Camp`','` Back to Chats`');
once('"aria-label":`Open profile`','"aria-label":`Open passport`');
once('hidden:!!V||Ze||[`games`,`home`,`shop`].includes(i)','hidden:!!V||Ze||[`games`,`home`,`shop`,`profile`,`chats`,`friends`].includes(i)');
once('window.arcticBack=()=>(an.current?.(),!0)','window.arcticBack=()=>{if(document.dispatchEvent(new Event(`ak-passport-back`,{cancelable:true})))an.current?.();return true;}');
once('function Xt(){s(Ut?.returnScreen||`lobby`),Bt.enabled&&H(`hall`)}','function Xt(){let target=Ut?.returnScreen||`lobby`;s(target);if(target===`lobby`&&i===`profile`)H(null);else if(Bt.enabled)H(`hall`);}');
once('finishLabel:`Back to hall`','finishLabel:`Return to your journey`');
once('"aria-label":`Back to hall`','"aria-label":`Back to journey`');
once('versionName:`5.9.4`,versionCode:92,distribution:`direct-apk`','versionName:`5.9.5`,versionCode:93,distribution:`direct-apk`');
// The nav's label supplies both Passport headings; all internal route IDs stay stable.
acorn.parse(code,{ecmaVersion:'latest',sourceType:'script'});fs.writeFileSync(output,code);
console.log('Recompiled Passport and Chats; verified all limited presentation anchors.');
