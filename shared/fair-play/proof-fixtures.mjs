import * as core from './core.js';
import {RULESETS} from './rulesets.js';
import {diceValues,verifyBeacon,QUICKNET,roundTime} from './beacon.js';
import fs from 'node:fs/promises';
export async function signedFixture({authority=RULESETS[1],id='xiangqi',options={},server,steps=1}={}){
 server||=await core.generateKey();
 const engine=authority.engine,config={randomness:'drand-quicknet-v1',...options};
 let state=engine.create(id,config);
 const keys=await Promise.all(engine.game(id).seats.map(()=>core.generateKey()));
 const actors=engine.game(id).seats.map((seat,n)=>({id:'fixture-'+n,seat,kind:'human',publicKey:keys[n].publicKey}));
 const bundle=await core.makeHeader({protocol:core.PROTOCOL,matchId:'fixture-'+id,gameId:id,rulesHash:authority.manifest.rulesHash,rulesVersion:engine.VERSION,initialState:state,initialStateHash:await core.stateHash(state),actors,serverPublicKey:server.publicKey,options:config},server.privateKey);
 for(let n=0;n<steps;n++){
  const actor=actors.findIndex(a=>a.seat===engine.turn(state)),action=engine.actions(id,state)[0];
  const signed=await core.makeIntent({bundle,actor:actors[actor].id,actionId:action.id,before:state,beaconRound:action.kind==='roll'?42:null},keys[actor].privateKey);
  let rng=null;
  if(action.kind==='roll'){
   const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/drand-quicknet.json',import.meta.url)));
   const beacon=await verifyBeacon(fixture.beacon,42);
   const count=action.id.startsWith('roll-one|')?1:2,values=await diceValues(beacon,signed.intent,count);
   rng={provider:'drand-quicknet-v1',chainHash:QUICKNET.hash,...beacon,count,values,intentHash:await core.hashObject(signed.intent),committedAt:roundTime(42)-4000};
  }
  state=engine.apply(id,state,action.id,rng?{roll:{values:rng.values}}:{});
  await core.appendEvent(bundle,{signed,after:state,rng},server.privateKey);
 }
 return {bundle,state,engine,server,keys,actors,authority};
}
