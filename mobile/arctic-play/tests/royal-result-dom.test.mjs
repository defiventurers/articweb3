import test from 'node:test';
import assert from 'node:assert/strict';
import{readFileSync,mkdirSync}from'node:fs';
import{fileURLToPath}from'node:url';
import{dirname,join}from'node:path';
import{createRequire}from'node:module';
const require=createRequire(new URL('../build-deps/package.json',import.meta.url));
const {JSDOM,VirtualConsole}=require('jsdom');
const {build}=await import(require.resolve('rolldown'));
const mobile=fileURLToPath(new URL('../',import.meta.url));
const bundled=join(mobile,'build/royal-result-test.js');
mkdirSync(dirname(bundled),{recursive:true});
await build({
 input:fileURLToPath(new URL('./royal-result-harness.jsx',import.meta.url)),platform:'browser',
 plugins:[{name:'strip-css-for-UI-test',load(id){if(id.endsWith('.css'))return{code:'',moduleType:'js'};}}],
 resolve:{alias:Object.fromEntries(['react','react-dom'].map(n=>[n,join(mobile,'build-deps/node_modules',n)]))},
 transform:{target:'es2020',define:{'process.env.NODE_ENV':'"production"'}},
 output:{file:bundled,format:'iife',minify:true}
});
const js=readFileSync(bundled,'utf8');
async function waitFor(predicate){for(let i=0;i<150;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,15));}throw Error('Royal result UI did not settle');}
test('Royal result mounts all winning sprites, exposes accessible actions and honest draw/defeat states',async t=>{
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',error=>errors.push(error.message));
 const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc});
 t.after(()=>dom.window.close());
 dom.window.eval(js);
 const counts={back:0,replay:0,board:0,rematch:0,share:0};
 const images=Array.from({length:28},(_,i)=>({key:'p'+i,src:'art/shanshui/pieces/'+i+'.webp',alt:'Winning piece '+i}));
 const p={title:'Shanshui Xiangqi',kind:'win',winnerLabel:'Blue + Green triumphs',reason:'Both opposing armies defeated',pieces:images,viewerWon:true,rematchLabel:'New private table',
  onBack:()=>counts.back++,onPlayAgain:()=>counts.replay++,onViewBoard:()=>counts.board++,onRematch:()=>counts.rematch++,onShare:()=>counts.share++};
 dom.window.renderRoyalOutcome(p);
 const doc=dom.window.document;
 await waitFor(()=>doc.querySelector('[data-testid=royal-result]'));
 assert.equal(doc.querySelector('[role=dialog][aria-modal=true] h1').textContent,'ROYAL VICTORY');
 assert.equal(doc.querySelectorAll('img.ak-royal-unit').length,28,'Every surviving piece must be represented');
 assert.ok(doc.querySelector('.ak-royal-army.crowded'));
 const click=needle=>{const button=[...doc.querySelectorAll('[data-testid=royal-result] button')].find(b=>b.textContent.includes(needle));assert.ok(button,'Expected '+needle);button.click();};
 click('Play again');click('New private table');click('View final board');click('Back to Games');click('Share result');
 await waitFor(()=>Object.values(counts).every(n=>n===1));
 dom.window.renderRoyalOutcome({...p,kind:'draw',winnerLabel:'An honourable draw',pieces:images});
 await waitFor(()=>doc.querySelector('[data-testid=royal-result] h1')?.textContent==='A WORTHY DRAW');
 dom.window.renderRoyalOutcome({...p,viewerWon:false,kind:'win'});
 await waitFor(()=>doc.querySelector('[data-testid=royal-result] h1')?.textContent==='MATCH COMPLETE');
 dom.window.renderRoyalOutcome({...p,kind:'ended'});
 await waitFor(()=>doc.querySelector('[data-testid=royal-result] h1')?.textContent==='MATCH COMPLETE');
 assert.deepEqual(errors,[]);
});
