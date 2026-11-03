import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../frontend/package.json',import.meta.url)),sharp=require('sharp');

test('Archive illustration has transparent surroundings and an open arch for the shared world',async()=>{
 const source=new URL('../art/brand/archive-v1/home-archive.webp',import.meta.url),runtime=new URL('../android/app/src/main/assets/art/brand/archive-v1/home-archive.webp',import.meta.url);
 const bytes=await fs.readFile(source);assert.deepEqual(bytes,await fs.readFile(runtime));
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(info.width,1200);assert.equal(info.height,600);
 for(const[x,y]of [[0,0],[1199,0],[0,599],[1199,599]])assert(data[(y*1200+x)*4+3]<=2,'Only imperceptible feathering may reach the outermost pixel');
 let clear=0;for(let y=210;y<330;y++)for(let x=550;x<650;x++)if(data[(y*1200+x)*4+3]<16)clear++;
 assert(clear>3000,'The glacier must show through the Archive arch, not a painted backing');
});

test('Monochrome launcher keeps four clear face interiors and stays within the adaptive circle',async()=>{
 const bytes=await fs.readFile(new URL('../android/app/src/main/res/drawable-nodpi/ic_launcher_monochrome.png',import.meta.url));
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,432);assert.equal(info.height,432);
 for(const[x,y]of [[41,42],[67,42],[41,64],[67,64]]){const px=Math.round((54+(x-54)*.92)*4),py=Math.round((54+(y-54)*.92)*4);assert(data[(py*432+px)*4+3]<8,'Face interior must survive a solid monochrome tint');}
 let radius=0,ink=0;for(let y=0;y<432;y++)for(let x=0;x<432;x++)if(data[(y*432+x)*4+3]>32){ink++;radius=Math.max(radius,Math.hypot(x-215.5,y-215.5));}
 assert(ink>8000);assert(radius<=132,`The themed icon would crop at radius ${radius}`);
});
