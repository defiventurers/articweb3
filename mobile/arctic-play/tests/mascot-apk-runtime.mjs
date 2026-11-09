// Exercise the actual patched shipped runtime without changing its production bundle.
import fs from 'node:fs';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const root=fileURLToPath(new URL('../',import.meta.url)).replace(/\/$/,'');
const require=createRequire(root+'/build-deps/package.json');const {parse}=require('acorn');const {JSDOM,VirtualConsole}=require('jsdom');
const source=fs.readFileSync(root+'/build/mascot-names-v599/app.js','utf8');
const marker=';(0,Gl.createRoot)(document.getElementById(`root`)).render(';const stop=source.lastIndexOf(marker);assert.ok(stop>0);
const testSource=source.slice(0,stop)+';globalThis.__mascotQA={guides:$v,festival:wv,free:sb,illustrated:Lb,emitFestival:Ev,parseFestival:Dv,emitFree:cb,parseFree:lb,emitIllustrated:Gb,parseIllustrated:Kb};})();';
const dom=new JSDOM('<div id="root"></div>',{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',virtualConsole:new VirtualConsole(),beforeParse(w){w.WebSocket=undefined;w.fetch=()=>Promise.reject(Error('Offline QA'));w.Android={setDarkTheme(){},appReady(){}};}});
try{
 dom.window.eval(testSource);const q=dom.window.__mascotQA;assert.ok(q);
 const names={polly:'Nova',retsba:'Rocco',pengu:'Piko',abster:'Ziggy'},old={polly:'Polly',retsba:'Retsba',pengu:'Pengu',abster:'Abster'};
 for(const [id,name]of Object.entries(names))assert.equal(q.guides[id].name,name);
 let cases=0;
 for(const s of q.festival){assert.equal(q.emitFestival(s.id),`🎉 ${names[s.host]}: ${s.label}`);assert.equal(q.parseFestival(q.emitFestival(s.id)).id,s.id);assert.equal(q.parseFestival(`🎉 ${old[s.host]}: ${s.label}`).id,s.id);assert.equal(q.parseFestival('extra '+q.emitFestival(s.id)),null);cases++;}
 for(const host of Object.keys(names))for(const r of q.free){assert.equal(q.emitFree(host,r.id),`🐧 ${names[host]}: ${r.label}`);assert.equal(q.parseFree(q.emitFree(host,r.id)).host,host);assert.equal(q.parseFree(`🐧 ${old[host]}: ${r.label}`).host,host);assert.equal(q.parseFree(q.emitFree(host,r.id)+' extra'),null);cases++;}
 for(const r of q.illustrated){assert.equal(q.emitIllustrated(r.id),`🐧 ${names[r.host]}: ${r.label} · Little Victories`);assert.equal(q.parseIllustrated(q.emitIllustrated(r.id)).id,r.id);assert.equal(q.parseIllustrated(`🐧 ${old[r.host]}: ${r.label} · Little Victories`).id,r.id);assert.equal(q.parseIllustrated('extra '+q.emitIllustrated(r.id)),null);cases++;}
 let legacy=[];function walk(n){if(!n||typeof n!=='object')return;if(n.type==='Literal'&&typeof n.value==='string'&&/\b(Polly|Retsba|Pengu|Abster)\b/.test(n.value))legacy.push(n.value);if(n.type==='TemplateElement')assert.doesNotMatch(n.value.cooked||'',/\b(Polly|Retsba|Pengu|Abster)\b/);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}walk(parse(source,{ecmaVersion:'latest'}));assert.deepEqual(legacy.sort(),Object.values(old).sort());
 console.log(JSON.stringify({actualPackagedRuntime:'passed',guideNames:names,authoredReactionCases:cases,remainingOldNames:'four compatibility constants only'}));
}finally{dom.window.close();}
