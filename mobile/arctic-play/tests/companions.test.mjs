import test from 'node:test';
import assert from 'node:assert/strict';
import {GUIDES,GAME_HERITAGE} from '../src/brand.js';
import {companionPreferences,companionId,companionLine,reactionFor} from '../src/companions.js';
test('Malformed companion preferences recover while explicit quiet settings survive',()=>{
  for(const input of [null,false,[],42,'polly',{guide:'constructor'}])assert.deepEqual(companionPreferences(input),{guide:'auto',motion:true,comments:true,inGame:true});
  assert.deepEqual(companionPreferences({guide:'abster',motion:false,comments:false,inGame:false,unknown:true}),{guide:'abster',motion:false,comments:false,inGame:false});
});
test('Automatic hosts follow all seven games and a pinned guide follows the player',()=>{
  const automatic=companionPreferences({});assert.equal(companionId(automatic),'polly');
  for(const [id,heritage] of Object.entries(GAME_HERITAGE)){assert.equal(companionId(automatic,id),heritage.host);for(const guide of Object.keys(GUIDES))assert.equal(companionId(companionPreferences({guide}),id),guide);}
});
test('Only position events react; game endings take precedence over captures',()=>{
  assert.equal(reactionFor(),null);assert.equal(reactionFor({finished:true,captured:true,moved:true}),'finish');assert.equal(reactionFor({finished:true,draw:true,moved:true}),'draw');assert.equal(reactionFor({discovery:true,moved:true}),'discovery');assert.equal(reactionFor({captured:true,moved:true}),'capture');assert.equal(reactionFor({moved:true}),'move');assert.equal(reactionFor({rolled:true}),'dice');
});
test('All four voices have distinct greetings, changing tap responses and safe fallbacks',()=>{
  const welcomes=new Set();for(const id of Object.keys(GUIDES)){welcomes.add(companionLine(id));assert.notEqual(companionLine(id,'tap',0),companionLine(id,'tap',1));assert.equal(typeof companionLine(id,'missing',NaN),'string');assert.equal(typeof companionLine(id,'tip',-1),'string');for(const kind of ['capture','discovery','undo','restart','finish','draw','dice'])assert.ok(companionLine(id,kind).length>15);}assert.equal(welcomes.size,4);
});
