// Game-record signatures grant no authority over wallet funds.
export const PROTOCOL = 'ak-fair-play-v1';
export const utf8 = value => new TextEncoder().encode(value);
export const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
export function unhex(value) {
  if (typeof value !== 'string' || !/^(?:[a-f0-9]{2})+$/i.test(value)) throw Error('Invalid hexadecimal data.');
  return Uint8Array.from(value.match(/../g), byte => parseInt(byte, 16));
}
export function canonical(value) {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw Error('A proof contains an invalid number.');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).filter(k => value[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  throw Error('Unsupported proof data.');
}
export const copy = value => JSON.parse(canonical(value));
export async function sha256(value) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', typeof value === 'string' ? utf8(value) : value))); }
export const hashObject = value => sha256(canonical(value));
export function position(value) {
  if (Array.isArray(value)) return value.map(position);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).filter(k => k !== 'updatedAt').map(k => [k, position(value[k])]));
  return value;
}
export const stateHash = state => hashObject(position(state));
export function b64(bytes) { return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
export function unb64(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value) || value.length > 10000) throw Error('Invalid signature encoding.');
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}
export function publicKey(jwk) {
  if (jwk?.kty !== 'EC' || jwk.crv !== 'P-256' || !/^[-\w]{43}$/.test(jwk.x || '') || !/^[-\w]{43}$/.test(jwk.y || '')) throw Error('Invalid game proof key.');
  return {kty:'EC', crv:'P-256', x:jwk.x, y:jwk.y, ext:true};
}
export async function generateKey() {
  const key = await crypto.subtle.generateKey({name:'ECDSA', namedCurve:'P-256'}, true, ['sign', 'verify']);
  return {privateKey:await crypto.subtle.exportKey('jwk', key.privateKey), publicKey:publicKey(await crypto.subtle.exportKey('jwk', key.publicKey))};
}
export async function sign(jwk, body) {
  const key = await crypto.subtle.importKey('jwk', jwk, {name:'ECDSA', namedCurve:'P-256'}, false, ['sign']);
  return b64(new Uint8Array(await crypto.subtle.sign({name:'ECDSA', hash:'SHA-256'}, key, utf8(canonical(body)))));
}
export async function verify(jwk, body, signature) {
  try {
    const key = await crypto.subtle.importKey('jwk', publicKey(jwk), {name:'ECDSA', namedCurve:'P-256'}, false, ['verify']);
    const bytes = unb64(signature);
    return bytes.length === 64 && await crypto.subtle.verify({name:'ECDSA', hash:'SHA-256'}, key, bytes, utf8(canonical(body)));
  } catch { return false; }
}
export const keyId = key => hashObject(publicKey(key));
export const headerMessage = hash => ({protocol:PROTOCOL, kind:'match-header', hash});
export const receiptMessage = (matchId, hash) => ({protocol:PROTOCOL, kind:'move-receipt', matchId, hash});
export async function makeHeader(header, key) {
  const headerHash = await hashObject(header);
  return {header:copy(header), headerHash, headerSignature:await sign(key, headerMessage(headerHash)), events:[], checkpoint:null, closure:null};
}
export async function makeIntent({bundle, actor, actionId, before, kind='action', beaconRound=null, nonce}, key) {
  const count = bundle.events?.length ?? bundle.eventCount;
  const previousHash = bundle.events?.at(-1)?.hash || bundle.tip || bundle.headerHash;
  const intent = {protocol:PROTOCOL, matchId:bundle.header?.matchId || bundle.matchId, seq:count+1, previousHash, actor, kind, actionId, beforeHash:await stateHash(before), beaconRound, nonce:nonce || b64(crypto.getRandomValues(new Uint8Array(16)))};
  return {intent, signature:await sign(key, intent)};
}
export async function checkIntent(bundle, signed, before) {
  const intent = signed?.intent, header = bundle.header;
  const actor = header.actors.find(a => a.id === intent?.actor);
  if (!actor || intent.protocol !== PROTOCOL || intent.matchId !== header.matchId || intent.seq !== bundle.events.length+1 || intent.previousHash !== (bundle.events.at(-1)?.hash || bundle.headerHash) || intent.beforeHash !== await stateHash(before) || !/^[-\w]{22}$/.test(intent.nonce || '')) throw Error('This action does not match the recorded turn.');
  if (!await verify(actor.publicKey, intent, signed.signature)) throw Error('The player signature could not be verified.');
  return actor;
}
export async function appendEvent(bundle, {signed, after, rng=null, acceptedAt=Date.now()}, key) {
  const body = {protocol:PROTOCOL, matchId:bundle.header.matchId, seq:bundle.events.length+1, previousHash:bundle.events.at(-1)?.hash || bundle.headerHash, kind:signed.intent.kind, signed:copy(signed), afterHash:await stateHash(after), rng:rng ? copy(rng) : null, acceptedAt};
  const hash = await hashObject(body);
  const event = {...body, hash, receipt:await sign(key, receiptMessage(body.matchId, hash))};
  bundle.events.push(event);
  return event;
}
export const leafHash = hash => sha256(Uint8Array.of(0, ...unhex(hash)));
export const parentHash = (a,b) => sha256(Uint8Array.of(1, ...unhex(a), ...unhex(b)));
export async function merkleRoot(hashes) {
  if (!hashes.length) throw Error('An empty move list has no checkpoint.');
  let level = await Promise.all(hashes.map(leafHash));
  while (level.length > 1) { const next=[]; for (let i=0;i<level.length;i+=2) next.push(await parentHash(level[i], level[i+1] || level[i])); level=next; }
  return level[0];
}
export async function inclusionProof(hashes, index) {
  if (!Number.isInteger(index) || index<0 || index>=hashes.length) throw Error('Invalid move index.');
  let level=await Promise.all(hashes.map(leafHash)), cursor=index;
  const path=[];
  while (level.length>1) { path.push({left:cursor%2===1, hash:level[cursor^1] || level[cursor]}); const next=[]; for(let i=0;i<level.length;i+=2) next.push(await parentHash(level[i],level[i+1] || level[i])); level=next; cursor=Math.floor(cursor/2); }
  return {index,count:hashes.length,path,root:level[0]};
}
export async function verifyInclusion(hash, proof) {
  try {
    if (!Number.isInteger(proof.index) || !Number.isInteger(proof.count) || proof.count<1 || proof.index<0 || proof.index>=proof.count || proof.path.length>20) return false;
    let current=await leafHash(hash), index=proof.index, width=proof.count;
    for(const item of proof.path) { if(width<=1 || item.left!==(index%2===1)) return false; if(index%2===0 && index+1>=width && item.hash!==current) return false; current=item.left ? await parentHash(item.hash,current) : await parentHash(current,item.hash); index=Math.floor(index/2); width=Math.ceil(width/2); }
    return width===1 && current===proof.root;
  } catch { return false; }
}
export async function closeBundle(bundle,state,result,key) {
  const closure={protocol:PROTOCOL,kind:'match-closed',matchId:bundle.header.matchId,eventCount:bundle.events.length,tip:bundle.events.at(-1)?.hash || bundle.headerHash,stateHash:await stateHash(state),result:copy(result),closedAt:Date.now()};
  bundle.closure={...closure,signature:await sign(key,closure)};
  return bundle.closure;
}
export async function verifyBundle(bundle,{engine,rulesHash,trustedKeys=[],verifyRandomness,verifyChain,onProgress=()=>{}}={}) {
  const fail=message=>{throw Error(message);}, header=bundle?.header;
  if(!header || header.protocol!==PROTOCOL || !engine || !Array.isArray(bundle.events) || bundle.events.length>4000) fail('This is not a supported match proof.');
  if(header.rulesHash!==rulesHash) fail('This match needs its original published rules build.');
  const headerHash=await hashObject(header);
  if(headerHash!==bundle.headerHash || !await verify(header.serverPublicKey,headerMessage(headerHash),bundle.headerSignature)) fail('The match definition or its signature has changed.');
  const signer=await keyId(header.serverPublicKey), trusted=await Promise.all(trustedKeys.map(keyId));
  if(!trusted.includes(signer)) fail('Unknown match-service signing key.');
  if(!Array.isArray(header.actors) || header.actors.length!==engine.game(header.gameId)?.players || new Set(header.actors.map(a=>a.id)).size!==header.actors.length || new Set(header.actors.map(a=>a.seat)).size!==header.actors.length) fail('The player list is inconsistent.');
  if(await stateHash(header.initialState)!==header.initialStateHash || await stateHash(engine.create(header.gameId,header.options))!==header.initialStateHash) fail('The starting board does not match the published rules.');
  let state=copy(header.initialState), previous=headerHash, rolls=0;
  const prefix={header:copy(header),headerHash,events:[]}, timeline=[];
  for(let n=0;n<bundle.events.length;n++) {
    const event=bundle.events[n], {hash,receipt,...body}=event, intent=event.signed?.intent;
    if(event.protocol!==PROTOCOL || event.matchId!==header.matchId || event.seq!==n+1 || event.previousHash!==previous || await hashObject(body)!==hash) fail('The move history is altered, incomplete or out of order.');
    if(!await verify(header.serverPublicKey,receiptMessage(header.matchId,hash),receipt)) fail('A move receipt is invalid.');
    const actor=await checkIntent(prefix,event.signed,state);
    if(event.kind!==intent.kind) fail('The recorded action type has changed.');
    if(event.kind==='action') {
      if(actor.seat!==engine.turn(state)) fail('A move was made by the wrong player.');
      const action=engine.actions(header.gameId,state).find(a=>a.id===intent.actionId);
      if(!action) fail('A recorded move breaks the published rules.');
      let context={};
      if(action.kind==='roll') { if(!event.rng || !verifyRandomness) fail('A roll has no independently checkable randomness.'); const r=await verifyRandomness(event.rng,{intent,header}); context={roll:{values:r.values}}; rolls++; }
      else if(event.rng || intent.beaconRound!==null) fail('Unexpected randomness on a move.');
      state=engine.apply(header.gameId,state,intent.actionId,context);
    } else if(event.kind==='resign') { if(event.rng || intent.beaconRound!==null) fail('Unexpected randomness on a resignation.'); state=engine.forfeit(header.gameId,state,actor.seat); actor.publicKey=header.serverPublicKey; actor.kind='bot'; actor.left=true; if(!prefix.header.actors.some(a=>a.kind==='human'&&!a.left)&&!engine.result(state))state={...state,mobileResult:{winner:null,draw:true,reason:'All players left the table.'}}; }
    else fail('Unsupported action type.');
    if(await stateHash(state)!==event.afterHash) fail('The board after a move does not match the rules.');
    previous=hash; prefix.events.push(event);
    timeline.push({seq:event.seq,actor:actor.seat,actionId:intent.actionId,kind:event.kind,hash,legal:true,signed:true,rng:event.rng ? {values:event.rng.values,round:event.rng.round} : null});
    onProgress({checked:n+1,total:bundle.events.length});
  }
  if(bundle.closure) { const {signature,...c}=bundle.closure; if(c.kind!=='match-closed' || c.protocol!==PROTOCOL || c.matchId!==header.matchId || c.eventCount!==bundle.events.length || c.tip!==previous || c.stateHash!==await stateHash(state) || canonical(c.result)!==canonical(engine.result(state)) || !await verify(header.serverPublicKey,c,signature)) fail('The final result or move count has changed.'); }
  let chain={status:'unanchored',covered:0};
  if(bundle.checkpoint && verifyChain) chain=await verifyChain(bundle.checkpoint,bundle);
  return {status:bundle.events.length?'checked':'empty',moves:bundle.events.length,rolls,closed:!!bundle.closure,result:engine.result(state),state,timeline,chain,rulesHash:header.rulesHash,randomnessTiming:chain.rollTimingVerified?'chain-confirmed':'server-attested request timing'};
}
