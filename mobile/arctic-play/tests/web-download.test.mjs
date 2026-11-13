import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash,webcrypto} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {validateManifest,assembleApk} from '../src/downloads/download.js';
const require=createRequire(new URL('../build-deps/package.json',import.meta.url)),{JSDOM}=require('jsdom');
const baseUrl='https://example.test/play/downloads/',hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(){
 const bytes=new TextEncoder().encode('Exact tiny signed-file fixture bytes'),chunkBytes=9,parts=[];
 for(let i=0;i<bytes.length;i+=chunkBytes){const data=bytes.slice(i,i+chunkBytes);parts.push({file:`part-${String(parts.length).padStart(3,'0')}.bin`,bytes:data.length,sha256:hash(data),data});}
 return {bytes,parts,manifest:{schemaVersion:1,review:true,version:'5.10.2',versionCode:106,filename:'AntarcticKingdoms-v5.10.2.apk',bytes:bytes.length,sha256:hash(bytes),chunkBytes,parts:parts.map(({data,...part})=>part)}};
}
function fetcher(parts,{corrupt=false,oversize=false}={}){
 const calls=[];
 return {calls,fetch:async(url,options)=>{calls.push({url,options});const name=new URL(url).pathname.split('/').at(-1),part=parts.find(part=>part.file===name);if(!part)return new Response('',{status:404});const data=part.data.slice();if(corrupt)data[0]^=1;return new Response(oversize?new Uint8Array(data.length+1):data);}};
}
test('checked parts reconstruct byte-identical APK and fetch only same-origin static names',async()=>{
 const f=fixture(),net=fetcher(f.parts),progress=[];
 const assembled=await assembleApk(f.manifest,{baseUrl,fetchImpl:net.fetch,cryptoImpl:webcrypto,onProgress:value=>progress.push(value)});
 assert.deepEqual(assembled.bytes,f.bytes);assert.equal(hash(assembled.bytes),f.manifest.sha256);
 assert.equal(net.calls.length,f.parts.length);assert.equal(progress.at(-1).verifiedBytes,f.bytes.length);
 for(const {url,options}of net.calls){assert.equal(new URL(url).origin,new URL(baseUrl).origin);assert.equal(options.credentials,'same-origin');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');}
});
test('part corruption, oversized bodies and a wrong whole-file digest reject without returning a file',async()=>{
 const f=fixture();
 for(const config of [{corrupt:true},{oversize:true}])await assert.rejects(assembleApk(f.manifest,{baseUrl,fetchImpl:fetcher(f.parts,config).fetch,cryptoImpl:webcrypto}),/integrity|size/);
 await assert.rejects(assembleApk({...f.manifest,sha256:'0'.repeat(64)},{baseUrl,fetchImpl:fetcher(f.parts).fetch,cryptoImpl:webcrypto}),/complete APK failed/);
});
test('manifest rejects arbitrary URLs, traversal, downloads above 100MiB, invalid names and inconsistent lengths',()=>{
 const f=fixture(),badPart=value=>({...f.manifest,parts:[{...f.manifest.parts[0],file:value},...f.manifest.parts.slice(1)]});
 for(const file of ['../private','/secret','https://elsewhere.test/part-000.bin','part-000.bin?token=private','part-001.bin'])assert.throws(()=>validateManifest(badPart(file),baseUrl),/part/i);
 for(const value of [{...f.manifest,bytes:100*1024*1024+1},{...f.manifest,filename:'../../other.apk'},{...f.manifest,filename:'bad.exe'},{...f.manifest,parts:f.manifest.parts.slice(1)},{...f.manifest,review:false},{...f.manifest,chunkBytes:26*1024*1024}])assert.throws(()=>validateManifest(value,baseUrl));
 assert.throws(()=>validateManifest(f.manifest,'http://example.test/downloads/'),/secure/);
});
test('cancel and redirected or missing parts stop assembly',async()=>{
 const f=fixture(),controller=new AbortController();controller.abort();
 await assert.rejects(assembleApk(f.manifest,{baseUrl,fetchImpl:fetcher(f.parts).fetch,cryptoImpl:webcrypto,signal:controller.signal}),{name:'AbortError'});
 await assert.rejects(assembleApk(f.manifest,{baseUrl,fetchImpl:async()=>({ok:true,redirected:true}),cryptoImpl:webcrypto}),/retrieved/);
 await assert.rejects(assembleApk(f.manifest,{baseUrl,fetchImpl:async()=>new Response('',{status:404}),cryptoImpl:webcrypto}),/retrieved/);
});
test('packager creates bounded parts from an exact digest and leaves no full APK in static output',async()=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'ak-download-test-'));
 try{
  const apk=path.join(tmp,'AntarcticKingdoms-v5.10.2.apk'),web=path.join(tmp,'web'),bytes=fixture().bytes;
  await fs.mkdir(web);await fs.writeFile(path.join(web,'.incremental-web-build'),'xyz.arcticdominion.play\n');await fs.writeFile(apk,bytes);
  const script=fileURLToPath(new URL('../scripts/package-web-download.mjs',import.meta.url));
  const args=[script,'--apk',apk,'--web-output',web,'--version','5.10.2','--version-code','106','--expected-sha256',hash(bytes)];
  const result=JSON.parse(execFileSync(process.execPath,args,{encoding:'utf8'}));
  assert.equal(result.containsFullApk,false);assert.ok(result.largestPartBytes<25*1024*1024);
  const dir=path.join(web,'downloads'),files=await fs.readdir(dir),manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json')));
  assert.equal(files.some(file=>file.endsWith('.apk')),false);assert.deepEqual(await fs.readFile(apk),Buffer.from(bytes));
  const assembled=await assembleApk(manifest,{baseUrl,cryptoImpl:webcrypto,fetchImpl:async url=>new Response(await fs.readFile(path.join(dir,new URL(url).pathname.split('/').at(-1))))});
  assert.deepEqual(assembled.bytes,bytes);
  const wrong=args.slice();wrong[wrong.length-1]='0'.repeat(64);
  assert.throws(()=>execFileSync(process.execPath,wrong,{stdio:'pipe'}),/Command failed/);
  assert.equal(JSON.parse(await fs.readFile(path.join(dir,'manifest.json'))).sha256,hash(bytes));
 }finally{await fs.rm(tmp,{recursive:true,force:true});}
});
test('install dialog links to an explicit relative review-download page without changing direct-APK handling',async()=>{
 const controls=await fs.readFile(new URL('../src/pwa-tools.js',import.meta.url),'utf8');
 for(const [page,expected]of [['downloads/','https://example.test/play/downloads/'],['https://elsewhere.test/downloads/',null],['../downloads/',null]]){
  const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://example.test/play/',runScripts:'outside-only'});
  try{
   dom.window.matchMedia=()=>({matches:false});const script=dom.window.document.createElement('script');script.dataset.apkDownloadPage=page;
   Object.defineProperty(dom.window.document,'currentScript',{value:script});dom.window.eval(controls);
   const link=dom.window.document.querySelector('.ak-pwa-apk');assert.equal(link?.href||null,expected);
   if(link){assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');assert.match(link.textContent,/review APK/);}
  }finally{dom.window.close();}
 }
});
