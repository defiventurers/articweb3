import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {FESTIVAL_STICKERS} from '../src/celebration.js';
const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.resolve(mobile,'../../frontend/package.json')),sharp=require('sharp');
const output=path.resolve(process.argv[2]||'celebration-deliverables/asset-pack');await fs.mkdir(output,{recursive:true});
const art=path.join(mobile,'art/celebration');
for(const dir of ['masters','scenes','stickers'])await fs.cp(path.join(art,dir),path.join(output,dir),{recursive:true});
for(const file of ['prompt-set.json','manifest.json'])await fs.copyFile(path.join(art,file),path.join(output,file));
await fs.copyFile(path.join(mobile,'RELEASE-3.8.0.md'),path.join(output,'Visual-and-Story-Guide.md'));
await fs.mkdir(path.join(output,'sticker-png'),{recursive:true});
for(const s of FESTIVAL_STICKERS)await sharp(path.join(mobile,'android/app/src/main/assets',s.image)).png().toFile(path.join(output,'sticker-png',s.id.replace('festival-','')+'.png'));
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function textSvg(width,height,rows){return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${rows.map(r=>`<text x="${r.x}" y="${r.y}" font-family="DejaVu Sans,sans-serif" font-size="${r.size||21}" font-weight="${r.bold?'bold':'normal'}" fill="${r.color||'#e9f8ff'}" text-anchor="${r.anchor||'start'}">${esc(r.text)}</text>`).join('')}</svg>`);}
const sheets=path.join(output,'overview');await fs.mkdir(sheets,{recursive:true});
const stickerW=1440,stickerH=1320,stickerLayers=[],stickerText=[{x:50,y:65,text:'THE ETERNAL GATHERING',size:28,bold:true},{x:50,y:104,text:'12 free festival stickers · Polly / Retsba / Pengu / Abster',size:20,color:'#afd7e6'}];
for(const[i,s]of FESTIVAL_STICKERS.entries()){const col=i%4,row=Math.floor(i/4),left=30+col*350,top=145+row*380;stickerLayers.push({input:await sharp(path.join(output,'sticker-png',s.id.replace('festival-','')+'.png')).resize(290,290).png().toBuffer(),left:left+25,top});stickerText.push({x:left+170,y:top+318,text:s.host[0].toUpperCase()+s.host.slice(1),size:20,bold:true,anchor:'middle'},{x:left+170,y:top+349,text:s.label,size:17,anchor:'middle',color:'#f6ddac'});}
stickerLayers.push({input:textSvg(stickerW,stickerH,stickerText),left:0,top:0});await sharp({create:{width:stickerW,height:stickerH,channels:4,background:'#0b2a42'}}).composite(stickerLayers).png().toFile(path.join(sheets,'Festival-Stickers.png'));
const scenes=[['lantern-harbor-festival','Lantern Harbor Festival'],['xiangqi','Xiangqi · River Between Stars'],['shogi','Shogi · Second Sunrises'],['sannin','Sannin Shogi · Three Paths'],['sanguo','Sanguo Qi · Changing Banners'],['sanyou','San You Qi · Observatory'],['yanyi','Yan Yi · Yellow Lantern Court'],['dominion','Arctic Dominion · Four Clans'],['festival-friends','Festival Friends'],['lantern-passport','Your Lantern Passport'],['eighth-lantern-celebration','Eighth Lantern Celebration']];
const sceneW=1470,sceneH=1660,sceneLayers=[],sceneText=[{x:40,y:59,text:'REMARKABLE GAMES. AN ENDLESS CELEBRATION.',size:26,bold:true},{x:40,y:97,text:'11 original story scenes · The Eternal Gathering',size:20,color:'#afd7e6'}];
for(const[i,[id,title]]of scenes.entries()){const left=30+i%3*480,top=135+Math.floor(i/3)*375;sceneLayers.push({input:await sharp(path.join(output,'scenes',id+'.webp')).resize(450,300).png().toBuffer(),left,top});sceneText.push({x:left+225,y:top+330,text:title,size:18,bold:true,anchor:'middle'});}
sceneLayers.push({input:textSvg(sceneW,sceneH,sceneText),left:0,top:0});await sharp({create:{width:sceneW,height:sceneH,channels:4,background:'#0b2a42'}}).composite(sceneLayers).png().toFile(path.join(sheets,'Celebration-Scenes.png'));
await fs.writeFile(path.join(output,'README.md'),'# The Eternal Gathering — Celebration Asset Pack\n\n23 final generated originals: 11 scenes and 12 stickers.\n\n- masters/: full-size original PNGs.\n- scenes/: optimized scene and game-card WebPs.\n- stickers/: optimized transparent sticker WebPs.\n- sticker-png/: 512 × 512 transparent PNGs, ready to share.\n- overview/: labelled scene and sticker contact sheets.\n- prompt-set.json: original generation briefs and refinement instructions.\n- Visual-and-Story-Guide.md: game/story mapping and app integration.\n\nThe Antarctic halls are fiction celebrating each game’s distinct tradition or chosen edition. Existing playable boards and pieces are retained separately in the app.\n\nIn the app: Profile → Festival stickers. During a match: table chat → Festival stickers. Share exports an ordinary transparent PNG; native messaging sticker-pack installation is not included.\n');
console.log(JSON.stringify({output,originals:23,stickers:12,scenes:11,overviewSheets:2}));
