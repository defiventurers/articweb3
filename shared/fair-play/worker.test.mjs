import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {webcrypto,createHash} from 'node:crypto';
import * as core from './core.js';
import {verifyBeacon,diceValues,QUICKNET,roundTime} from './beacon.js';

const root=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(import.meta.url);
const engine=require('../../server/fairPlayEngine.cjs');
const gameplay=require('../../server/arcticPlayGames.cjs');
const manifest=JSON.parse(await fs.readFile(new URL('./rules-manifest.json',import.meta.url),'utf8'));
const server=await core.generateKey();
const buildRequire=createRequire(path.join(root,'mobile/arctic-play/build-deps/package.json'));
const {rolldown}=await import(buildRequire.resolve('rolldown'));
const compiled=await rolldown({
  input:path.join(root,'mobile/arctic-play/src/fair.worker.js'),platform:'browser',external:['node:crypto'],
  onwarn(w){throw Error(w.message);},
  plugins:[{name:'isolated-test-public-key',load(id){
    if(id===path.join(root,'shared/fair-play/trust.json'))return {code:JSON.stringify({keys:[server.publicKey]}),moduleType:'json'};
  }}],
});
const generated=await compiled.generate({format:'iife',minify:true});
await compiled.close();
const workerSource=generated.output.find(o=>o.type==='chunk').code;

function worker() {
  const replies=[],self={postMessage:value=>replies.push(value)};
  const context=vm.createContext({self,crypto:webcrypto,TextEncoder,TextDecoder,URL,URLSearchParams,AbortController,AbortSignal,setTimeout,clearTimeout,atob,btoa,console,
    fetch(){throw Error('The isolated proof must not request a network service.');}});
  new vm.Script(workerSource).runInContext(context);
  return {async send(type,values={}){await self.onmessage({data:{id:'request',type,...values}});return replies.at(-1);},replies};
}

async function proof(id='shogi',options={}) {
  // The fixture uses the gameplay authority; the worker uses the pinned proof executable.
  let state=gameplay.create(id,options);
  const keys=await Promise.all(gameplay.game(id).seats.map(()=>core.generateKey()));
  const actors=gameplay.game(id).seats.map((seat,n)=>({id:'player-'+n,seat,kind:'human',publicKey:keys[n].publicKey}));
  const bundle=await core.makeHeader({protocol:core.PROTOCOL,matchId:'worker-'+id,gameId:id,rulesHash:manifest.rulesHash,rulesVersion:engine.VERSION,initialState:state,initialStateHash:await core.stateHash(state),actors,serverPublicKey:server.publicKey,options:{...options,randomness:'drand-quicknet-v1'}},server.privateKey);
  const n=actors.findIndex(a=>a.seat===gameplay.turn(state)),actionId=gameplay.actions(id,state)[0].id;
  const isRoll=id==='dominion';
  const signed=await core.makeIntent({bundle,actor:actors[n].id,actionId,before:state,beaconRound:isRoll?42:null},keys[n].privateKey);
  let rng=null,context={};
  if(isRoll){
    const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/drand-quicknet.json',import.meta.url),'utf8'));
    const beacon=await verifyBeacon(fixture.beacon,42),sides=options.rulesProfile==='chaturanga-long-dice-v1'?[2,3,4,5]:[1,2,3,4,5,6];
    const values=await diceValues(beacon,signed.intent,2,sides);
    rng={provider:'drand-quicknet-v1',chainHash:QUICKNET.hash,...beacon,count:2,values,intentHash:await core.hashObject(signed.intent),committedAt:roundTime(42)-4000};
    context={roll:{values}};
  }
  state=gameplay.apply(id,state,actionId,context);
  await core.appendEvent(bundle,{signed,after:state,rng},server.privateKey);
  return {bundle,state};
}

test('the browser worker verifies the actual published authority, including native Shogi, Shanshui and both dice editions',async()=>{
  assert.equal(createHash('sha256').update(await fs.readFile(path.join(root,'server/fairPlayEngine.cjs'))).digest('hex'),manifest.engineHash);
  const w=worker();
  for(const [id,options] of [['shogi',{}],['shanshui',{}],['dominion',{}],['dominion',{rulesProfile:'chaturanga-long-dice-v1',teamMode:'2v2'}]]){
    const f=await proof(id,options),reply=await w.send('verify',{bundle:f.bundle});
    assert.equal(reply.type,'verified',id+': '+reply.error);
    assert.equal(reply.report.moves,1);
    assert.equal(reply.report.chain.status,'unanchored');
    assert.equal(await core.stateHash(reply.report.state),await core.stateHash(f.state));
    const replay=await w.send('replay',{step:1});
    assert.equal(replay.type,'replay');
    if(id==='dominion'){
      assert.ok(replay.pieces.some(p=>p.sprite.startsWith('art/chaturanga-final-four/pawns/')),'replay preserves current approved pawn art');
      assert.ok(replay.pieces.some(p=>p.sprite.startsWith('art/dominion/')),'replay preserves the other current approved sprites');
      assert.equal(core.canonical(replay.board),core.canonical(engine.board(id)),'presentation must not change board geometry');
      assert.equal(core.canonical(replay.pieces.map(({sprite,...piece})=>piece)),core.canonical(engine.pieces(id,f.state).map(({sprite,...piece})=>piece)),'presentation must not change pieces or positions');
    }
  }
});

test('worker rejects altered proofs and unknown rules; failed verification clears the previous replay',async()=>{
  const w=worker(),{bundle}=await proof();
  assert.equal((await w.send('verify',{bundle})).type,'verified');
  const altered=core.copy(bundle);altered.events[0].afterHash='0'.repeat(64);
  let reply=await w.send('verify',{bundle:altered});
  assert.ok(reply.error);assert.equal(reply.verificationStatus,'failed');
  assert.match((await w.send('replay',{step:1})).error,/Verify this match before replaying/);
  for(const hash of ['63845f4daef97f9721ccecd9cb3c7ef363842835a2566f8f48c7e515863cd952','0'.repeat(64)]){
    const old=core.copy(bundle);old.header.rulesHash=hash;
    reply=await w.send('verify',{bundle:old});
    assert.equal(reply.verificationStatus,'hold');
    assert.ok(reply.error);assert.notEqual(reply.type,'verified');
    assert.match((await w.send('replay',{step:0})).error,/Verify this match before replaying/);
  }
  const wrongVersion=core.copy(bundle);wrongVersion.header.rulesVersion='wrong-version';
  assert.match((await w.send('verify',{bundle:wrongVersion})).error,/original published rules version/);
  const outsider=await core.generateKey(),unknownSigner=core.copy(bundle);
  unknownSigner.header.serverPublicKey=outsider.publicKey;
  unknownSigner.headerHash=await core.hashObject(unknownSigner.header);
  unknownSigner.headerSignature=await core.sign(outsider.privateKey,core.headerMessage(unknownSigner.headerHash));
  assert.match((await w.send('verify',{bundle:unknownSigner})).error,/Unknown match-service signing key/);
});
