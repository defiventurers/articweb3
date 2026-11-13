// Operator CLI. Keys are read from the private environment only; public records
// contain receipts/addresses, never credentials. The browser console needs no key.
import fs from 'node:fs';
import path from 'node:path';
import {JsonRpcProvider,Wallet} from 'ethers';
import {compileBundle} from './compile.mjs';
import {TESTNET,newDeployment,deployTestnet,verifyDeployment,runRegistryRehearsal,assertTestnet} from './testnet.mjs';
import {indexDeployment,snapshotStore} from './event-index.mjs';
import {verifyExplorerSources} from './explorer-verification.mjs';
const args=process.argv.slice(2),arg=(flag,fallback)=>{const n=args.indexOf(flag);return n<0?fallback:args[n+1];};
const mode=args[0]||'plan',file=path.resolve(arg('--record','deployments/robinhood-testnet.json'));
const {artifacts,input}=compileBundle();
function atomic(target,value){fs.mkdirSync(path.dirname(target),{recursive:true});const temp=target+'.'+crypto.randomUUID()+'.tmp';const fd=fs.openSync(temp,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,target);}
if(mode==='plan'){
 console.log(JSON.stringify({chainId:46630,network:TESTNET.name,contracts:['FairPlayRegistry','AntarcticPassport'],broadcast:false,networkVerified:false,required:'A funded Robinhood testnet wallet. Browser console can deploy without sharing its key.'},null,2));
 process.exit(0);
}
if(!['deploy','verify','verify-source','rehearse','index','verification-input'].includes(mode))throw Error('Choose plan, deploy, verify, verify-source, rehearse, index or verification-input.');
if(mode==='verification-input'){atomic(path.resolve(arg('--output','artifacts/standard-input.json')),input);process.exit(0);}
const rpc=process.env.AK_LAUNCH_RPC_URL||TESTNET.rpc,u=new URL(rpc);
if(u.protocol!=='https:'||u.username||u.password||u.hash)throw Error('Use an HTTPS Robinhood testnet RPC.');
const provider=new JsonRpcProvider(rpc,undefined,{cacheTimeout:0});
let lock;
try{
 await assertTestnet(provider);
 let record=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null;
 const save=r=>atomic(file,r);
 if(['deploy','rehearse'].includes(mode)){
  if(!process.env.AK_LAUNCH_DEPLOYER_KEY)throw Error('Use the wallet console, or configure a dedicated testnet key privately in AK_LAUNCH_DEPLOYER_KEY. Never paste a key in chat.');
  const signer=new Wallet(process.env.AK_LAUNCH_DEPLOYER_KEY,provider);
  record||=newDeployment({owner:signer.address,operator:process.env.AK_LAUNCH_OPERATOR_ADDRESS||signer.address,metadataBase:process.env.AK_PASSPORT_METADATA_BASE});
  await save(record);
  const progress=message=>console.error(message);
  if(mode==='deploy')await deployTestnet({provider,signer,artifacts,record,save,progress});
  else await runRegistryRehearsal({provider,signer,artifacts,record,save,progress});
  console.log(JSON.stringify({record:file,chainId:46630,contracts:record.contracts,rehearsalConfirmed:record.smoke?.confirmed||false},null,2));
 }else if(mode==='verify')console.log(JSON.stringify(await verifyDeployment({provider,record,artifacts}),null,2));
 else if(mode==='verify-source')console.log(JSON.stringify(await verifyExplorerSources({provider,record,artifacts,input,save}),null,2));
 else{
  const indexFile=path.resolve(arg('--state',file+'.events.json'));fs.mkdirSync(path.dirname(indexFile),{recursive:true});
  const candidate=indexFile+'.lock';fs.closeSync(fs.openSync(candidate,'wx',0o600));lock=candidate;
  const store=snapshotStore(fs.existsSync(indexFile)?JSON.parse(fs.readFileSync(indexFile)):null,s=>atomic(indexFile,s));
  console.log(JSON.stringify(await indexDeployment({provider,record,artifacts,store}),null,2));
 }
}catch(e){console.error('Testnet step did not complete. Keep the saved record; check wallet funding, network and private local configuration.');if(typeof e.code==='string'&&/^[A-Z_]{1,40}$/.test(e.code))console.error('Code: '+e.code);process.exitCode=1;}
finally{provider.destroy();if(lock)fs.unlinkSync(lock);}
