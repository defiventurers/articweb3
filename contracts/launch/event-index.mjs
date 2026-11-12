import {Interface,Contract,sha256} from 'ethers';
import indexer from '../../shared/chain/confirmed-events.cjs';
import {verifyDeployment} from './testnet.mjs';
const normalize=v=>typeof v==='bigint'?String(v):Array.isArray(v)?v.map(normalize):v;
export function decoder(abi){
 const iface=new Interface(abi);
 return log=>{
  let parsed;try{parsed=iface.parseLog(log);}catch{return null;}
  if(!parsed)return null;
  return {name:parsed.name,args:Object.fromEntries(parsed.fragment.inputs.map((p,n)=>[p.name||'arg'+n,normalize(parsed.args[n])]))};
 };
}
export function snapshotStore(snapshot,write=()=>{}){
 const store=indexer.memoryStore();
 if(snapshot){
  if(snapshot.schema!==1||!Array.isArray(snapshot.states)||!Array.isArray(snapshot.events))throw Error('Invalid event index snapshot.');
  for(const [k,s]of snapshot.states)store.states.set(k,s);
  for(const [k,e]of snapshot.events)store.events.set(k,e);
 }
 const persist=()=>write({schema:1,states:[...store.states],events:[...store.events]});
 return {...store,
  async apply(...args){const r=await store.apply(...args);await persist();return r;},
  async rewind(...args){const r=await store.rewind(...args);await persist();return r;},
  export:()=>({schema:1,states:[...store.states],events:[...store.events]})
 };
}
export async function indexDeployment({provider,record,artifacts,store,maxBatches=20}){
 const checked=await verifyDeployment({provider,record,artifacts});
 if(!checked.ready)throw Error('Confirmed deployments are required before indexing.');
 const reports=[];
 for(const [name,kind]of [['FairPlayRegistry','registry'],['AntarcticPassport','passport']]){
  const c=checked.contracts[name],scope={chainId:46630,contract:c.address.toLowerCase(),fromBlock:c.blockNumber,kind,runtimeHash:artifacts[name].runtimeHash};
  reports.push(await indexer.syncConfirmedEvents({provider,store,scope,decode:decoder(artifacts[name].abi),hashCode:code=>sha256(code).slice(2),maxBatches}));
 }
 const report={chainId:46630,checkedAt:new Date().toISOString(),scopes:reports,ready:reports.every(r=>r.ready),reconciliation:null,playerMatchVerified:false};
 if(report.ready){
  const rows=[...store.events.values()],passportReport=reports.find(r=>r.kind==='passport');
  const mints=rows.filter(e=>e.chainId===46630&&e.contract===passportReport.contract&&e.name==='Transfer'&&/^0x0{40}$/i.test(e.args.from));
  const issued=await new Contract(passportReport.contract,artifacts.AntarcticPassport.abi,provider).totalIssued({blockTag:passportReport.cursor});
  if(BigInt(new Set(mints.map(e=>e.args.tokenId)).size)!==issued)throw Error('Indexed passport mint count differs from the onchain total at the checked block.');
  const registry=reports.find(r=>r.kind==='registry'),rehearsal=rows.filter(e=>e.chainId===46630&&e.contract===registry.contract&&e.args.matchId===record.smoke?.matchId);
  report.reconciliation={confirmedPassports:String(issued),passportCountMatchesContract:true,rehearsalEvents:rehearsal.map(e=>({name:e.name,transactionHash:e.transactionHash,blockNumber:e.blockNumber})),rehearsalIndexed:!!record.smoke?.confirmed&&['MatchRegistered','RollCommitted','Checkpoint'].every(name=>rehearsal.some(e=>e.name===name))};
 }
 return report;
}
