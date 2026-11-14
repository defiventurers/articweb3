const {getAddress}=require('ethers');
const {createPassportStore}=require('./antarcticPassportStore');
const CHAINS=Object.fromEntries(Object.values(require('./gameWalletChains.json')).map(c=>[c.id,{name:c.name,explorer:c.blockExplorers.default.url,testnet:c.testnet}]));
function createPassportRoutes({store=createPassportStore(),chainId=Number(process.env.AK_VISA_CHAIN_ID||46630),accountStore,deliveryEnabled=process.env.AK_VISA_DELIVERY_ENABLED==='true',deliveryRuntime=require('./passportDeliveryRuntime').runtime}={}){
 if(!CHAINS[chainId])throw Error('Unsupported passport network.');
 const enabled=()=>process.env.AK_PASSPORT_RUNTIME_ENABLED==='true'?deliveryRuntime.status().ready:deliveryEnabled;
 function response(p){if(!p)return null;return {...p,network:CHAINS[p.chainId]?.name,deliveries:p.deliveries.map(d=>({...d,status:(!enabled()||(process.env.AK_PASSPORT_RUNTIME_ENABLED==='true'&&!deliveryRuntime.status().kinds?.includes(d.kind)))&&d.status==='queued'?'awaiting_setup':d.status,...(/^0x[0-9a-f]{64}$/i.test(d.transactionHash||'')?{explorerUrl:CHAINS[p.chainId].explorer+'/tx/'+d.transactionHash}:{})}))};}
 async function syncAchievements(accountId){
  if(!accountStore||!store.configured||!store.enqueueAchievement)return;
  let account=await accountStore.get('account',accountId);if(!account)return;
  const wins={...account.verifiedSupplementalWins},history=await accountStore.get('fair-owner',accountId);
  for(const match of (history?.matches||[]).filter(m=>m.closed&&['co-tu-lenh','shanshui','shanshui-2v2'].includes(m.gameId)).slice(0,100)){
   const game=match.gameId==='co-tu-lenh'?'co-tu-lenh':'shanshui-xiangqi';if(wins[game])continue;
   const saved=await accountStore.get('fair-match',match.matchId),bundle=saved?.bundle,result=bundle?.closure?.result;
   if(!saved?.owners?.includes(accountId)||!result||result.draw)continue;
   const winners=require('../mobile/arctic-play/src/unlockModel.cjs').winningSeats(result),seats=saved.ownerSeats?.[accountId]||[];
   if(seats.some(s=>winners.includes(s.seat)&&!bundle.events.some(e=>e.kind==='resign'&&e.signed.intent.actor===s.actor)))wins[game]={matchId:match.matchId,at:bundle.closure.closedAt||match.updatedAt};
  }
  if(Object.keys(wins).length>Object.keys(account.verifiedSupplementalWins||{}).length){await accountStore.transact('account',accountId,a=>a?({...a,verifiedSupplementalWins:{...a.verifiedSupplementalWins,...wins}}):null);account={...account,verifiedSupplementalWins:wins};}
  for(const a of require('./antarcticAchievements').earnedAchievements(account))await store.enqueueAchievement(accountId,a);
 }
 async function route(ctx){const {path,method,authenticated,req,body,error,now}=ctx;
  const metadata=/^\/passport\/metadata\/(\d+)\/([1-9]\d{0,30})\.json$/.exec(path);
  if(metadata&&method==='GET'){
   const id=Number(metadata[1]);if(!CHAINS[id]||!store.confirmedToken)throw error('Passport metadata is unavailable.',404);
   const record=await store.confirmedToken(id,metadata[2]);if(!record)throw error('This passport has no confirmed delivery yet.',404);
   const account=accountStore?await accountStore.get('account',record.account_id):null;
   const earned=require('./antarcticAchievements').earnedAchievements(account);
   return {name:'Antarctic Passport #'+metadata[2],description:'A free account-bound Antarctic Kingdoms passport. Metadata updates with service-verified game achievements. '+(CHAINS[id].testnet?'Testnet collectible: no real-world value.':'Game collectible.'),image:'https://articweb3.onrender.com/arctic-play/app/art/passport-book-v2/company-passport-cover.webp',external_url:'https://articweb3.onrender.com/arctic-play/app/',attributes:[{trait_type:'Network',value:CHAINS[id].name},{trait_type:'Arrival',value:new Date(Number(record.created_at)).toISOString()},...earned.map(a=>({trait_type:a.title,value:'Earned'}))],properties:{chainId:id,metadata:'mutable',achievementAuthority:'server-validated match results',personalData:'excluded',updatedAt:Math.max(Number(record.created_at),...Object.values(account?.accessProgress?.wins||{}).map(w=>w.at||0))}};
  }
  const keepsake=/^\/passport\/achievement-metadata\/([0-9a-f]{1,64})\.json$/i.exec(path);
  if(keepsake&&method==='GET'){const n=BigInt('0x'+keepsake[1]);const achievement=require('./antarcticAchievements').ACHIEVEMENTS.find(a=>BigInt(a.tokenId)===n);if(n!==1n&&!achievement)throw error('Unknown achievement.',404);return {name:achievement?.title||'Antarctic Arrival',description:'Free Antarctic Kingdoms achievement keepsake. Initially issued on Robinhood Chain testnet; no real-world value.',image:'https://articweb3.onrender.com/arctic-play/app/art/passport-book-v2/company-passport-cover.webp',attributes:[{trait_type:'Edition',value:'Testnet launch'},{trait_type:'Award',value:achievement?.code||'arrival'}]};}
  const eggMetadata=/^\/passport\/egg-metadata\/(\d+)\/([1-9]\d?)\.json$/.exec(path);
  if(eggMetadata&&method==='GET'){
   const id=Number(eggMetadata[1]),serial=Number(eggMetadata[2]);if(id!==46630||serial<1||serial>33)throw error('Unknown Mystery Golden Egg edition.',404);
   return {name:'Antarctic Mystery Golden Egg #'+String(serial).padStart(2,'0')+' / 33',description:'One of 33 founding mystery eggs from Antarctic Gaming Co. Free Robinhood Chain testnet collectible; contents and future reveal are not financial rewards.',image:'https://arcticdominion.xyz/early/mystery-golden-egg.svg',external_url:'https://arcticdominion.xyz/early/',attributes:[{trait_type:'Founding Edition',value:serial},{trait_type:'Total Editions',value:33},{trait_type:'Mystery Status',value:'Sealed'},{trait_type:'Network',value:'Robinhood Chain testnet'}],properties:{chainId:id,noRealWorldValue:true,personalData:'excluded'}};
  }
  if(path==='/passport/delivery/config'&&method==='GET')return {version:1,...deliveryRuntime.status()};
  if(path==='/passport/acceptance'&&method==='GET'){
   const actor=await authenticated(req,a=>({id:a.id,wallet:a.gameWallet})),p=await store.get(actor.id);
   // Earlier APKs labelled a matching attested Para address as external. Bind
   // evidence to the current server-verified wallet, never that old UI label.
   const linked=!!(p&&actor.wallet?.provider==='para'&&p.wallet.toLowerCase()===actor.wallet.address.toLowerCase()&&p.chainId===actor.wallet.chainId);
   if(!linked)return {confirmed:false,paraWalletVerified:false,status:p?'para_wallet_mismatch':'not_registered'};
   const evidence=await deliveryRuntime.verify(actor.id);
   const confirmed=evidence.confirmed===true&&evidence.chainId===p.chainId&&evidence.wallet?.toLowerCase()===p.wallet.toLowerCase();
   return {...evidence,confirmed,paraWalletVerified:true,passportId:p.id};
  }
  if(path==='/passport/egg/acceptance'&&method==='GET'){
   const actor=await authenticated(req,a=>({id:a.id,wallet:a.gameWallet})),p=await store.get(actor.id);
   const linked=!!(p?.eggSerial&&actor.wallet?.provider==='para'&&p.wallet.toLowerCase()===actor.wallet.address?.toLowerCase()&&p.chainId===actor.wallet.chainId);
   if(!linked)return {confirmed:false,paraWalletVerified:false,status:p?.eggSerial?'para_wallet_mismatch':'not_eligible'};
   const evidence=await deliveryRuntime.verifyEgg(actor.id);
   return {...evidence,confirmed:evidence.confirmed===true&&evidence.wallet?.toLowerCase()===p.wallet.toLowerCase()&&Number(evidence.tokenId)===p.eggSerial,paraWalletVerified:true,edition:p.eggSerial};
  }
  if(path==='/passport/config'&&method==='GET')return {version:1,registration:store.configured,deliveryEnabled:enabled(),chainId,network:CHAINS[chainId].name,visa:'soulbound',arrival:'transferable'};
  if(path==='/passport/achievements/sync'&&method==='POST'){const id=await authenticated(req,a=>a.id);await syncAchievements(id);return {passport:response(await store.get(id))};}
  if(path==='/passport'&&method==='GET'){const identity=await authenticated(req,a=>({accountId:a.id,displayName:a.identity?.displayName||'',provider:a.identity?.provider||'recovery',wallet:a.gameWallet||a.privyWallet||null}));await syncAchievements(identity.accountId);return {identity,passport:response(await store.get(identity.accountId))};}
  if(path==='/passport'&&method==='POST'){
   const b=await body(req);if(b.campaign==='first33-20261114'&&b.adultConfirmed!==true)throw error('Participants must confirm they are at least 18 to receive a testnet Mystery Golden Egg.',403);let name=String(b.playerName||'').normalize('NFKC').replace(/[\u0000-\u001f\u007f<>]/g,'').replace(/\s+/g,' ').trim();if([...name].length<2||[...name].length>24)throw error('Choose a player name with 2–24 characters.');
   const actor=await authenticated(req,a=>({id:a.id,wallet:a.gameWallet||a.privyWallet}));let wallet;try{wallet=getAddress(String(['privy','embedded'].includes(b.walletMode)?actor.wallet?.address:b.wallet||'').trim());if(/^0x0{40}$/i.test(wallet))throw Error();}catch{throw error('Enter a valid EVM wallet address. Check mixed-case addresses carefully.');}
   if(!['antarctic-visa-v1','antarctic-visa-v2'].includes(b.consentVersion)||typeof b.souvenir!=='boolean')throw error('Review your passport and confirm the NFT delivery address.');
   const accountId=await authenticated(req,a=>a.id);
   const paraBound=actor.wallet?.provider==='para'&&actor.wallet.address?.toLowerCase()===wallet.toLowerCase();
   const selectedChain=paraBound?actor.wallet.chainId:chainId;if(!CHAINS[selectedChain])throw error('This wallet network is not supported.');
   const p=await store.register(accountId,{playerName:name,wallet,chainId:selectedChain,souvenir:b.souvenir,consentVersion:b.consentVersion,walletProvider:paraBound?'para':b.walletMode==='embedded'?actor.wallet?.provider:b.walletMode==='privy'?'privy':'external',achievementOptIn:b.consentVersion==='antarctic-visa-v2'&&b.achievementOptIn===true,campaign:paraBound&&b.campaign==='first33-20261114'?'first33-20261114':null},now());await syncAchievements(accountId);return {passport:response(await store.get(accountId)||p)};
  }
 }
 async function walletInventory(accountId){const p=await store.get(accountId);if(!p)return [];const contract=(key)=>process.env[key+'_'+p.chainId]||(p.chainId===chainId?process.env[key]:null);const addresses={visa:contract('AK_VISA_CONTRACT'),arrival:contract('AK_ARRIVAL_CONTRACT'),achievement:contract('AK_ACHIEVEMENT_CONTRACT'),egg:contract('AK_EGG_CONTRACT')};return p.deliveries.filter(d=>d.status==='confirmed'&&d.chainId===p.chainId&&/^\d+$/.test(d.tokenId||'')&&/^0x[0-9a-fA-F]{40}$/.test(addresses[d.kind]||'')&&!/^0x0{40}$/i.test(addresses[d.kind])).map(d=>({title:d.title||(d.kind==='visa'?'Antarctic Passport':d.kind==='egg'?'Mystery Golden Egg':'Arrival collectible'),contract:getAddress(addresses[d.kind]),tokenId:d.tokenId,chainId:d.chainId||p.chainId,network:CHAINS[d.chainId||p.chainId]?.name,standard:['visa','egg'].includes(d.kind)?'ERC721':'ERC1155',transferable:d.kind!=='visa',wallet:p.wallet}));}
 return {route,syncAchievements,walletInventory,close:()=>store.close()};
}
module.exports={createPassportRoutes,CHAINS};
