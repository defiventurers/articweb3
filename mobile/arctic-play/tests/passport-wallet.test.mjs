import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {verifiedAccount} from './account-fixture.mjs';
const mobile=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(mobile+'/build-deps/package.json'),{JSDOM,VirtualConsole}=require('jsdom');
const bundle=process.argv[2];if(!bundle)throw Error('Supply patched app.js');
const debug=value=>{if(process.env.WALLET_TEST_DEBUG)console.log(value)};
const source=fs.readFileSync(bundle,'utf8'),errors=[],checks=[];
const address='0x1234567890123456789012345678901234567890',contract='0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',accountId='11111111-1111-4111-8111-111111111111';
const response=body=>({ok:true,json:async()=>body}),delay=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn,label='UI'){for(let n=0;n<750;n++){if(fn())return;await delay(8)}throw Error('Timed out: '+label)}
function open(){
 const v=new VirtualConsole();v.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM('<div id="root"></div><div id="test-root"></div>',{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:v,beforeParse(w){w.Worker=class{postMessage(){}terminate(){}};w.WebSocket=undefined;w.HTMLElement.prototype.scrollIntoView=function(){};w.Android={setDarkTheme(){},appReady(){},openAuth(){throw Error('Unexpected Para redirect')}};w.open=()=>{throw Error('Unexpected browser redirect')};w.localStorage.setItem('arctic-play.v1.profile',JSON.stringify({id:'wallet-fixture',name:'Explorer',avatar:'red'}));}});
 const w=dom.window;verifiedAccount(w);const fallback=w.fetch;const calls=[];let page=0;
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{w.copiedAddress=text}}});
 w.fetch=async(input,options={})=>{
  const url=String(input);calls.push({url,options});
  if(url.endsWith('/passport'))return response({identity:{accountId,wallet:{provider:'para',address,chainId:46630}},passport:{id:'fixture',number:'AK-1',playerName:'Explorer',wallet:contract,deliveries:[]}});
  if(url.startsWith('https://rpc.testnet.chain.robinhood.com')){const body=JSON.parse(options.body);assert.equal(options.headers.Authorization,undefined);return response({id:body.id,result:body.method==='eth_chainId'?'0xb626':'0x112210f4768db400'})}
  if(url.includes('/api/v2/addresses/')){
   assert.ok(url.includes(address));assert.equal(options.credentials,'omit');assert.equal(options.headers,undefined);
   const id=new URL(url).searchParams.has('token_id')?'9':'7';page++;
   return response({items:[{id,token_type:'ERC-1155',value:'3',token:{address_hash:contract,name:'Lantern Collection'},metadata:{name:'Lantern #'+id,description:'A winter keepsake',image:'javascript:alert(1)'}}],next_page_params:id==='7'?{token_id:'7',items_count:50}:null});
  }
  return fallback(input,options);
 };
 // Export the existing ReactDOM root only in the test copy, to exercise account races with an isolated gateway.
 w.eval(source.replace(';(0,Gl.createRoot)(document.getElementById(`root`)).render(',';window.__walletTestRoot=Gl.createRoot;(0,Gl.createRoot)(document.getElementById(`root`)).render('));
 return {dom,w,doc:w.document,calls,getPages:()=>page};
}
const app=open();const {w,doc}=app,buttons=()=>[...doc.querySelectorAll('button')];
try{
 await wait(()=>doc.querySelector('.home-heritage'));
 buttons().find(b=>b.textContent==='Passport').click();await wait(()=>doc.querySelector('.pw-entry'));
 assert.ok(doc.querySelector('.pw-entry').previousElementSibling.classList.contains('pp-book-caption'));
 doc.querySelector('.pw-entry button').click();await wait(()=>doc.querySelector('[role=dialog][aria-label=Wallet]'));
 await wait(()=>doc.querySelector('.pw-nft'));
 assert.ok(doc.querySelector('.pw-balance').textContent.includes('1.234567'));assert.ok(doc.querySelector('.pw-balance').textContent.includes('Test ETH'));
 assert.equal(doc.querySelector('.pw-address code').textContent,address);assert.notEqual(doc.querySelector('.pw-address code').textContent,contract);
 assert.equal(doc.querySelector('.pw-nft img'),null);debug('checkpoint');checks.push('Passport entry opens Wallet inside the existing focus-trapped app sheet, using verified Para address');
 buttons().find(b=>b.textContent==='Copy address').click();await wait(()=>w.copiedAddress===address);
 doc.querySelector('.pw-nft').click();await wait(()=>doc.querySelector('.pw-detail'));assert.ok(doc.querySelector('.pw-detail').textContent.includes('Quantity3'));
 assert.equal(doc.querySelectorAll('.pw-wallet a').length,0);buttons().find(b=>b.textContent.includes('Back to NFTs')).click();await wait(()=>!doc.querySelector('.pw-detail'));
 buttons().find(b=>b.textContent==='Load more NFTs').click();await wait(()=>doc.querySelectorAll('.pw-nft').length===2);
 assert.equal(buttons().find(b=>b.textContent==='Load more NFTs'),undefined);debug('checkpoint');checks.push('Copy address, NFT details and paginated ERC-1155 collection stay in app');
 buttons().find(b=>b.textContent==='Refresh').click();await wait(()=>doc.querySelectorAll('.pw-nft').length===1&&buttons().some(b=>b.textContent==='Refresh'));
 assert.ok(app.getPages()>=3);doc.querySelector('[aria-label=Close]').click();await wait(()=>!doc.querySelector('[role=dialog]'));debug('checkpoint');checks.push('Refresh reloads holdings and Close returns to Passport');
 // Test the shipped component against session changes, delayed requests and partial failures.
 const root=w.__walletTestRoot(doc.getElementById('test-root')),R=w.__AKReact;
 let current={session:{accountId:'a',session:'a-token'}},listener,resolveIdentity,identityCalls=0;
 const gateway={snapshot:()=>current,watch:fn=>{listener=fn;return()=>{listener=null}},request:()=>{identityCalls++;return new Promise(r=>{resolveIdentity=r})}};
 root.render(R.createElement(w.AKPassportWallet.PassportWallet,{gateway}));await wait(()=>identityCalls===1);
 const stale=resolveIdentity;current={session:{accountId:'b',session:'b-token'}};listener(current);await wait(()=>identityCalls===2);
 stale({identity:{accountId:'a',wallet:{provider:'para',address,chainId:46630}}});await delay(30);
 assert.equal(doc.querySelector('#test-root .pw-address'),null);resolveIdentity({identity:{accountId:'b',wallet:null}});await wait(()=>doc.getElementById('test-root').textContent.includes('No Para wallet'));
 current={session:null};listener(current);await wait(()=>doc.getElementById('test-root').textContent.includes('Sign in to your account'));assert.equal(doc.querySelector('#test-root .pw-address'),null);debug('checkpoint');checks.push('Delayed account A response cannot leak holdings into account B or signed-out state');
 root.unmount();
 let saved={session:{accountId:'a',session:'a-token'}};
 const g={snapshot:()=>saved,watch:()=>()=>{},request:async()=>({identity:{accountId:'a',wallet:{provider:'para',address,chainId:46630}}})};
 const failures=w.__walletTestRoot(doc.getElementById('test-root'));w.fetch=async url=>{if(String(url).includes('/nft?'))return response({items:[],next_page_params:null});throw Error('RPC offline')};
 failures.render(R.createElement(w.AKPassportWallet.PassportWallet,{gateway:g}));await wait(()=>doc.querySelector('#test-root .pw-empty'));
 assert.ok(doc.querySelector('#test-root .pw-balance').textContent.includes('Unavailable'));assert.ok(doc.querySelector('#test-root .pw-empty').textContent.includes('No NFTs yet'));
 w.fetch=async()=>({ok:false});doc.querySelector('#test-root .pw-refresh').click();await wait(()=>doc.querySelector('#test-root [role=alert]')&&doc.querySelector('#test-root .pw-collection-heading')?.textContent.includes('Unavailable'));
 assert.equal(doc.querySelector('#test-root .pw-empty'),null);debug('checkpoint');checks.push('Independent balance/NFT failures remain actionable and never show a false empty collection');
 failures.unmount();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:checks.length,checks},null,2));
}catch(e){fs.writeFileSync(path.resolve('wallet-failure.html'),doc.body.innerHTML);throw e}finally{app.dom.window.close()}
