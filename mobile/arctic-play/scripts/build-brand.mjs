import path from 'node:path';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';

// Package the generated artwork at Android's required sizes. The master artwork
// and the original host references are never repainted or regenerated here.
export async function buildBrand(mobile,destination){
  const require=createRequire(path.resolve(mobile,'build-deps/package.json'));
  const sharp=require('sharp');
  const source=path.join(mobile,'art/brand');
  const cast=path.join(source,'archive-v1');
  const mark=await sharp(path.join(cast,'masters/icon-foreground.png')).trim().png().toBuffer();
  const background=path.join(mobile,'art/ice/night.webp');
  const res=path.join(mobile,'android/app/src/main/res');
  async function write(relative,content){const file=path.join(res,relative);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,content);}
  for(const [density,size] of [['mdpi',48],['hdpi',72],['xhdpi',96],['xxhdpi',144],['xxxhdpi',192]]){
    const piece=await sharp(mark).resize(Math.round(size*.88),Math.round(size*.88),{fit:'inside'}).png().toBuffer();
    const icon=await sharp(background).resize(size,size,{fit:'cover'}).composite([{input:piece,gravity:'centre'}]).png().toBuffer();
    await write(`mipmap-${density}/ic_launcher.png`,icon);
  }
  // Fit every substantial alpha pixel inside Android's circular 66/108 safe zone.
  // Four faces stay visible under circle, squircle and rounded-square masks.
  const {data,info}=await sharp(mark).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let radius=1;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>16)radius=Math.max(radius,Math.hypot(x-(info.width-1)/2,y-(info.height-1)/2));
  const scale=126/radius;
  const safe=await sharp(mark).resize(Math.floor(info.width*scale),Math.floor(info.height*scale)).png().toBuffer();
  const foreground=await sharp({create:{width:432,height:432,channels:4,background:'#00000000'}}).composite([{input:safe,gravity:'centre'}]).png().toBuffer();
  await write('drawable-nodpi/ic_launcher_foreground.png',foreground);
  await write('drawable-nodpi/ic_launcher_monochrome.png',await sharp(path.join(cast,'monochrome.svg')).resize(432,432).png().toBuffer());
  await write('values/brand.xml',`<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">#0A3150</color></resources>\n`);
  await write('drawable/ic_launcher_ice.xml',`<?xml version="1.0" encoding="utf-8"?>\n<layer-list xmlns:android="http://schemas.android.com/apk/res/android"><item android:drawable="@color/ic_launcher_background"/><item><bitmap android:src="@drawable/launch_ice_texture" android:gravity="fill"/></item></layer-list>\n`);
  const adaptive=monochrome=>`<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@drawable/ic_launcher_ice"/>\n    <foreground android:drawable="@drawable/ic_launcher_foreground"/>${monochrome?'\n    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>':''}\n</adaptive-icon>\n`;
  await write('mipmap-anydpi-v26/ic_launcher.xml',adaptive(false));
  await write('mipmap-anydpi-v33/ic_launcher.xml',adaptive(true));
  const web=path.join(destination,'art/brand');await fs.mkdir(web,{recursive:true});
  const webPiece=await sharp(mark).resize(480,480,{fit:'inside'}).png().toBuffer();
  await sharp({create:{width:512,height:512,channels:4,background:'#00000000'}}).composite([{input:webPiece,gravity:'centre'}]).webp({quality:92,alphaQuality:100}).toFile(path.join(web,'icon.webp'));
  await fs.mkdir(path.join(web,'frostbound-v1'),{recursive:true});
  await fs.copyFile(path.join(source,'frostbound-v1/home-party.webp'),path.join(web,'frostbound-v1/home-party.webp'));
  await fs.mkdir(path.join(web,'archive-v1'),{recursive:true});
  await fs.copyFile(path.join(cast,'home-archive.webp'),path.join(web,'archive-v1/home-archive.webp'));
  await fs.cp(path.join(source,'hosts'),path.join(web,'hosts'),{recursive:true});
  await fs.cp(path.join(source,'hosts-director-v1'),path.join(web,'hosts-director-v1'),{recursive:true,filter:filename=>!filename.endsWith('pose-atlas.png')&&!filename.endsWith('README.md')});
  const cute=path.join(web,'hosts-cute-v3');await fs.mkdir(cute,{recursive:true});
  for(const host of ['polly','pengu','retsba','abster'])await fs.copyFile(path.join(source,'hosts-cute-v3',host+'.webp'),path.join(cute,host+'.webp'));
  // Preserve the sportier v3.5.1 launcher exactly, including the themed icon.
  const sport=path.join(source,'sport-v1');
  if(await fs.stat(sport).catch(()=>null)){
    await fs.copyFile(path.join(sport,'icon.webp'),path.join(web,'icon.webp'));
    await fs.cp(path.join(sport,'res'),res,{recursive:true});
  }

}
