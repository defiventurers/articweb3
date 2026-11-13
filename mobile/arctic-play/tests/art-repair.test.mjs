import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('art recovery refreshes only the early public cache and preserves other scopes',async()=>{
 const removed=[],unregistered=[],requests=[],button={disabled:false,addEventListener(type,fn){this.click=fn;}},status={};let destination;
 const early='https://example.test/early/',other='https://example.test/other/';
 const stored=[{url:early+'art/piece.webp'},{url:other+'art/piece.webp'},{url:early+'arctic-play/v3/account'}];
 class Image {naturalWidth=10;set src(value){queueMicrotask(()=>this.onload());}}
 const context={URL,Image,Promise,Set,location:{origin:'https://example.test',replace:url=>{destination=url;}},document:{getElementById:id=>id==='repair'?button:status},navigator:{serviceWorker:{getRegistrations:async()=>[early,other].map(scope=>({scope,unregister:async()=>unregistered.push(scope)}))}},caches:{keys:async()=>['ak-inc-v1-%2Fearly%2F-old-art','ak-shell-old','unrelated-player-data'],delete:async name=>removed.push(name),open:async()=>({keys:async()=>stored,delete:async r=>removed.push(r.url)})},fetch:async(url,options)=>{requests.push({url:String(url),options});return String(url).endsWith('game-assets.json')?{ok:true,json:async()=>({assets:[{url:'art/dominion/piece.webp'}]})}:{ok:true,headers:new Headers({'Content-Type':'image/webp'}),blob:async()=>new Blob(['fixture'])};}};
 vm.runInNewContext(fs.readFileSync(new URL('../../../frontend/public/early-art-repair.js',import.meta.url),'utf8'),context);
 await button.click();
 assert.deepEqual(unregistered,[early]);assert.deepEqual(removed,['ak-inc-v1-%2Fearly%2F-old-art',early+'art/piece.webp']);
 assert.equal(destination,early+'?art-repaired=2');assert.ok(requests.every(r=>r.options.cache==='reload'&&r.options.credentials==='omit'));
 assert.ok(!fs.readFileSync(new URL('../../../frontend/public/early-art-repair.js',import.meta.url),'utf8').includes('localStorage'));
});
