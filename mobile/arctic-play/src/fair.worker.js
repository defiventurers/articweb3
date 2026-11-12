import {selectRuleset} from '../../../shared/fair-play/rulesets.js';
import {verifyBundle,copy} from '../../../shared/fair-play/core.js';
import {verifyRandomness} from '../../../shared/fair-play/beacon.js';
import {verifyCheckpoint} from '../../../shared/fair-play/chain.js';
import trust from '../../../shared/fair-play/trust.json';
let checkedBundle,checkedEngine;
self.onmessage=async({data})=>{
 const {id,type}=data;
 try {
  if(type==='verify') {
   checkedBundle=null;checkedEngine=null;
   const {engine,manifest,id:ruleset}=selectRuleset(data.bundle?.header);
   const report=await verifyBundle(data.bundle,{engine,rulesHash:manifest.rulesHash,trustedKeys:trust.keys,verifyRandomness,verifyChain:verifyCheckpoint,onProgress:progress=>self.postMessage({id,type:'progress',progress})});
   checkedBundle=copy(data.bundle);checkedEngine=engine;self.postMessage({id,type:'verified',report:{...report,ruleset}});
  } else if(type==='replay') {
   if(!checkedBundle)throw Error('Verify this match before replaying it.');
   const step=Number(data.step);
   if(!Number.isInteger(step)||step<0||step>checkedBundle.events.length)throw Error('Choose a valid replay action.');
   const engine=checkedEngine,header=checkedBundle.header,actors=copy(header.actors);let state=engine.create(header.gameId,header.options);
   for(const e of checkedBundle.events.slice(0,step)) {
    const actor=actors.find(a=>a.id===e.signed.intent.actor);
    if(e.kind==='resign'){state=['sannin','sanyou','dominion'].includes(header.gameId)?state:engine.forfeit(header.gameId,state,actor.seat);actor.kind='bot';actor.left=true;if(!actors.some(a=>a.kind==='human'&&!a.left)&&!engine.result(state))state={...state,mobileResult:{winner:null,draw:true,reason:'All players left the table.'}};}
    else state=engine.apply(header.gameId,state,e.signed.intent.actionId,e.rng?{roll:{values:e.rng.values}}:{});
   }
   self.postMessage({id,type:'replay',step,board:engine.board(header.gameId),pieces:engine.pieces(header.gameId,state)});
  }
 }catch(e){self.postMessage({id,error:e.message||'This proof could not be verified.',verificationStatus:'not-verified'});}
};
