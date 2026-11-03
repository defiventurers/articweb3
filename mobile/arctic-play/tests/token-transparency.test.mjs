import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {TOKEN_CUTOUTS,tokenCutoutAsset} from '../src/tokenCutouts.js';
const require=createRequire(import.meta.url),engine=require('../build/games.cjs'),sharp=require('sharp');
const root=new URL('../android/app/src/main/assets/',import.meta.url);
test('all 13 legacy token cutouts have transparent corners and preserve original embedded pixels',async()=>{
 for(const key of Object.keys(TOKEN_CUTOUTS)){
  const original=await sharp(fileURLToPath(new URL(`art/tokens/token-sanguo-${key}.webp`,root))).ensureAlpha().raw().toBuffer();
  const svg=await fs.readFile(new URL(`art/tokens/cutouts/token-sanguo-${key}.svg`,root),'utf8');
  const payload=Buffer.from(/data:image\/png;base64,([^"]+)/.exec(svg)[1],'base64');
  assert.deepEqual(await sharp(payload).ensureAlpha().raw().toBuffer(),original,`${key}: original raster pixels must be preserved`);
  const{data,info}=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,256);assert.equal(info.height,256);
  for(const[x,y]of[[0,0],[255,0],[0,255],[255,255],[10,128],[245,128],[128,245]])assert.equal(data[(y*256+x)*4+3],0,`${key}: background is transparent at ${x},${y}`);
  assert.equal(data[(128*256+128)*4+3],255,`${key}: the character stays opaque`);
 }
 // Preserve the features extending beyond the round medal.
 for(const[key,x,y]of[['red-horse',129,16],['red-general',128,20],['red-bannerman',209,64]]){
  const{data}=await sharp(fileURLToPath(new URL(`art/tokens/cutouts/token-sanguo-${key}.svg`,root))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert(data[(y*256+x)*4+3]>0,`${key}: horn, crown or flag is retained`);
 }
});
test('Xiangqi and shared piece icons resolve to the corrected artwork without changing unaffected pieces',()=>{
 const units=engine.pieces('xiangqi',engine.create('xiangqi'));assert.equal(units.length,32);
 assert.equal(units.filter(p=>p.sprite.includes('/cutouts/')).length,21);
 for(const p of units)assert.equal(engine.asset(p.sprite.replace(/^art\//,'')),p.sprite);
 assert(engine.asset(engine.game('xiangqi').icon).endsWith('/token-sanguo-red-general.svg'));
 assert.equal(tokenCutoutAsset('tokens/token-sanguo-green-horse.webp'),'tokens/token-sanguo-green-horse.webp');
 assert.equal(tokenCutoutAsset('yanyi/pieces/blue-horse.webp'),'yanyi/pieces/blue-horse.webp');
});
