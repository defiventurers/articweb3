import {pieces} from './games.ts';

// App presentation versions are independent of the online ruleset protocol.
export const APP_VERSION='1.1.0';
export const GAME_PRESENTATION={
  shogi:{tag:'9 × 9 · Captures become drops',shape:'Square board',goal:'Checkmate the opposing King.',tips:['Move and capture with your army on the 9 × 9 board.','Captured pieces enter your hand. Drop one back onto an empty legal square.','Eligible pieces can promote in the far three ranks. Always keep your King safe.']},
  sannin:{tag:'127 hexes · Three armies',shape:'Hexagonal board',goal:'Reach the central Pleasure Garden safely, or become the last surviving player.',tips:['Red, Green and Blue take turns across 127 hexes. Directions follow your army’s seat.','Captured pieces change owner and enter your hand for later drops.','Promotion, royal powers and alliances matter. Open the full rules before your first complete game.']},
  sanguo:{tag:'Three sectors · Army takeover',shape:'Three-sector board',goal:'Become the last surviving kingdom.',tips:['Three armies meet across the river and connected sector routes.','Chariots slide; Cannons capture over one screen. Horses and Elephants can be blocked.','Defeating a General gives you the surviving army. Its original colors stay visible with an owner ring.']},
  sanyou:{tag:'Y board · Fire and Flags',shape:'Three-arm board',goal:'Keep your General safe and defeat the opposing kingdoms.',tips:['Three armies share a Y-shaped board with river, mountain and fort restrictions.','Fire takes one forward diagonal step. Flags advance exactly two clear forward steps at home.','Enemy territory changes Flag and Soldier movement. Legal highlights include the terrain restrictions.']},
  yanyi:{tag:'Three armies · Yellow Han',shape:'Four-region board',goal:'Use the chosen free-play rules to conquer the rival kingdoms.',tips:['Green, Blue and Red command three armies. The yellow Han pieces start as a separate imperial force.','The game’s activation and takeover rules decide who controls Han. Yellow artwork remains yellow.','Select a piece to see legal destinations. An orange ring marks an opponent you can capture.']},
  xiangqi:{tag:'River · Palaces · Cannons',shape:'River board',goal:'Checkmate or stalemate the opposing General.',tips:['Red and Blue play on intersections; Blue represents the traditional Black side.','Palaces restrict Generals and Advisors. Elephants stay on their own side of the river.','Cannons capture over exactly one screen. Never leave the two Generals facing along an open file.']},
};

// Uses actual accepted positions, so chats and ready changes never fabricate a move.
export function describeTransition(id,before,after){
  if(!before||!after)return null;
  const previous=new Map(pieces(id,before).map(p=>[p.id,p]));
  const next=pieces(id,after);
  const moving=next.find(p=>previous.has(p.id)&&previous.get(p.id).cell!==p.cell);
  if(moving)return {from:previous.get(moving.id).cell,to:moving.cell,label:moving.label};
  const dropped=next.find(p=>!previous.has(p.id));
  return dropped?{from:null,to:dropped.cell,label:`${dropped.label} (drop)`}:null;
}

export function parseInvitation(value){
  const text=String(value||'').trim();
  if(/^[A-Z2-9]{6}$/i.test(text))return text.toUpperCase();
  const candidates=/\s/.test(text)?text.match(/(?:https:\/\/|arcticplay:\/\/)[^\s]+/g)||[]:[text];
  const codes=new Set();
  for(const candidate of candidates){try{
    const url=new URL(candidate);
    if(url.protocol==='arcticplay:'&&url.hostname==='room'){
      const code=url.pathname.replace(/^\//,'');
      if(/^[A-Z2-9]{6}$/i.test(code))codes.add(code.toUpperCase());
    }
    if(url.protocol==='https:'&&url.hostname==='articweb3.onrender.com'&&url.pathname==='/arctic-play/join'){
      const code=url.searchParams.get('room')||'';
      if(/^[A-Z2-9]{6}$/i.test(code))codes.add(code.toUpperCase());
    }
  }catch{}}
  return codes.size===1?[...codes][0]:null;
}
