const {randomBytes,createHash}=require('node:crypto');
const {createArcticPlayWorkerPool}=require('./arcticPlayWorkerPool');
const engine=require('./arcticPlayEngine.cjs');
function createChallengeRoutes(){const workers=createArcticPlayWorkerPool();
 async function validate(proof,error){try{return await workers.run({proof});}catch(e){throw error(e.message,/busy|too long|restarting/.test(e.message)?503:400);}}

 async function route({req,path,method,body,authenticated,store,error,now}){
  if(path==='/challenges'&&method==='POST'){await authenticated(req,()=>({ok:true}));const b=await body(req);const proof=await validate(b,error);if(!proof.complete)throw error('Finish this discovery on the board before sharing it.');const id=randomBytes(18).toString('base64url'),digest=createHash('sha256').update(JSON.stringify({request:proof.request,actionIds:proof.actionIds,version:engine.VERSION})).digest('hex');const challenge={id,request:proof.request,title:proof.title,version:engine.VERSION,digest,createdAt:now()};await authenticated(req,a=>{a.challenges=(a.challenges||[]).slice(-59);a.challenges.push({id,title:proof.title,createdAt:now()});return{};});await store.transact('challenge',id,()=>challenge);return{...challenge,url:'https://articweb3.onrender.com/arctic-play/challenge/'+id};}
  const m=/^\/challenges\/([A-Za-z0-9_-]{24})(\/solve)?$/.exec(path);if(!m)return;
  const challenge=await store.get('challenge',m[1]);if(!challenge)throw error('This challenge could not be found.',404);if(challenge.version!==engine.VERSION)throw error('This challenge uses another rules version. Ask your friend for a new one.',409);
  if(!m[2]&&method==='GET')return challenge;
  if(m[2]&&method==='POST'){const b=await body(req),proof=await validate({request:challenge.request,actionIds:b.actionIds},error);if(!proof.complete)throw error('Try another legal move to complete the discovery.');return{complete:true,title:challenge.title,caption:proof.caption};}
 }
 return{route,close:()=>workers.close()};
}
module.exports={createChallengeRoutes};
