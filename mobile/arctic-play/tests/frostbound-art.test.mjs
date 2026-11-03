import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../frontend/package.json',import.meta.url)),sharp=require('sharp');
const source=new URL('../art/brand/frostbound-v1/',import.meta.url),packaged=new URL('../android/app/src/main/assets/art/brand/',import.meta.url);

test('Home cast has real transparent surroundings, not a rectangular or checkerboard background',async()=>{
 const bytes=await fs.readFile(new URL('home-party.webp',source));
 assert.deepEqual(bytes,await fs.readFile(new URL('frostbound-v1/home-party.webp',packaged)));
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h}=info;assert.equal(w,1200);assert.equal(h,600);
 for(const[x,y]of [[0,0],[w-1,0],[0,h-1],[w-1,h-1]])assert.equal(data[(y*w+x)*4+3],0);
 let clear=0,opaque=0;for(let i=3;i<data.length;i+=4){if(data[i]===0)clear++;if(data[i]>240)opaque++;}
 assert(clear>w*h*.15,'The world must show around the illustration');assert(opaque>w*h*.4,'Characters and their table must remain fully opaque');
});

test('Launcher retains four mascot colours at 48px and fits the adaptive circular safe area',async()=>{
 const res=new URL('../android/app/src/main/res/',import.meta.url);
 const {data,info}=await sharp(await fs.readFile(new URL('drawable-nodpi/ic_launcher_foreground.png',res))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(info.width,432);assert.equal(info.height,432);
 let max=0;for(let y=0;y<432;y++)for(let x=0;x<432;x++)if(data[(y*432+x)*4+3]>32)max=Math.max(max,Math.hypot(x-215.5,y-215.5));
 assert(max<=132,`Adaptive circle would clip the mascot cluster at radius ${max}`);
 for(const [folder,size]of [['mdpi',48],['hdpi',72],['xhdpi',96],['xxhdpi',144],['xxxhdpi',192]]){
  const image=sharp(await fs.readFile(new URL(`mipmap-${folder}/ic_launcher.png`,res))),m=await image.metadata();assert.equal(m.width,size);assert.equal(m.height,size);
 }
 const small=await sharp(await fs.readFile(new URL('mipmap-mdpi/ic_launcher.png',res))).removeAlpha().raw().toBuffer();
 const colour={pink:0,blue:0,red:0,green:0};
 for(let i=0;i<small.length;i+=3){const[r,g,b]=small.subarray(i,i+3);if(r>210&&g>85&&b>g*1.05)colour.pink++;if(b>140&&b>r*1.2&&b>g*1.05)colour.blue++;if(r>160&&g<120&&b<140)colour.red++;if(g>110&&g>r*1.2&&g>b*1.05)colour.green++;}
 for(const[name,count]of Object.entries(colour))assert(count>8,`${name} must stay visible in the smallest launcher icon`);
});
