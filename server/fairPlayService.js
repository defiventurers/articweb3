const {randomBytes,createHash}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const manifest=require('../shared/fair-play/rules-manifest.json');
const trust=require('../shared/fair-play/trust.json');
const sdk=Promise.all([import('../shared/fair-play/core.js'),import('../shared/fair-play/beacon.js')]);
const error=(message,status=400)=>Object.assign(Error(message),{status});
function configuredKey(){try{return JSON.parse(process.env.AK_FAIR_SIGNING_JWK||'null');}catch{return null;}}

function createFairPlayService({store,engine,privateKey=configuredKey(),trustedKeys=trust.keys,beaconFetcher,anchor,now=Date.now,saveRoom=async()=>{}}={}) {
  const publicKey=privateKey?{kty:'EC',crv:'P-256',x:privateKey.x,y:privateKey.y,ext:true}:null;
  const keyPinned=!!privateKey?.d&&trustedKeys.some(k=>k.x===privateKey.x&&k.y===privateKey.y);
  const engineHash=createHash('sha256').update(fs.readFileSync(path.join(__dirname,'arcticPlayEngine.cjs'))).digest('hex');
  const enabled=()=>keyPinned&&engineHash===manifest.engineHash;
  const pendingArchives=new Map(),beacons=new Map(),fetching=new Map();
  anchor||=require('./fairPlayAnchors').createFairPlayAnchors();
  async function config(){return {protocol:'ak-fair-play-v1',enabled:enabled(),rulesHash:manifest.rulesHash,serverKey:publicKey,chain:anchor.config(),randomness:'drand-quicknet-v1',payouts:false};}
  async function validateKey(key){const [core]=await sdk;return core.publicKey(key);}
  async function start(room) {
    if(!room.fairEnabled)return;
    if(!enabled())throw error('The Fair Play service is being updated. Please retry shortly.',503);
    const [core]=await sdk;
    const actors=Object.values(room.players).map(p=>({id:p.id,seat:p.seat,kind:p.bot?'bot':'human',publicKey:p.bot?publicKey:p.fairKey}));
    if(actors.some(a=>!a.publicKey))throw error('Every player needs the Fair Play update before starting.');
    const options={teamMode:room.gameState.teamMode||'free-for-all',randomness:'drand-quicknet-v1'};
    const header={protocol:core.PROTOCOL,matchId:room.matchId,gameId:room.tableId,rulesHash:manifest.rulesHash,rulesVersion:engine.VERSION,initialState:room.gameState,initialStateHash:await core.stateHash(room.gameState),actors,serverPublicKey:publicKey,createdAt:now(),options,anchor:anchor.config()};
    room.fair={bundle:await core.makeHeader(header,privateKey),pending:null};
    await archive(room);
  }
  function liveActors(bundle){const actors=JSON.parse(JSON.stringify(bundle.header.actors));for(const e of bundle.events)if(e.kind==='resign'){const a=actors.find(a=>a.id===e.signed.intent.actor);if(a){a.kind='bot';a.left=true;a.publicKey=bundle.header.serverPublicKey;}}return actors;}
  async function validateIntent(room,signed,actorId,actionId,kind='action') {
    const [core]=await sdk,b=room.fair?.bundle;
    if(!b||b.closure)throw error('This match is not accepting proof records.');
    if(signed?.intent?.actor!==actorId||signed.intent.actionId!==actionId||signed.intent.kind!==kind)throw error('This signature belongs to another action.');
    const actor=await core.checkIntent({...b,header:{...b.header,actors:liveActors(b)}},signed,room.gameState);
    if(kind==='action'&&actor.seat!==engine.turn(room.gameState))throw error('Wait for your turn.');
    return actor;
  }
  async function botIntent(room,player,actionId){if(room.fair.pending)return room.fair.pending.signed;const [core,beacon]=await sdk;return core.makeIntent({bundle:room.fair.bundle,actor:player.id,actionId,before:room.gameState,beaconRound:actionId.startsWith('roll')?beacon.futureRound(now()):null},privateKey);}
  async function apply(room,{signed,actorId,actionId,kind='action',run,onPending=async()=>{}}) {
    const [core,beacon]=await sdk,bundle=room.fair.bundle;
    const actor=await validateIntent(room,signed,actorId,actionId,kind);
    const intent=signed.intent;
    if(room.fair.pending&&core.canonical(room.fair.pending.signed)!==core.canonical(signed))throw error('Retrieve the recorded roll before making another move.');
    let rng=null,roll;
    if(kind==='action') {
      const action=engine.actions(room.tableId,room.gameState).find(a=>a.id===actionId);
      if(!action)throw error('That action is no longer legal.');
      if(action.kind==='roll') {
        const count=actionId==='roll-one|control:roll-one'?1:2;
        if(!room.fair.pending) {
          const time=beacon.roundTime(intent.beaconRound);
          if(!Number.isSafeInteger(intent.beaconRound)||time<=now()+1000||time>now()+30000)throw error('Check your phone clock and start the roll again.');
          room.fair.pending={signed:core.copy(signed),intentHash:await core.hashObject(intent),committedAt:now()};
          await saveRoom(room);await onPending();
        }
        const pending=room.fair.pending;
        if(anchor.config().configured&&!pending.anchor){pending.anchor=await anchor.commitRoll(room,pending);await saveRoom(room);}
        const value=await (beaconFetcher?beaconFetcher(intent.beaconRound):beacon.fetchRound(intent.beaconRound));
        const checked=await beacon.verifyBeacon(value,intent.beaconRound),values=await beacon.diceValues(checked,intent,count);
        rng={provider:'drand-quicknet-v1',chainHash:beacon.QUICKNET.hash,...checked,count,values,intentHash:pending.intentHash,committedAt:pending.committedAt,...(pending.anchor?{anchor:pending.anchor}:{})};roll={values};
      }else if(intent.beaconRound!==null)throw error('This move must not request dice.');
    } else if(intent.beaconRound!==null)throw error('A resignation must not request dice.');
    let state=kind==='resign'?engine.forfeit(room.tableId,room.gameState,actor.seat):await run(roll);
    if(kind==='resign'&&!Object.values(room.players).some(p=>p.id!==actorId&&!p.bot&&!p.left)&&!engine.result(state))state={...state,mobileResult:{winner:null,draw:true,reason:'All players left the table.'}};
    await core.appendEvent(bundle,{signed,after:state,rng,acceptedAt:now()},privateKey);
    room.gameState=state;room.fair.pending=null;
    if(engine.result(state))await core.closeBundle(bundle,state,engine.result(state),privateKey);
    await archive(room);
    if(anchor.config().configured&&(bundle.closure||bundle.events.length-(bundle.checkpoint?.count||0)>=20))queueAnchor(room);
    return state;
  }
  function summary(room) {
    const b=room.fair?.bundle;
    if(!b)return {available:false,reason:room.fairEnabled?'Start the match to create its proof.':'This table uses an earlier game protocol.'};
    return {available:true,protocol:b.header.protocol,matchId:room.matchId,header:b.header,headerHash:b.headerHash,headerSignature:b.headerSignature,eventCount:b.events.length,tip:b.events.at(-1)?.hash||b.headerHash,lastEvent:b.events.at(-1)||null,closed:!!b.closure,pending:room.fair.pending?{signed:room.fair.pending.signed,committedAt:room.fair.pending.committedAt}:null,checkpoint:b.checkpoint,chain:anchor.config(),archivePending:!!room.fair.archivePending};
  }
  async function archive(room) {
    if(!store?.configured||!room.fair?.bundle)return;
    try {
      const owners=[...new Set(Object.values(room.players).filter(p=>p.accessOwner?.kind==='account').map(p=>p.accessOwner.id))];
      await store.transact('fair-match',room.matchId,old=>({...old,owners,bundle:room.fair.bundle,updatedAt:now()}));
      for(const owner of owners)await store.transact('fair-owner',owner,value=>({matches:[{matchId:room.matchId,gameId:room.tableId,moves:room.fair.bundle.events.length,closed:!!room.fair.bundle.closure,updatedAt:now()},...(value?.matches||[]).filter(m=>m.matchId!==room.matchId)].slice(0,500)}));
      room.fair.archivePending=false;
    }catch{room.fair.archivePending=true;}
  }
  function queueAnchor(room){if(pendingArchives.has(room.matchId))return;const job=anchor.checkpoint(room).then(async checkpoint=>{if(checkpoint){room.fair.bundle.checkpoint=checkpoint;await archive(room);await saveRoom(room);}}).catch(()=>{room.fair.anchorPending=true;}).finally(()=>pendingArchives.delete(room.matchId));pendingArchives.set(room.matchId,job);}
  async function owned(accountId,matchId){const saved=await store.get('fair-match',matchId);if(!saved?.owners?.includes(accountId))throw error('This proof is not in your match history.',404);return saved;}
  async function route({req,path,method,authenticated,now:clock=now}) {
    if(path==='/fair/config'&&method==='GET')return config();
    if(path==='/fair/matches'&&method==='GET'){const id=await authenticated(req,a=>a.id);return await store.get('fair-owner',id)||{matches:[]};}
    const pub=/^\/fair\/public\/([A-Za-z0-9_-]{43})$/.exec(path);
    if(pub&&method==='GET'){const share=await store.get('fair-share',pub[1]);if(!share)throw error('This shared proof is unavailable.',404);const saved=await store.get('fair-match',share.matchId);if(!saved)throw error('This proof is unavailable.',404);return {bundle:saved.bundle};}
    const match=/^\/fair\/matches\/([a-f0-9-]{36})(\/share)?$/.exec(path);
    if(match){const id=await authenticated(req,a=>a.id),saved=await owned(id,match[1]);
      if(!match[2]&&method==='GET')return {bundle:saved.bundle};
      if(match[2]&&method==='POST'){const token=saved.shareToken||randomBytes(32).toString('base64url');await store.transact('fair-share',token,()=>({matchId:match[1],at:clock()}));await store.transact('fair-match',match[1],value=>({...value,shareToken:token}));return {url:'https://arcticdominion.xyz/fair-play/?proof='+token,token};}
      if(match[2]&&method==='DELETE'){if(saved.shareToken)await store.transact('fair-share',saved.shareToken,()=>null);await store.transact('fair-match',match[1],value=>({...value,shareToken:null}));return {ok:true};}
    }
    const round=/^\/fair\/beacon\/([0-9]{1,12})$/.exec(path);
    if(round&&method==='GET'){
      const [,beacon]=await sdk,n=Number(round[1]);if(!Number.isSafeInteger(n)||n<1||n>beacon.futureRound(now()))throw error('Invalid beacon round.');
      if(beacons.has(n))return beacons.get(n);if(fetching.size>=4&&!fetching.has(n))throw error('Randomness requests are busy. Retry shortly.',503);
      if(!fetching.has(n)){const task=beacon.fetchRound(n,{timeout:12000}).then(b=>{beacons.set(n,b);if(beacons.size>30)beacons.delete(beacons.keys().next().value);return b;}).finally(()=>fetching.delete(n));fetching.set(n,task);}
      return fetching.get(n);
    }
  }
  return {enabled,config,validateKey,start,apply,botIntent,summary,archive,route,bundle:room=>room.fair?.bundle||null,close:()=>Promise.allSettled([...pendingArchives.values()])};
}
module.exports={createFairPlayService};
