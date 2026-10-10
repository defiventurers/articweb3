// The Android app shares rule authorities with Heritage Arcade without editing them.
import * as sh from '../../../frontend/src/games/shogi-frozen-shogunate/rules.js';
import * as ss from '../../../frontend/src/games/sannin-shogi/rules.js';
import { HEX_CELLS } from '../../../frontend/src/games/sannin-shogi/hex.js';
import { artworkPoint, BATTLE_VIEWBOX } from '../../../frontend/src/games/sannin-shogi/boardGeometry.js';
import placement from '../../../frontend/src/games/sannin-shogi/publishedPiecePlacement.json';
import * as sg from '../../../frontend/src/games/heritage-arcade/ported/game/sanguoRules.ts';
import { arcticBoardNode } from '../../../frontend/src/games/heritage-arcade/ported/game/sanguoArcticBoardGraph.ts';
import * as sy from '../../../frontend/src/games/san-you-qi/rules.js';
import { parseArmNode } from '../../../frontend/src/games/san-you-qi/topology.js';
import * as yy from '../../../frontend/src/games/heritage-arcade/ported/game/sanguoYanYiRules.ts';
import { yanYiPixelPoint, yanYiPieceSprite, YAN_YI_CHAPTERS, YAN_YI_ROLE_HELP } from '../../../frontend/src/games/heritage-arcade/ported/game/sanguoYanYiPresentation.ts';
import * as xq from '../../../frontend/src/games/heritage-arcade/ported/game/xiangqiRules.ts';

export const VERSION = 'arctic-play-1.0.0';
export const COLORS = { red: '#ed5269', blue: '#348ff4', black: '#348ff4', green: '#31b788', han: '#e4b848' };
export const GAME_LIST = [
  { id: 'shogi', name: 'Shogi', subtitle: 'Every capture is a new possibility', seats: ['red', 'blue'], players: 2, tag: 'Japanese chess', accent: '#b8693c', icon: 'shogi/red-king.webp' },
  { id: 'sannin', name: 'Sannin Shogi', subtitle: 'Three kingdoms. One hexagonal board.', seats: ['red', 'green', 'blue'], players: 3, tag: 'Three-player shogi', accent: '#82714d', icon: 'sannin/red-king.webp' },
  { id: 'sanguo', name: 'Sanguo Qi', subtitle: 'Make your move across three kingdoms', seats: ['red', 'green', 'blue'], players: 3, tag: 'Three-player chess', accent: '#087c98', icon: 'tokens/token-sanguo-blue-general.webp' },
  { id: 'sanyou', name: 'San You Qi', subtitle: 'A world of fire, flags and strategy', seats: ['red', 'green', 'blue'], players: 3, tag: 'Three-player chess', accent: '#199b82', icon: 'sanyou/green_team_SWfacing_general.webp' },
  { id: 'yanyi', name: 'Sanguo Yan Yi Qi', subtitle: 'Alliances, the Han Emperor and conquest', seats: ['green', 'blue', 'red'], players: 3, tag: 'Three Kingdoms', accent: '#7653a6', icon: 'yanyi/pieces/han-emperor.webp' },
  { id: 'xiangqi', name: 'Xiangqi', subtitle: 'The classic battle across the river', seats: ['red', 'black'], players: 2, tag: 'Chinese chess', accent: '#ad454b', icon: 'tokens/token-sanguo-red-general.webp' },
];
export const game = (id) => GAME_LIST.find(item => item.id === id);
export const seatName = (id, seat) => seat === 'black' ? 'Blue' : ({red:'Red',green:'Green',blue:'Blue',han:'Han'})[seat] || seat;
export const asset = (path) => `art/${path}`;
const tokenRoot = 'tokens/token-sanguo-';
const sanguoRoles = {king:'general',guard:'advisor',seer:'elephant',rider:'horse',runner:'bannerman',icebreaker:'chariot',cannon:'cannon',scout:'soldier'};
const title = (value) => String(value || '').replace(/-/g,' ').replace(/^./, x => x.toUpperCase());
const k = (point) => typeof point === 'object' ? JSON.stringify(point) : String(point);
const sgKey = (n) => `${n.sector}-${n.rank}-${n.file}`;
const yyKey = (n) => `${n.x},${n.y}`;
const xqKey = (n) => `${n.row},${n.col}`;

export function create(id) {
  switch(id) {
    case 'shogi': return sh.createShogiState();
    case 'sannin': return ss.createInitialState();
    case 'sanguo': return sg.initialSanguoState();
    case 'sanyou': return sy.createInitialState();
    case 'yanyi': return yy.createYanYiState();
    case 'xiangqi': return xq.initialXiangqiState();
    default: throw new Error('Choose one of the six Arctic games.');
  }
}
export function result(state) {
  if (state.mobileResult) return state.mobileResult;
  if (state.outcome) return {winner:state.outcome.winner || state.outcome.winners?.join(' + ') || null, reason:state.outcome.reason || state.outcome.type || 'Game over', draw:state.outcome.type === 'draw'};
  if (state.winner || state.draw) return {winner:state.winner || null, draw:!!state.draw, reason:state.result || (typeof state.draw === 'string' ? state.draw : state.draw ? 'Draw' : 'Last surviving kingdom')};
  return null;
}
export const turn = (state) => state.turn;

export function actions(id, state) {
  if (result(state)) return [];
  let raw = [];
  if(id === 'shogi') raw = sh.getLegalActions(state);
  if(id === 'sannin') raw = ss.getLegalActions(state);
  if(id === 'sanyou') raw = sy.getLegalActions(state);
  if(id === 'sanguo') {
    if(state.pending) raw = [{kind:'claim'}];
    else raw = state.pieces.filter(p=>!p.captured && p.controller===state.turn).flatMap(p=>sg.legalSanguoTargets(p,state.pieces).map(to=>({kind:'move',pieceId:p.id,to})));
  }
  if(id === 'yanyi') raw = state.pieces.filter(p=>!p.inactive && p.owner===state.turn).flatMap(p=>yy.legalYanYiTargets(state,p).map(to=>({kind:'move',pieceId:p.id,to:{x:to.x,y:to.y}})));
  if(id === 'xiangqi') raw = state.pieces.filter(p=>p.side===state.turn).flatMap(p=>xq.legalTargets(p,state.pieces).map(to=>({kind:'move',pieceId:p.id,to:{row:to.row,col:to.col}})));
  return raw.map(a=> {
    const kind = a.kind || a.type;
    const source = kind === 'drop' ? `hand:${a.pieceId || a.type}` : id === 'shogi' ? `piece:${state.board[a.from]?.id}` : `piece:${a.pieceId || 'claim'}`;
    const target = a.to == null ? null : id==='sanguo' ? sgKey(a.to) : id==='yanyi' ? yyKey(a.to) : id==='xiangqi' ? xqKey(a.to) : String(a.to);
    return {id:`${kind}|${source}|${target ?? ''}|${a.promote ? 1 : 0}`, source, target, kind, promote:!!a.promote, raw:a};
  });
}
export function apply(id, state, actionId) {
  const action = actions(id,state).find(a=>a.id === actionId);
  if(!action) throw new Error('That move is no longer legal. The board has been refreshed.');
  const a = action.raw;
  let next;
  if(id==='shogi') { const r=sh.applyShogiAction(state,a); if(r.error) throw new Error(r.error); next=r.state; }
  if(id==='sannin') { const r=ss.applyAction(state,a); if(r.error) throw new Error(r.error.message); next=r.state; }
  if(id==='sanyou') { const r=sy.applyAction(state,a); if(r.error) throw new Error(r.error.message); next=sy.resolveStalemate(r.state); }
  if(id==='sanguo') {
    next=a.kind==='claim' ? sg.resolveSanguoAppropriation(state) : sg.applySanguoMove(state,a.pieceId,a.to);
    // Claiming a defeated army is mandatory, so complete it before offering the next turn.
    for(let i=0;next?.pending && i<3;i++) next=sg.resolveSanguoAppropriation(next);
  }
  if(id==='yanyi') next=yy.applyYanYiMove(state,a.pieceId,{x:a.to.x,y:a.to.y});
  if(id==='xiangqi') next=xq.applyXiangqiMove(state,a.pieceId,{row:a.to.row,col:a.to.col});
  if(!next) throw new Error('The rules rejected this move.');
  return next;
}
export function inCheck(id,state) {
  if(result(state)) return false;
  if(id==='shogi') return sh.isInCheck(state,state.turn);
  if(id==='sannin') return ss.isInCheck(state,state.turn);
  if(id==='sanyou') return sy.isInCheck(state,state.turn);
  if(id==='sanguo') return sg.generalIsAttacked(state.turn,state.pieces);
  if(id==='yanyi') return yy.yanYiIsInCheck(state,state.turn);
  return xq.isInCheck(state.turn,state.pieces);
}
export function hand(id,state) {
  if(id==='shogi') return sh.HAND_TYPES.filter(t=>state.hands[state.turn][t]>0).map(type=>({source:`hand:${type}`,label:title(type),count:state.hands[state.turn][type],sprite:asset(`shogi/${state.turn}-${type}.webp`)}));
  if(id==='sannin') return ss.getHand(state,state.turn).map(p=>({source:`hand:${p.id}`,label:title(p.type),count:1,sprite:asset(`sannin/${p.owner}-${ss.assetRole(p)}.webp`)}));
  return [];
}
export function board(id) {
  if(id==='shogi') return {viewBox:'0 0 900 1000',width:900,height:1000,size:88,grid:true,cells:Array.from({length:81},(_,i)=>({id:String(i),x:90+(i%9)*90,y:140+Math.floor(i/9)*90,label:`File ${9-i%9}, rank ${Math.floor(i/9)+1}`}))};
  if(id==='sannin') return {viewBox:BATTLE_VIEWBOX,image:asset('sannin/board.webp'),imageWidth:1334,imageHeight:1179,size:56,cells:HEX_CELLS.map(c=>({id:c.id,...artworkPoint(c,placement[c.id]),label:`Hex ${c.id}`}))};
  if(id==='sanguo') return {viewBox:'65 20 1160 1055',image:asset('boards/sanguo.webp'),imageWidth:1280,imageHeight:1280,size:56,cells:['red','green','blue'].flatMap(sector=>Array.from({length:45},(_,i)=> {const n={sector,rank:Math.floor(i/9),file:i%9};const p=arcticBoardNode(sector,n.rank,n.file);return {id:sgKey(n),x:p.x*1280,y:p.y*1280,label:`${title(sector)}, file ${n.file+1}, rank ${n.rank+1}`};}))};
  if(id==='sanyou') return {viewBox:'110 65 780 625',image:asset('boards/sanyou.webp'),imageWidth:1000,imageHeight:857.46,size:43,cells:sy.allNodes().map(n=>{const p=sy.getNodePoint(n);return {id:n,x:p[0]*1000,y:p[1]*857.46,label:sy.getNodeLabel(n)};})};
  if(id==='yanyi') return {viewBox:'45 25 1440 1460',image:asset('yanyi/yan-yi-arctic-board.webp'),imageWidth:1536,imageHeight:1536,size:70,cells:yy.YAN_YI_POINTS.map(n=>({id:yyKey(n),...yanYiPixelPoint(n),label:`Column ${n.x+1}, row ${n.y+1}`}))};
  const xs=[105.6842,187.2919,269.563,353.8246,453.3461,556.8485,641.11,723.3812,804.3254];
  const ys=[87.0335,169.5933,256.3158,337.488,416.5789,507.4641,584.4737,662.177,746.1244,831.4593];
  return {viewBox:'40 35 832 870',image:asset('boards/xiangqi.webp'),imageX:40,imageY:35,imageWidth:832,imageHeight:870,size:73,cells:Array.from({length:90},(_,i)=>({id:`${Math.floor(i/9)},${i%9}`,x:xs[i%9],y:ys[Math.floor(i/9)],label:`File ${i%9+1}, rank ${Math.floor(i/9)+1}`}))};
}
export function pieces(id,state) {
  if(id==='shogi') return state.board.flatMap((p,i)=>p ? [{id:p.id,source:`piece:${p.id}`,cell:String(i),owner:p.side,origin:p.side,label:sh.displayPieceName(p),sprite:asset(`shogi/${p.side}-${sh.assetRole(p)}.webp`),rotation:p.side==='blue'?180:0}] : []);
  if(id==='sannin') return state.pieces.filter(p=>p.status==='board').map(p=>({id:p.id,source:`piece:${p.id}`,cell:p.cell,owner:p.owner,origin:p.owner,label:title(p.type)+(p.promoted?' (promoted)':''),sprite:asset(`sannin/${p.owner}-${ss.assetRole(p)}.webp`),rotation:{red:-120,green:0,blue:120}[p.owner]}));
  if(id==='sanguo') return state.pieces.filter(p=>!p.captured).map(p=>({id:p.id,source:`piece:${p.id}`,cell:sgKey(p.node),owner:p.controller,origin:p.sector,label:sg.roleLabels[p.role],sprite:asset(`${tokenRoot}${p.sector}-${sanguoRoles[p.role]}.webp`)}));
  if(id==='sanyou') return state.pieces.filter(p=>p.status==='board').map(p=>{
    const arm=parseArmNode(p.node);const pt=sy.getNodePoint(p.node);
    const facing=p.faction==='blue'?'SEfacing':p.faction==='green'?'SWfacing':arm?.faction==='red'?(arm.lane<5?'NWfacing':arm.lane>5?'NEfacing':'backfacing'):arm?.faction==='blue'?'NWfacing':arm?.faction==='green'?'NEfacing':pt[0]<.485?'NWfacing':pt[0]>.515?'NEfacing':'backfacing';
    return {id:p.id,source:`piece:${p.id}`,cell:p.node,owner:p.owner,origin:p.faction,label:sy.ROLE_LABELS[p.role]+(p.promoted?' (promoted)':''),sprite:asset(`sanyou/${p.faction}_team_${facing}_${p.role==='advisor'?'guard':p.role}.webp`)};
  });
  if(id==='yanyi') return state.pieces.map(p=>({id:p.id,source:`piece:${p.id}`,cell:yyKey(p),owner:p.owner,origin:p.origin,inactive:!!p.inactive,label:yy.YAN_YI_ROLE_SHORT[p.role],sprite:asset(yanYiPieceSprite(p).replace('/assets/heritage-arcade/sanguo-yan-yi','yanyi'))}));
  return state.pieces.map(p=>({id:p.id,source:`piece:${p.id}`,cell:xqKey(p),owner:p.side,origin:p.side,label:xq.ROLE_LABELS[p.role],sprite:asset(`${tokenRoot}${p.side==='black'?'blue':'red'}-${p.role}.webp`)}));
}
const values={king:1000,general:1000,emperor:50,rook:10,chariot:10,icebreaker:10,bishop:9,horse:5,rider:5,cannon:6,elephant:3,seer:3,gold:5,silver:4,knight:3,lance:3,advisor:2,guard:2,pawn:1,soldier:1,scout:1,fire:5,flag:5};
export function chooseBot(id,state) {
  const choices=actions(id,state);
  if(!choices.length) return null;
  const visible=pieces(id,state), byCell=new Map(visible.map(p=>[p.cell,p]));
  const rawPieces=id==='shogi'?state.board.filter(Boolean):state.pieces;
  const rawById=new Map(rawPieces.map(p=>[p.id,p]));
  const cells=board(id).cells, byNode=new Map(cells.map(c=>[c.id,c]));
  const [, ,width,height]=board(id).viewBox.split(' ').map(Number);
  const scored=choices.map(a=> {
    const victim=byCell.get(a.target), rawVictim=victim&&rawById.get(victim.id);
    const cell=byNode.get(a.target),moving=visible.find(p=>p.source===a.source),from=moving&&byNode.get(moving.cell);
    const distance=cell? Math.hypot(cell.x-width/2,cell.y-height/2):0;
    const progress=from&&cell? (Math.hypot(from.x-width/2,from.y-height/2)-distance)/100:0;
    return {action:a,score:(rawVictim ? values[rawVictim.type||rawVictim.role]||2:0)*10+(a.promote?4:0)+progress+Math.random()*2-(a.kind==='castle'?1:0)};
  }).sort((a,b)=>b.score-a.score);
  // Casual, one-ply ranking. Do not evaluate complete successor states here:
  // Sannin drop/alliance validation already performs substantial rule work.
  return scored[0].action.id;
}
export function forfeit(id,state,seat) {
  if(result(state)) return state;
  if(id==='yanyi') return yy.resignYanYi(state,seat) || state;
  if(id==='sanguo') return sg.resignSanguoFaction(state,seat) || state;
  if(game(id).players===2) return {...state,mobileResult:{winner:game(id).seats.find(s=>s!==seat),reason:'Resignation',draw:false}};
  // Three-player Shogi / San You use a bot replacement when a player leaves,
  // rather than introducing a new elimination rule to their canonical engines.
  throw new Error('Your seat will be handed to a practice bot when you leave this match.');
}
export const RULES = {
  shogi:[{title:'The goal',paragraphs:['Two players take turns on a 9 × 9 board. Red opens. Checkmate the opposing King. You must answer check and may not expose your own King. A side with no legal move loses.']},{title:'Movement',paragraphs:['King: one square in any direction. Rook: any clear orthogonal distance. Bishop: any clear diagonal distance. Gold: one forward, sideways, backward straight or forward diagonal. Silver: one forward or any diagonal. Knight: two forward and one sideways. Lance: any clear distance forward. Pawn: one square forward.']},{title:'Promotion and drops',paragraphs:['Moving into, out of or within the farthest three ranks permits eligible pieces to promote. Promoted Rook adds one-step diagonal movement; promoted Bishop adds one-step orthogonal movement. Promoted Silver, Knight, Lance and Pawn move as Gold. Promotion is mandatory when a Pawn, Lance or Knight would have no future unpromoted move.','Captured pieces return to your hand unpromoted. On your turn, drop one onto an empty square. Never drop a Pawn in a file already containing your unpromoted Pawn, or deliver immediate checkmate with a Pawn drop. Pawns and Lances cannot drop on the last rank; Knights cannot drop on the last two. Fourfold repetition draws except perpetual check, which loses for the checking side.'] }],
  sannin:[{title:'Three-player Shogi',paragraphs:['A 127-cell hexagonal board with Red, Green and Blue taking turns. Each army starts with 18 pieces. Win by safely moving your unallied King into the central Pleasure Garden, or by becoming the final surviving player. The table follows the Fairbairn–Kapitan digital rules used by Heritage Arcade.']},{title:'Movement',paragraphs:['King: one adjacent hex. An illuminated King ranges along all twelve main and radian lines. Rook: four main lines and the directly rear radian; a promoted Rook uses all six main lines. Bishop: all six radian lines; a promoted Bishop also steps to all adjacent cells.','Gold: six steps, using four main directions and forward/rear radian directions; it never promotes. Silver: four diagonal forward/rear main steps and two forward radian steps; promotion adds forward/rear radian ranges. Knight: two sideways main steps and four sideways radian steps; it neither jumps nor promotes. Lance: ranges on two forward main lines; promotion adds two rear main ranges. Pawn: one step on either forward main line; promotion gives Gold movement.','Radian landing cells are two hexes apart. Rays pass between the two flanking cells; pieces in those flanking cells do not block them. Directions are relative to each army’s seat. Tap a piece to see every legal destination.']},{title:'Captures, drops and promotion',paragraphs:['A captured piece changes owner, demotes and enters the captor’s hand. A drop uses your whole turn. There is no two-Pawns-on-a-file rule. Dead Pawn/Lance drops and immediate Pawn-drop mate are forbidden.','King, Rook, Bishop, Silver, Lance and Pawn may promote when entering, leaving or staying in an opponent’s territory, or entering/leaving the Garden. Promotion is mandatory for a Pawn or Lance that would otherwise have no future move. Choose Promote or Keep when both are legal.']},{title:'Royal powers and alliances',paragraphs:['Before moving or ever being checked, a King may castle-jump to a legal point anywhere in its own three-rank territory. Castling destinations are offered separately from ordinary moves. A promoted King may illuminate all twelve rays: it captures the first enemy on each eligible ray only if neither opponent protects that enemy. The Illuminate button appears when this action is legal.','Certain consecutive material-winning attacks compel an alliance. Allies may capture each other’s nonroyal pieces, but cannot check one another. They lose promotion and Garden rights; unused castling ends, and the lone King illuminates. Mating either ally defeats both. If the allies mate the lone player, that army leaves play and the alliance dissolves. This app starts with three independent armies.']},{title:'Repetition and draws',paragraphs:['A move recreating an earlier full position is illegal; the initiator must vary. A player with no legal action while not checked causes a draw.'] }],
  sanguo:[{title:'Three kingdoms',paragraphs:['Red, Green and Blue each begin with 16 pieces on three 5 × 9 sectors: General, two Advisors, Elephants, Horses, Chariots and Cannons, and five Soldiers. Red opens. The river and junction connections determine how moves continue into other sectors.']},{title:'Movement and capture',paragraphs:['General and Advisors stay within their palace. Elephant eyes and Horse legs can block movement. Chariots slide on clear logical ranks and files; Cannons need exactly one intervening screen to capture. Soldiers advance in their controller’s direction and gain sideways moves after the river.','You may not expose your own General or leave facing Generals on an open logical file. Checkmate or stalemate defeats a kingdom. The victor receives its surviving army; the defeated General leaves play. The mobile table completes this mandatory appropriation automatically. Original colors remain visible, and an owner ring identifies inherited pieces. The last surviving kingdom wins; repeated positions or the engine’s no-progress rule can draw.'] }],
  sanyou:[{title:'The finalized Arctic board',paragraphs:['Three armies play on 156 intersections: 135 arm points and 21 approved central points. Each has 18 pieces. Red opens, then Green and Blue. A checked kingdom answers immediately; an interrupted turn resumes when check is cleared.']},{title:'Pieces and special units',paragraphs:['General, Advisor, Elephant, Horse, Chariot and Cannon use the Xiangqi movement adapted to this board’s legal lines. Tap any piece for every legal destination; a central junction never lets a sliding piece turn arbitrarily. Fire moves one diagonal step forward and never retreats.','Flag moves exactly two clear forward steps in its own camp. After entering enemy territory it becomes Chariot-like and cannot return to exclusive home territory. It may return to its original camp’s shared gate at C1, C7 or C13, but stops there. Soldier always moves one forward; first entry into enemy territory promotes it and adds sideways movement.']},{title:'Terrain and territories',paragraphs:['Extended-river crossings C3–C17, C5–C9 and C15–C11 block Chariots. They block Horses only when used for the first orthogonal leg. Cannons may cross. Mountain crossings C2–C18, C6–C8 and C14–C12 block Cannons. At Forts, a Cannon may stop on C1, C7 or C13 from its own side, but cannot continue through into the opposite kingdom.','C20, C22 and C24 are legal stopping points on continuation routes; they are not horizontal H-lines. Red’s camp owns C2–C6 and C20; Green owns C8–C12 and C22; Blue owns C14–C18 and C24. C1 is shared Red/Blue, C7 Red/Green, C13 Green/Blue. Shared gates are home for both owning camps and do not trigger promotion.']},{title:'Victory and online seats',paragraphs:['Check safety, repetition, checkmate, stalemate and army inheritance use the same rules as Heritage Arcade. Inherited pieces keep their faction art and show the controlling player’s ring. The last surviving kingdom wins. A player leaving an online room hands the seat to a casual bot.'] }],
  yanyi:[...YAN_YI_CHAPTERS,{title:'Piece guide',paragraphs:Object.entries(YAN_YI_ROLE_HELP).map(([role,text])=>`${title(role)}: ${text}`)}],
  xiangqi:[{title:'The goal',paragraphs:['Two armies of 16 pieces use the 90 intersections of a 9-file, 10-rank board. Red opens; Blue represents the traditional Black side. Win by checkmate or stalemate. The two Generals may never face one another along an empty file.']},{title:'Piece movement',paragraphs:['General: one orthogonal point in its 3 × 3 palace. Advisor: one diagonal point in the palace. Elephant: two diagonal points with an empty eye, and may not cross the river. Horse: an L-shaped move with an empty orthogonal leg. Chariot: any clear orthogonal distance. Cannon: clear orthogonal movement; captures over exactly one screen. Soldier: one forward; after the river it also moves one sideways, never backward.','Moves that fail to answer check or expose your General are illegal. This table preserves the Heritage Arcade edition; it does not adjudicate tournament perpetual chase or repetition.'] }],
};
