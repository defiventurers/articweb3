// Privy runs in the system browser. Only a verifier-bound, one-use ticket
// returns to the APK; no Privy access token or wallet key enters a URL.
const {randomBytes,createHash}=require('node:crypto');
const {getAddress}=require('ethers');
const hash=v=>createHash('sha256').update(String(v)).digest('hex');
const secret=()=>randomBytes(32).toString('base64url');
function createPrivyPassportAuth({appId=process.env.AK_PRIVY_APP_ID,appSecret=process.env.AK_PRIVY_APP_SECRET,portalUrl=process.env.AK_PRIVY_PORTAL_URL||'https://articweb3.onrender.com/arctic-play/wallet/',websiteReturnUri=process.env.AK_GOOGLE_WEBSITE_RETURN_URI||'https://arcticdominion.xyz/',client}={}){
 const configured=!!(appId&&appSecret),portal=new URL(portalUrl),web=new URL(websiteReturnUri);
 if(portal.protocol!=='https:'||portal.username||portal.password||portal.search||portal.hash||!['articweb3.onrender.com','arcticdominion.xyz'].includes(portal.hostname)||portal.pathname!=='/arctic-play/wallet/')throw Error('Use the approved HTTPS Privy wallet portal path.');
 if(web.protocol!=='https:'||web.username||web.password||web.search||web.hash)throw Error('Invalid website return URL.');
 let sdk=client;
 const api=()=>sdk||(sdk=new(require('@privy-io/node').PrivyClient)({appId,appSecret,timeout:12000,maxRetries:0}));
 async function verifiedWallet(token,error,now){
  if(typeof token!=='string'||token.length>15000)throw error('Sign in to your game wallet again.',401);
  let claims,user;try{claims=await api().utils().auth().verifyAccessToken(token);user=await api().users()._get(claims.user_id);}catch{throw error('Privy sign-in could not be verified. Please try again.',401);}
  if(user.id!==claims.user_id)throw error('Wallet identity did not match the sign-in.',401);
  const wallets=(user.linked_accounts||[]).filter(w=>w.type==='wallet'&&w.chain_type==='ethereum'&&w.wallet_client_type==='privy'&&w.connector_type==='embedded'&&w.user_can_sign!==false);
  const wallet=wallets.sort((a,b)=>(a.wallet_index||0)-(b.wallet_index||0))[0];if(!wallet)throw error('Your game wallet is still being created. Please retry.',409);
  let address;try{address=getAddress(wallet.address);if(/^0x0{40}$/i.test(address))throw Error();}catch{throw error('Privy returned an invalid receive address.',502);}
  const email=(user.linked_accounts||[]).find(a=>a.type==='email'&&typeof a.address==='string'&&Number(a.latest_verified_at||a.first_verified_at)>0&&Number(a.latest_verified_at||a.first_verified_at)*1000<=now()+60000);
  return {key:user.id,email:email?.address.toLowerCase()||null,wallet:{provider:'privy',userId:user.id,id:wallet.id||null,address}};
 }
 async function route(ctx){const {path,method,body,req,store,authenticated,error,now,url}=ctx;
  if(path==='/auth/privy/config'&&method==='GET')return {enabled:configured&&store.configured,appId:configured?appId:null,portalUrl:portal.href,loginMethods:['email'],network:'Abstract',walletCreation:'users-without-wallets'};
  if(path==='/auth/privy/start'&&method==='POST'){
   if(!configured||!store.configured)throw error('Game wallet setup is not active yet. Existing recovery access still works.',503);
   const b=await body(req);if(!/^[A-Za-z0-9_-]{43}$/.test(b.challenge||''))throw error('Start sign-in again.');
   const accountId=req.headers.authorization?await authenticated(req,a=>a.id):null,purpose=b.purpose==='manage'?'manage':'login';if(purpose==='manage'&&!accountId)throw error('Sign in before opening your game wallet.',401);
   const attempt=secret();await store.transact('privy-attempt',hash(attempt),()=>({challenge:b.challenge,platform:['android','website'].includes(b.platform)?b.platform:'web',accountId,purpose,expires:now()+600000}));
   return {url:portal.href+'?attempt='+attempt};
  }
  if(path==='/auth/privy/attempt'&&method==='GET'){
   const id=url.searchParams.get('attempt');if(!/^[A-Za-z0-9_-]{43}$/.test(id||''))throw error('Open the wallet from the app again.',401);const a=await store.get('privy-attempt',hash(id));if(!a||a.used||a.expires<=now())throw error('This wallet invitation expired. Open it from the app again.',401);return {purpose:a.purpose};
  }
  if(path==='/auth/privy/complete'&&method==='POST'){
   if(!configured)throw error('Game wallet setup is not active yet.',503);const b=await body(req);if(!/^[A-Za-z0-9_-]{43}$/.test(b.attempt||''))throw error('Start sign-in from the app again.',401);
   const verified=await verifiedWallet(b.accessToken,error,now);let result;
   const a=await store.get('privy-attempt',hash(b.attempt));
   if(!a||a.used||a.expires<=now())throw error('This wallet invitation expired. Start again from the app.',401);
   const account=a.accountId?await store.get('account',a.accountId):null;
   if(a.accountId&&!account)throw error('Your account is no longer available.',401);
   if(account?.privyWallet&&account.privyWallet.userId!==verified.key)throw error('Use the email linked to your existing game wallet.',409);
   if(a.purpose==='manage'&&account?.privyWallet?.userId!==verified.key)throw error('Use the email linked to this game wallet.',409);
   // Consume atomically, then write other documents outside this transaction.
   // This also works with the isolated file-store test adapter.
   await store.transact('privy-attempt',hash(b.attempt),v=>{if(!v||v.used||v.expires<=now())throw error('Start again from the app.',401);return {...v,used:true};});
   if(a.purpose==='manage')return {managed:true,wallet:verified.wallet};
   await store.transact('auth-identity',hash('privy:'+verified.key),mapping=>{if(mapping&&a.accountId&&mapping.accountId!==a.accountId)throw error('This wallet is linked to another game account. Sign in to that account instead.',409);return mapping||(a.accountId?{accountId:a.accountId,provider:'privy',createdAt:now()}:null);});
   const ticket=secret();await store.transact('auth-ticket',hash(ticket),()=>({provider:'privy',key:verified.key,email:verified.email,wallet:verified.wallet,challenge:a.challenge,expires:now()+120000}));
   return {returnTo:a.platform==='android'?'arcticplay://auth?ticket='+ticket:a.platform==='website'?web.href+'?auth_ticket='+ticket:'/arctic-play/app/?auth_ticket='+ticket};
  }
 }
 return {route,enabled:configured,verifiedWallet};
}
module.exports={createPrivyPassportAuth};
