import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreCachedEntitlements} from '../src/cloudEntitlements.js';

const now=1800000000000,session={accountId:'account-one',session:'session-fixture'};
const value={'sanyou-hall-v1':{active:true}},cache={accountId:session.accountId,at:now-1000,value};

test('An owner-only session and missing cache never crash or restore account entitlements',()=>{
 for(const owner of [{ownerRecovery:'invalid-fixture'},null,{},false])
  for(const saved of [null,{},false,[],{at:now,value},cache])
   assert.deepEqual(restoreCachedEntitlements(owner,saved,now),{});
});
test('A recent account cache restores only for its own nonempty account ID',()=>{
 assert.deepEqual(restoreCachedEntitlements(session,cache,now),value);
 assert.deepEqual(restoreCachedEntitlements({...session,ownerRecovery:'invalid-fixture'},cache,now),value);
 assert.deepEqual(restoreCachedEntitlements({accountId:'account-two'},cache,now),{});
 for(const accountId of [undefined,null,'',' ',0])
  assert.deepEqual(restoreCachedEntitlements({accountId},{...cache,accountId},now),{});
});
test('Missing, invalid, expired and future cache timestamps grant no cached access',()=>{
 for(const saved of [null,{},false,[]])assert.deepEqual(restoreCachedEntitlements(session,saved,now),{});
 for(const at of [undefined,null,NaN,Infinity,'1800000000000',0,now+1,now-30*86400000])
  assert.deepEqual(restoreCachedEntitlements(session,{...cache,at},now),{});
 assert.deepEqual(restoreCachedEntitlements(session,{...cache,at:now-30*86400000+1},now),value);
});
test('Malformed cache values grant no cached access',()=>{
 for(const value of [undefined,null,false,5,'owner',[]])
  assert.deepEqual(restoreCachedEntitlements(session,{...cache,value},now),{});
});
