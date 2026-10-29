// Verified Google OIDC and email codes. Provider credentials remain on the server.
const {randomBytes,randomUUID,randomInt,createHash,createPublicKey,verify,timingSafeEqual}=require('node:crypto');
const digest=x=>createHash('sha256').update(String(x)).digest('hex'),random=()=>randomBytes(32).toString('base64url');
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const emailOf=v=>String(v||'').trim().toLowerCase();
const validEmail=e=>e.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
function createCompanyAuth({googleClientId=process.env.AK_GOOGLE_CLIENT_ID,googleClientSecret=process.env.AK_GOOGLE_CLIENT_SECRET,websiteReturnUri=process.env.AK_GOOGLE_WEBSITE_RETURN_URI||'https://arcticdominion.xyz/',redirectUri=process.env.AK_GOOGLE_REDIRECT_URI||'https://articweb3.onrender.com/arctic-play/v3/auth/google/callback',mailKey=process.env.AK_MAIL_API_KEY,mailFrom=process.env.AK_MAIL_FROM,fetcher=fetch,sendCode}={}){
 const attempts=new Map();
 const websiteReturn=new URL(websiteReturnUri);if(websiteReturn.protocol!=='https:'||websiteReturn.username||websiteReturn.password||websiteReturn.hash||websiteReturn.search)throw Error('Google website return URI must be an HTTPS page without query or fragment.');
 const google=!!(googleClientId&&googleClientSecret),email=!!(sendCode||(mailKey&&mailFrom));let jwks,keysAt=0;
 async function googleClaims(token,nonce,now,error){
  try{
   const parts=String(token).split('.');if(parts.length!==3||parts.some(p=>!/^[A-Za-z0-9_-]+$/.test(p)))throw Error();const h=JSON.parse(Buffer.from(parts[0],'base64url')),c=JSON.parse(Buffer.from(parts[1],'base64url'));
   if(h.alg!=='RS256'||typeof h.kid!=='string')throw Error();
   if(!jwks||now()-keysAt>3600000||!jwks.keys.some(k=>k.kid===h.kid)){const r=await fetcher('https://www.googleapis.com/oauth2/v3/certs',{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();jwks=await r.json();keysAt=now();}
   const k=jwks.keys.find(k=>k.kid===h.kid&&k.kty==='RSA');if(!k||!verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),createPublicKey({key:k,format:'jwk'}),Buffer.from(parts[2],'base64url')))throw Error();
   const aud=Array.isArray(c.aud)?c.aud:[c.aud];if(!aud.includes(googleClientId)||(aud.length>1&&c.azp!==googleClientId)||(c.azp&&c.azp!==googleClientId)||!['accounts.google.com','https://accounts.google.com'].includes(c.iss)||!Number.isFinite(c.exp)||c.exp*1000<=now()||!Number.isFinite(c.iat)||c.iat*1000>now()+60000||c.nonce!==nonce||typeof c.sub!=='string'||!c.sub||c.email_verified!==true||!validEmail(emailOf(c.email)))throw Error();
   return c;
  }catch{throw error('Google sign-in could not be verified. Please start again.',401);}
 }
 async function identityAccount(provider,key,verifiedEmail,ctx){
  const {store,now}=ctx;let accountId,isNew=false;
  await store.transact('auth-identity',digest(provider+':'+key),v=>{accountId=v?.accountId||randomUUID();isNew=!v;return v||{accountId,provider,createdAt:now()};});
  await store.transact('account',accountId,a=>a||{id:accountId,email:verifiedEmail,recoveryHash:null,sessions:[],progress:{},revision:0,createdAt:now(),metrics:[],entitlements:{},marketing:{enabled:false},marketingChoiceSet:false});
  if(provider==='google')await store.transact('auth-identity',digest('email:'+verifiedEmail),v=>v||{accountId,provider:'email',createdAt:now()});
  return {accountId,isNew};
 }
 async function signIn(provider,key,verifiedEmail,ctx,displayName,wallet){const found=await identityAccount(provider,key,verifiedEmail,ctx);let out;await ctx.store.transact('account',found.accountId,a=>{if(provider==='privy'&&wallet){if(a.privyWallet&&a.privyWallet.userId!==wallet.userId)throw ctx.error('Use your existing game wallet.',409);a.privyWallet=wallet;}if(provider==='google')a.identity={provider:'google',displayName:typeof displayName==='string'?displayName.replace(/[\u0000-\u001f\u007f<>]/g,'').trim().slice(0,100):''};else if(!a.identity)a.identity={provider,displayName:''};out={accountId:a.id,session:ctx.session(a),email:a.email,displayName:a.identity.displayName,provider:a.identity.provider,...(a.privyWallet?{wallet:a.privyWallet}:{}),marketingChoiceNeeded:!!a.email&&!a.marketingChoiceSet,isNew:found.isNew};return a;});return out;}
 async function route(ctx){const {req,path,method,body,store,error,now,authenticated}=ctx;
  if(method==='POST'&&['/auth/email/start','/auth/google/start'].includes(path)){const ip=req.socket?.remoteAddress||'unknown',key=ip+':'+path,old=attempts.get(key),limit=path.includes('email')?6:20;if(old&&now()-old.at<600000){if(++old.n>limit)throw error('Too many sign-in requests. Please try again later.',429);}else attempts.set(key,{at:now(),n:1});if(attempts.size>10000)for(const [k,v]of attempts)if(now()-v.at>=600000)attempts.delete(k);}
  if(path==='/auth/providers'&&method==='GET')return {google:google&&store.configured,email:email&&store.configured,recovery:true};
  if(path==='/auth/google/start'&&method==='POST'){
   if(!google||!store.configured)throw error('Google sign-in is awaiting service setup.',503);
   const b=await body(req);if(!/^[A-Za-z0-9_-]{43}$/.test(b.challenge||''))throw error('Start sign-in again.');
   const state=random(),nonce=random(),verifier=random();await store.transact('oauth-attempt',digest(state),()=>({nonce,verifier,challenge:b.challenge,platform:b.platform==='android'?'android':b.platform==='website'?'website':'web',expires:now()+600000}));
   const u=new URL('https://accounts.google.com/o/oauth2/v2/auth');u.search=new URLSearchParams({client_id:googleClientId,redirect_uri:redirectUri,response_type:'code',scope:'openid email profile',state,nonce,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',prompt:'select_account'});return {url:u.href};
  }
  if(path==='/auth/google/callback'&&method==='GET'){
   const state=ctx.url.searchParams.get('state'),code=ctx.url.searchParams.get('code');if(!/^[A-Za-z0-9_-]{43}$/.test(state||'')||!code||code.length>3000)throw error('Google sign-in was cancelled or expired.',401);
   let attempt;await store.transact('oauth-attempt',digest(state),v=>{if(!v||v.expires<=now()||v.used)throw error('Start Google sign-in again.',401);attempt={...v};return {...v,used:true};});
   const r=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:googleClientId,client_secret:googleClientSecret,redirect_uri:redirectUri,grant_type:'authorization_code',code_verifier:attempt.verifier}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw error('Google sign-in failed. Please try again.',401);const tokens=await r.json(),claims=await googleClaims(tokens.id_token,attempt.nonce,now,error),ticket=random();
   await store.transact('auth-ticket',digest(ticket),()=>({provider:'google',key:claims.sub,email:emailOf(claims.email),displayName:claims.name,challenge:attempt.challenge,expires:now()+120000}));
   return {redirect:attempt.platform==='android'?'arcticplay://auth?ticket='+ticket:attempt.platform==='website'?websiteReturn.href+'?auth_ticket='+ticket:'/arctic-play/app/?auth_ticket='+ticket};
  }
  if(path==='/auth/exchange'&&method==='POST'){
   const b=await body(req);if(!/^[A-Za-z0-9_-]{43}$/.test(b.ticket||'')||!/^[A-Za-z0-9_-]{43}$/.test(b.verifier||''))throw error('Start sign-in again.',401);let ticket;
   await store.transact('auth-ticket',digest(b.ticket),v=>{if(!v||v.expires<=now()||!same(v.challenge,createHash('sha256').update(b.verifier).digest('base64url')))throw error('This sign-in belongs to another app session.',401);ticket=v;return null;});return signIn(ticket.provider,ticket.key,ticket.email,ctx,ticket.displayName,ticket.wallet);
  }
  if(path==='/auth/email/start'&&method==='POST'){
   if(!email||!store.configured)throw error('Email sign-in is awaiting service setup.',503);const b=await body(req),address=emailOf(b.email);if(!validEmail(address))throw error('Enter a valid email address.');
   const id=random(),code=String(randomInt(0,1000000)).padStart(6,'0'),salt=random();let previous;
   await store.transact('email-rate',digest(address),v=>{if(v&&now()-v.at<60000)throw error('Wait a minute before requesting another code.',429);previous=v;return {at:now()};});
   await store.transact('email-attempt',digest(id),()=>({email:address,hash:digest(salt+code),salt,expires:now()+600000,attempts:0}));
   try{if(sendCode)await sendCode(address,code);else{const r=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+mailKey,'Content-Type':'application/json','Idempotency-Key':'ak-login-'+id},body:JSON.stringify({from:mailFrom,to:[address],subject:'Your Antarctic Gaming Co. sign-in code',text:'Your sign-in code is '+code+'. It expires in 10 minutes. Do not share it. If you did not request this code, ignore this email.'}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();}}catch{await store.transact('email-attempt',digest(id),()=>null);throw error('The sign-in email could not be sent. Please try again.',503);}
   return {attempt:id,expiresIn:600};
  }
  if(path==='/auth/email/verify'&&method==='POST'){
   const b=await body(req);if(!/^[A-Za-z0-9_-]{43}$/.test(b.attempt||'')||!/^\d{6}$/.test(b.code||''))throw error('Enter the six-digit code.');let address,valid=false;
   await store.transact('email-attempt',digest(b.attempt),v=>{if(!v||v.expires<=now()||v.attempts>=5)return null;v.attempts++;if(same(v.hash,digest(v.salt+b.code))){valid=true;address=v.email;return null;}return v;});if(!valid)throw error('That code is incorrect or expired. Request a new one.',401);return signIn('email',address,address,ctx);
  }
  if(path==='/communication-preferences'&&method==='GET')return authenticated(req,a=>({email:a.email||null,enabled:!!a.marketing?.enabled,choiceSet:!!a.marketingChoiceSet}));
  if(path==='/communication-preferences'&&method==='POST'){const b=await body(req);return authenticated(req,a=>{if(b.enabled===true&&!a.email)throw error('Add a verified email before receiving celebration emails.');a.marketing={enabled:b.enabled===true,at:now(),version:'celebration-email-v1',source:'account-choice'};a.marketingChoiceSet=true;return {enabled:a.marketing.enabled};});}
 }
 return {route,providers:{google,email}};
}
module.exports={createCompanyAuth};
