import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {YAN_YI_BOUNDARY_MARKERS,YAN_YI_GUARDIAN_ART} from '../src/yanYiBoardArtwork.js';
const require=createRequire(import.meta.url),engine=require('../build/games.cjs'),sharp=createRequire(new URL('../../../frontend/package.json',import.meta.url))('sharp');
const colours={blue:(r,g,b)=>b>r*1.3&&b>g*1.05&&g>r*1.2,green:(r,g,b)=>g>r*1.2&&g>b*1.2,red:(r,g,b)=>r>g*1.35&&r>b*1.3,han:(r,g,b)=>r>140&&g>90&&r>g*1.05&&g>b*1.4};
test('all four sets of eight boundary dots match the artwork at the actual game coordinates',async()=>{
 const board=engine.board('yanyi'),cells=new Map(board.cells.map(c=>[c.id,c]));assert.equal(board.artCalibration,'guardian-v3');assert.equal(board.cells.length,225);assert.equal(board.viewBox,'0 0 1536 1536');
 assert.equal(new Set(YAN_YI_BOUNDARY_MARKERS.map(p=>p.x+','+p.y)).size,32);
 for(const color of Object.keys(colours))assert.equal(YAN_YI_BOUNDARY_MARKERS.filter(p=>p.color===color).length,8);
 for(const file of [new URL('../art/boards/yanyi-guardian-v3-master.png',import.meta.url),new URL('../android/app/src/main/assets/art/yanyi/yan-yi-arctic-board.webp',import.meta.url)]){
  const{data,info}=await sharp(fileURLToPath(file)).removeAlpha().raw().toBuffer({resolveWithObject:true}),scale=info.width/1536;
  for(const marker of YAN_YI_BOUNDARY_MARKERS){const cell=cells.get(marker.x+','+marker.y),x=Math.round(cell.x*scale),y=Math.round(cell.y*scale),radius=Math.ceil(5*info.width/1254);let matches=0;
   for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const i=((y+dy)*info.width+x+dx)*info.channels;if(colours[marker.color](data[i],data[i+1],data[i+2]))matches++;}
   assert(matches>=20,`${marker.color} dot at ${cell.id} must align with its visible inlaid marker`);
  }
 }
});
// Measure the circular edge away from the horizontal/vertical grid lines. A hue
// check alone accepted the oversized, overly dark marbles in the previous art.
const homeDots={blue:[483,204],green:[1048,487],red:[483,1048],han:[141,487]};
function dotMetrics(data,info,x,y){
 const scale=info.width/1254;
 const sample=(nx,ny)=>{const px=nx*scale,py=ny*scale,ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy;
  return [0,1,2].map(c=>(data[(iy*info.width+ix)*info.channels+c]*(1-fx)+data[(iy*info.width+ix+1)*info.channels+c]*fx)*(1-fy)+(data[((iy+1)*info.width+ix)*info.channels+c]*(1-fx)+data[((iy+1)*info.width+ix+1)*info.channels+c]*fx)*fy);};
 let previous=null,edge={radius:0,change:0},hueX=0,hueY=0;
 for(let radius=2;radius<=9;radius+=.5){let rgb=[0,0,0],n=0;
  for(let a=0;a<Math.PI*2;a+=Math.PI/64){if(Math.min(Math.abs(Math.sin(a)),Math.abs(Math.cos(a)))<.4)continue;
   const c=sample(x+radius*Math.cos(a),y+radius*Math.sin(a));rgb=rgb.map((v,k)=>v+c[k]);n++;
   if(radius>=2.5&&radius<=4.5){const[r,g,b]=c,max=Math.max(...c),min=Math.min(...c),delta=max-min;
    if(delta/max>.3){let h=max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;h*=Math.PI/3;hueX+=Math.cos(h)*delta;hueY+=Math.sin(h)*delta;}}
  }
  rgb=rgb.map(v=>v/n);if(previous&&radius>=5){const change=Math.hypot(...rgb.map((v,k)=>v-previous[k]));if(change>edge.change)edge={radius:radius-.25,change};}previous=rgb;
 }
 return{radius:edge.radius,hue:Math.atan2(hueY,hueX)};
}
test('boundary inlays match the home-dot size and palette in both master and app image',async()=>{
 for(const file of [new URL('../art/boards/yanyi-guardian-v3-master.png',import.meta.url),new URL('../android/app/src/main/assets/art/yanyi/yan-yi-arctic-board.webp',import.meta.url)]){
  const{data,info}=await sharp(fileURLToPath(file)).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const homes=Object.fromEntries(Object.entries(homeDots).map(([color,[x,y]])=>[color,dotMetrics(data,info,x,y)]));
  for(const marker of YAN_YI_BOUNDARY_MARKERS){const m=dotMetrics(data,info,YAN_YI_GUARDIAN_ART.x[marker.x],YAN_YI_GUARDIAN_ART.y[marker.y]),reference=homes[marker.color];
   const hueDifference=Math.abs(Math.atan2(Math.sin(m.hue-reference.hue),Math.cos(m.hue-reference.hue)))*180/Math.PI;
   assert(Math.abs(m.radius-reference.radius)<=1.25,`${marker.color} ${marker.x},${marker.y}: radius ${m.radius} must match home radius ${reference.radius}`);
   assert(hueDifference<=18,`${marker.color} ${marker.x},${marker.y}: hue differs ${hueDifference.toFixed(1)} degrees from its home inlay`);
  }
 }
});
test('slightly larger pieces retain a gap at every horizontal and vertical neighbour',()=>{
 const b=engine.board('yanyi'),cells=new Map(b.cells.map(c=>[c.id,c]));assert(b.size>70);let pairs=0;
 for(const a of b.cells){const[x,y]=a.id.split(',').map(Number);for(const [nx,ny] of [[x+1,y],[x,y+1]]){const next=cells.get(`${nx},${ny}`);if(!next)continue;
  const distance=Math.hypot(next.x-a.x,next.y-a.y);assert(distance-b.size>=1,`Pieces on ${a.id} and ${next.id} need a visible gap, including the full sprite bounds`);pairs++;
 }}assert.equal(pairs,416);
});
test('new framing retains the complete initial army and all canonical playable points',()=>{
 const b=engine.board('yanyi'),state=engine.create('yanyi'),cells=new Map(b.cells.map(c=>[c.id,c]));assert.equal(engine.pieces('yanyi',state).length,53);
 for(const c of b.cells){const[x,y]=c.id.split(',').map(Number);assert(x>=4&&x<=12||y>=4&&y<=12);assert(c.x>=0&&c.x<=1536&&c.y>=0&&c.y<=1536);}
 for(const p of engine.pieces('yanyi',state))assert(cells.has(p.cell),p.id);
 assert.equal(engine.VERSION,'arctic-play-1.0.0');
});
