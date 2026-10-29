const {randomBytes,createHash,timingSafeEqual}=require('node:crypto');
const model=require('../mobile/arctic-play/src/unlockModel.cjs');
const hash=v=>createHash('sha256').update(String(v||'')).digest('hex');
const error=(message,status=403)=>Object.assign(Error(message),{status});
function readFestivals(){try{return model.festivalsFrom(JSON.parse(process.env.AK_ACCESS_FESTIVALS||'[]'));}catch{return [];}}
function createAccessService({store,withAccount,now=Date.now,festivals=readFestivals(),requireAccount=true,onVerifiedProgress=async()=>{}}={}){
  festivals=model.festivalsFrom(festivals);
  const configured=()=>!!store.configured;
  function checkId(id){if(typeof id!=='string'||!/^[a-z0-9-]{20,64}$/i.test(id))throw error('Reopen the app to restore your player identity.');}
  async function accountActor(token){if(!token)return null;return withAccount(token,a=>({kind:'account',id:a.id}));}
  async function identity(payload){
    const account=await accountActor(payload.cloudSession);if(account)return account;if(requireAccount)throw error('Sign in and connect to play.',401);
    checkId(payload.playerId);const d=await store.get('access-device',payload.playerId),h=hash(payload.accessToken);
    if(!d||!/^[a-f0-9]{64}$/.test(payload.accessToken||'')||!timingSafeEqual(Buffer.from(h),Buffer.from(d.tokenHash)))throw error('Reconnect your unlock journey before joining this hall.');
    if(d.accountId)throw error('Restore the recovery account linked to this journey.');
    return {kind:'device',id:payload.playerId};
  }
  async function transact(owner,fn){
    let response;
    await store.transact(owner.kind==='account'?'account':'access-device',owner.id,async value=>{
      if(!value)throw error('Restore your unlock journey first.');
      const p=model.clean(owner.kind==='account'?value.accessProgress:value.progress);
      const update=await fn(p,owner.kind==='account'?value.entitlements||{}:{});
      if(owner.kind==='account')value.accessProgress=model.clean(update.progress||p);else value.progress=model.clean(update.progress||p);
      response={...update,progress:owner.kind==='account'?value.accessProgress:value.progress,entitlements:owner.kind==='account'?value.entitlements||{}:{},festivals,serverNow:now()};return value;
    });if(owner.kind==='account')await onVerifiedProgress(owner.id).catch(()=>{});return response;
  }
  async function open(payload){
    if(!configured())throw error('Online unlock syncing is awaiting service setup. Sign in and connect, or restore your purchased Offline Access Pass.',503);
    const owner=await accountActor(payload.cloudSession);
    if(owner){
      // Import only a server-validated guest ledger, authenticated by its secret.
      if(payload.accessToken){
        let guestProgress;
        checkId(payload.playerId);await store.transact('access-device',payload.playerId,d=>{
          if(!d||!/^[a-f0-9]{64}$/.test(payload.accessToken)||!timingSafeEqual(Buffer.from(hash(payload.accessToken)),Buffer.from(d.tokenHash)))throw error('That device journey could not be verified.');
          if(d.accountId&&d.accountId!==owner.id)throw error('This device journey belongs to another recovery account.');
          guestProgress=model.clean(d.progress);d.accountId=owner.id;return d;
        });
        await transact(owner,p=>({progress:model.merge(p,guestProgress)}));
      }
      return transact(owner,p=>({progress:p}));
    }
    if(requireAccount)throw error('Sign in and connect to play.',401);
    checkId(payload.playerId);let token;
    await store.transact('access-device',payload.playerId,d=>{
      if(d){if(!/^[a-f0-9]{64}$/.test(payload.accessToken||'')||!timingSafeEqual(Buffer.from(hash(payload.accessToken)),Buffer.from(d.tokenHash)))throw error('Restore the unlock identity saved on this phone.');if(d.accountId)throw error('Restore the recovery account linked to this journey.');return d;}
      token=randomBytes(32).toString('hex');return{tokenHash:hash(token),progress:model.empty()};
    });
    const snapshot=await transact({kind:'device',id:payload.playerId},p=>({progress:p}));
    return {...snapshot,...(token?{accessToken:token}:{})};
  }
  async function action(payload,kind,verified){const owner=await identity(payload);return transact(owner,p=>({progress:kind==='complete'?model.complete(p,payload.challengeId,payload.point):kind==='spend'?model.spend(p,payload.tableId,now()):kind==='win'?model.win(p,verified.id,verified.matchId,now()):kind==='foundation'?model.foundationWin(p,verified,now()):p}));}
  async function authorize(payload,id){
    if(requireAccount){const owner=await identity(payload);return authorizeOwner(owner,id);}
    const publicAccess=model.access(id,{festivals,now:now()});let owner=null;
    if(publicAccess.open){if(configured()&&(payload.cloudSession||payload.accessToken))owner=await identity(payload);return {owner,reason:publicAccess.reason};}
    if(!configured())throw error('This hall needs its unlock journey verified by the updated online service. Sign in and connect to verify your access.',503);
    owner=await identity(payload);return authorizeOwner(owner,id);
  }
  async function authorizeOwner(owner,id){
    if(requireAccount&&owner?.kind!=='account')throw error('Every player must sign in to play.',401);
    if(!owner){if(model.access(id,{festivals,now:now()}).open)return {owner:null};throw error('This hall is locked. Earn access or restore your purchase first.');}
    const snapshot=await transact(owner,p=>({progress:p}));
    const grant=model.access(id,{...snapshot,now:now()});if(!grant.open)throw error('Hall locked: '+id+'. '+model.requirement(id));return {owner,reason:grant.reason};
  }
  async function recordRoom(room){
    if(!configured()||room.progressDisqualified||!room.actionCount||room.status!=='finished')return;
    const engine=require('./arcticPlayEngine.cjs'),seats=model.winningSeats(engine.result(room.gameState));
    for(const player of Object.values(room.players))if(!player.bot&&!player.left&&player.accessOwner&&seats.includes(player.seat))await transact(player.accessOwner,p=>({progress:model.win(p,room.tableId,'room:'+room.matchId,now())}));
  }
  return {open,action,authorize,authorizeOwner,recordRoom,identity,configured,festivals,snapshot:payload=>action(payload,'status'),model};
}
module.exports={createAccessService};
