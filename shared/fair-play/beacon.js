import {fetchBeacon} from 'drand-client';
import {sha256,hashObject} from './core.js';
export const QUICKNET=Object.freeze({hash:'52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971',public_key:'83cf0f2896adee7eb8b5f01fcad3912212c437e0073e911fb90022d3e760183c8c4b450b6a0a6c3ac6a5776a2d1064510d1fec758c921cc22b0e17e63aaf4bcb5ed66304de9cf809bd274ca73bab4af5a6e9c76a4bc09e76eae8991ef5ece45a',schemeID:'bls-unchained-g1-rfc9380',period:3,genesis_time:1692803367});
export const roundTime=round=>(QUICKNET.genesis_time+(round-1)*QUICKNET.period)*1000;
export const futureRound=(now=Date.now())=>Math.floor((now/1000+12-QUICKNET.genesis_time)/QUICKNET.period)+1;
export async function verifySignedBeacon(beacon,round,chainInfo) {
  if(!Number.isSafeInteger(round) || round<1 || beacon?.round!==round || !/^([a-f0-9]{2}){48}$/i.test(beacon.signature || '')) throw Error('Invalid randomness round or signature.');
  const normalized={round,signature:beacon.signature.toLowerCase(),randomness:await sha256(Uint8Array.from(beacon.signature.match(/../g),x=>parseInt(x,16)))};
  if(beacon.randomness && beacon.randomness.toLowerCase()!==normalized.randomness) throw Error('The randomness output was altered.');
  await fetchBeacon({options:{disableBeaconVerification:false,noCache:false},chain:()=>({info:async()=>chainInfo}),get:async()=>normalized},round);
  return normalized;
}
export const verifyBeacon=(beacon,round)=>verifySignedBeacon(beacon,round,QUICKNET);
export async function diceValues(beacon,intent,count) {
  if(![1,2].includes(count)) throw Error('Invalid dice count.');
  const values=[]; let draw=0;
  while(values.length<count && draw<128) {
    const hash=await hashObject({domain:'AK-DICE-V1',beacon:beacon.randomness,intent,draw:draw++});
    for(let i=0;i<hash.length && values.length<count;i+=8) { const word=parseInt(hash.slice(i,i+8),16); if(word<4294967292) values.push(word%6+1); }
  }
  if(values.length!==count) throw Error('Randomness mapping failed.');
  return values;
}
export async function verifyRandomness(proof,{intent,header}) {
  if(proof.provider!=='drand-quicknet-v1' || proof.chainHash!==QUICKNET.hash || proof.round!==intent.beaconRound || proof.count!==(intent.actionId==='roll-one|control:roll-one'?1:2) || proof.intentHash!==await hashObject(intent) || !Number.isFinite(proof.committedAt) || roundTime(proof.round)<=proof.committedAt+1000) throw Error('The dice request does not match this turn.');
  if(header.options?.randomness!=='drand-quicknet-v1') throw Error('This match did not agree to the randomness protocol.');
  const beacon=await verifyBeacon(proof,proof.round), values=await diceValues(beacon,intent,proof.count);
  if(JSON.stringify(values)!==JSON.stringify(proof.values)) throw Error('The dice do not match the public randomness.');
  return {values,beacon};
}
export async function fetchRound(round,{fetcher=fetch,timeout=23000}={}) {
  const deadline=Date.now()+timeout;
  const urls=['https://api.drand.sh/v2/chains/'+QUICKNET.hash+'/rounds/'+round,'https://drand.cloudflare.com/'+QUICKNET.hash+'/public/'+round];
  while(Date.now()<deadline) {
    for(const url of urls) {
      try { const r=await fetcher(url,{signal:AbortSignal.timeout(Math.min(4000,Math.max(1,deadline-Date.now())))}); if(!r.ok) continue; return await verifyBeacon(await r.json(),round); } catch {}
    }
    if(Date.now()<deadline) await new Promise(r=>setTimeout(r,400));
  }
  throw Error('This recorded roll is waiting for its public randomness. Retry to retrieve the same roll.');
}
