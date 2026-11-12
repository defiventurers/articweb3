// DOM unit tests with a local EVM wallet fixture; no production wallet or RPC.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ganache from 'ganache';
const require=createRequire(new URL('../../mobile/arctic-play/build-deps/package.json',import.meta.url)),{JSDOM,VirtualConsole}=require('jsdom');
const dist=process.env.AK_OPERATOR_DIST;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let n=0;n<600;n++){if(fn())return;await pause(25);}throw Error('Console did not reach '+label);}
function boot(wallet){
 const errors=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
 const html=fs.readFileSync(new URL('./operator/index.html',import.meta.url),'utf8').replace(/<script[^>]*><\/script>/,'');
 const dom=new JSDOM(html,{url:'https://operator.example.test/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console,beforeParse(w){w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.AbortController=AbortController;w.AbortSignal=AbortSignal;w.structuredClone=structuredClone;if(wallet)w.ethereum=wallet;}});
 dom.window.eval(fs.readFileSync(dist+'/app.js','utf8'));return {dom,document:dom.window.document,errors};
}
test('operator page keeps deployment disabled until connection and explains missing wallet access',{skip:!dist},async()=>{
 const f=boot();try{
  assert.equal(f.document.getElementById('deploy').disabled,true);f.document.getElementById('connect').click();
  await until(()=>f.document.getElementById('status').classList.contains('error'),'wallet access message');
  assert.match(f.document.getElementById('status').textContent,/browser with an EVM wallet/);assert.equal(f.document.querySelectorAll('input[type=password]').length,0);assert.deepEqual(f.errors,[]);
 }finally{f.dom.window.close();}
});
test('compiled console deploys and resumes, records a local rehearsal and indexes its actual EVM receipts',{skip:!dist,timeout:60000},async()=>{
 const local=ganache.provider({logging:{quiet:true},chain:{chainId:46630}});let mining=false;
 const timer=setInterval(async()=>{if(mining)return;mining=true;try{await local.request({method:'evm_mine',params:[]});}catch{}finally{mining=false;}},100);
 const wallet={on(){},async request(p){if(p.method==='wallet_switchEthereumChain'){assert.equal(p.params[0].chainId,'0xb626');return null;}return local.request({...p,method:p.method==='eth_requestAccounts'?'eth_accounts':p.method});}};
 const f=boot(wallet),button=id=>f.document.getElementById(id);
 try{
  button('connect').click();await until(()=>!button('deploy').disabled,'connection');
  button('deploy').click();await until(()=>button('contracts-state').textContent==='Code, roles and receipts verified','deployment');
  const first=JSON.parse(f.dom.window.localStorage.getItem('ak.operator.robinhood46630.record.v1'));
  assert.equal(Object.keys(first.contracts).length,2);assert.equal(first.backendEnabled,false);
  button('rehearse').click();await until(()=>button('status').textContent.includes('rehearsal transactions are confirmed'),'rehearsal');
  button('index').click();await until(()=>button('index-state').textContent==='Confirmed events reconciled','indexing');
  const final=JSON.parse(f.dom.window.localStorage.getItem('ak.operator.robinhood46630.record.v1'));
  assert.equal(final.indexReport.reconciliation.rehearsalIndexed,true);assert.equal(final.indexReport.reconciliation.confirmedPassports,'0');
  assert.equal(f.document.querySelectorAll('#receipt-list a').length,3);assert.equal(button('export').disabled,false);assert.deepEqual(f.errors,[]);
 }finally{clearInterval(timer);f.dom.window.close();await local.disconnect();}
});
