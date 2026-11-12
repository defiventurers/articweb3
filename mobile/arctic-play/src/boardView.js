import {board,game,asset} from './games.ts';

// Presentation only. These angles follow each original army's forward axis;
// canonical cell IDs, owners, turn order and legal actions never change.
const SEAT_ANGLES={
  shogi:{red:0,blue:180},
  xiangqi:{red:0,black:180},
  sannin:{red:120,green:0,blue:-120},
  sanguo:{red:0,green:120,blue:-120},
  sanyou:{red:0,green:120,blue:-120},
  yanyi:{red:0,green:90,blue:180},
  dominion:{green:0,red:-90,blue:90,yellow:180},
};
const THREE_ARM_BOARDS=new Set(['sannin','sanguo','sanyou']);

export function viewSeat(id,seat){
  const normalized=id==='xiangqi'&&seat==='blue'?'black':id==='dominion'&&seat==='pink'?'yellow':seat;
  return Object.hasOwn(SEAT_ANGLES[id]||{},normalized)?normalized:'red';
}

export function matchPerspective({id,online=false,seat,mode,humans=[],turn}){
  // A remote opponent's turn must never turn this player's camera. Offline
  // bots also keep the human's view. Only a shared phone follows the turn.
  return viewSeat(id,online?seat:mode==='hotseat'?turn:humans[0]||game(id)?.seats[0]);
}

export function pieceRotation(unit,angle=0){
  // Shogi wedges follow their army's forward direction. Round tokens and
  // illustrated characters stay upright so their faces and labels are readable.
  if(!Number.isFinite(unit.rotation))return 0;
  return ((unit.rotation+angle)%360+360)%360;
}

export function boardGeometry(id,perspective){
  // Presentation-only override: unchanged 8x8 IDs, positions, rotation and legal actions.\n  const base=board(id),g=id==='dominion'?{...base,image:asset('launch-v1/chaturanga-match/grid-v2.webp')}:base,seat=viewSeat(id,perspective),angle=SEAT_ANGLES[id][seat];
  if(!angle)return {...g,angle:0,perspective:seat};
  const [x,y,w,h]=g.viewBox.split(' ').map(Number),cx=x+w/2,cy=y+h/2;
  const radians=angle*Math.PI/180,cos=Math.cos(radians),sin=Math.sin(radians);
  const rotate=p=>({...p,x:cx+(p.x-cx)*cos-(p.y-cy)*sin,y:cy+(p.x-cx)*sin+(p.y-cy)*cos});
  const cells=g.cells.map(rotate);
  // Three-arm / hexagonal art is framed around its playable footprint. Using
  // the rectangular image corners would shrink the game into empty corners.
  // Square and rectangular boards retain their entire original frame.
  const footprint=THREE_ARM_BOARDS.has(id)?cells:[{x,y},{x:x+w,y},{x,y:y+h},{x:x+w,y:y+h}].map(rotate);
  const margin=THREE_ARM_BOARDS.has(id)?g.size*.72:0;
  const minX=Math.min(...footprint.map(c=>c.x))-margin,minY=Math.min(...footprint.map(c=>c.y))-margin;
  const maxX=Math.max(...footprint.map(c=>c.x))+margin,maxY=Math.max(...footprint.map(c=>c.y))+margin;
  return {...g,cells,angle,perspective:seat,backgroundTransform:`rotate(${angle} ${cx} ${cy})`,viewBox:`${minX} ${minY} ${maxX-minX} ${maxY-minY}`};
}
