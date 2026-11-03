import defaults from './sanyouPositions.json' with {type:'json'};
import {read,write} from './storage.js';
import {fitSanyouPieceSizes} from '../../../frontend/src/games/san-you-qi/sanyouPieceSizing.js';

export const SANYOU_BOARD_ID=defaults.board;
const previousKey='sanyou-calibration.'+SANYOU_BOARD_ID;
export const SANYOU_CALIBRATION_KEY=previousKey+'.pieces-142585';
export const SANYOU_EDITOR_URL='https://arcticdominion.xyz/assets/heritage-arcade/sanyou-piece-placement.html';
export const SANYOU_POINT_IDS=Object.freeze(Object.keys(defaults.points));
export const defaultCalibration=()=>JSON.parse(JSON.stringify(defaults));
export function validateCalibration(input){
 const value=typeof input==='string'?JSON.parse(input):input;
 if(!value||value.version!==1||value.board!==SANYOU_BOARD_ID||value.width!==1536||value.height!==1536)throw Error('Choose a position file for this San You Qi board.');
 if(!Number.isFinite(value.pieceSize)||value.pieceSize<40||value.pieceSize>100)throw Error('Piece size must be between 40 and 100.');
 if(!value.points||typeof value.points!=='object'||Object.keys(value.points).length!==156)throw Error('The file must contain all 156 game points.');
 const points={};
 for(const id of SANYOU_POINT_IDS){
  const point=value.points[id];
  if(!Array.isArray(point)||point.length!==2||point.some(n=>!Number.isFinite(n)||n<0||n>1536))throw Error('Invalid position for '+id+'.');
  points[id]=point.map(n=>Math.round(n*100)/100);
 }
 const seen=new Set();
 for(const p of Object.values(points)){const key=p.join(',');if(seen.has(key))throw Error('Two points occupy the same position. Move one before saving.');seen.add(key);}
 return {version:1,board:SANYOU_BOARD_ID,width:1536,height:1536,pieceSize:value.pieceSize,points};
}
export function currentCalibration(){try{return validateCalibration(read(SANYOU_CALIBRATION_KEY,null));}catch{try{return {...validateCalibration(read(previousKey,null)),pieceSize:defaults.pieceSize};}catch{return defaultCalibration();}}}
export function saveCalibration(value){const valid=validateCalibration(value);if(!write(SANYOU_CALIBRATION_KEY,valid))throw Error('Could not save these positions. Export a backup first.');return valid;}
export function resetCalibration(){return saveCalibration(defaultCalibration());}
export function calibrationPieceSizes(value){return fitSanyouPieceSizes(SANYOU_POINT_IDS.map(id=>({id,x:value.points[id][0],y:value.points[id][1]})),value.pieceSize);}
export function sanyouBoardGeometry(){const value=currentCalibration(),sizes=calibrationPieceSizes(value);return {viewBox:'0 0 1536 1536',artCalibration:SANYOU_BOARD_ID,image:'art/boards/sanyou-ice-white-v2.png',overlay:'art/boards/sanyou-ice-white-v2-grid.svg',imageWidth:1536,imageHeight:1536,size:value.pieceSize,cells:SANYOU_POINT_IDS.map(id=>({id,x:value.points[id][0],y:value.points[id][1],size:sizes[id],label:id.startsWith('C')?id:id.replace(':',' ').toUpperCase()}))};}
