import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {GUIDES,LEGACY_GUIDE_NAMES} from '../src/brand.js';
import {companionPreferences,companionLine} from '../src/companions.js';
import {FESTIVAL_STICKERS,festivalStickerText,parseFestivalSticker} from '../src/celebration.js';
import {ILLUSTRATED_REACTIONS,illustratedText,parseIllustrated} from '../src/collectionModel.js';
const journey=createRequire(import.meta.url)('../build/companionJourney.cjs');
const names={polly:'Nova',retsba:'Rocco',pengu:'Piko',abster:'Ziggy'};

test('new display names retain saved guide IDs, roles and asset references',()=>{
  assert.deepEqual(Object.keys(GUIDES),Object.keys(names));
  for(const[id,name]of Object.entries(names)){
    assert.equal(GUIDES[id].name,name);
    assert.equal(companionPreferences({guide:id,mode:'quiet',motion:false}).guide,id);
    assert.match(GUIDES[id].image,new RegExp('/'+id+'/listening\\.webp$'));
  }
  assert.match(companionLine('hello',{},0,'pengu'),/I’m Piko/);
  assert.match(companionLine('hello',{},0,'abster'),/I’m Ziggy/);
  const progress=journey.journeyProgress({memories:{'shogi:first':123},outfits:{polly:'none'}});
  assert.equal(progress.memories['shogi:first'],123);
  assert.equal(progress.outfits.polly,'none');
});

test('new festival messages display new names and old authored sticker history still parses',()=>{
  for(const s of FESTIVAL_STICKERS){
    const text=festivalStickerText(s.id);
    assert.equal(text,`🎉 ${names[s.host]}: ${s.label}`);
    assert.equal(parseFestivalSticker(text)?.id,s.id);
    assert.equal(parseFestivalSticker(`🎉 ${LEGACY_GUIDE_NAMES[s.host]}: ${s.label}`)?.id,s.id);
    assert.equal(parseFestivalSticker('prefix '+text),null);
  }
});

test('free and illustrated reactions preserve both old and new message formats',()=>{
  for(const[host,name]of Object.entries(names))for(const r of journey.REACTIONS){
    const text=journey.reactionText(host,r.id);
    assert.equal(text,`🐧 ${name}: ${r.label}`);
    assert.equal(journey.parseReaction(text)?.host,host);
    assert.equal(journey.parseReaction(`🐧 ${LEGACY_GUIDE_NAMES[host]}: ${r.label}`)?.host,host);
    assert.equal(journey.parseReaction(text+' untrusted'),null);
  }
  for(const r of ILLUSTRATED_REACTIONS){
    const text=illustratedText(r.id);
    assert.equal(text,`🐧 ${names[r.host]}: ${r.label} · Little Victories`);
    assert.equal(parseIllustrated(text)?.id,r.id);
    assert.equal(parseIllustrated(`🐧 ${LEGACY_GUIDE_NAMES[r.host]}: ${r.label} · Little Victories`)?.id,r.id);
    assert.equal(parseIllustrated(text+' extra'),null);
  }
});
