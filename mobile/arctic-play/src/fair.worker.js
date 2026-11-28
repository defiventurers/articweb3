// Replay the exact published executable, independent of later UI/source changes.
// Browser build entrypoints reproduce and check its unchanged digest first.
import engine from '../../../server/fairPlayEngine.cjs';
import {pieceArt} from './dominion.js';
import {verifyBundle,copy} from '../../../shared/fair-play/core.js';
import {verifyRandomness} from '../../../shared/fair-play/beacon.js';
import {verifyCheckpoint} from '../../../shared/fair-play/chain.js';
import manifest from '../../../shared/fair-play/rules-manifest.json';
import trust from '../../../shared/fair-play/trust.json';
import readiness from '../../../shared/fair-play/release-readiness.json';
let checkedBundle;
self.onmessage=async({data})=>{
 const {id,type}=data;
 let verificationStatus='failed';
 try {
  if(type==='verify') {
   checkedBundle=null;
   if(data.bundle?.header?.rulesHash!==manifest.rulesHash){
    verificationStatus='hold';
    throw Error(data.bundle?.header?.rulesHash===readiness.rulesHash?readiness.message:'This match needs its original published rules build. Keep your proof for verification with that release.');
   }
   const report=await verifyBundle(data.bundle,{engine,rulesHash:manifest.rulesHash,trustedKeys:trust.keys,verifyRandomness,verifyChain:verifyCheckpoint,onProgress:progress=>self.postMessage({id,type:'progress',progress})});
   checkedBundle=copy(data.bundle);self.postMessage({id,type:'verified',report});
  } else if(type==='replay') {
   if(!checkedBundle)throw Error('Verify this match before replaying it.');
   const step=Number(data.step);
   if(!Number.isInteger(step)||step<0||step>checkedBundle.events.length)throw Error('Choose a valid replay action.');
   const header=checkedBundle.header,actors=copy(header.actors);let state=engine.create(header.gameId,header.options);
   for(const e of checkedBundle.events.slice(0,step)) {
    const actor=actors.find(a=>a.id===e.signed.intent.actor);
    if(e.kind==='resign'){state=['sannin','sanyou','dominion'].includes(header.gameId)?state:engine.forfeit(header.gameId,state,actor.seat);actor.kind='bot';actor.left=true;if(!actors.some(a=>a.kind==='human'&&!a.left)&&!engine.result(state))state={...state,mobileResult:{winner:null,draw:true,reason:'All players left the table.'}};}
    else state=engine.apply(header.gameId,state,e.signed.intent.actionId,e.rng?{roll:{values:e.rng.values}}:{});
   }
   const pieces=engine.pieces(header.gameId,state);
   // Artwork is presentation, not proof authority. Keep the current approved
   // sprites while replayed state, positions and geometry stay with the pinned engine.
   if(header.gameId==='dominion'){
    const byId=new Map(state.board.flat().filter(Boolean).map(piece=>[piece.id,piece]));
    for(const piece of pieces){const source=byId.get(piece.id);piece.sprite='art/'+pieceArt(source.team,source.type);}
   }
   self.postMessage({id,type:'replay',step,board:engine.board(header.gameId),pieces});
  }
 }catch(e){self.postMessage({id,error:e.message||'This proof could not be verified.',verificationStatus});}
};
