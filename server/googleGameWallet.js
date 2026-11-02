// Google-only embedded wallets. No private key, provider token or game session
// is placed in the browser-return URL. The existing app PKCE exchange is reused.
const {randomBytes,createHash,createPublicKey,verify}=require('node:crypto');
const {getAddress,computeAddress,verifyMessage}=require('ethers');
const hash=x=>createHash('sha256').update(String(x)).digest('hex');
const secret=()=>randomBytes(32).toString('base64url');
const valid=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{43}$/.test(x);
function createGoogleGameWallet({enabled=process.env.AK_WALLET_ENABLED==='true',clientId=process.env.AK_WALLET_CLIENT_ID,connectionId=process.env.AK_WALLET_GOOGLE_CONNECTION_ID,network=process.env.AK_WALLET_NETWORK||'sapphire_devnet',chainId=Number(process.env.AK_VISA_CHAIN_ID||11124),productionApproved=process.env.AK_WALLET_PRODUCTION_APPROVED==='true',fetcher=fetch,websiteReturnUri=process.env.AK_GOOGLE_WEBSITE_RETURN_URI||'https://arcticdominion.xyz/'}={}){
 if(!['sapphire_devnet','sapphire_mainnet'].includes(network)||![11124,2741].includes(chainId))throw Error('Unsupported embedded wallet environment.');
 const ready=!!(enabled&&clientId&&connectionId&&((network==='sapphire_devnet'&&chainId===11124)||(network==='sapphire_mainnet'&&chainId===2741&&productionApproved)));
 const web=new URL(websiteReturnUri);if(web.protocol!=='https:'||web.username||web.password||web.search||web.hash)throw Error('Invalid website return URI.');
 let keys,keysAt=0;
 function config(){return {enabled:ready,provider:'metamask-embedded',clientId:ready?clientId:null,connectionId:ready?connectionId:null,network,chainId,loginMethods:['google'],walletCreation:'automatic'};}
 async function claimsOf(token,ctx){
  const {error,now}=ctx;
  try{
   if(typeof token!=='string'||token.length>18000)throw Error();const p=token.split('.');if(p.length!==3||p.some(v=>!v||!/^[\w-]+$/.test(v)))throw Error();
   const h=JSON.parse(Buffer.from(p[0],'base64url')),c=JSON.parse(Buffer.from(p[1],'base64url'));
   if(h.alg!=='ES256'||!h.kid||c.iss!=='https://api-auth.web3auth.io'||c.aud!==clientId||!Number.isFinite(c.exp)||c.exp*1000<=now()||!Number.isFinite(c.iat)||c.iat*1000>now()+60000||typeof c.userId!=='string'||!c.userId||c.userId.length>256)throw Error();
   // Pin a dedicated Google connection; never accept tokens from another project,
   // external wallet connector or an arbitrary multi-provider group.
   if((c.authConnectionId||c.groupedAuthConnectionId)!==connectionId||!['google','web3auth'].includes(c.authConnection))throw Error();
   if(!keys||now()-keysAt>3600000||!keys.some(k=>k.kid===h.kid)){const r=await fetcher('https://api-auth.web3auth.io/jwks',{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();const j=await r.json();keys=j.keys;keysAt=now();}
   const k=keys.find(k=>k.kid===h.kid&&k.kty==='EC'&&k.crv==='P-256');if(!k||!verify('sha256',Buffer.from(p[0]+'.'+p[1]),{key:createPublicKey({key:k,format:'jwk'}),dsaEncoding:'ieee-p1363'},Buffer.from(p[2],'base64url')))throw Error();
   const wallets=(c.wallets||[]).filter(w=>w.type==='web3auth_app_key'&&w.curve==='secp256k1');
   const addresses=wallets.map(w=>computeAddress('0x'+String(w.public_key).replace(/^0x/,'')));
   if(addresses.length!==1)throw Error();
   const email=typeof c.email==='string'?c.email.trim().toLowerCase():'';
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw Error();
   return {key:connectionId+':'+c.userId,email,name:String(c.name||'Explorer'),address:getAddress(addresses[0])};
  }catch{throw error('Google wallet identity could not be verified. Start sign-in again.',401);}
 }
 const message=(attempt,expires)=>'Antarctic Kingdoms\nLink my Google game wallet\nOrigin: https://articweb3.onrender.com\nRequest: '+attempt+'\nExpires: '+expires;
 async function route(ctx){const {path,method,body,store,now,error,authenticated,req}=ctx;
  if(path==='/auth/wallet/config'&&method==='GET')return {...config(),enabled:ready&&store.configured};
  if(path==='/auth/wallet/start'&&method==='POST'){
   if(!ready||!store.configured)throw error('Google wallet setup is awaiting activation. Your saved games are preserved.',503);
   const b=await body(req);if(!valid(b.challenge))throw error('Start sign-in again.');
   const purpose=b.purpose==='manage'?'manage':'login';const accountId=purpose==='manage'?await authenticated(req,a=>a.id):null;
   const attempt=secret(),expires=now()+600000;await store.transact('google-wallet-attempt',hash(attempt),()=>({challenge:b.challenge,platform:['android','website'].includes(b.platform)?b.platform:'web',purpose,accountId,expires}));
   return {url:'https://articweb3.onrender.com/arctic-play/wallet/?attempt='+attempt};
  }
  if(path==='/auth/wallet/attempt'&&method==='POST'){
   const b=await body(req);if(!ready||!valid(b.attempt))throw error('Open Google sign-in from the app again.',401);const a=await store.get('google-wallet-attempt',hash(b.attempt));if(!a||a.used||a.expires<=now())throw error('This sign-in expired. Start again in the app.',401);
   return {...config(),purpose:a.purpose,message:message(b.attempt,a.expires)};
  }
  if(path==='/auth/wallet/complete'&&method==='POST'){
   if(!ready)throw error('Google wallet setup is not active.',503);const b=await body(req);if(!valid(b.attempt))throw error('Start sign-in again.',401);
   const a=await store.get('google-wallet-attempt',hash(b.attempt));if(!a||a.used||a.expires<=now())throw error('This sign-in expired. Start again in the app.',401);
   const v=await claimsOf(b.idToken,ctx);let address;try{address=getAddress(b.address);if(address!==v.address||verifyMessage(message(b.attempt,a.expires),b.signature)!==address)throw Error();}catch{throw error('The wallet did not match your Google sign-in.',401);}
   if(a.accountId){const account=await store.get('account',a.accountId);if(!account?.gameWallet||account.gameWallet.address.toLowerCase()!==address.toLowerCase())throw error('Use the Google account linked to this wallet.',409);}
   await store.transact('google-wallet-attempt',hash(b.attempt),old=>{if(!old||old.used||old.expires<=now())throw error('This sign-in was already completed.',401);return {...old,used:true};});
   const wallet={provider:'metamask-embedded',address,identity:v.key,network,chainId};
   if(a.purpose==='manage')return {managed:true,wallet,collectibles:ctx.walletInventory?await ctx.walletInventory(a.accountId):[]};
   const ticket=secret();await store.transact('auth-ticket',hash(ticket),()=>({provider:'google-wallet',key:v.key,email:v.email,displayName:v.name,wallet,challenge:a.challenge,expires:now()+120000}));
   return {returnTo:a.platform==='android'?'arcticplay://auth?ticket='+ticket:a.platform==='website'?web.href+'?auth_ticket='+ticket:'/arctic-play/app/?auth_ticket='+ticket};
  }
 }
 return {route,config,claimsOf};
}
module.exports={createGoogleGameWallet};
