// Read-only acceptance probe. Capability advertising is not a completed-match
// proof, and a reachable RPC is not a deployed registry or anchored result.
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {selectRuleset} from './rulesets.js';
import trust from './trust.json' with {type:'json'};
import {keyId,sha256} from './core.js';
import {verifyBeacon} from './beacon.js';
const base='https://articweb3.onrender.com';
async function json(url,options={}){
 const response=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('HTTP '+response.status);
 return response.json();
}
export async function auditLive(){
 const report={checkedAt:new Date().toISOString(),service:base,readOnly:true,liveMatchVerified:false,onchainRecordingVerified:false};
 try{
  const c=await json(base+'/arctic-play/v3/fair/config');
  const a=selectRuleset({protocol:c.protocol,rulesHash:c.rulesHash,gameId:'xiangqi',rulesVersion:'arctic-play-1.0.0'});
  const pinned=(await Promise.all(trust.keys.map(keyId))).includes(await keyId(c.serverKey));
  report.serviceConfig={enabled:c.enabled,rulesHash:c.rulesHash,supportedRuleset:a.id,signingKeyPinned:pinned,chain:c.chain,randomness:c.randomness,payouts:c.payouts};
  if(!c.enabled||!pinned)throw Error('Service capability or public signing key is not accepted.');
 }catch(e){report.serviceError=e.message;}
 try{
  const beacon=await json(base+'/arctic-play/v3/fair/beacon/42');
  const verified=await verifyBeacon(beacon,42);
  report.publicBeacon={status:'signature-verified',round:verified.round,randomness:verified.randomness};
 }catch(e){report.publicBeacon={status:'unavailable',error:e.message};}
 try{
  const r=await json('https://rpc.testnet.chain.robinhood.com',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_chainId',params:[]})});
  if(Number(BigInt(r.result))!==46630)throw Error('RPC reported a different chain.');
  report.robinhoodRpc={status:'reachable',chainId:46630,registryConfigured:report.serviceConfig?.chain?.configured===true};
 }catch(e){report.robinhoodRpc={status:'unavailable',error:e.message};}
 try{
  const response=await fetch(base+'/arctic-play/app/fair-worker.js',{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('HTTP '+response.status);
  report.deployedWorker={sha256:await sha256(new Uint8Array(await response.arrayBuffer())),note:'Read-only fingerprint. Updated APK worker is packaged separately; no backend or public website deployed by this probe.'};
 }catch(e){report.deployedWorker={error:e.message};}
 report.remaining=['Verify an exported real authenticated match from the live service, including its final result.','Deploy/fund a registry and verify a real checkpoint and pre-beacon commitment in phase 3.','Complete Android device update and retention acceptance in phase 15.'];
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=await auditLive();
 if(process.argv[2])await fs.writeFile(path.resolve(process.argv[2]),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
 if(report.serviceError)process.exitCode=1;
}
