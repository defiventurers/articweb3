// Encode approved generated masters; no generated scene, host or piece repainting.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.resolve(mobile,'../../frontend/package.json')),sharp=require('sharp');
const root=path.join(mobile,'art/celebration');
const entries=JSON.parse(await fs.readFile(path.join(root,'generation-inputs.json'),'utf8'));
const seen=new Set(),manifest=[];
for(const item of entries){
  if(seen.has(item.id))throw Error('Duplicate art ID: '+item.id);seen.add(item.id);
  const original=path.join(root,'masters',item.id+'.png');
  const folder=item.kind==='sticker'?'stickers':'scenes',target=path.join(root,folder,item.id+'.webp');
  await fs.mkdir(path.dirname(target),{recursive:true});
  const incoming=await fs.readFile(item.path).catch(async()=>fs.readFile(original));
  const previous=await fs.readFile(original).catch(()=>null);
  const unchanged=previous?.equals(incoming)&&await fs.stat(target).catch(()=>null)&&(!item.hall||await fs.stat(path.join(root,'scenes',item.id+'-card.webp')).catch(()=>null));
  if(!unchanged)await fs.writeFile(original,incoming);
  const meta=await sharp(original).metadata();
  if(item.kind==='sticker'&&!meta.hasAlpha)throw Error('Sticker lacks alpha: '+item.id);
  if(!unchanged){let encoded=sharp(original);
  if(item.kind==='sticker')encoded=encoded.resize(448,448,{fit:'contain',background:'#00000000'}).extend({top:32,bottom:32,left:32,right:32,background:'#00000000'});
  else encoded=encoded.resize(1200,800,{fit:'inside',withoutEnlargement:true});
  await encoded.webp({quality:item.kind==='sticker'?92:84,alphaQuality:100,effort:6}).toFile(target);
  if(item.hall)await sharp(original).resize(960,640,{fit:'cover'}).webp({quality:84,effort:6}).toFile(path.join(root,'scenes',item.id+'-card.webp'));
  }
  const bytes=await fs.readFile(target),m=await sharp(bytes).metadata();
  manifest.push({id:item.id,kind:item.kind,master:'masters/'+item.id+'.png',file:folder+'/'+item.id+'.webp',width:m.width,height:m.height,hasAlpha:m.hasAlpha,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify({version:'3.8.0',generation:'Built-in Image Generation',sceneCount:entries.filter(x=>x.kind==='scene').length,stickerCount:entries.filter(x=>x.kind==='sticker').length,assets:manifest},null,2)+'\n');
console.log(JSON.stringify({masters:manifest.length,runtimeBytes:manifest.reduce((n,m)=>n+m.bytes,0),scenes:manifest.filter(x=>x.kind==='scene').length,stickers:manifest.filter(x=>x.kind==='sticker').length}));
