import path from 'node:path';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';

// Package the generated artwork at Android's required sizes. The master artwork
// and the original host references are never repainted or regenerated here.
export async function buildBrand(mobile,destination){
  const require=createRequire(path.resolve(mobile,'../../frontend/package.json'));
  const sharp=require('sharp');
  const source=path.join(mobile,'art/brand');
  const mark=await sharp(path.join(source,'icon-foreground.png')).trim().png().toBuffer();
  const background='#071b38';
  const res=path.join(mobile,'android/app/src/main/res');
  async function write(relative,content){const file=path.join(res,relative);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,content);}
  for(const [density,size] of [['mdpi',48],['hdpi',72],['xhdpi',96],['xxhdpi',144],['xxxhdpi',192]]){
    const piece=await sharp(mark).resize(Math.round(size*.84),Math.round(size*.84),{fit:'inside'}).png().toBuffer();
    const icon=await sharp({create:{width:size,height:size,channels:4,background}}).composite([{input:piece,gravity:'centre'}]).png().toBuffer();
    await write(`mipmap-${density}/ic_launcher.png`,icon);
  }
  // A 232 px tall emblem on a 432 px foreground fits the circular 66/108 safe zone.
  const safe=await sharp(mark).resize(232,232,{fit:'inside'}).png().toBuffer();
  const foreground=await sharp({create:{width:432,height:432,channels:4,background:'#00000000'}}).composite([{input:safe,gravity:'centre'}]).png().toBuffer();
  await write('drawable-nodpi/ic_launcher_foreground.png',foreground);
  await write('values/brand.xml',`<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">${background}</color></resources>\n`);
  const adaptive=monochrome=>`<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@drawable/ic_launcher_foreground"/>${monochrome?'\n    <monochrome android:drawable="@drawable/ic_launcher_foreground"/>':''}\n</adaptive-icon>\n`;
  await write('mipmap-anydpi-v26/ic_launcher.xml',adaptive(false));
  await write('mipmap-anydpi-v33/ic_launcher.xml',adaptive(true));
  const web=path.join(destination,'art/brand');await fs.mkdir(web,{recursive:true});
  const webPiece=await sharp(mark).resize(480,480,{fit:'inside'}).png().toBuffer();
  await sharp({create:{width:512,height:512,channels:4,background:'#00000000'}}).composite([{input:webPiece,gravity:'centre'}]).webp({quality:92,alphaQuality:100}).toFile(path.join(web,'icon.webp'));
  await fs.cp(path.join(source,'hosts'),path.join(web,'hosts'),{recursive:true});
}
