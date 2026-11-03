import test from 'node:test';
import assert from 'node:assert/strict';
import {requireServiceFeature} from '../src/network.js';
test('Online team creation requires a team-capable service, preventing silent four-way fallback',async t=>{
 const calls=[];t.mock.method(globalThis,'fetch',async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({ok:true,version:'arctic-play-1.0.0'})};});
 await assert.rejects(requireServiceFeature('dominion-teams-v1'),/2v2.*service update/);assert.equal(calls.length,1);assert.equal(calls[0].options.cache,'no-store');
 globalThis.fetch=async()=>({ok:true,json:async()=>({capabilities:['dominion-teams-v1','browser-play-v1']})});await assert.doesNotReject(requireServiceFeature('dominion-teams-v1'));
});
