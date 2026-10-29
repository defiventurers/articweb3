const {getAddress}=require('ethers');
const {createPassportStore}=require('./antarcticPassportStore');
const CHAINS={11124:{name:'Abstract Sepolia',explorer:'https://sepolia.abscan.org'},2741:{name:'Abstract',explorer:'https://abscan.org'}};
function createPassportRoutes({store=createPassportStore(),chainId=Number(process.env.AK_VISA_CHAIN_ID||11124),accountStore,deliveryEnabled=process.env.AK_VISA_DELIVERY_ENABLED==='true'}={}){
 if(!CHAINS[chainId])throw Error('Unsupported passport network.');
 function response(p){if(!p)return null;return {...p,network:CHAINS[p.chainId]?.name,deliveries:p.deliveries.map(d=>({...d,status:!deliveryEnabled&&d.status==='queued'?'awaiting_setup':d.status,...(/^0x[0-9a-f]{64}$/i.test(d.transactionHash||'')?{explorerUrl:CHAINS[p.chainId].explorer+'/tx/'+d.transactionHash}:{})}))};}
 async function syncAchievements(accountId){if(!accountStore||!store.configured||!store.enqueueAchievement)return;const account=await accountStore.get('account',accountId);for(const a of require('./antarcticAchievements').earnedAchievements(account))await store.enqueueAchievement(accountId,a);}
 async function route(ctx){const {path,method,authenticated,req,body,error,now}=ctx;
  if(path==='/passport/config'&&method==='GET'){if(store.configured)await store.init?.();return {version:1,registration:store.configured,deliveryEnabled,chainId,network:CHAINS[chainId].name,visa:'soulbound',arrival:'transferable'};}
  if(path==='/passport/achievements/sync'&&method==='POST'){const id=await authenticated(req,a=>a.id);await syncAchievements(id);return {passport:response(await store.get(id))};}
  if(path==='/passport'&&method==='GET'){const identity=await authenticated(req,a=>({accountId:a.id,displayName:a.identity?.displayName||'',provider:a.identity?.provider||'recovery',wallet:a.privyWallet||null}));await syncAchievements(identity.accountId);return {identity,passport:response(await store.get(identity.accountId))};}
  if(path==='/passport'&&method==='POST'){
   const b=await body(req);let name=String(b.playerName||'').normalize('NFKC').replace(/[\u0000-\u001f\u007f<>]/g,'').replace(/\s+/g,' ').trim();if([...name].length<2||[...name].length>24)throw error('Choose a player name with 2–24 characters.');
   const actor=await authenticated(req,a=>({id:a.id,wallet:a.privyWallet}));let wallet;try{wallet=getAddress(String(b.walletMode==='privy'?actor.wallet?.address:b.wallet||'').trim());if(/^0x0{40}$/i.test(wallet))throw Error();}catch{throw error('Enter a valid EVM wallet address. Check mixed-case addresses carefully.');}
   if(!['antarctic-visa-v1','antarctic-visa-v2'].includes(b.consentVersion)||typeof b.souvenir!=='boolean')throw error('Review your passport and confirm the NFT delivery address.');
   const accountId=await authenticated(req,a=>a.id);
   const p=await store.register(accountId,{playerName:name,wallet,chainId,souvenir:b.souvenir,consentVersion:b.consentVersion,walletProvider:b.walletMode==='privy'?'privy':'external',achievementOptIn:b.consentVersion==='antarctic-visa-v2'&&b.achievementOptIn===true},now());await syncAchievements(accountId);return {passport:response(await store.get(accountId)||p)};
  }
 }
 return {route,syncAchievements,close:()=>store.close()};
}
module.exports={createPassportRoutes,CHAINS};
