import test from 'node:test';
import assert from 'node:assert/strict';
import {FESTIVAL_STICKERS,festivalStickerText,parseFestivalSticker,HALL_ART,hallSticker} from '../src/celebration.js';
import {HALL_ORDER,hallPostcard,guestPostcard} from '../src/gathering.js';
import {BRAND} from '../src/brand.js';

test('Free festival reactions round-trip through ordinary private-room text without interpreting arbitrary input',()=>{
  assert.equal(FESTIVAL_STICKERS.length,12);
  assert.equal(new Set(FESTIVAL_STICKERS.map(s=>s.id)).size,12);
  for(const s of FESTIVAL_STICKERS){const text=festivalStickerText(s.id);assert.ok(text.length<100);assert.equal(parseFestivalSticker(text)?.id,s.id);}
  for(const invalid of [null,{},'','__proto__','<img src=x onerror=alert(1)>','🎉 Polly: Made-up reaction'])assert.equal(parseFestivalSticker(invalid),null);
  assert.equal(festivalStickerText('__proto__'),null);
});

test('Every game has a distinct scene, a game-linked sticker and its matching celebration postcard',()=>{
  assert.deepEqual(Object.keys(HALL_ART).sort(),[...HALL_ORDER].sort());
  for(const id of HALL_ORDER){assert.ok(hallSticker(id),id);assert.equal(hallPostcard(id).art,HALL_ART[id].image);}
  assert.match(guestPostcard().art,/eighth-lantern-celebration/);
  assert.doesNotMatch(BRAND.tagline,/lost|reviv/i);
});
