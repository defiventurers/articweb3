// Generates a self-contained, key-free signing surface from deploy-eggs.mjs.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {JsonRpcProvider,FetchRequest,ContractFactory,Interface,getAddress,getCreateAddress,id,ZeroHash} from 'ethers';
const here=path.dirname(fileURLToPath(import.meta.url));
export async function buildEggWallet({artifact,passport,rpc,metadata,admin,minter,output}){
 admin=getAddress(admin);minter=getAddress(minter);passport=getAddress(passport);
 if(admin===minter)throw Error('Use a separate backend minter.');
 const request=new FetchRequest(rpc);request.timeout=20000;
 const provider=new JsonRpcProvider(request,undefined,{cacheTimeout:0,batchMaxCount:1});
 try{
  if(Number((await provider.getNetwork()).chainId)!==46630)throw Error('Wrong chain.');
  if(await provider.getCode(passport)==='0x')throw Error('Existing Passport missing.');
  const data=(await new ContractFactory(artifact.abi,artifact.bytecode).getDeployTransaction(admin,minter,passport,metadata)).data;
  // The Egg's only immutable is its existing Passport address. Fill solc's
  // exact offsets instead of making a state-changing deployment to obtain code.
  const references=Object.values(artifact.immutableReferences||{});
  if(references.length!==1)throw Error('Review the Egg immutable layout before preparing a wallet transaction.');
  let runtime=artifact.runtimeBytecode;
  for(const {start,length}of references[0]){
   if(length!==32)throw Error('Unexpected immutable width.');
   runtime=runtime.slice(0,2+start*2)+passport.slice(2).toLowerCase().padStart(64,'0')+runtime.slice(2+(start+length)*2);
  }
  const sha256=hex=>createHash('sha256').update(Buffer.from(hex.slice(2),'hex')).digest('hex');
  const iface=new Interface(artifact.abi);
  const plan={version:1,sourceCommit:'100c3c7513ce90fd2e5e5fc4163155c4c8419d36',chainId:'0xb626',rpc,explorer:'https://explorer.testnet.chain.robinhood.com',admin,minter,passport,metadata,data,runtimeSha256:sha256(runtime),creationSha256:sha256(data),calls:{admin:iface.encodeFunctionData('hasRole',[ZeroHash,admin]),minter:iface.encodeFunctionData('hasRole',[id('MINTER_ROLE'),minter]),passport:iface.encodeFunctionData('passport'),cap:iface.encodeFunctionData('MAX_EDITION'),count:iface.encodeFunctionData('mintedCount'),name:iface.encodeFunctionData('name')},candidates:Array.from({length:256},(_,nonce)=>getCreateAddress({from:admin,nonce}))};
  const app=await fs.readFile(path.join(here,'operator/egg-app.js'),'utf8');
  const script='const PLAN='+JSON.stringify(plan)+';\n'+app;
  const scriptHash=createHash('sha256').update(script).digest('base64');
  const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${scriptHash}'; style-src 'unsafe-inline'; connect-src ${rpc} https://explorer.testnet.chain.robinhood.com; base-uri 'none'; form-action 'none'"><title>Antarctic Egg — Owner Deployment</title><style>body{font:17px system-ui;background:#071d29;color:#e6f6ff;max-width:850px;margin:40px auto;padding:24px}h1{color:#f1d28a}button,input{font:inherit;padding:14px;margin:8px 8px 8px 0}button{cursor:pointer;background:#f1d28a;color:#071d29;border:0;border-radius:8px}button:disabled{opacity:.45;cursor:default}code,pre{overflow-wrap:anywhere;white-space:pre-wrap}pre{background:#102d3d;padding:20px;border-radius:8px}input{width:90%;color:inherit;background:#102d3d;border:1px solid #789}a{color:#f1d28a}</style><h1>Mystery Golden Egg deployment</h1><p>Owner tool · Robinhood Testnet 46630 · 33 editions · 0 ETH value</p><p>This deploys only the Egg. Your existing Passport, data and registration settings are preserved. Wallet keys remain in Zerion.</p><pre id="plan"></pre><button id="connect">1. Connect Zerion</button><button id="deploy" disabled>2. Review & deploy Egg</button><button id="refresh">Check / resume</button><p id="status" role="status">Connect the owner wallet, then review the deployment.</p><p>Already submitted? Paste its transaction hash to resume:</p><input id="hash" aria-label="Deployment transaction hash" placeholder="0x…"><button id="recover">Resume transaction</button><button id="cancelled">I cancelled the wallet request</button><button id="export" disabled>Download receipt</button><pre id="result"></pre><script>${script}</script></html>`;
  const target=output?path.resolve(output):path.resolve(here,'../../frontend/public/ops/egg-deploy/index.html');
  await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,html);
  console.log(JSON.stringify({mode:'WALLET_SIGNATURE_REQUIRED',output:target,chainId:46630,admin,minter,passport,metadata,creationSha256:plan.creationSha256,runtimeSha256:plan.runtimeSha256,broadcast:false}));
  return plan;
 }finally{provider.destroy();}
}
