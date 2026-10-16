import {GAME_LIST,create,actions,apply,pieces,board} from './games.ts';

export const LEARNING_KEY='how-to-play.v1';
export const CHALLENGES=['move','capture','special'];
// Optional, authored resource links belong here once supplied. All lessons and
// free boards work offline; never guess the user's external board URL.
export const PRACTICE_LINKS={};

export const LESSONS={
  shogi:{board:'Two armies · 9 × 9 squares · Red moves first',goal:'Checkmate the other King: attack it so it has no safe reply.',turn:'Take one move, or drop one captured piece. Always keep your King safe.',move:'Tap the glowing Pawn, then a blue dot. A Pawn takes one step straight forward, even when it captures.',capture:'The rival Pawn is one step ahead. Land on its orange ring to capture it. It joins your hand!',special:'Your captured Pawn is waiting in hand. Tap it, then a blue dot to drop it back for your side.',cheer:['A tiny step, a lovely start!','A capture and a new helper in your hand.','Back on the board, now on your side!'],remember:['Your far three ranks are the promotion zone. Entering, leaving or moving within it can offer promotion.','Captured pieces demote before joining your hand. Pawn drops have extra restrictions; blue dots already include them.','Check must be answered. Checkmate wins; a side with no legal move loses. See the full rules for repetition.']},
  sannin:{board:'Three armies · 127 hexes · Red → Green → Blue',goal:'Move your unallied King safely into the central Pleasure Garden, or be the last surviving player.',turn:'Take one legal action. Your army’s forward directions rotate with its seat.',move:'Tap the glowing Pawn. Its two forward directions follow Red’s seat. Choose a blue dot for one little hex step.',capture:'An enemy Pawn is on one of your Pawn’s paths. Tap your Pawn, then the orange ring. The captured piece joins your hand.',special:'Let’s return a captured Pawn to play. Tap the piece in hand, then an empty blue dot. A drop uses your turn.',cheer:['One hex closer to understanding!','Caught it! Captured pieces can return for you.','A little helper rejoins your army.'],remember:['This Knight does not jump, and it does not promote. Do not use ordinary Shogi movement on this hex board.','Promotion, one-time castling, illuminated Kings and forced alliances have their own rules. Open the royal-powers chapter before a full game.','Allies lose Garden and promotion rights. Mating either ally defeats both. Legal highlights handle these restrictions.']},
  sanguo:{board:'Three sectors · 135 intersections · Red → Green → Blue',goal:'Defeat the other kingdoms and become the last surviving one.',turn:'Move one controlled piece along this board’s logical routes. Keep your General safe.',move:'Tap the glowing Soldier, then a blue dot. Forward follows your army’s sector; crossing the river adds sideways moves.',capture:'An enemy Soldier is on your path. Tap your Soldier, then its orange ring. Captures happen on the destination.',special:'A Cannon needs one piece in between to capture. Tap the Cannon, then the enemy beyond the single screen.',cheer:['A first step across your kingdom!','A clean capture. Well spotted!','One screen, one Cannon capture. Nicely done!'],remember:['Horses have blockable legs. Elephants have blockable eyes. Generals and Advisors stay in their palaces.','A Cannon moves through clear space, but needs exactly one screen to capture. It cannot jump a second screen.','Checkmate or stalemate defeats a kingdom. Its surviving army transfers automatically; an owner ring shows who controls it.']},
  sanyou:{board:'Three arms · 156 intersections · Red → Green → Blue',goal:'Keep your General safe and become the last surviving kingdom.',turn:'Follow the connected lines. A checked kingdom answers immediately, then an interrupted turn resumes.',move:'Tap the glowing Soldier, then a blue dot. Your first step follows your army’s forward route.',capture:'The enemy is on your Soldier’s route. Tap your Soldier, then the orange ring to try a capture.',special:'This is a Flag. At home it travels exactly two clear forward steps. Tap it and choose a blue dot.',cheer:['A tiny step on a very special board!','You found the capture route!','Two clear steps. Your Flag is on its way!'],remember:['Fire takes one forward diagonal step and never retreats. An enemy-territory Flag becomes Chariot-like; Soldiers gain sideways movement.','Rivers block Chariots and some Horse legs; mountains block Cannons. A Cannon cannot pass through a fort into the opposite kingdom.','A junction is not permission to turn. Use the legal highlights for the approved central routes, gates and terrain.']},
  yanyi:{board:'Three kingdoms + yellow Han · 225 cross intersections',goal:'Checkmate rival kingdoms and finish with the last surviving King.',turn:'Wu (Green) → Wei (Blue) → Shu (Red). A single checked kingdom answers immediately.',move:'Tap the glowing Soldier, then a blue dot. Soldiers here can step sideways at home; this is not ordinary Xiangqi.',capture:'An enemy Soldier is on your path. Tap your Soldier, then the orange ring. Active Kings are checkmated, not captured directly.',special:'We placed Wu’s Horse beside Han for this puzzle. Tap the Horse, then the yellow Emperor. Wu gains Han; Wei and Shu ally.',cheer:['One little step on the cross!','A capture, with your own King still safe.','Han is awake! Yellow art stays yellow; the owner ring shows control.'],remember:['Horse legs and Elephant eyes are not blocked by pieces in this edition. Their whole routes must still stay on the cross.','A Horse at another kingdom’s alliance point allies with it; the third kingdom gets Han. Capturing the Emperor is the other activation route.','Allies cannot capture or check each other. Checkmate transfers surviving armies. First-round Cannons stop at the starting Soldier line.']},
  xiangqi:{board:'Two armies · 90 intersections · Red moves first',goal:'Checkmate or stalemate the other General.',turn:'Move one piece per turn, on intersections. Keep your own General safe.',move:'Tap the glowing Soldier, then a blue dot. It moves one point forward. After the river, it can also step sideways.',capture:'An enemy Soldier is straight ahead. Tap your Soldier, then the orange ring to capture it.',special:'A Cannon captures over exactly one screen. Tap your Cannon, then the enemy behind the single piece between them.',cheer:['Your first step across the board!','You found the capture. Flippers up!','One screen is just right for a Cannon!'],remember:['General and Advisors stay in the palace. Elephants cannot cross the river, and a piece can block their eyes.','A blocked Horse leg stops that L-shaped move. The two Generals cannot face each other on an empty file.','Blue represents traditional Black. This edition does not adjudicate tournament perpetual chase or repetition.']},
  dominion:{board:'Four kingdoms · 8 × 8 squares · Green → Red → Blue → Pink',goal:'Capture the other original royal Frost Kings. Be the last kingdom standing.',turn:'Roll two dice, then spend each die on one move. Use either die first.',move:'These practice dice are fixed at 1 and 3. The 1 wakes a Guard or King. Tap the glowing Guard, then a blue dot.',capture:'Your Guard captures one diagonal step forward. Tap it, then the orange ring. This uses the practice die showing 1.',special:'A 3 wakes the Aurora Unicorn. Tap it, then a blue dot to jump two squares one way and one across: an L!',cheer:['One die, one tiny move!','A diagonal capture. Your Guard has it!','A lovely L-shaped leap!'],remember:['Dice: 1 or 5 = Guard or King; 2 = Mammoth; 3 = Unicorn; 4 or 6 = Icebreaker. Each die buys one move.','There is no check or checkmate restriction. Losing your original royal King removes your whole army.','Guards promote at the far edge according to the landing square. Promoted Kings are fighters; losing one does not eliminate the kingdom.']},
};

const shogiPieces=[
  ['king','King','One square in any direction. Keep it safe from check.','It never promotes.'],
  ['rook','Rook','Slide along a clear row or column. Stop at the first piece.','Promoted: Dragon King adds one-step diagonals.'],
  ['bishop','Bishop','Slide along a clear diagonal.','Promoted: Dragon Horse adds one-step straight moves.'],
  ['gold','Gold General','One step forward, sideways, straight back or diagonally forward.','No backward diagonals; never promotes.'],
  ['silver','Silver General','One step forward or on any diagonal.','Promoted: moves like a Gold General.'],
  ['knight','Knight','Jump two squares forward and one sideways.','Promoted: moves like a Gold General.'],
  ['lance','Lance','Slide any clear distance straight forward.','Promoted: moves like a Gold General.'],
  ['pawn','Pawn','One square straight forward, for moving and capturing.','Promoted Pawn (Tokin): moves like a Gold General.'],
];
const xiangqiPieces=[
  ['general','General','One straight step inside its 3 × 3 palace.','Always answer check and avoid facing the opposing General.'],
  ['advisor','Advisor','One diagonal step inside the palace.','Its job is to help shelter the General.'],
  ['elephant','Elephant','Exactly two diagonal steps. A piece on the middle eye blocks it.','In Xiangqi, it stays on its own side of the river.'],
  ['horse','Horse','One straight step, then one diagonal step out: an L.','A piece on the first straight step blocks that route.'],
  ['chariot','Chariot','Slide along a clear row or column.','Capture the first enemy on the route; never jump a piece.'],
  ['cannon','Cannon','Move straight through clear space.','To capture, jump exactly one screen and land on the enemy.'],
  ['soldier','Soldier','One forward step; after the river, also one sideways.','Never move backward.'],
];
export const PIECE_GUIDES={
  shogi:shogiPieces,
  sannin:[
    ['king','King','One adjacent hex.','Promoted: ranges on all twelve main and radian lines. See royal powers for castling and illumination.'],
    ['rook','Rook','Four main rays and the directly rear radian ray.','Promoted: all six main rays.'],
    ['bishop','Bishop','Slide on all six radian rays.','Promoted: also steps to any adjacent hex.'],
    ['gold','Gold General','Four main steps and forward/rear radian steps.','Six choices relative to your seat; never promotes.'],
    ['silver','Silver General','Four forward/rear diagonal main steps and two forward radian steps.','Promoted: adds forward/rear radian ranges.'],
    ['knight','Knight','Two sideways main steps and four sideways radian steps.','It does not jump and never promotes.'],
    ['lance','Lance','Slide on the two forward main rays.','Promoted: also ranges on the two rear main rays.'],
    ['pawn','Pawn','One step on either forward main line.','Promoted: moves like a Gold. Radian rays pass between the flanking hexes.'],
  ],
  xiangqi:xiangqiPieces,
  sanguo:xiangqiPieces.map(([role,name,move,note])=>[({general:'king',advisor:'guard',elephant:'seer',horse:'rider',chariot:'icebreaker',soldier:'scout'})[role]||role,name,move,role==='elephant'?'Uses its home-sector Elephant network; the middle eye can block it.':role==='general'?'Palace safety and open-file facing restrictions apply across logical routes.':role==='soldier'?'Forward follows its original sector. After crossing its river, sideways movement is allowed.':note]),
  sanyou:[...xiangqiPieces.map(([role,name,move,note])=>[role,name,role==='chariot'?'Slide along a clear approved line; never turn at a junction.':role==='soldier'?'One forward step. Entry into enemy territory promotes it and adds sideways moves.':move,role==='elephant'?'Uses its approved home-camp Elephant points; an occupied eye blocks the route.':role==='horse'?'A blocked first leg stops the Horse. Some river legs also block it.':role==='cannon'?'One screen to capture. Mountains and forts also restrict Cannon routes.':role==='general'?'Stay in your palace and answer check immediately.':role==='soldier'?'Shared home gates do not trigger promotion.':note]),['fire','Fire','One forward diagonal step.','Never retreats. Look for the highlighted forward routes.'],['flag','Flag','Exactly two clear forward steps in its own camp.','In enemy territory it becomes Chariot-like and cannot re-enter exclusive home territory.']],
  yanyi:[
    ['king','King','One straight step within its own palace.','You also protect an allied King. The ordinary flying-General rule is not used.'],
    ['advisor','Advisor','One diagonal step on its palace points.','Inherited Advisors may transfer to the controller’s palace, one Advisor per whole move.'],
    ['elephant','Elephant','Exactly two diagonal steps on the controlled seven-point networks.','Pieces do not block its eye; the route must stay on the cross. Inheritance can open neighboring networks.'],
    ['horse','Horse','An L-shaped move: two along one axis, one across.','Pieces do not block its leg. The whole route stays on the cross; Horses can activate Han.'],
    ['chariot','Chariot','Any clear straight distance across the cross.','Stop at the first piece. Friendly and allied destinations are blocked.'],
    ['cannon','Cannon','Clear straight moves; exactly one screen to capture.','During the first full round, it cannot pass its starting Soldier line.'],
    ['soldier','Soldier','One straight point. At home: forward or sideways.','Beyond the national boundary it may retreat, but not behind that boundary. Direction follows the controller.'],
    ['emperor','Han Emperor','The inactive Emperor does not move.','A Horse captures it to activate Han. The three yellow Chariots and Cannon then show their new owner’s ring.'],
  ],
  dominion:[
    ['king','Frost King','One square in any direction.','Die 1 or 5. Your original royal King is vital; a promoted fighting King is not royal.'],
    ['elephant','War Mammoth','Slide any clear distance along a row or column.','Die 2. This Mammoth moves like a rook, not a Xiangqi Elephant.'],
    ['horse','Aurora Unicorn','Jump two squares one way and one across: an L.','Die 3. It can jump over intervening pieces.'],
    ['ship','Icebreaker','Jump exactly two squares diagonally.','Die 4 or 6. The middle square may be occupied.'],
    ['pawn','Snow Guard','One empty square forward; capture one diagonal step forward.','Die 1 or 5. Promotes automatically on the far edge. Forward rotates with your kingdom.'],
  ],
};

const clone=value=>JSON.parse(JSON.stringify(value));
export function rawUnits(id,state){return id==='shogi'?state.board.filter(Boolean):id==='dominion'?state.board.flat().filter(Boolean):state.pieces;}
export function unitRole(id,piece){return id==='shogi'||id==='sannin'||id==='dominion'?piece.type:piece.role;}
function owner(id,piece){return piece.owner||piece.controller||piece.side||piece.team;}
function atCell(id,piece,cell){
  if(id==='sannin')return {...piece,cell,status:'board'};
  if(id==='sanyou')return {...piece,node:cell,status:'board'};
  if(id==='sanguo'){const [sector,rank,file]=cell.split('-');return {...piece,node:{sector,rank:+rank,file:+file}};}
  if(id==='yanyi'){const [x,y]=cell.split(',').map(Number);return {...piece,x,y};}
  const [row,col]=cell.split(',').map(Number);return {...piece,row,col};
}
function relocate(id,state,pieceId,cell){
  const visible=pieces(id,state),original=rawUnits(id,state).find(p=>p.id===pieceId);
  const victim=visible.find(p=>p.cell===cell&&p.id!==pieceId);
  if(id==='shogi')state.board=state.board.map(p=>p?.id===pieceId||p?.id===victim?.id?null:p),state.board[+cell]=original;
  else if(id==='dominion'){state.board=state.board.map(row=>row.map(p=>p?.id===pieceId||p?.id===victim?.id?null:p));const [r,c]=cell.split(',').map(Number);state.board[r][c]=original;}
  else state.pieces=state.pieces.filter(p=>p.id!==victim?.id).map(p=>p.id===pieceId?atCell(id,p,cell):p);
}
const pawnRole=id=>({sanguo:'scout',sanyou:'soldier',yanyi:'soldier',xiangqi:'soldier'})[id]||'pawn';
function findUnit(id,state,role,side=state.turn){return rawUnits(id,state).find(p=>unitRole(id,p)===role&&owner(id,p)===side);}
function describe(id,state,filter){
  const legal=actions(id,state).filter(filter);
  if(!legal.length)throw new Error('This teaching position has no matching legal move.');
  const focus=legal[0].source;
  return {state,legal:legal.filter(a=>a.source===focus),focus};
}
function fewDropSpots(id,position){
  const cells=board(id).cells,byId=new Map(cells.map(c=>[c.id,c]));
  const royal=pieces(id,position.state).find(p=>p.owner===position.state.turn&&p.label==='King'),anchor=byId.get(royal?.cell)||cells[0];
  return {...position,legal:[...position.legal].sort((a,b)=>{const x=byId.get(a.target),y=byId.get(b.target);return Math.hypot(x.x-anchor.x,x.y-anchor.y)-Math.hypot(y.x-anchor.x,y.y-anchor.y);}).slice(0,4)};
}
export function lessonPosition(id,kind){
  if(!Object.hasOwn(LESSONS,id)||!CHALLENGES.includes(kind))throw new Error('Choose a lesson from this game.');
  const state=create(id),pawn=findUnit(id,state,pawnRole(id));
  if(id==='dominion')state.dice={rolled:true,values:kind==='special'?[3,4]:[1,3],used:[false,false]};
  if(kind==='move')return describe(id,state,a=>a.source===`piece:${pawn.id}`&&a.kind==='move'&&!a.promote);
  if(kind==='capture'){
    // An arranged teaching position, not a recorded or saved match. Relocate one
    // enemy Pawn/Soldier, then ask the canonical engine to validate the capture.
    const foe=GAME_LIST.find(g=>g.id===id).seats.find(s=>s!==state.turn);
    const enemy=findUnit(id,state,pawnRole(id),foe);
    let candidates;
    if(id==='dominion'){
      const pos=pieces(id,state).find(p=>p.id===pawn.id),[r,c]=pos.cell.split(',').map(Number);
      candidates=[`${r-1},${c+1}`,`${r-1},${c-1}`].filter(cell=>board(id).cells.some(c=>c.id===cell)&&!pieces(id,state).some(p=>p.cell===cell));
    }else candidates=actions(id,state).filter(a=>a.source===`piece:${pawn.id}`&&a.kind==='move').map(a=>a.target);
    for(const cell of candidates){
      const sample=clone(state);relocate(id,sample,enemy.id,cell);
      try{return {...describe(id,sample,a=>a.source===`piece:${pawn.id}`&&a.target===cell&&!a.promote),victim:enemy.id};}catch{}
    }
    throw new Error('The capture lesson needs a valid teaching position.');
  }
  if(id==='shogi'){
    state.board=state.board.map(p=>p?.id===pawn.id?null:p);state.hands.red.pawn=1;
    return fewDropSpots(id,describe(id,state,a=>a.kind==='drop'&&a.source==='hand:pawn'));
  }
  if(id==='sannin'){
    const captive=findUnit(id,state,'pawn','green');Object.assign(captive,{owner:'red',status:'hand',cell:null,promoted:false});
    return fewDropSpots(id,describe(id,state,a=>a.kind==='drop'&&a.source===`hand:${captive.id}`));
  }
  if(id==='sanyou'){
    const flag=findUnit(id,state,'flag');return describe(id,state,a=>a.source===`piece:${flag.id}`&&a.kind==='move');
  }
  if(id==='yanyi'){
    const horse=findUnit(id,state,'horse');relocate(id,state,horse.id,'2,7');
    return describe(id,state,a=>a.source===`piece:${horse.id}`&&a.target==='0,8');
  }
  if(id==='dominion'){
    const horse=findUnit(id,state,'horse');return describe(id,state,a=>a.source===`piece:${horse.id}`&&a.kind==='move');
  }
  const cannon=findUnit(id,state,'cannon'),screen=findUnit(id,state,pawnRole(id));
  const enemy=findUnit(id,state,pawnRole(id),id==='xiangqi'?'black':'green');
  const screenCell=id==='xiangqi'?'5,1':'red-2-3',target=id==='xiangqi'?'3,1':'red-2-5';
  relocate(id,state,screen.id,screenCell);relocate(id,state,enemy.id,target);
  return {...describe(id,state,a=>a.source===`piece:${cannon.id}`&&a.target===target),victim:enemy.id};
}

export function piecePosition(id,role){
  const state=create(id),chosen=findUnit(id,state,role)||(id==='yanyi'&&role==='emperor'?state.pieces.find(p=>p.role==='emperor'):null);
  if(!chosen)throw new Error('Choose a piece from the guide.');
  if(id==='dominion'){
    state.dice={rolled:true,values:[({king:1,pawn:1,elephant:2,horse:3,ship:4})[role],6],used:[false,true]};
    state.board=state.board.map(row=>row.map(p=>p&&p.team===state.turn&&!p.isRoyal&&p.id!==chosen.id?null:p));
  }else if(id==='shogi')state.board=state.board.map(p=>p&&p.side===state.turn&&p.type!=='king'&&p.id!==chosen.id?null:p);
  else state.pieces=state.pieces.filter(p=>owner(id,p)!==state.turn||['king','general'].includes(unitRole(id,p))||p.id===chosen.id);
  // Keep the forward Soldiers in Sanguo/Xiangqi as royal-file screens. Moving
  // them away is part of a real game, not a reason to invent illegal examples.
  if(id==='sanguo'||id==='xiangqi'){
    const original=create(id);for(const p of original.pieces)if(owner(id,p)===state.turn&&unitRole(id,p)===pawnRole(id)&&!state.pieces.some(q=>q.id===p.id))state.pieces.push(p);
  }
  return {state,legal:actions(id,state).filter(a=>a.source===`piece:${chosen.id}`&&a.kind==='move'),focus:`piece:${chosen.id}`};
}
export function acceptLesson(id,position,actionId){
  if(!position.legal.some(a=>a.id===actionId))throw new Error('Try one of the highlighted lesson moves.');
  return apply(id,position.state,actionId);
}
export function learningProgress(value){
  const clean={};for(const g of GAME_LIST){const done=CHALLENGES.filter(k=>Number.isFinite(value?.[g.id]?.[k])&&value[g.id][k]>0);if(done.length)clean[g.id]=Object.fromEntries(done.map(k=>[k,value[g.id][k]]));}return clean;
}
export function recordLesson(value,id,kind,at=Date.now()){
  const clean=learningProgress(value);if(Object.hasOwn(LESSONS,id)&&CHALLENGES.includes(kind)&&Number.isFinite(at)&&at>0)clean[id]={...clean[id],[kind]:clean[id]?.[kind]||at};return clean;
}
export function initialFreeBoard(id,saved){
  const original=pieces(id,create(id)),cells=new Set(board(id).cells.map(c=>c.id)),byId=new Map(original.map(p=>[p.id,p]));
  if(!Array.isArray(saved))return original;
  const ids=new Set(),occupied=new Set();
  for(const p of saved){if(!p||!byId.has(p.id)||!cells.has(p.cell)||ids.has(p.id)||occupied.has(p.cell))return original;ids.add(p.id);occupied.add(p.cell);}
  return saved.map(p=>({...byId.get(p.id),cell:p.cell}));
}
export function freeBoardMove(id,units,source,target){
  const moving=units.find(p=>p.source===source);
  if(!moving||!board(id).cells.some(c=>c.id===target))throw new Error('Choose a piece and a point on this board.');
  const other=units.find(p=>p.cell===target);
  return units.map(p=>p.id===moving.id?{...p,cell:target}:other&&p.id===other.id?{...p,cell:moving.cell}:p);
}
