import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {HALLS,HALL_ORDER,OPENING,gatheringProgress,visitHall,earnLantern,lanternCount,revealGathering,featuredHall,storySettings,hallInvitation} from '../src/gathering.js';
import {availableDecoration,appearanceFor} from '../src/collectionModel.js';
const require=createRequire(import.meta.url),adventures=require('../build/adventures.cjs');

test('Reading all seven tales leaves the Eighth Lantern unearned; legacy accepted moves survive',()=>{
  let p=gatheringProgress();for(const id of HALL_ORDER)p=visitHall(p,id,1000);
  assert.equal(lanternCount(p),0);assert.equal(revealGathering(p).revealedAt,null);assert.ok(HALL_ORDER.every(id=>p.halls[id].visitedAt===1000));
  p=gatheringProgress(p,{shogi:1234,xiangqi:5678,bogus:1234,sannin:-1});assert.equal(lanternCount(p),2);assert.equal(p.halls.shogi.learnedAt,1234);assert.equal(p.halls.sannin.learnedAt,null);
  assert.equal(OPENING.reduce((n,f)=>n+f.duration,0),25000);assert.deepEqual(storySettings({enabled:false,sound:true}),{enabled:false,sound:true});
});

test('Every hall challenge completes through unchanged canonical legal actions',()=>{
  let progress=gatheringProgress();let challenges=0;
  for(const id of HALL_ORDER){
    for(const c of HALLS[id].challenges){
      let path=[],p=adventures.adventurePosition(id,c.mission,c.variant);
      assert.ok(p.legal.length>0,`${id}: ${c.mission} has a legal starting action`);
      while(!p.complete){assert.ok(path.length<3);const action=p.legal[0];assert.ok(action);path.push(action.id);p=adventures.adventurePosition(id,c.mission,c.variant,path);}
      assert.equal(p.stage,p.stageCount);progress=earnLantern(progress,id,{mission:c.mission,at:1000+challenges});challenges++;
    }
  }
  assert.equal(challenges,17);assert.equal(lanternCount(progress),7);const reveal=revealGathering(progress,5555);assert.equal(reveal.revealedAt,5555);assert.equal(revealGathering(reveal,9999).revealedAt,5555);
});

test('Lantern progress rejects unknown games, invalid challenges and malformed timestamps',()=>{
  const p=gatheringProgress();assert.deepEqual(earnLantern(p,'unknown'),p);assert.deepEqual(earnLantern(p,'shogi',{mission:'invented'}),p);assert.deepEqual(earnLantern(p,'shogi',{at:NaN}),p);assert.deepEqual(visitHall(p,'__proto__',55),p);assert.equal(Object.prototype.visitedAt,undefined);
  assert.equal(gatheringProgress({revealedAt:123,halls:{shogi:{learnedAt:123}}}).revealedAt,null);
});

test('Invitations identify the actual game and seats; editorial spotlight is stable within a week',()=>{
  const text=hallInvitation('yanyi','ABC234','https://example.test/join?room=ABC234');assert.match(text,/Yellow Lantern Court/);assert.match(text,/Sanguo Yan Yi Qi · 3 seats/);assert.match(text,/Private room: ABC234/);assert.doesNotMatch(text,/seatToken|everyone|online now/);
  assert.equal(featuredHall(new Date('2026-10-19T12:00:00Z')),featuredHall(new Date('2026-10-25T12:00:00Z')));assert.notEqual(featuredHall(new Date('2026-10-19T12:00:00Z')),featuredHall(new Date('2026-10-26T12:00:00Z')));
});

test('The Eighth Lantern Camp keepsake is free after the real seven-hall reveal, and stays locked before it',()=>{
  let p=gatheringProgress();assert.equal(availableDecoration('guest-lantern',{}, {},p),false);
  for(const id of HALL_ORDER)p=earnLantern(p,id,{at:1000});
  assert.equal(availableDecoration('guest-lantern',{}, {},p),false,'seven stamps alone do not claim the reveal');
  p=revealGathering(p,2000);assert.equal(availableDecoration('guest-lantern',{}, {},p),true);
  const choices={decorations:{left:'guest-lantern',right:'none'}};
  assert.equal(appearanceFor(choices,{}, {},{},p).decorations.left,'guest-lantern');
  assert.equal(appearanceFor(choices,{}, {},{}).decorations.left,'none');
});
