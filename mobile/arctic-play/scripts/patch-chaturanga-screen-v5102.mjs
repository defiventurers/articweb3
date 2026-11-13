import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const mobile=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(mobile+'build-deps/package.json');
const {parse}=require('acorn'),{build}=await import(require.resolve('rolldown'));
const marker='/* AK_CH_SCREEN_FLOW_V1 */';
export async function patchChaturangaScreen(source){
 if(source.includes(marker))return source;
 const original=source,changes=[];
 const once=(before,after)=>{if(source.split(before).length!==2)throw Error('Expected one accepted v5.10.2 UI anchor: '+before.slice(0,100));source=source.replace(before,after);changes.push({before,after});};
 const file=path.join(mobile,'build/chaturanga-screen.iife.js');await fs.mkdir(path.dirname(file),{recursive:true});
 await build({input:path.join(mobile,'src/ChaturangaScreenUpdate.jsx'),platform:'browser',external:['react'],resolve:{alias:{'lucide-react':path.join(mobile,'build-deps/node_modules/lucide-react')}},transform:{jsx:{runtime:'classic'},target:'es2020'},output:{file,name:'AKChaturangaScreenUpdate',format:'iife',globals:{react:'window.__AKReact'},minify:true},onwarn(w,next){if(w.code==='MODULE_LEVEL_DIRECTIVE')return;if(['UNRESOLVED_IMPORT','MISSING_GLOBAL_NAME'].includes(w.code))throw Error(w.message);next(w);}});
 const library=await fs.readFile(file,'utf8');
 once(';window.AKChaturangaRelease=AKChaturangaRelease;',`;window.AKChaturangaRelease=AKChaturangaRelease;${marker}${library};Object.assign(window.AKChaturangaRelease,AKChaturangaScreenUpdate);`);
 once('()=>Y_(e,S)',"()=>e==='dominion'?window.AKChaturangaRelease.calibrateChaturangaGeometry(Y_(e,S)):Y_(e,S)");
 once("window.AKChaturangaRelease.usePostRollHelp({id:K,state:q,legal:Tt,canAct:hn,screen:o,sheet:V,matchId:Gn,onOpen:()=>H('dominion-roll-help')});","const AKAutoPass=window.AKChaturangaRelease.usePostRollHelp({id:K,state:q,legal:Tt,canAct:hn,screen:o,sheet:V,matchId:Gn,onOpen:()=>H('dominion-roll-help'),onAction:Kn,blocked:Ge||je||Ze||!!lt});");
 once('onRoll:()=>Wn(window.AKChaturangaRelease.rollActionId(q)),onSelect:ft}',"onRoll:()=>Wn(window.AKChaturangaRelease.rollActionId(q)),onSelect:ft,onHelp:()=>H('dominion-roll-help'),autoPass:AKAutoPass}");
 once('function Un(){Ae(!1),H(`dominion-turn`)}',"function Un(choice){Ae(choice==='skip'),H(`dominion-turn`)}");
 once('focusId:ke?`dominion-no-skip`:`dominion-roll-both`','focusId:ke?`dominion-no-skip`:`dominion-back-board`');
 once('confirm:ke,busy:(je||Ge)||!hn,onBoth:', 'confirm:ke,busy:(je||Ge)||!hn,onClose:()=>H(null),onBoth:');
 const ast=parse(source,{ecmaVersion:'latest'}),cards=[];
 function walk(n){if(!n||typeof n!=='object')return;if(n.type==='CallExpression'&&n.arguments[1]?.type==='ObjectExpression'&&n.arguments[1].properties.some(p=>p.key?.name==='className'&&source.slice(p.value.start,p.value.end)==='`result-card`'))cards.push(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}
 walk(ast);if(cards.length!==1)throw Error('Expected one retained result card');
 const n=cards[0],before=source.slice(n.start,n.end);
 once(before,`(K==='dominion'?d.createElement(window.AKChaturangaRelease.ChaturangaVictory,{key:Gn,outcome:dn,title:'Chaturanga',visible:H_(K,q),isOnline:ln,viewerWon:oC.default.winningSeats(dn).includes(ln?fn?.seat:Be.humans?.[0]),onPlayAgain:()=>ln?s('room'):H('restart'),onRematch:()=>s('room'),onBack:()=>{s('lobby');a('games')},onShare:()=>Mn('Chaturanga · Antarctic Kingdoms · '+(dn.draw?'Draw':D_(K,dn.winner)+' wins'))}):${before})`);
 parse(source,{ecmaVersion:'latest'});
 // Verify every original byte outside the declared UI adapter stays intact.
 let reversed=source;for(const {before,after}of changes.reverse())reversed=reversed.replace(after,before);
 if(reversed!==original)throw Error('Unexpected change outside Chaturanga screen integration');
 return source;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Supply input and output app.js');
 const source=await fs.readFile(input,'utf8'),result=await patchChaturangaScreen(source);await fs.writeFile(output,result);
 console.log(JSON.stringify({inputSha256:createHash('sha256').update(source).digest('hex'),outputSha256:createHash('sha256').update(result).digest('hex'),bytes:result.length,scope:'Chaturanga screen adapters only; retained engines, loading, Home, accounts and other games unchanged'}));
}
