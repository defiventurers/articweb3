import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto,createHash} from 'node:crypto';
import ganache from 'ganache';
import {BrowserProvider,ContractFactory,Interface,ZeroHash,id,getCreateAddress} from 'ethers';
import {compile} from './compile.mjs';

test('Rabby deployment, exact immutable runtime, lost-response recovery and duplicate blocking',async()=>{
 const chain=ganache.provider({logging:{quiet:true},chain:{chainId:46630}}),provider=new BrowserProvider(chain,undefined,{cacheTimeout:0});
 try{
 const owner=await (await provider.getSigner(0)).getAddress(),minter=await (await provider.getSigner(1)).getAddress(),passport='0xF059141A4e21eF5786e66e96F1c4357858a0De11',a=compile().AntarcticMysteryEgg;
 const data=(await new ContractFactory(a.abi,a.bytecode).getDeployTransaction(owner,minter,passport,'https://example.test/egg/')).data;
 let runtime=a.runtimeBytecode;for(const refs of Object.values(a.immutableReferences))for(const {start,length}of refs)runtime=runtime.slice(0,2+start*2)+passport.slice(2).toLowerCase().padStart(length*2,'0')+runtime.slice(2+(start+length)*2);
 const iface=new Interface(a.abi),plan={chainId:'0xb626',rpc:'https://example.test/rpc',admin:owner,minter,passport,data,runtimeSha256:createHash('sha256').update(Buffer.from(runtime.slice(2),'hex')).digest('hex'),calls:Object.fromEntries([['admin','hasRole',[ZeroHash,owner]],['minter','hasRole',[id('MINTER_ROLE'),minter]],['passport','passport',[]],['cap','MAX_EDITION',[]],['count','mintedCount',[]],['name','name',[]]].map(([key,fn,args])=>[key,iface.encodeFunctionData(fn,args)])),candidates:Array.from({length:32},(_,nonce)=>getCreateAddress({from:owner,nonce}))};
 const app=await fs.readFile(new URL('./operator/egg-app.js',import.meta.url),'utf8');
 let sentHash,loseResponse=true;
 const wallet={isRabby:true,async request({method,params}){
  if(method==='eth_requestAccounts'||method==='eth_accounts')return [owner];
  if(method==='wallet_switchEthereumChain')return null;
  const result=await chain.request({method,params:params||[]});
  if(method==='eth_sendTransaction'){sentHash=result;if(loseResponse)throw Error('Wallet response lost after broadcast');}
  return result;
 }};
 function page(storage=new Map()){
  const elements=new Map();const document={getElementById:id=>{if(!elements.has(id))elements.set(id,{textContent:'',value:'',disabled:false});return elements.get(id);}};
  const context={document,window:{ethereum:wallet,addEventListener(){},dispatchEvent(){}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},Event:class{},setTimeout,AbortSignal,crypto:webcrypto,TextDecoder,Uint8Array,URL,Blob,fetch:async(_url,options)=>{const r=JSON.parse(options.body);return {ok:true,json:async()=>({result:await chain.request({method:r.method,params:r.params})})};}};
  vm.createContext(context);vm.runInContext('const PLAN='+JSON.stringify(plan)+';\n'+app,context);
  return {elements,storage,click:async id=>{await elements.get(id).onclick();return elements.get('status').textContent;},record:()=>JSON.parse(storage.get('ak.egg-deployment.46630.v1'))};
 }
 const first=page();assert.match(await first.click('connect'),/No existing Egg/);
 assert.match(await first.click('deploy'),/response lost/);assert.ok(sentHash);assert.equal(first.record().pendingNonce,0);
 await first.click('refresh');assert.equal(first.record().eggAddress.toLowerCase(),plan.candidates[0].toLowerCase());assert.equal(first.record().runtimeVerified,true);assert.equal(first.elements.get('deploy').disabled,true);
 // A fresh tab without storage discovers the existing Egg by owner creation nonce.
 const fresh=page();assert.match(await fresh.click('refresh'),/Existing Egg found/);assert.equal(fresh.elements.get('deploy').disabled,true);
 // Recover the exact submitted transaction and canonical receipt; never send again.
 first.elements.get('hash').value=sentHash;await chain.request({method:'evm_mine',params:[]});
 assert.match(await first.click('recover'),/Egg confirmed/);assert.equal(first.record().confirmedL2,true);assert.equal(first.record().rolesVerified,true);assert.equal(await provider.getTransactionCount(owner),1);
 const forged=page();forged.elements.get('hash').value='0x'+'0'.repeat(64);assert.match(await forged.click('recover'),/not visible/);
 }finally{provider.destroy();await chain.disconnect();}
});
