import defaults from './sanyouPositions.json' with {type:'json'};
import previousImage from './sanyouPreviousPositions.json' with {type:'json'};
import legacy from './sanyouLegacyPositions.json' with {type:'json'};
import {validateCalibration,SANYOU_POINT_IDS} from './sanyouCalibration.js';

// Read the two JSON declarations from the original website export. Never run
// pasted JavaScript. The optional CSS section may be absent or truncated.
function declaration(text,name){
 const match=new RegExp('\\b(?:const|let|var)\\s+'+name+'\\s*=\\s*').exec(text);
 if(!match)throw Error('Paste both SANYOU_POSITIONS and SANYOU_CUSTOM_POINTS.');
 const start=match.index+match[0].length,open=text[start],close=open==='{'?'}':open==='['?']':null;
 if(!close)throw Error('The saved coordinates must contain JSON arrays and objects.');
 let depth=0,quoted=false,escape=false;
 for(let i=start;i<text.length;i++){
  const c=text[i];
  if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;continue;}
  if(c==='"'){quoted=true;continue;}
  if(c===open)depth++;
  if(c===close&&--depth===0)return JSON.parse(text.slice(start,i+1));
 }
 throw Error('The saved coordinate declaration is incomplete.');
}
const normalized=p=>Array.isArray(p)&&p.length===2&&p.every(n=>Number.isFinite(n)&&n>=0&&n<=1);
export function alignLegacyPositions(input){
 const value=typeof input==='string'?{positions:declaration(input,'SANYOU_POSITIONS'),customPoints:declaration(input,'SANYOU_CUSTOM_POINTS')}:input;
 const arms=value?.positions||value?.SANYOU_POSITIONS,center=value?.customPoints||value?.SANYOU_CUSTOM_POINTS;
 if(!arms||Object.keys(arms).sort().join(',')!=='blue,green,red'||!Array.isArray(center)||center.length!==21)throw Error('Include three armies of 45 points and all 21 central points.');
 const original={},reference={},groups={};
 for(const team of ['red','green','blue']){
  if(!Array.isArray(arms[team])||arms[team].length!==45||!arms[team].every(normalized))throw Error('Each army must contain 45 normalized coordinate pairs.');
  arms[team].forEach((p,i)=>{const id=team+':L'+(Math.floor(i/5)+1)+'-'+(i%5+1);original[id]=p;reference[id]=legacy.positions[team][i];groups[id]=team;});
 }
 const centerReference=Object.fromEntries(legacy.customPoints.map(p=>[p.name,[p.x,p.y]]));
 for(const p of center){
  if(!p||!Object.hasOwn(centerReference,p.name)||Object.hasOwn(original,p.name)||!normalized([p.x,p.y]))throw Error('Use every saved C-point name exactly once.');
  original[p.name]=[p.x,p.y];reference[p.name]=centerReference[p.name];groups[p.name]='center';
 }
 const points={};
 for(const id of SANYOU_POINT_IDS){
  const d=original[id].map((n,i)=>n-reference[id][i]),m=legacy.adjustmentScale[groups[id]],base=defaults.points[id];
  points[id]=value.board===defaults.board?original[id].map(n=>n*1536):[base[0]+d[0]*m[0][0]+d[1]*m[1][0],base[1]+d[0]*m[0][1]+d[1]*m[1][1]];
 }
 return validateCalibration({...defaults,pieceSize:value.board===defaults.board?(value.pieceSize??defaults.pieceSize):defaults.pieceSize,points});
}
export function importSanyouPositions(input){
 if(typeof input==='string'){
  if(input.length>75000)throw Error('Choose a coordinate export smaller than 75 KB.');
  if(/\b(?:const|let|var)\s+SANYOU_POSITIONS\s*=/.test(input))return alignLegacyPositions(input);
  input=JSON.parse(input);
 }
 // Explicitly migrate older image exports by their relative edits.
 if([previousImage.board,'sanyou-142247-v3'].includes(input?.board)){
  const old=validateCalibration({...input,board:defaults.board});
  for(const id of SANYOU_POINT_IDS)old.points[id]=old.points[id].map((n,i)=>defaults.points[id][i]+n-previousImage.points[id][i]);
  return validateCalibration(old);
 }
 if(input?.positions||input?.SANYOU_POSITIONS)return alignLegacyPositions(input);
 // Carry earlier edits onto the corrected reference network, rather than
 // restoring the mistaken outer-border central positions from v1/v2.
 if(['sanyou-142247-v1','sanyou-142247-v2'].includes(input?.board)){
  const previous=validateCalibration({...input,board:defaults.board});
  for(const id of SANYOU_POINT_IDS){const ref=legacy.previousCentralPositions[id]||previousImage.points[id];previous.points[id]=previous.points[id].map((n,i)=>n+defaults.points[id][i]-ref[i]);}
  return validateCalibration(previous);
 }
 return validateCalibration(input);
}
export function exportSanyouCSS(input){
 const value=validateCalibration(input);
 return '/* San You Qi — final approved image; 1536 × 1536 logical coordinates. Use each stable ID as data-point. */\n.sanyou-points { position: relative; aspect-ratio: 1 / 1; }\n.sanyou-point { position: absolute; transform: translate(-50%, -50%); }\n'+SANYOU_POINT_IDS.map(id=>{
  const p=value.points[id];return '.sanyou-point[data-point="'+id+'"] { left: '+(p[0]/15.36).toFixed(3)+'%; top: '+(p[1]/15.36).toFixed(3)+'%; }';
 }).join('\n')+'\n';
}
export function exportSanyouNormalized(input){
 const value=validateCalibration(input),positions={},custom=[];
 for(const team of ['red','green','blue'])positions[team]=SANYOU_POINT_IDS.filter(id=>id.startsWith(team+':')).map(id=>value.points[id].map(n=>+(n/1536).toFixed(8)));
 for(const id of SANYOU_POINT_IDS.filter(id=>id.startsWith('C'))){const [x,y]=value.points[id];custom.push({name:id,team:'neutral',x:+(x/1536).toFixed(8),y:+(y/1536).toFixed(8),left:(x/15.36).toFixed(3)+'%',top:(y/15.36).toFixed(3)+'%'});}
 return JSON.stringify({board:value.board,width:1536,height:1536,pieceSize:value.pieceSize,SANYOU_POSITIONS:positions,SANYOU_CUSTOM_POINTS:custom},null,2)+'\n';
}
