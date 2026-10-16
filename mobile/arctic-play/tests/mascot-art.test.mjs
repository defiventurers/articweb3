import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {GUIDES} from '../src/brand.js';
const require=createRequire(new URL('../../../frontend/package.json',import.meta.url)),sharp=require('sharp');
test('The complete new mascot family has genuine alpha, comfortable padding and identical packaged bytes',async()=>{
  for(const [key,guide] of Object.entries(GUIDES)){
    assert.match(guide.image,/hosts-cute-v3/);
    const source=fs.readFileSync(new URL(`../art/brand/hosts-cute-v3/${key}.webp`,import.meta.url));
    const packaged=fs.readFileSync(new URL(`../android/app/src/main/assets/${guide.image}`,import.meta.url));assert.deepEqual(packaged,source);
    const meta=await sharp(source).metadata();assert.equal(meta.hasAlpha,true);assert.ok(meta.width>=300&&meta.height>=300);
    const {data,info}=await sharp(source).raw().toBuffer({resolveWithObject:true});
    for(const [x,y] of [[0,0],[info.width-1,0],[0,info.height-1],[info.width-1,info.height-1]])assert.equal(data[(y*info.width+x)*info.channels+3],0,'corner stays transparent');
    const stats=await sharp(source).stats();assert.ok(stats.channels[3].mean>30&&stats.channels[3].mean<220,'a visible cutout, not an opaque panel or blank image');
  }
});
