import {GAME_LIST,create,actions,apply,pieces} from './games.ts';
import {lessonPosition,piecePosition,findUnit,relocate,rawUnits,unitRole,owner} from './learning.js';
import {removeGeneralAndAppropriate} from '../../../frontend/src/games/heritage-arcade/ported/game/sanguoRules.ts';

export const ADVENTURE_KEY='little-adventures.v1';
// These are authored, separate teaching snapshots. Every offered move comes
// from the same engine as a match; comparison switches never edit a real game.
export const ADVENTURES={
  shogi:{title:'The little comeback club',subtitle:'Capture a helper. Bring it home. Discover its new powers.',stamp:'Comeback Flipper',accent:'#d98cac',welcome:'In Shogi, a capture can become a friendship. Let’s meet your pieces, one little surprise at a time.',missions:[
    {key:'pawn-catch',short:'A catch',title:'A capture becomes a helper',host:'polly',task:'Move your Pawn straight onto the rival Pawn.',why:'A Shogi Pawn captures the same way it moves: one square straight forward.',after:'The rival Pawn left the board and joined your hand. You may use it on a later turn.',hint:'Find the gold-ringed Pawn. Its rival is one square straight ahead.'},
    {key:'helper-drop',short:'Come back',title:'A helper returns on your side',host:'abster',task:'Choose the Pawn in hand, then an empty blue spot.',why:'A drop uses your turn. The captured piece returns unpromoted, under your control.',after:'Your hand has one fewer Pawn, and your army has a new helper on the board.',hint:'Your helper is in the little hand button below the board. Tap it first.'},
    {key:'golden-pawn',short:'Grow',title:'A tiny Pawn grows up',host:'pengu',task:'Enter the far promotion zone and choose the promoted move.',why:'Entering, leaving or moving within the far three ranks can offer promotion. This Pawn can become a Tokin, which moves like a Gold.',after:'Your Pawn is now a Tokin. Promotion changes its movement; it does not turn into a royal King.',hint:'Choose the destination marked “Promote”. This arranged Pawn is one step from the zone.'},
    {key:'king-shelter',short:'Stay safe',title:'A safe little step for the King',host:'retsba',task:'Your King is in check. Move it to a safe blue spot.',why:'Check means the King is attacked. Your next action must remove that attack.',after:'Your King is safe from the Rook’s line. Capturing is optional; answering check is essential.',hint:'Step sideways out of the attacking Rook’s file. The blue choices are safe replies.'},
  ]},
  sannin:{title:'Three homes, one little Garden',subtitle:'Follow a hex path, meet a walking Knight and visit the centre.',stamp:'Garden Flipper',accent:'#aa9bdc',welcome:'This hex board has its own directions and royal surprises. Ordinary Shogi habits need a tiny reset here.',missions:[
    {key:'two-forwards',short:'Two paths',title:'Forward comes in pairs',host:'pengu',task:'Choose a home colour, then take one forward hex step.',why:'A Sannin Pawn has two forward main directions. They rotate with its army’s home.',after:'One small hex step! Change the home colour to see how the two forward paths rotate.',hint:'Tap the glowing Pawn, then either blue hex.',variants:[['red','Red home','Red’s forward paths point away from its own home.'],['green','Green home','Green has the same rule, rotated around this hex board.'],['blue','Blue home','Blue’s forward paths rotate too. “Up the screen” is not every army’s forward.']]},
    {key:'walking-knight',short:'A walker',title:'This Knight walks',host:'retsba',task:'Try one of this Knight’s sideways paths.',why:'The Sannin Knight does not jump and never promotes. Its main and radian paths differ from ordinary Shogi’s forward leap.',after:'That was a Sannin Knight move. The board’s highlights follow its own hex rules.',hint:'Choose the glowing Knight. The short blue paths are this edition’s legal routes.'},
    {key:'returning-helper',short:'A helper',title:'A helper finds a new home',host:'polly',task:'Drop the captured Pawn onto an empty blue hex.',why:'A captured piece can return from your hand. A drop takes one action and must meet this hex game’s restrictions.',after:'Your captured helper has returned. Captures and drops belong to this three-player game too.',hint:'Tap the Pawn in hand, then a blue hex near your home.'},
    {key:'garden-visit',short:'The Garden',title:'A safe visit to the Pleasure Garden',host:'abster',task:'Move the unallied King onto the marked centre hex.',why:'A safe, unallied King reaching the Pleasure Garden wins. Allied Kings cannot use this victory route.',after:'The engine awarded the Garden win! A real journey also needs care around promotion, illumination, castling and alliances.',hint:'The Garden is the centre hex, 0,0. It is the only destination in this small snapshot.'},
  ]},
  sanguo:{title:'A postcard from three kingdoms',subtitle:'Read the river, build a Cannon screen and follow the owner ring.',stamp:'Three-Shore Flipper',accent:'#66b9cc',welcome:'Three kingdoms share connected routes. We’ll explore the little rules that make this board its own.',missions:[
    {key:'river-soldier',short:'New shores',title:'A Soldier on a new shore',host:'polly',task:'Try a sideways move with the Soldier beyond its home river.',why:'A Soldier gains sideways movement after crossing its river. Its forward direction still follows its original sector.',after:'Your Soldier used a sideways route beyond its home river. It still cannot move backward.',hint:'This arranged Soldier is already across the river. Choose a sideways blue point.'},
    {key:'one-screen',short:'One screen',title:'A tiny bridge for a Cannon',host:'pengu',task:'Find the screen count that lets your Cannon capture the marked rival.',why:'A Cannon captures over exactly one intervening piece. Zero or two screens will not do.',after:'Exactly one screen made the capture possible. The screen stays where it was.',hint:'Choose “One screen”, tap the Cannon, then the orange-ringed rival.',variants:[['zero','No screen','The rival is visible, but there is no screen to jump.'],['one','One screen','One intervening piece creates a legal Cannon capture.'],['two','Two screens','The extra piece closes this capture route. A Cannon cannot jump two screens.']]},
    {key:'clear-leg',short:'Clear a leg',title:'Give the Horse a little doorway',host:'retsba',task:'Clear the Horse’s first leg, then try the marked L-shaped route.',why:'In Sanguo Qi, an occupied first leg blocks the Horse. A clear leg opens that particular L-shaped route.',after:'The first leg was clear, so the Horse could finish its L. Other routes may have different legs.',hint:'Switch to “Leg clear”. Tap the Horse, then the blue destination.',variants:[['blocked','Leg occupied','The small piece is on this route’s first leg, so this destination is unavailable.'],['clear','Leg clear','The first leg is empty. This L-shaped route is now available.']]},
    {key:'owner-ring',short:'New owner',title:'The colour outside tells a story',host:'abster',task:'Move the green-art Soldier controlled by Red.',why:'After a kingdom is defeated, surviving pieces can transfer. Their original artwork stays; the outer ring shows the controller.',after:'Red moved a green-art piece. Read the owner ring when an army has been inherited.',hint:'The arranged inherited Soldier has green artwork and a red control ring.'},
  ]},
  sanyou:{title:'The Fire and Flag expedition',subtitle:'Two unusual helpers and a landscape full of little decisions.',stamp:'Trailfinder Flipper',accent:'#72c5a2',welcome:'San You Qi has Fire, Flags and special terrain. Let’s learn those first, instead of treating it like a familiar chess board.',missions:[
    {key:'fire-spark',short:'A spark',title:'A little spark moves forward',host:'polly',task:'Move Fire one step diagonally forward.',why:'Fire advances one forward diagonal step. It never retreats.',after:'A small diagonal spark! Fire follows the army’s forward routes, not every diagonal around it.',hint:'Tap Fire. Choose one of its forward blue points.'},
    {key:'flag-path',short:'Two steps',title:'A Flag needs two clear steps',host:'pengu',task:'Clear the middle point and move the Flag exactly two forward steps.',why:'At home, a Flag moves exactly two forward points. It cannot stop on the middle point or jump a blocker there.',after:'Two clear steps, one Flag move. The middle point was a path, not a landing choice.',hint:'Choose “Path clear”, then tap the Flag and its blue destination.',variants:[['blocked','Middle occupied','The Flag cannot jump the piece on its first step.'],['clear','Path clear','Both steps are clear. The Flag may finish exactly two points ahead.']]},
    {key:'travelling-flag',short:'Far from home',title:'A Flag away from home',host:'abster',task:'Slide the crossed Flag along a clear approved line.',why:'In enemy territory, a Flag becomes Chariot-like. It can return to shared home gates, but cannot re-enter exclusive home territory.',after:'Away from home, the Flag can slide farther. Its home boundary still matters.',hint:'This arranged Flag has already left home. Choose a blue point on its clear line.'},
    {key:'terrain-lines',short:'Read the sea',title:'The same edge, two different helpers',host:'retsba',task:'Compare the Chariot and Cannon, then move the Cannon across the marked Sea edge.',why:'On this specific Sea connection, a Chariot is blocked and a Cannon may cross. Other terrain has its own rules: mountains block Cannon routes, and forts restrict passage.',after:'The Cannon crossed this Sea edge. Terrain belongs to the connection between points, not just the destination.',hint:'Choose “Cannon”, then the marked blue destination. The Chariot cannot use this same edge.',variants:[['chariot','Chariot','This Sea edge blocks the Chariot’s route.'],['cannon','Cannon','The Cannon may cross this Sea connection when the path is clear.']]},
  ]},
  yanyi:{title:'Wake the little Han court',subtitle:'Explore the cross, meet Han and learn who is on your side.',stamp:'Han Explorer',accent:'#ba93dc',welcome:'This cross-board game has its own Soldiers, leaping Horses and alliances. We’ll discover them in four tiny scenes.',missions:[
    {key:'sideways-start',short:'Sideways too',title:'A Soldier has room to wiggle',host:'polly',task:'Move Wu’s Soldier one point sideways, even at home.',why:'Yan Yi Soldiers may move sideways from the opening. Do not wait for a Xiangqi-style river crossing.',after:'A sideways step at home was legal. Inside the home boundary, the Soldier still cannot retreat.',hint:'Wu is Green. Pick a sideways point beside its glowing Soldier.'},
    {key:'leaping-horse',short:'A true leap',title:'This Horse does leap',host:'retsba',task:'Try the marked L-shaped move. Compare an occupied and a clear leg.',why:'In this edition of Yan Yi, pieces do not block Horse legs. The entire route must still remain on the cross.',after:'The Horse used its L-shaped leap. An occupied leg would not block it; Sanguo Qi and Xiangqi handle this differently.',hint:'The occupied leg is intentional. The blue destination remains legal.',variants:[['occupied','Leg occupied','This piece does not block the Yan Yi Horse’s leg. The L-shaped route is legal.'],['clear','Leg clear','Removing the piece leaves the same L-shaped destination legal.']]},
    {key:'wake-han',short:'Hello, Han',title:'A little Horse wakes Han',host:'pengu',task:'Move Wu’s Horse onto the yellow Han Emperor.',why:'This is one activation route: a Horse captures the Emperor. Wu gains Han’s surviving forces; Wei and Shu become allies.',after:'Wu controls the four yellow Han fighters. Their artwork stays yellow; their owner rings are Green. Wei and Shu are now allied.',hint:'Find Wu’s Horse near the Emperor. The orange ring is the activation destination.'},
    {key:'allied-colours',short:'Who is a friend?',title:'Different colours can be friends',host:'abster',task:'Blue and Red are allied. Capture the Green rival with Blue’s Chariot.',why:'Allies cannot capture or check each other. A different artwork colour is not enough to make a piece a legal target.',after:'Blue captured the Green rival and left its Red ally alone. Protect both allied Kings.',hint:'The Red piece is an ally. The Green piece on the Chariot’s row is the capture target.'},
  ]},
  xiangqi:{title:'A little journey across the river',subtitle:'A Soldier’s new paths, a Cannon bridge and a Horse’s doorway.',stamp:'River Flipper',accent:'#df9b81',welcome:'Start with the river and palace. Then the Cannon and Horse will feel much less mysterious.',missions:[
    {key:'river-passport',short:'The river',title:'A river changes a Soldier’s choices',host:'polly',task:'Move the Soldier sideways after it has crossed the river.',why:'Before crossing, a Soldier moves only forward. After crossing, it gains sideways steps. It never retreats.',after:'A sideways step is now allowed. The river added choices without adding backward moves.',hint:'Choose “Across the river”, then the sideways blue destination.',variants:[['home','Before crossing','On its home side, this Soldier has a forward move but no sideways move.'],['across','Across the river','Across the river, a sideways step is available.']]},
    {key:'cannon-bridge',short:'A bridge',title:'One little screen is just right',host:'pengu',task:'Give the Cannon one screen, then capture the rival behind it.',why:'A Cannon moves through clear space without jumping. To capture, it jumps exactly one piece of either colour.',after:'One screen let the Cannon capture the rival. Zero screens and two screens both close that capture.',hint:'Choose “One screen”, tap your Cannon, then the rival with an orange ring.',variants:[['zero','No screen','No screen means no capture on this occupied target.'],['one','One screen','Exactly one piece lies between Cannon and target. The capture is legal.'],['two','Two screens','Two intervening pieces are too many. This capture is unavailable.']]},
    {key:'horse-door',short:'A doorway',title:'A Horse needs a clear first step',host:'retsba',task:'Open the Horse’s doorway, then take its L-shaped route.',why:'A Xiangqi Horse first steps straight, then diagonally outward. A piece on that first step blocks this route.',after:'The clear first step let the Horse move. It cannot jump a blocked leg.',hint:'Choose “Leg clear”. The marked destination will become blue.',variants:[['blocked','Leg occupied','This route is closed by the occupied first leg.'],['clear','Leg clear','The first leg is clear, so this L-shaped destination is legal.']]},
    {key:'palace-home',short:'A safe palace',title:'The Generals need a little privacy',host:'abster',task:'Step the General safely sideways. Compare what opening the central file changes.',why:'The Generals cannot face each other on an empty file. Your General also stays inside its own 3 × 3 palace.',after:'Your General stayed inside its palace and out of an open facing line. When that file is open, answering the attack is essential.',hint:'With “File open”, Red is in check. A sideways blue point is a safe reply.',variants:[['open','File open','With both screens removed, the Generals face each other. Red must answer check.'],['closed','File screened','The central Soldiers keep the Generals from facing each other.']]},
  ]},
  dominion:{title:'A two-dice snow day',subtitle:'Wake your team, spend two dice and watch the royal Kings.',stamp:'Snow-Day Flipper',accent:'#79bce0',welcome:'This is four-player Chaturanga. Dice wake specific helpers, and royal Kings can be captured. Let’s try one whole little turn.',missions:[
    {key:'two-dice',short:'Two dice',title:'Two dice, two little moves',host:'polly',task:'Spend practice die 1 on a Guard, then die 3 on a Unicorn.',why:'Each die buys one move by a piece it activates. Either die may go first in a match; this guided example starts with 1.',after:'You spent both dice in one Green turn. Now the next kingdom can roll.',hint:'First move the glowing Guard. The next gold ring will guide you to the Unicorn.'},
    {key:'guard-nibble',short:'A nibble',title:'A Guard captures at an angle',host:'retsba',task:'Use die 1 to capture the rival diagonally forward.',why:'A Snow Guard walks straight into an empty square, but captures one square diagonally forward. Its forward rotates with its kingdom.',after:'Your Guard made a diagonal capture. A straight step and a capture have different shapes here.',hint:'The rival’s orange ring is diagonally ahead of your Guard.'},
    {key:'icebreaker-hop',short:'A hop',title:'An Icebreaker hops over the middle',host:'pengu',task:'Jump exactly two squares diagonally. Try an occupied and a clear middle square.',why:'Die 4 or 6 activates the Icebreaker. It jumps exactly two diagonal squares and may hop over a piece in the middle.',after:'That was a two-square diagonal jump. A middle piece would stay where it was; only the landing square matters for a capture.',hint:'The blue destination is exactly two diagonal squares away.',variants:[['occupied','Middle occupied','The Icebreaker can jump over this piece.'],['clear','Middle clear','An empty middle square permits the same two-square jump.']]},
    {key:'royal-watch',short:'Royal watch',title:'One royal King holds a kingdom together',host:'abster',task:'Use die 3 to capture Red’s original royal Frost King.',why:'There is no check restriction here. Capturing an original royal King eliminates its whole kingdom. Promoted fighting Kings are different.',after:'Red’s original royal King was captured, so Red’s remaining army was removed. Other kingdoms continue.',hint:'Your Unicorn can make an L-shaped capture onto Red’s royal King.'},
  ]},
};

const clone=x=>JSON.parse(JSON.stringify(x));
const source=p=>`piece:${p.id}`;
function keep(id,state,ids){
  const wanted=new Set(ids);
  if(id==='shogi')state.board=state.board.map(p=>p&&(p.type==='king'||wanted.has(p.id))?p:null);
  else if(id==='dominion')state.board=state.board.map(row=>row.map(p=>p&&(p.isRoyal||wanted.has(p.id))?p:null));
  else if(id==='sannin')for(const p of state.pieces){if(p.type!=='king'&&!wanted.has(p.id)){p.status='eliminated';p.cell=null;}}
  else if(id==='sanyou')for(const p of state.pieces){if(p.role!=='general'&&!(p.role==='soldier'&&p.node?.endsWith(':L5-4'))&&!wanted.has(p.id)){p.status='captured';p.node=null;}}
  else state.pieces=state.pieces.filter(p=>['king','general'].includes(unitRole(id,p))||wanted.has(p.id));
}
function remove(id,state,pieceId){
  if(id==='shogi')state.board=state.board.map(p=>p?.id===pieceId?null:p);
  else if(id==='dominion')state.board=state.board.map(row=>row.map(p=>p?.id===pieceId?null:p));
  else if(id==='sannin')Object.assign(state.pieces.find(p=>p.id===pieceId),{status:'eliminated',cell:null});
  else if(id==='sanyou')Object.assign(state.pieces.find(p=>p.id===pieceId),{status:'captured',node:null});
  else state.pieces=state.pieces.filter(p=>p.id!==pieceId);
}
function choose(state,focus,filter=()=>true,extra={}){return {state,focus,legal:actions(extra.id,state).filter(a=>a.source===focus&&filter(a)),...extra};}
function fixture(id,key,variant){
  let p,state=create(id),unit,target;
  const finish=(piece,filter=()=>true,extra={})=>choose(state,source(piece),filter,{id,...extra});
  if(['pawn-catch','guard-nibble'].includes(key))return {...lessonPosition(id,'capture'),id};
  if(['helper-drop','returning-helper'].includes(key))return {...lessonPosition(id,'special'),id};
  if(['one-screen','cannon-bridge'].includes(key)){
    p=lessonPosition(id,'special');state=clone(p.state);
    const screen=state.pieces.find(q=>id==='xiangqi'?q.row===5&&q.col===1:q.node.sector==='red'&&q.node.rank===2&&q.node.file===3);
    const target=p.legal[0].target;
    if(variant==='zero')remove(id,state,screen.id);
    if(variant==='two'){
      const extra=rawUnits(id,state).find(q=>owner(id,q)!==state.turn&&!['king','general'].includes(unitRole(id,q))&&q.id!==p.victim);
      relocate(id,state,extra.id,id==='xiangqi'?'4,1':'red-2-4');
    }
    return choose(state,p.focus,a=>a.target===target,{id,notice:[{cell:target,label:'Rival target'}]});
  }
  if(key==='golden-pawn'){
    unit=findUnit(id,state,'pawn');keep(id,state,[unit.id]);relocate(id,state,unit.id,'31');
    return finish(unit,a=>a.promote,{notice:[{cell:'22',label:'Promotion zone'}]});
  }
  if(key==='king-shelter'){
    unit=findUnit(id,state,'king');const enemy=findUnit(id,state,'rook','blue');keep(id,state,[enemy.id]);
    relocate(id,state,unit.id,'67');relocate(id,state,enemy.id,'40');
    return finish(unit);
  }
  if(key==='two-forwards'){
    state.turn=variant;unit=findUnit(id,state,'pawn',variant);return finish(unit,a=>a.kind==='move'&&!a.promote);
  }
  if(key==='walking-knight')return {...piecePosition(id,'knight'),id};
  if(key==='garden-visit'){
    unit=findUnit(id,state,'king');keep(id,state,[]);relocate(id,state,unit.id,'1,0');
    return finish(unit,a=>a.target==='0,0'&&!a.promote,{notice:[{cell:'0,0',label:'Pleasure Garden'}]});
  }
  if(key==='river-soldier'){
    unit=findUnit(id,state,'scout');relocate(id,state,unit.id,'green-1-4');
    return finish(unit,a=>a.target==='green-1-3'||a.target==='green-1-5');
  }
  if(key==='clear-leg'||key==='horse-door'){
    unit=findUnit(id,state,id==='sanguo'?'rider':'horse');target=id==='sanguo'?'red-2-0':'7,0';
    const blocker=findUnit(id,state,id==='sanguo'?'scout':'soldier');
    if(variant==='blocked')relocate(id,state,blocker.id,id==='sanguo'?'red-3-1':'8,1');
    return finish(unit,a=>a.target===target,{notice:[{cell:target,label:'L-shaped destination'}]});
  }
  if(key==='owner-ring'){
    unit=findUnit(id,state,'scout','green');state.pieces=removeGeneralAndAppropriate(state.pieces,{defeated:'green',victor:'red'});state.defeated=['green'];
    return finish(unit);
  }
  if(key==='fire-spark')return {...piecePosition(id,'fire'),id};
  if(key==='flag-path'){
    p=lessonPosition(id,'special');state=clone(p.state);unit=state.pieces.find(q=>source(q)===p.focus);
    if(variant==='blocked'){const blocker=findUnit(id,state,'soldier');relocate(id,state,blocker.id,'red:L4-4');}
    return finish(unit,a=>a.target==='red:L4-5',{notice:[{cell:'red:L4-5',label:'Two steps ahead'}]});
  }
  if(key==='travelling-flag'){
    unit=findUnit(id,state,'flag');keep(id,state,[unit.id]);relocate(id,state,unit.id,'blue:L5-4');unit=state.pieces.find(p=>p.id===unit.id);unit.leftHome=true;
    return finish(unit,a=>['blue:L4-4','blue:L6-4','blue:L7-4','blue:L8-4'].includes(a.target));
  }
  if(key==='terrain-lines'){
    unit=findUnit(id,state,variant);keep(id,state,[unit.id]);relocate(id,state,unit.id,'C3');
    return finish(unit,a=>a.target==='C17',{notice:[{cell:'C3',label:'Sea edge start'},{cell:'C17',label:'Across the Sea edge'}]});
  }
  if(key==='sideways-start'){
    unit=findUnit(id,state,'soldier');return finish(unit,a=>a.raw.to.x===unit.x);
  }
  if(key==='leaping-horse'){
    unit=findUnit(id,state,'horse');const blocker=findUnit(id,state,'soldier','red');keep(id,state,[unit.id,blocker.id]);
    relocate(id,state,unit.id,'8,8');if(variant==='occupied')relocate(id,state,blocker.id,'9,8');else remove(id,state,blocker.id);
    return finish(unit,a=>a.target==='10,9',{notice:[{cell:'10,9',label:'Legal L-shaped destination'}]});
  }
  if(key==='wake-han')return {...lessonPosition(id,'special'),id};
  if(key==='allied-colours'){
    state.turn='blue';state.alliance=['blue','red'];state.hanOwner='green';state.activationUsed=true;state.opening={red:true,green:true,blue:true};state.ply=6;
    unit=findUnit(id,state,'chariot','blue');const ally=findUnit(id,state,'soldier','red'),rival=findUnit(id,state,'soldier','green');
    keep(id,state,[unit.id,ally.id,rival.id]);relocate(id,state,unit.id,'8,8');relocate(id,state,ally.id,'8,9');relocate(id,state,rival.id,'10,8');
    return finish(unit,a=>a.target==='10,8',{notice:[{cell:'8,9',label:'Red ally: not a target'},{cell:'10,8',label:'Green rival'}]});
  }
  if(key==='river-passport'){
    unit=findUnit(id,state,'soldier');relocate(id,state,unit.id,variant==='home'?'5,0':'4,0');
    return finish(unit,a=>a.target==='4,1',{notice:[{cell:'4,1',label:'Sideways destination'}]});
  }
  if(key==='palace-home'){
    p=piecePosition(id,'general');state=clone(p.state);unit=findUnit(id,state,'general');
    if(variant==='open')for(const piece of [...state.pieces])if(piece.role==='soldier'&&piece.col===4)remove(id,state,piece.id);
    return finish(unit,a=>a.target==='9,3'||a.target==='9,5');
  }
  if(key==='two-dice'){
    state.dice={rolled:true,values:[1,3],used:[false,false]};unit=findUnit(id,state,'pawn');
    return finish(unit,a=>a.raw.dieIndex===0,{stageCount:2});
  }
  if(key==='icebreaker-hop'){
    unit=findUnit(id,state,'ship');const middle=findUnit(id,state,'pawn');keep(id,state,[unit.id,middle.id]);
    relocate(id,state,unit.id,'4,2');if(variant==='occupied')relocate(id,state,middle.id,'3,3');else remove(id,state,middle.id);
    state.dice={rolled:true,values:[4,6],used:[false,true]};
    return finish(unit,a=>a.target==='2,4',{notice:[{cell:'3,3',label:'Middle square'},{cell:'2,4',label:'Two-square landing'}]});
  }
  if(key==='royal-watch'){
    unit=findUnit(id,state,'horse');relocate(id,state,unit.id,'6,1');state.dice={rolled:true,values:[3,6],used:[false,true]};
    return finish(unit,a=>a.target==='4,0',{notice:[{cell:'4,0',label:'Red original royal King'}]});
  }
  throw new Error('Choose a discovery from this game.');
}

export function missionFor(id,key){const m=ADVENTURES[id]?.missions.find(m=>m.key===key);if(!m)throw new Error('Choose a discovery from this game.');return m;}
export function adventurePosition(id,key,variant,actionIds=[]){
  const mission=missionFor(id,key),options=mission.variants?.map(v=>v[0])||['default'];
  variant=variant||options[0];if(!options.includes(variant))throw new Error('Choose one of this discovery’s setups.');
  if(!Array.isArray(actionIds)||actionIds.length>(key==='two-dice'?2:1))throw new Error('Replay this little discovery.');
  const initial=fixture(id,key,variant);
  let position={...initial,missionKey:key,practiceDice:id==='dominion'?clone(initial.state.dice):null,variant,stage:0,stageCount:key==='two-dice'?2:1,complete:false};
  for(const actionId of actionIds){
    if(position.complete||!position.legal.some(a=>a.id===actionId))throw new Error('Try the glowing piece and a highlighted destination.');
    const state=apply(id,position.state,actionId),stage=position.stage+1,complete=stage===position.stageCount;
    let legal=[],focus=position.focus;
    if(!complete){const horse=findUnit(id,state,'horse');focus=source(horse);legal=actions(id,state).filter(a=>a.source===focus&&a.raw.dieIndex===1);if(!legal.length)throw new Error('This example needs a second legal dice move.');}
    position={...position,state,legal,focus,stage,complete};
  }
  return position;
}
export function adventureProgress(value){
  const clean={};for(const {id} of GAME_LIST){const done=ADVENTURES[id].missions.filter(m=>Number.isFinite(value?.[id]?.[m.key])&&value[id][m.key]>0);if(done.length)clean[id]=Object.fromEntries(done.map(m=>[m.key,value[id][m.key]]));}return clean;
}
export function recordAdventure(value,id,key,at=Date.now()){
  missionFor(id,key);const clean=adventureProgress(value);if(Number.isFinite(at)&&at>0)clean[id]={...clean[id],[key]:clean[id]?.[key]||at};return clean;
}
