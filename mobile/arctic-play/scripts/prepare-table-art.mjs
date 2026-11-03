// Encode the approved image-generation masters without cropping or repainting.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.resolve(mobile,'../../frontend/package.json'));
const sharp=require('sharp');
const root=path.join(mobile,'art/tables-3d-v3');
const tables={
  shogi:'Uploaded blue-and-gold ice Shogi board on a thick wood slab, with Retsba, Pengu and upright shogi wedges',
  sannin:'Faceted hexagonal sapphire table with stepped buttresses',
  sanguo:'Three thick river territories on a fortress pedestal',
  sanyou:'Three-armed observatory table with flags and fire miniatures',
  yanyi:'Dragon-carved lacquer court on a golden lantern pedestal',
  xiangqi:'Jade river-bridge table on arched trestles',
  dominion:'Four-tower ice arena table with a separate dice shelf',
};
const manifest=[];
for(const [id,description] of Object.entries(tables)){
  const file=id+'.webp',master=path.join(root,'masters',id+'.png');
  const input=await sharp(master).metadata();
  if(input.width!==1536||input.height!==1024)throw new Error(id+': expected a 3:2 master');
  const buffer=await sharp(master).resize(1200,800,{fit:'inside',withoutEnlargement:true}).webp({quality:90,effort:6}).toBuffer();
  await fs.writeFile(path.join(root,file),buffer);
  manifest.push({id,file,description,width:1200,height:800,bytes:buffer.length,sha256:createHash('sha256').update(buffer).digest('hex'),master:'masters/'+id+'.png',kind:'illustrative-3d-scene'});
}
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Encoded seven complete 3D table scenes: '+(manifest.reduce((sum,v)=>sum+v.bytes,0)/1024/1024).toFixed(2)+' MiB total.');
