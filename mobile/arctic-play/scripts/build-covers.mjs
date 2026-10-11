import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';

export async function buildCovers(mobile,destination){
  const require=createRequire(path.join(mobile,'../../frontend/package.json'));
  const sharp=require('sharp');
  const engine=require(path.join(mobile,'build/games.cjs'));
  const target=path.join(destination,'art/covers');
  await fs.mkdir(target,{recursive:true});
  // SVG's raster loader supports PNG consistently; inline WebP can render empty.
  const imageData=new Map();
  const data=async relative=>{
    if(!imageData.has(relative))imageData.set(relative,`data:image/png;base64,${(await sharp(path.join(destination,relative)).png().toBuffer()).toString('base64')}`);
    return imageData.get(relative);
  };
  const manifest=[];
  for(const definition of engine.GAME_LIST){
    const geometry=engine.board(definition.id),state=engine.create(definition.id);
    await fs.copyFile(path.join(mobile,'art/covers',`${definition.id}-scene-v1.webp`),path.join(target,`${definition.id}-scene-v1.webp`));
    const [x,y,width,height]=geometry.viewBox.split(' ').map(Number);
    const layers=[];
    if(geometry.image)layers.push(`<image xlink:href="${await data(geometry.image)}" x="${geometry.imageX||0}" y="${geometry.imageY||0}" width="${geometry.imageWidth}" height="${geometry.imageHeight}" preserveAspectRatio="none"/>`);
    else {
      layers.push('<rect width="900" height="1000" rx="24" fill="#d7ad6d"/><rect x="40" y="90" width="820" height="820" fill="#f4d7a2" stroke="#9b692e" stroke-width="4"/>');
      for(let i=0;i<10;i++)layers.push(`<path d="M ${45+i*90} 95 V 905 M 45 ${95+i*90} H 855" stroke="#73552d" stroke-width="2"/>`);
    }
    const cells=new Map(geometry.cells.map(cell=>[cell.id,cell]));
    const units=engine.pieces(definition.id,state);
    for(const piece of units){
      const cell=cells.get(piece.cell);
      if(!cell)throw new Error(`Cover piece missing a canonical cell: ${piece.id}`);
      const half=geometry.size/2;
      layers.push(`<image xlink:href="${await data(piece.sprite)}" x="${cell.x-half}" y="${cell.y-half}" width="${geometry.size}" height="${geometry.size}"${piece.rotation?` transform="rotate(${piece.rotation} ${cell.x} ${cell.y})"`:''}/>`);
    }
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="640" height="${Math.round(640*height/width)}" viewBox="${x} ${y} ${width} ${height}">${layers.join('')}</svg>`;
    const rendered=await sharp(Buffer.from(svg)).webp({quality:90,alphaQuality:100}).toBuffer();
    const stats=await sharp(rendered).stats();
    if(stats.channels[3]?.max===0||stats.entropy<1)throw new Error(`Empty board artwork for ${definition.id}`);
    await fs.writeFile(path.join(target,`${definition.id}-board-v1.webp`),rendered);
    manifest.push({id:definition.id,name:definition.name,cells:geometry.cells.length,pieces:units.length,scene:`${definition.id}-scene-v1.webp`,board:`${definition.id}-board-v1.webp`,geometrySource:'Canonical Heritage Arcade adapter; no generated board geometry'});
  }
  await fs.writeFile(path.join(target,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
}
