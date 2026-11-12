// Para attestations are verified on the server. Only PKCE tickets return to Android.
const {randomBytes,createHash,createPublicKey,verify}=require('node:crypto');
const {getAddress,verifyMessage}=require('ethers');
const hash=x=>createHash('sha256').update(String(x)).digest('hex');
const secret=()=>randomBytes(32).toString('base64url');
const valid=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{43}$/.test(x);
const chains=require('./gameWalletChains.json');
const DEFAULT_PUBLIC_KEY='beta_a42ff79ffe66ed951ec89a1678783131';
function createParaGameWallet({enabled=process.env.AK_PARA_ENABLED!=='false',apiKey=process.env.AK_PARA_API_KEY||DEFAULT_PUBLIC_KEY,audience=process.env.AK_PARA_APP_KEY_ID||(apiKey===DEFAULT_PUBLIC_KEY?'5ae54490-27ad-4a09-86b2-51fd84a2a40e':null),environment=process.env.AK_PARA_ENVIRONMENT||'BETA',chainId=Number(process.env.AK_PARA_CHAIN_ID||46630),productionApproved=process.env.AK_PARA_PRODUCTION_APPROVED==='true',fetcher=fetch,websiteReturnUri=process.env.AK_GOOGLE_WEBSITE_RETURN_URI||'https://arcticdominion.xyz/'}={}){
 if(!['BETA','PRODUCTION'].includes(environment)||!chains[chainId])throw Error('Unsupported Para environment.');
 const base=environment==='BETA'?'https://api.beta.getpara.com':'https://api.getpara.com';
 const ready=!!(enabled&&apiKey&&audience&&((environment==='BETA'&&/^beta_/i.test(apiKey))||(environment==='PRODUCTION'&&/^prod_/i.test(apiKey)))&&((environment==='BETA'&&chains[chainId].testnet)||(environment==='PRODUCTION'&&productionApproved)));
 const web=new URL(websiteReturnUri);if(web.protocol!=='https:'||web.username||web.password||web.search||web.hash)throw Error('Invalid website return URI.');
 let keys,keysAt=0;
 function config(){return {enabled:ready,provider:'para',apiKey:ready?apiKey:null,environment,chainId,chain:chains[chainId],loginMethods:'dashboard',walletCreation:'automatic',...(ready?{}:{reason:'Para sign-in needs its server configuration. Your saved games are preserved.'})};}
 async function claimsOf(token,address,ctx){
  try{
   if(typeof token!=='string'||token.length>24000)throw Error();const p=token.split('.');if(p.length!==3||p.some(v=>!v||!/^[\w-]+$/.test(v)))throw Error();
   const h=JSON.parse(Buffer.from(p[0],'base64url')),c=JSON.parse(Buffer.from(p[1],'base64url'));
   if(h.alg!=='RS256'||typeof h.kid!=='string'||h.kid.length>200||c.aud!==audience||!Number.isFinite(c.exp)||c.exp*1000<=ctx.now()||!Number.isFinite(c.iat)||c.iat*1000>ctx.now()+60000||c.exp<=c.iat||typeof c.sub!=='string'||!c.sub||c.sub.length>256)throw Error();
   if(c.nbf!==undefined&&(!Number.isFinite(c.nbf)||c.nbf*1000>ctx.now()+60000))throw Error();
   if(!keys||ctx.now()-keysAt>3600000||!keys.some(k=>k.kid===h.kid)){const r=await fetcher(base+'/.well-known/jwks.json',{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();const j=await r.json();if(!Array.isArray(j.keys)||j.keys.length>50)throw Error();keys=j.keys;keysAt=ctx.now();}
   const k=keys.find(k=>k.kid===h.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
   if(!k||!verify('RSA-SHA256',Buffer.from(p[0]+'.'+p[1]),createPublicKey({key:k,format:'jwk'}),Buffer.from(p[2],'base64url')))throw Error();
   const d=c.data;if(!d||d.userId!==c.sub||!['email','phone','farcaster','telegram','externalWallet'].includes(d.authType)||d.isGuestMode===true||!Array.isArray(d.wallets))throw Error();
   // connectedWallets alone is insufficient: a managed game wallet must be attested in wallets.
   const normalized=getAddress(address);if(/^0x0{40}$/i.test(normalized))throw Error();
   const matches=d.wallets.filter(w=>w?.type==='EVM'&&typeof w.id==='string'&&typeof w.address==='string'&&w.address.toLowerCase()===normalized.toLowerCase());
   if(matches.length!==1)throw Error();
   const email=typeof d.email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)&&d.email.length<=254?d.email.trim().toLowerCase():null;
   return {key:environment+':'+audience+':'+c.sub,email,name:'Explorer',address:normalized,walletId:matches[0].id};
  }catch{throw ctx.error('Your sign-in or wallet could not be verified. Please sign in again.',401);}
 }
 const message=(attempt,expires)=>'Antarctic Kingdoms\nConnect my Para game wallet\nOrigin: https://articweb3.onrender.com\nRequest: '+attempt+'\nExpires: '+expires;
 async function route(ctx){const {path,method,body,store,now,error,authenticated,req}=ctx;
  if(path==='/auth/para/config'&&method==='GET')return {...config(),enabled:ready&&store.configured};
  if(path==='/auth/para/start'&&method==='POST'){
   if(!ready||!store.configured)throw error(config().reason||'Para sign-in is awaiting activation.',503);
   const b=await body(req);if(!valid(b.challenge))throw error('Start sign-in again.');
   const purpose=['manage','link'].includes(b.purpose)?b.purpose:'login';
   const actor=purpose!=='login'?await authenticated(req,(a,c)=>({accountId:a.id,sessionHash:hash(c.key)})):{};
   const allowedWebOrigin=['https://arcticdominion.xyz','https://www.arcticdominion.xyz'].includes(req.headers.origin)?req.headers.origin:null;
   const browserReturn=allowedWebOrigin&&b.returnPath==='/play/'?allowedWebOrigin+'/play/':req.headers.origin==='https://articweb3.onrender.com'&&b.returnPath==='/arctic-play/passport-check/'?'https://articweb3.onrender.com/arctic-play/passport-check/':null;
   const attempt=secret(),expires=now()+600000;await store.transact('para-wallet-attempt',hash(attempt),()=>({challenge:b.challenge,platform:['android','website'].includes(b.platform)?b.platform:'web',browserReturn,purpose,...actor,expires}));
   return {url:'https://articweb3.onrender.com/arctic-play/wallet/?attempt='+attempt+'&provider=para'};
  }
  if(path==='/auth/para/attempt'&&method==='POST'){
   const b=await body(req);if(!ready||!valid(b.attempt))throw error('Open sign-in from the app again.',401);const a=await store.get('para-wallet-attempt',hash(b.attempt));if(!a||a.used||a.expires<=now())throw error('This sign-in expired. Start again in the app.',401);
   return {...config(),purpose:a.purpose,message:message(b.attempt,a.expires)};
  }
  if(path==='/auth/para/complete'&&method==='POST'){
   if(!ready)throw error('Para sign-in is not configured.',503);const b=await body(req);if(!valid(b.attempt))throw error('Start sign-in again.',401);
   const a=await store.get('para-wallet-attempt',hash(b.attempt));if(!a||a.used||a.expires<=now())throw error('This sign-in expired. Start again in the app.',401);
   const v=await claimsOf(b.idToken,b.address,ctx);
   try{if(verifyMessage(message(b.attempt,a.expires),b.signature)!==v.address)throw Error();}catch{throw error('The wallet signature did not match this sign-in.',401);}
   if(a.accountId){const account=await store.get('account',a.accountId);if(!account||account.temporaryExpiresAt&&account.temporaryExpiresAt<=now()||!account.sessions?.some(s=>s.hash===a.sessionHash&&s.expires>now()))throw error('Sign in to your game account again before linking.',401);
    if(a.purpose==='manage'&&(!account.gameWallet||account.gameWallet.provider!=='para'||account.gameWallet.identity!==v.key||account.gameWallet.address.toLowerCase()!==v.address.toLowerCase()))throw error('Use the sign-in linked to this game wallet.',409);
    if(a.purpose==='link'&&account.gameWallet&&(account.gameWallet.provider!=='para'||account.gameWallet.identity!==v.key||account.gameWallet.address.toLowerCase()!==v.address.toLowerCase()))throw error('This account already has a different wallet. Existing assets have not been moved.',409);
   }
   await store.transact('para-wallet-attempt',hash(b.attempt),old=>{if(!old||old.used||old.expires<=now())throw error('This sign-in was already completed.',401);return {...old,used:true};});
   const wallet={provider:'para',address:v.address,identity:v.key,walletId:v.walletId,network:environment,chainId};
   if(a.purpose==='manage')return {managed:true,wallet,collectibles:ctx.walletInventory?await ctx.walletInventory(a.accountId):[]};
   const ticket=secret();await store.transact('auth-ticket',hash(ticket),()=>({provider:'para-wallet',key:v.key,email:v.email,displayName:v.name,wallet,challenge:a.challenge,...(a.accountId?{accountId:a.accountId,linkSessionHash:a.sessionHash}:{}),expires:now()+120000}));
   return {returnTo:a.platform==='android'?'arcticplay://auth?ticket='+ticket:a.platform==='website'?web.href+'?auth_ticket='+ticket:(a.browserReturn||'/arctic-play/app/')+'?auth_ticket='+ticket};
  }
 }
 return {route,config,claimsOf};
}
module.exports={createParaGameWallet};
