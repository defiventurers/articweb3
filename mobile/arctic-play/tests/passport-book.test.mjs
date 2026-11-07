import test from 'node:test';
import assert from 'node:assert/strict';
import {passportSnapshot,passportDate,passportPage,passportMoment,STAMP_ORIGINS} from '../src/passportBookModel.js';
import {HALL_ORDER,gatheringProgress,visitHall,earnLantern,revealGathering} from '../src/gathering.js';

test('visits, reveal flags, invalid dates and extra catalogue games cannot award the Crown',()=>{
 let p=gatheringProgress();for(const id of HALL_ORDER)p=visitHall(p,id,1000);
 assert.equal(passportSnapshot(p).count,0);p.revealedAt=2000;p.halls['co-tu-lenh']={learnedAt:2000};p.halls.shogi.learnedAt=Infinity;
 assert.equal(passportSnapshot(p).crownedAt,null);p.halls.shogi.learnedAt=8640000000000001;assert.equal(passportSnapshot(p).count,0);
 assert.equal(passportDate(Infinity),'');assert.equal(passportDate(-1),'');
});
test('legacy accepted moves keep their dates and determine the next missing lantern',()=>{
 const p=gatheringProgress({}, {xiangqi:1000,shogi:2000});const before=JSON.stringify(p),s=passportSnapshot(p);
 assert.equal(s.count,2);assert.equal(s.stamps[0].earnedAt,1000);assert.equal(s.next.id,'sannin');assert.equal(s.crownedAt,null);assert.equal(JSON.stringify(p),before);
});
test('the seventh existing legal-move milestone awards a stable cosmetic Crown without claiming the optional story',()=>{
 let p=gatheringProgress();for(const [i,id]of HALL_ORDER.entries()){
  p=earnLantern(p,id,{at:1000+i});assert.equal(!!passportSnapshot(p).crownedAt,i===6);
 }
 const before=JSON.stringify(p);assert.equal(passportSnapshot(p).crownedAt,1006);assert.equal(p.revealedAt,null);assert.equal(passportSnapshot(p).next,null);assert.equal(JSON.stringify(p),before);
 assert.equal(passportSnapshot(revealGathering(p,5000)).crownedAt,1006);
});
test('corrupt or stale page values fall back to Arrival',()=>{
 for(const value of [-1,4,'2',null,{},NaN])assert.equal(passportPage(value),0);
 assert.equal(passportPage(3),3);
});

test('earned date includes the original instant and timezone without inventing a date',()=>{
 const value=Date.UTC(2026,10,7,9,23,45),moment=passportMoment(value);
 assert.equal(moment.iso,'2026-11-07T09:23:45.000Z');assert.ok(moment.date);assert.ok(moment.time);assert.ok(moment.full);
 for(const bad of [null,0,-1,Infinity,NaN])assert.equal(passportMoment(bad),null);
});
test('each founding game has distinct art; uncertain or ancient periods never receive modern flags',()=>{
 assert.deepEqual(Object.keys(STAMP_ORIGINS).sort(),[...HALL_ORDER].sort());
 assert.equal(new Set(Object.values(STAMP_ORIGINS).map(x=>x.art)).size,7);
 for(const id of ['xiangqi','shogi','sanguo','sanyou','dominion']){assert.equal(STAMP_ORIGINS[id].kind,'origin');assert.equal(STAMP_ORIGINS[id].flag,undefined);}
 assert.equal(STAMP_ORIGINS.sannin.flag,'japan');assert.equal(STAMP_ORIGINS.yanyi.flag,'china');
});
