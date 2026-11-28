// Read-only checks of an extracted retained APK, not a source/Vite rebuild.
// Account, HTTP, images and native bridge are fixtures. Workers are APK bytes.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
import {verifiedAccount} from './account-fixture.mjs';

const require=createRequire(new URL('../build-deps/package.json',import.meta.url));
const {JSDOM,VirtualConsole}=require('jsdom');
const assets=process.argv[2]&&path.resolve(process.argv[2]);
if(!assets)throw Error('Supply the unchanged extracted v5.10.2 or v5.11.1 assets directory.');
const source=fs.readFileSync(path.join(assets,'app.js'),'utf8');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const appHash=sha(source);
const versions={
 d54a6d6e9d10fccf9b15736d80c2950c4174e75cd8722595ee2b186f94eea826:'5.10.2',
 '982f167b4e4bcd9be7a11366d0ed36893dc9adcfc7595437ab49337e12b12d3e':'5.11.1',
};
assert.ok(versions[appHash],'This harness requires the exact retained APK app.js.');
const workerSources=Object.fromEntries(['bot.js','learn.js'].map(name=>[name,fs.readFileSync(path.join(assets,name),'utf8')]));
const expectedWorkers={
 'bot.js':'d59a9487d7e41b4d3b7bd53c28fdbf844d3518fe91af140638c6ba404482336d',
 'learn.js':'2da2a951aab162694bfb173f2d4c8cc9469d6f941b5194f96673a93d6407f65f',
};
for(const [name,expected] of Object.entries(expectedWorkers))assert.equal(sha(workerSources[name]),expected,'Expected the unchanged retained APK '+name);
const copy=value=>JSON.parse(JSON.stringify(value));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(test,label){
 for(let attempt=0;attempt<700;attempt++){if(test())return;await sleep(10);}
 throw Error('Timed out: '+label);
}

function workerContext(name,reply){
 let draws=0;
 const context=vm.createContext({
  crypto:{getRandomValues(bytes){for(let i=0;i<bytes.length;i++)bytes[i]=[3,1][draws++%2];return bytes;}},
  TextEncoder,TextDecoder,URL,AbortController,atob,btoa,setTimeout,clearTimeout,
  postMessage:data=>reply(copy(data)),
 });
 context.self=context;
 vm.runInContext(workerSources[name],context,{filename:name});
 return context;
}

function open({stored={},signedIn=true,unavailable=false}={}){
 const errors=[],requests=[],workerRequests=[],authOpens=[];
 const virtualConsole=new VirtualConsole();
 virtualConsole.on('jsdomError',error=>errors.push(error.message));
 let nativeSession=null,exchanges=0;
 const accountId='11111111-1111-4111-8111-111111111111';
 const ok=body=>({ok:true,status:200,json:async()=>body});
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{
  url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole,
  beforeParse(w){
   w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
   Object.defineProperty(w,'crypto',{value:webcrypto});
   w.WebSocket=undefined;
   w.XMLHttpRequest=class{open(){throw Error('External XHR is prohibited in retained APK fixtures.');}};
   w.HTMLElement.prototype.scrollIntoView=function(){};
   w.HTMLElement.prototype.scrollTo=function(){};
   w.Android={appReady(){},setDarkTheme(){},openAuth(url){authOpens.push(url);return true;}};
   w.Image=class{
    constructor(){this.complete=true;this.naturalWidth=1200;this.naturalHeight=800;}
    set src(value){this._src=value;queueMicrotask(()=>this.onload?.());}
    get src(){return this._src;}
    decode(){return Promise.resolve();}
   };
   w.Worker=class{
    constructor(url){
     const name=path.basename(String(url));
     assert.ok(workerSources[name],'Unexpected worker: '+name);
     this.context=workerContext(name,data=>queueMicrotask(()=>{if(!this.dead)this.onmessage?.({data});}));
    }
    postMessage(data){workerRequests.push(copy(data));queueMicrotask(async()=>{if(!this.dead)await this.context.onmessage({data:copy(data)});});}
    terminate(){this.dead=true;}
   };
   w.localStorage.setItem('arctic-play.v1.profile',JSON.stringify({id:'retained-fixture',name:'Retained QA',avatar:'red'}));
   const extraFetch=async(input,options={})=>{
    const url=String(input),endpoint=url.split('/v3')[1]||url;
    requests.push({endpoint,method:options.method||'GET'});
    if(endpoint==='/capabilities')return ok({version:2,cloud:!unavailable,accountPlay:!unavailable});
    if(endpoint==='/auth/para/config')return ok({enabled:true,environment:'BETA',chain:{id:46630,name:'Robinhood Chain Testnet'}});
    if(endpoint==='/auth/providers')return ok({paraWallet:true,google:false,email:false,recovery:true});
    if(endpoint==='/auth/para/start'){
     const body=JSON.parse(options.body);assert.equal(body.platform,'android');assert.equal(body.purpose,'login');
     assert.match(body.challenge,/^[\w-]{43}$/);
     return ok({url:'https://articweb3.onrender.com/arctic-play/wallet/?attempt='+'a'.repeat(43)});
    }
    if(endpoint==='/auth/exchange'){
     exchanges++;const body=JSON.parse(options.body);
     const handoff=JSON.parse(w.localStorage.getItem('arctic-play.v1.auth-handoff'));
     assert.equal(body.verifier,handoff.verifier);assert.match(body.ticket,/^[\w-]{43}$/);
     await sleep(20);
     nativeSession={accountId,session:accountId+'.'+'q'.repeat(43),displayName:'Retained QA',marketingChoiceNeeded:false};
     return ok(nativeSession);
    }
    if(endpoint==='/passport')return ok({identity:{accountId,displayName:'Retained QA'},passport:{id:'retained-fixture',number:'QA',playerName:'Retained QA',wallet:'0x1234567890123456789012345678901234567890',deliveries:[]}});
    if(endpoint==='/play-access')return ok({accountId,online:true,leaseSeconds:60,offlineOwned:false});
    if(endpoint==='/progress')return ok({progress:{}});
    if(endpoint==='/account')return ok({accountId,entitlements:{}});
    throw Error('Unmocked request blocked: '+endpoint);
   };
   if(signedIn)verifiedAccount(w,{fetchImpl:extraFetch});else w.fetch=extraFetch;
   for(const [key,value] of Object.entries(stored))w.localStorage.setItem(key,value);
  },
 });
 const w=dom.window,d=w.document;
 w.eval(source);
 return{dom,w,d,errors,requests,workerRequests,authOpens,get exchanges(){return exchanges;},get nativeSession(){return nativeSession;},
  snapshot:()=>Object.fromEntries(Array.from({length:w.localStorage.length},(_,i)=>{const key=w.localStorage.key(i);return[key,w.localStorage.getItem(key)];})),
 };
}
const button=(d,label)=>[...d.querySelectorAll('button')].find(item=>item.textContent.trim()===label);
const containing=(d,label)=>[...d.querySelectorAll('button')].find(item=>item.textContent.includes(label));
const saved=h=>JSON.parse(h.w.localStorage.getItem('arctic-play.v1.practice.dominion'));
const checks=[];
let first,restored,login,held;
try{
 first=open();await waitFor(()=>first.d.querySelector('.home-chaturanga'),'retained Home');
 first.d.querySelector('.home-chaturanga').click();
 await waitFor(()=>first.d.querySelector('.cg-panel[data-game=dominion]'),'Chaturanga setup');
 button(first.d,'Learn').click();await waitFor(()=>containing(first.d,'How to play'),'retained Learn tab');
 const learn=containing(first.d,'How to play');assert.ok(learn,'Setup buttons: '+[...first.d.querySelectorAll('.cg-panel button')].map(b=>b.textContent.trim()).join(' | '));learn.click();
 await waitFor(()=>first.d.querySelector('[aria-label="Back from How to Play"]'),'How-to-Play entry');
 assert.match(first.d.body.textContent,/How to play/);
 first.d.querySelector('[aria-label="Back from How to Play"]').click();
 await waitFor(()=>first.d.querySelector('.home-chaturanga'),'return from How-to-Play');
 checks.push('Retained Home opens How-to-Play and returns through its original callback.');

 first.d.querySelector('.home-chaturanga').click();
 await waitFor(()=>containing(first.d,'On this phone'),'local setup');containing(first.d,'On this phone').click();
 await waitFor(()=>saved(first)&&first.d.querySelector('[data-screen="match"]'),'local Chaturanga');
 assert.equal(saved(first).mode,'hotseat');
 assert.deepEqual([...saved(first).humans].sort(),['blue','green','red','yellow']);
 assert.equal(saved(first).state.rulesProfile,'chaturanga-long-dice-v1');
 await waitFor(()=>button(first.d,'Roll both dice'),'retained paired-roll prompt');button(first.d,'Roll both dice').click();
 await waitFor(()=>saved(first).state.dice.rolled,'paired dice roll');
 const rolled=copy(saved(first).state);
 assert.equal(rolled.dice.values.length,2);assert.ok(rolled.dice.values.every(value=>[2,3,4,5].includes(value)));
 let result;
 const canonical=workerContext('bot.js',reply=>{result=reply;});
 await canonical.onmessage({data:{task:'legal',id:'dominion',state:copy(rolled),requestId:'legal'}});
 const legal=result.legal;assert.ok(legal.length);
 const move=legal.find(action=>action.kind==='move');assert.ok(move);
 await canonical.onmessage({data:{task:'apply',id:'dominion',state:copy(rolled),actionId:'invented-retained-fixture-move',requestId:'invalid'}});
 assert.ok(result.error,'Bundled worker must reject an invented move.');
 const guideBack=button(first.d,'Back to the board');if(guideBack)guideBack.click();
 await waitFor(()=>!first.d.querySelector('.ch-roll-guide'),'close post-roll guide');
 const unit=first.d.querySelector('[data-piece="'+move.source.replace(/^piece:/,'')+'"]');assert.ok(unit);
 await waitFor(()=>unit.getAttribute('tabindex')==='0','legal piece becomes actionable');
 unit.dispatchEvent(new first.w.MouseEvent('click',{bubbles:true}));
 await waitFor(()=>unit.getAttribute('aria-pressed')==='true','legal piece selection');
 const target=first.d.querySelector('[data-cell="'+move.target+'"]');assert.ok(target);
 await waitFor(()=>target.getAttribute('tabindex')==='0','legal target becomes actionable');
 target.dispatchEvent(new first.w.MouseEvent('click',{bubbles:true}));
 await waitFor(()=>JSON.stringify(saved(first).state)!==JSON.stringify(rolled),'actual legal board move');
 await canonical.onmessage({data:{task:'apply',id:'dominion',state:copy(rolled),actionId:move.id,requestId:'expected'}});
 assert.deepEqual(saved(first).state,result.state,'UI move must match the APK worker result.');
 checks.push('Local Chaturanga rolls two valid dice, accepts a bundled-worker legal move and rejects an invented move.');

 const beforeBack=copy(saved(first));
 first.d.querySelector('[aria-label="Match options"]').click();await waitFor(()=>first.d.querySelector('.sheet'),'match options');
 assert.equal(first.w.arcticBack(),true);await waitFor(()=>!first.d.querySelector('.sheet'),'native JS Back closes modal');
 assert.equal(first.w.arcticBack(),true);await waitFor(()=>first.d.querySelector('.app[data-screen="lobby"][data-tab="games"]'),'native JS Back returns Games');
 assert.equal(first.w.arcticBack(),true);await waitFor(()=>first.d.querySelector('.home-chaturanga'),'native JS Back returns Home');
 assert.deepEqual(saved(first),beforeBack,'Backing out must preserve the saved match.');
 const stored=first.snapshot();assert.deepEqual(first.errors,[]);first.dom.window.close();first=null;
 restored=open({stored});await waitFor(()=>restored.d.querySelector('.home-chaturanga'),'restart Home');
 assert.deepEqual(saved(restored),beforeBack,'Cold JS restart must preserve stored match bytes.');
 restored.d.querySelector('.home-chaturanga').click();await waitFor(()=>restored.d.querySelector('[data-screen="match"]'),'resume retained match');
 assert.deepEqual(saved(restored),beforeBack,'Resume must keep board, turn, history and match identity.');
 checks.push('JS Android-Back closes the modal, returns Home, and a fresh app realm restores the same saved match.');

 const practiceBefore=JSON.stringify(saved(restored));
 const botState=copy(saved(restored).state);
 await canonical.onmessage({data:{task:'legal',id:'dominion',state:botState,requestId:'bot-legal'}});
 const botLegal=result.legal;
 await canonical.onmessage({data:{id:'dominion',state:botState,sequence:1}});
 assert.ok(!result.error);assert.ok(result.action&&botLegal.some(action=>action.id===result.action));assert.ok(result.state);
 assert.equal(JSON.stringify(saved(restored)),practiceBefore,'Isolated bot check cannot change the saved UI match.');
 let lesson;
 const learner=workerContext('learn.js',reply=>{lesson=reply;});
 for(const role of ['king','pawn','horse','elephant','ship']){
  await learner.onmessage({data:{task:'solo',id:'dominion',role,requestId:'solo-'+role}});
  assert.equal(lesson.error,undefined,role);assert.ok(lesson.legal.length,role+' practice moves');
 }
 checks.push('Actual APK bot selects a legal action; all five bundled single-piece practice lessons return legal moves.');

 login=open({signedIn:false});
 await waitFor(()=>containing(login.d,'Sign in or create account')&&!containing(login.d,'Sign in or create account').disabled,'unsigned retained entry');
 assert.equal(login.d.querySelector('.home-chaturanga'),null);
 containing(login.d,'Sign in or create account').click();await waitFor(()=>login.authOpens.length,'mocked Android Para handoff');
 assert.equal(login.authOpens.length,1);assert.match(login.authOpens[0],/^https:\/\/articweb3\.onrender\.com\/arctic-play\/wallet\/\?attempt=/);
 assert.ok(typeof login.w.arcticAuth==='function');
 await Promise.all([login.w.arcticAuth('t'.repeat(43)),login.w.arcticAuth('t'.repeat(43))]);
 await waitFor(()=>login.d.querySelector('.home-chaturanga'),'mocked authenticated return');
 assert.equal(login.exchanges,1,'Duplicate native callbacks must exchange only once.');
 assert.equal(login.w.localStorage.getItem('arctic-play.v1.auth-handoff'),'null');
 checks.push('Unsigned app stays gated; mocked Para PKCE handoff and duplicate native callbacks establish exactly one fixture session.');

 held=open({signedIn:false,unavailable:true});
 await waitFor(()=>held.d.body.textContent.includes('The account service is unavailable'),'unavailable-service entry');
 assert.equal(held.d.querySelector('.home-chaturanga'),null);assert.equal(held.authOpens.length,0);
 assert.ok(held.requests.some(request=>request.endpoint==='/capabilities'));
 checks.push('Unavailable account service cannot expose Home or open an authentication browser.');
 for(const h of [restored,login,held])assert.deepEqual(h.errors,[]);
 console.log(JSON.stringify({version:versions[appHash],appSha256:appHash,workerSha256:Object.fromEntries(Object.entries(workerSources).map(([name,value])=>[name,sha(value)])),passed:checks.length,checks,actualAPKJavaScript:true,actualAPKWorkers:true,imagesDecoded:false,nativeAndroidExecuted:false,physicalDevice:false,livePara:false,network:'fixtures only; WebSocket and XMLHttpRequest disabled'},null,2));
}finally{for(const h of [first,restored,login,held])h?.dom.window.close();}
