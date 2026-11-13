// Reproducible locator jigs from actual app geometry; not final sculpted products.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createInitialState as commanderState} from '../frontend/src/games/co-tu-lenh/rules.js';
const require=createRequire(import.meta.url),g=require('../mobile/arctic-play/build/games.cjs'),sh=require('../mobile/arctic-play/build/shanshui.cjs');
const output=path.resolve(process.argv[2]||'physical-layouts');fs.mkdirSync(output,{recursive:true});
const boards=g.GAME_LIST.map(def=>({id:def.id,name:def.name,board:g.board(def.id),pieces:g.pieces(def.id,g.create(def.id))}));
boards.push({id:'shanshui-xiangqi',name:'Shanshui Xiangqi',board:sh.board(),pieces:sh.pieces('shanshui-xiangqi',sh.create('shanshui-xiangqi'))});
const ctl=commanderState();boards.push({id:'co-tu-lenh',name:'Cờ Tư Lệnh',board:{viewBox:'0 0 1199 1312',cells:Array.from({length:132},(_,i)=>({id:`${i%11},${Math.floor(i/11)}`,x:148+i%11*90.4,y:183+(11-Math.floor(i/11))*900/11}))},pieces:ctl.pieces});
const index=[];
for(const item of boards){
 const [, ,w,h]=item.board.viewBox.split(/\s+/).map(Number),width=450,height=450*h/w,margin=12;
 const points=item.board.cells.map(p=>({id:p.id,xMm:margin+p.x/w*width,yMm:margin+p.y/h*height}));
 let nearest=Infinity;for(let a=0;a<points.length;a++)for(let b=a+1;b<points.length;b++)nearest=Math.min(nearest,Math.hypot(points[a].xMm-points[b].xMm,points[a].yMm-points[b].yMm));
 const record={id:item.id,name:item.name,status:'ENGINEERING LOCATOR JIG — NOT FINAL PRODUCT',units:'mm',source:'Current app board geometry; cell IDs preserved',boardMm:[width+2*margin,height+2*margin,4],nearestCentersMm:nearest,maxSuggestedBaseDiameterMm:Math.floor(nearest*.75),points,startingPieces:item.pieces};
 fs.writeFileSync(path.join(output,item.id+'.json'),JSON.stringify(record,null,2)+'\n');
 const pointList=points.map(p=>`[${p.xMm.toFixed(4)},${(height+2*margin-p.yMm).toFixed(4)}]`).join(',');
 const scad=`// ${record.status}\n// ${item.name}: ${points.length} locations from app geometry. No move-route engraving.\n// 450mm field plus 12mm border. Cut into printer-bed-sized sections before production.\n$fn=24;\npoints=[${pointList}];\ndifference(){cube([${(width+2*margin).toFixed(4)},${(height+2*margin).toFixed(4)},4]);for(p=points)translate([p[0],p[1],3.6])cylinder(h=.8,r=1.2);}\n`;
 fs.writeFileSync(path.join(output,item.id+'.scad'),scad);
 index.push({id:item.id,name:item.name,locations:points.length,startingPieces:item.pieces.length,nearestCentersMm:+nearest.toFixed(3),maxSuggestedBaseDiameterMm:record.maxSuggestedBaseDiameterMm,status:record.status});
}
fs.writeFileSync(path.join(output,'inventory.json'),JSON.stringify(index,null,2)+'\n');console.log(JSON.stringify(index,null,2));
