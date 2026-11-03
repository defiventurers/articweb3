/**
 * Antarctic Kingdoms Cờ Tư Lệnh — 2015/2024 VERSIONED RESEARCH RULES v0.4.
 * Two-player deterministic practice implementation; NOT a certified/complete rulebook edition.
 * Unverified: exact full starting setup, ford coordinates, some carrier/AA event ordering,
 * composite multi-captures, tournament timers and publisher's commercial permission.
 * The fantasy unit sprites are an explicitly modern Antarctic Kingdoms visual adaptation.
 */
export const VERSION = 'co-tu-lenh-practice-0.4';
/** Heritage movement/win-rule choices from user-provided research v0.3, not edition approval. */
export const RULE_PROFILES = Object.freeze({
  ancientchess_2015_standard: Object.freeze({id:'ancientchess_2015_standard',label:'Heritage Standard · 2015 (research)',movementBasis:'AncientChess 2015',commanderRange:Infinity,missileDiagonal:true,landDivision:['infantry','tank','artillery'],autoDivision:true}),
  ancientchess_2015_long: Object.freeze({id:'ancientchess_2015_long',label:'Heritage Long / Total War · 2015 (research)',movementBasis:'AncientChess 2015',commanderRange:Infinity,missileDiagonal:true,landDivision:null,autoDivision:false}),
  creator_2024_standard: Object.freeze({id:'creator_2024_standard',label:'Creator 2024 Standard · research',movementBasis:'PROVISIONAL 2015 movement pending 2024 adjudication',commanderRange:Infinity,missileDiagonal:true,landDivision:['infantry','tank','engineer','artillery','militia'],autoDivision:true}),
  bga_2024: Object.freeze({id:'bga_2024',label:'BGA 2024 · documented differences',movementBasis:'BGA 2024',commanderRange:10,missileDiagonal:false,landDivision:['infantry','tank','artillery'],autoDivision:true})
});
export const DEFAULT_PROFILE='ancientchess_2015_standard';
export const resolveProfile=(key)=>key==='commander'?'ancientchess_2015_long':key==='division'?'ancientchess_2015_standard':key;
export function profileFor(state){
  const id=resolveProfile(state.rulesProfile||state.mode||DEFAULT_PROFILE);
  return RULE_PROFILES[id]||RULE_PROFILES[DEFAULT_PROFILE];
}

export const FILES = 11;
export const RANKS = 12;
export const TEAMS = ['red','blue'];
export const FORDS = [5,7]; // PROVISIONAL ONLY: exact 2015 ford indices still await diagram verification.
export const TYPES = Object.freeze({
  commander:{label:'Commander',native:'Tư lệnh',count:1,range:11,points:100},
  infantry:{label:'Infantry',native:'Bộ binh',count:2,range:1,points:10},
  tank:{label:'Tank',native:'Xe tăng',count:2,range:2,points:20},
  militia:{label:'Militia',native:'Dân quân',count:1,range:1,points:10,diagonal:true},
  engineer:{label:'Engineer',native:'Công binh',count:2,range:1,points:10},
  artillery:{label:'Artillery',native:'Pháo binh',count:2,range:3,points:30,diagonal:true},
  antiair:{label:'Anti-aircraft',native:'Cao xạ',count:2,range:1,points:10,airDefence:1},
  missile:{label:'Missile',native:'Tên lửa',count:1,range:2,points:20,diagonalRange:1,airDefence:2},
  aircraft:{label:'Aircraft',native:'Không quân',count:2,range:4,points:40,diagonal:true,canJump:true},
  navy:{label:'Navy',native:'Hải quân',count:2,range:4,points:80,diagonal:true,airDefence:1},
  headquarters:{label:'Headquarters',native:'Sở chỉ huy',count:2,range:0,points:10}
});
export const POINT_VALUES=Object.fromEntries(Object.entries(TYPES).map(([k,v])=>[k,v.points]));
const ORTHO = [[1,0],[-1,0],[0,1],[0,-1]];
const DIAG = [[1,1],[1,-1],[-1,1],[-1,-1]];
export const at=(x,y)=>`${x},${y}`;
export const inside=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<FILES&&y>=0&&y<RANKS;
export const water=(x,y)=>x<=1||y===5||y===6;
export const coast=(x,y)=>x===2;
export const nautical=(x,y)=>water(x,y)||coast(x,y);
export const opponent=team=>team==='red'?'blue':'red';
export const byId=(state,id)=>state.pieces.find(p=>p.id===id&&p.alive);
export const atPoint=(state,x,y)=>state.pieces.filter(p=>p.alive&&p.x===x&&p.y===y);
export const cargoOf=(state,id)=>state.pieces.filter(p=>p.alive&&p.carrier===id);
const direction=(dx,dy)=>(dx===0||dy===0)?'orthogonal':Math.abs(dx)===Math.abs(dy)?'diagonal':null;
const maxRange=(p,state)=>((p.type==='commander'?profileFor(state).commanderRange:TYPES[p.type]?.range)||0)+(p.hero?1:0);
const permitsDiagonal=(p,state)=>Boolean(p.hero||TYPES[p.type].diagonal||(p.type==='missile'&&profileFor(state).missileDiagonal));
const diagonalRange=(p,state)=>p.type==='missile'&&profileFor(state).missileDiagonal?1+(p.hero?1:0):maxRange(p,state);

const piecesAt=(state,x,y)=>atPoint(state,x,y);
const isHeavy=t=>['artillery','antiair','missile'].includes(t);
const seaPoint=(x,y)=>x<=1;
const crossedRiver=(y1,y2)=>(y1<=5&&y2>=6)||(y1>=6&&y2<=5);
const linePoints=(p,x,y)=>{
  const dx=Math.sign(x-p.x),dy=Math.sign(y-p.y),n=Math.max(Math.abs(x-p.x),Math.abs(y-p.y));
  return Array.from({length:n},(_,i)=>({x:p.x+(i+1)*dx,y:p.y+(i+1)*dy}));
};
/** The precise air-defence cells used for flight interception AND user-visible rings. */
export function airDefencePoints(unit){
  if(!unit?.alive||unit.carrier||!['antiair','missile','navy'].includes(unit.type))return [];
  const r=unit.type==='missile'?2:1,points=[];
  for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++){
    // Radius 1 = centre and orthogonal neighbors; missile also one-step diagonals.
    if(dx*dx+dy*dy>r*r)continue;
    const x=unit.x+dx,y=unit.y+dy;if(inside(x,y))points.push({x,y});
  }
  return points;
}
export function airDefenceZones(state){
  return state.pieces.filter(p=>p.alive&&!p.carrier&&['antiair','missile','navy'].includes(p.type))
    .map(p=>({id:p.id,team:p.team,type:p.type,x:p.x,y:p.y,radius:TYPES[p.type].airDefence,points:airDefencePoints(p)}));
}
export function threatenedByAirDefence(state,x,y,owner){
  return airDefenceZones(state).some(z=>z.team!==owner&&z.points.some(pt=>pt.x===x&&pt.y===y));
}
// Carrying eligibility and capacities retain the explicit v0.3/BGA-derived profile choices.
export function canCarry(carrierType,passengerType,existing){
  if(carrierType==='headquarters')return passengerType==='commander'&&existing.length===0;
  if(carrierType==='engineer')return isHeavy(passengerType)&&existing.length===0;
  if(carrierType==='tank')return ['commander','infantry','militia'].includes(passengerType)&&existing.length<2&&!(passengerType==='infantry'&&existing.some(p=>p.type==='infantry'));
  if(carrierType==='aircraft')return ['commander','infantry','militia','tank'].includes(passengerType)&&existing.length<2&&!(passengerType==='tank'&&existing.some(p=>p.type==='tank'));
  if(carrierType==='navy')return ['commander','infantry','militia','tank','aircraft'].includes(passengerType)&&existing.length<2&&!(passengerType==='tank'&&existing.some(p=>p.type==='tank'));
  return false;
}
export function stackMembers(state,id){
  let root=byId(state,id);if(!root)return [];
  const seen=new Set();
  while(root.carrier){if(seen.has(root.id))throw Error('Cyclic carrier state');seen.add(root.id);root=byId(state,root.carrier);if(!root)return [];}
  const members=[root],ids=new Set([root.id]);
  for(let i=0;i<members.length;i++)for(const c of cargoOf(state,members[i].id))if(!ids.has(c.id)){ids.add(c.id);members.push(c);}
  return members;
}
function navyPath(p,x,y){
  let prior=p;
  for(const pt of linePoints(p,x,y)){
    if(!nautical(pt.x,pt.y))return false;
    if(crossedRiver(prior.y,pt.y)&&(FORDS.includes(prior.x)||FORDS.includes(pt.x)))return false;
    prior=pt;
  }
  return true;
}
function travelAllowed(state,p,x,y,kind='move'){
  if(!inside(x,y)||p.type==='headquarters')return false;
  if(p.type==='navy')return navyPath(p,x,y);
  if(p.type!=='aircraft'&&seaPoint(x,y))return false;
  // The publisher explicitly allows a heavy gun to cross by capturing, away from a reef.
  if(isHeavy(p.type)&&crossedRiver(p.y,y)&&kind!=='capture'&&(!FORDS.includes(p.x)||!FORDS.includes(x)))return false;
  return true;
}
function blocked(state,p,x,y){
  const line=linePoints(p,x,y);line.pop();
  return line.some(pt=>atPoint(state,pt.x,pt.y).some(q=>!(coast(pt.x,pt.y)&&((q.type==='navy')!==(p.type==='navy')))));
}
// No unbounded stack chains: every component in the original stack acts at most once.
const carries=(s,p)=>cargoOf(s,p.id);
export function carriedUnits(state,id){
  const result=[],pending=[id],seen=new Set([id]);
  for(let i=0;i<pending.length;i++)for(const p of cargoOf(state,pending[i]))if(!seen.has(p.id)){seen.add(p.id);pending.push(p.id);result.push(p);}
  return result;
}
function canBoard(s,carrier,passenger){
  if(!carrier||passenger.carrier)return false;
  const root=stackMembers(s,carrier.id)[0],incoming=[passenger,...carriedUnits(s,passenger.id)];
  if(!root||incoming.some(p=>p.id===carrier.id||p.id===root.id))return false;
  const total=carriedUnits(s,root.id),own=carriedUnits(s,carrier.id);
  const maximum=['headquarters','engineer'].includes(root.type)?2:3;
  if(1+total.length+incoming.length>maximum)return false;
  const local=[...own],all=[...total];
  for(const p of incoming){
    if(!canCarry(carrier.type,p.type,local)||!canCarry(root.type,p.type,all))return false;
    local.push(p);all.push(p);
  }
  return carrier.type!=='engineer'||[5,6].includes(carrier.y);
}
function landingAllowed(p,x,y){return inside(x,y)&&(p.type==='aircraft'||(p.type==='navy'?nautical(x,y):!seaPoint(x,y)));}
const weaponFor=(s,p,a)=>p.type==='navy'&&['capture','fire'].includes(a.kind)?(byId(s,a.targetId)?.type==='navy'?'sea':'land'):null;
function rawActions(state,id){
  const p=byId(state,id);if(!p||p.team!==state.turn||state.winner||p.type==='headquarters')return [];
  const acts=[],r=maxRange(p,state),dirs=permitsDiagonal(p,state)?ORTHO.concat(DIAG):ORTHO;
  for(const [dx,dy] of dirs){
    const lim=dx&&dy?diagonalRange(p,state):r;
    for(let step=1;step<=lim;step++){
      const x=p.x+dx*step,y=p.y+dy*step;if(!inside(x,y))break;
      if(p.type==='engineer'&&carries(state,p).length&&(!crossedRiver(p.y,y)||x!==p.x||step!==1))continue;
      const occupants=atPoint(state,x,y),friends=occupants.filter(q=>q.team===p.team),foes=occupants.filter(q=>q.team!==p.team);
      const obstructed=blocked(state,p,x,y),jump=p.type==='aircraft'||p.type==='navy'||(p.type==='artillery'&&foes.length>0);
      if(obstructed&&!jump)continue;
      const risk=p.type==='aircraft'&&flightOutcome(state,p,x,y).risk;
      if(friends.length){
        if(!state.turnContext){
          for(const carrier of friends.filter(q=>canBoard(state,q,p)))acts.push({id:p.id,kind:'embark',x,y,carrierId:carrier.id,risk});
          for(const passenger of friends.filter(q=>canBoard(state,p,q)))if(travelAllowed(state,p,x,y)&&(p.type!=='engineer'||[5,6].includes(y)))acts.push({id:p.id,kind:'load',x,y,passengerId:passenger.id});
        }
        continue;
      }
      if(foes.length){
        if(p.type==='commander'&&step>1+(p.hero?1:0))continue;
        const hq=foes.find(q=>q.type==='headquarters'),commander=foes.find(q=>q.type==='commander');
        const strong=commander&&hq&&['engineer','tank','artillery','aircraft'].includes(p.type);
        const target=strong?commander:(foes.find(q=>!q.carrier)||foes[0]);
        const weakHQ=hq&&commander&&!strong;
        if(p.type==='navy'){
          if(navyPath(p,x,y))acts.push({id:p.id,kind:'capture',x,y,targetId:target.id});
          else if(step<=3+(p.hero?1:0)&&!nautical(x,y))acts.push({id:p.id,kind:'fire',x,y,targetId:target.id});
        }else if(weakHQ||p.type!=='aircraft'&&seaPoint(x,y)){
          acts.push({id:p.id,kind:'fire',x,y,targetId:target.id,risk});
        }else if(travelAllowed(state,p,x,y,'capture')){
          acts.push({id:p.id,kind:'capture',x,y,targetId:target.id,risk});
          if(p.type==='aircraft'&&target.type!=='aircraft')acts.push({id:p.id,kind:'bomb',x,y,targetId:target.id,risk});
        }
      }else if((!obstructed||p.type==='aircraft'||p.type==='navy')&&travelAllowed(state,p,x,y)){
        acts.push({id:p.id,kind:'move',x,y,risk});
        if(p.type==='aircraft'){
          const cargo=carries(state,p);
          for(const passenger of cargo)if(landingAllowed(passenger,x,y))acts.push({id:p.id,kind:'airdrop',x,y,dropIds:[passenger.id],risk});
          if(cargo.length===2){const carrier=cargo.find(q=>landingAllowed(q,x,y)&&canCarry(q.type,cargo.find(other=>other.id!==q.id).type,[]));if(carrier)acts.push({id:p.id,kind:'airdrop',x,y,dropIds:cargo.map(q=>q.id),dropCarrierId:carrier.id,risk});}
        }
      }
    }
  }
  // Naval land artillery can fire over blockers or land which the ship cannot cross.
  if(p.type==='navy')for(const [dx,dy] of ORTHO.concat(DIAG))for(let step=1;step<=3+(p.hero?1:0);step++){
    const x=p.x+dx*step,y=p.y+dy*step;if(!inside(x,y))break;
    if(nautical(x,y))continue;
    const target=atPoint(state,x,y).find(q=>q.team!==p.team&&!q.carrier);
    if(target&&!acts.some(a=>a.kind==='fire'&&a.targetId===target.id))acts.push({id:p.id,kind:'fire',x,y,targetId:target.id});
  }
  return acts;
}
export function legalActions(state,id){
  const p=byId(state,id),ctx=state.turnContext;if(!p||!ctx)return rawActions(state,id);
  if(ctx.team!==state.turn||!ctx.participants.includes(id))return [];
  const used=ctx.spent.includes(id),weapons=ctx.weapons[id]||[];
  return rawActions(state,id).filter(a=>{
    if(['embark','load'].includes(a.kind))return false;
    if(p.type==='navy'&&weapons.length)return weaponFor(state,p,a)&&!weapons.includes(weaponFor(state,p,a));
    return !used;
  });
}
export function countArmy(state,team){return state.pieces.filter(p=>p.alive&&p.team===team).length;}
export function checkDivisionVictory(state,team){
  const left=state.pieces.filter(p=>p.alive&&p.team===opponent(team));
  if(!left.some(p=>p.type==='commander'))return 'commander';
  const profile=profileFor(state);
  if(profile.autoDivision){if(!left.some(p=>p.type==='navy'))return 'navy';if(!left.some(p=>p.type==='aircraft'))return 'air';if(!left.some(p=>profile.landDivision.includes(p.type)))return 'land';}
  return null;
}
function commanderFacing(state){
  const a=state.pieces.find(p=>p.alive&&p.team==='red'&&p.type==='commander'),b=state.pieces.find(p=>p.alive&&p.team==='blue'&&p.type==='commander');
  return Boolean(a&&b&&(a.x===b.x||a.y===b.y)&&!blocked(state,a,b.x,b.y));
}
function givesCheck(state,p){
  const enemy=state.pieces.find(q=>q.alive&&q.team!==p.team&&q.type==='commander');
  if(!enemy||p.type==='headquarters'||p.carrier)return false;
  const testState={...state,turn:p.team,turnContext:null,winner:null};
  return rawActions(testState,p.id).some(a=>a.targetId===enemy.id&&['capture','bomb','fire'].includes(a.kind)&&(!a.risk||flightOutcome(state,p,a.x,a.y).reaches));
}
function flightOutcome(state,p,x,y){
  if(p.hero)return {risk:false,reaches:true};
  const path=linePoints(p,x,y);let entered=threatenedByAirDefence(state,p.x,p.y,p.team),risk=entered;
  for(const pt of path){
    const threatened=threatenedByAirDefence(state,pt.x,pt.y,p.team);
    if(entered&&!threatened)return {risk:true,reaches:false};
    if(threatened){entered=true;risk=true;}
  }
  return {risk,reaches:true};
}
function removeUnit(state,id,capturedBy){
  const unit=byId(state,id);if(!unit)return;
  unit.alive=false;
  if(capturedBy)state.captures.push({by:capturedBy,type:unit.type,turn:state.ply+1});
  for(const cargo of cargoOf(state,id)){
    // The booklet explicitly protects the Commander when a weak unit destroys HQ.
    if(unit.type==='headquarters'&&cargo.type==='commander')cargo.carrier=null;
    else removeUnit(state,cargo.id,capturedBy);
  }
}
function completeTurn(state){state.turnContext=null;state.turn=opponent(state.turn);state.turnNumber=(state.turnNumber||0)+1;return state;}
const sameIds=(a=[],b=[])=>Array.isArray(a)&&Array.isArray(b)&&JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
export function applyAction(state,action){
  if(!action||typeof action!=='object'||state.winner)throw Error('Illegal action');
  if(action.kind==='end-turn'){
    if(!state.turnContext)throw Error('No compound turn to finish');
    const next=structuredClone(state);next.ply++;next.lastMove={id:'turn',kind:'end-turn'};return completeTurn(next);
  }
  const chosen=legalActions(state,action.id).find(a=>a.kind===action.kind&&a.x===action.x&&a.y===action.y&&(a.targetId||'')===(action.targetId||'')&&(a.carrierId||'')===(action.carrierId||'')&&(a.passengerId||'')===(action.passengerId||'')&&(a.dropCarrierId||'')===(action.dropCarrierId||'')&&sameIds(a.dropIds,action.dropIds));
  if(!chosen)throw Error('Illegal move for current turn');
  const result=structuredClone(state),p=byId(result,action.id),original=byId(state,action.id),start={x:p.x,y:p.y},members=stackMembers(state,p.id);
  const passengers=cargoOf(result,p.id),weapon=weaponFor(state,p,chosen);
  let ctx=result.turnContext;
  if(!ctx&&!['embark','load'].includes(chosen.kind)&&(members.length>1||weapon))ctx=result.turnContext={team:p.team,participants:members.map(q=>q.id),spent:[],weapons:{}};
  if(chosen.kind==='embark'){
    p.x=chosen.x;p.y=chosen.y;p.carrier=chosen.carrierId;for(const q of carriedUnits(result,p.id)){q.x=p.x;q.y=p.y;}
  }else if(chosen.kind==='load'){
    const q=byId(result,chosen.passengerId);p.carrier=null;p.x=chosen.x;p.y=chosen.y;
    for(const child of carriedUnits(result,p.id)){child.x=p.x;child.y=p.y;}q.carrier=p.id;
  }else{
    if(p.carrier)p.carrier=null;
    if(action.carryIds!==undefined){
      if(!Array.isArray(action.carryIds)||new Set(action.carryIds).size!==action.carryIds.length||action.carryIds.some(id=>!passengers.some(q=>q.id===id)))throw Error('Invalid passenger selection');
      if(!['move','capture'].includes(chosen.kind))throw Error('Passenger selection requires carrier travel');
      const left=passengers.filter(q=>!action.carryIds.includes(q.id));
      if(left.length>1||left.some(q=>!landingAllowed(q,start.x,start.y)))throw Error('Passengers cannot be left on this intersection; move one separately first');
      for(const q of left)q.carrier=null;
    }
    const flight=p.type==='aircraft'?flightOutcome(state,original,chosen.x,chosen.y):{risk:false,reaches:true};
    if(flight.reaches){
      if(chosen.targetId){
        const target=byId(result,chosen.targetId);
        const shelter=target?.type==='commander'?result.pieces.find(q=>q.id===target.carrier&&q.type==='headquarters'):null;
        removeUnit(result,chosen.targetId,p.team);if(shelter)removeUnit(result,shelter.id,p.team);
      }
      if(chosen.kind==='airdrop'&&!flight.risk){
        for(const id of chosen.dropIds){const q=byId(result,id);q.carrier=chosen.dropCarrierId&&id!==chosen.dropCarrierId?chosen.dropCarrierId:null;}
        for(const id of chosen.dropIds){const q=byId(result,id);q.x=chosen.x;q.y=chosen.y;for(const child of carriedUnits(result,q.id)){child.x=q.x;child.y=q.y;}}
      }else if(!['fire','bomb','airdrop'].includes(chosen.kind)){
        p.x=chosen.x;p.y=chosen.y;for(const q of carriedUnits(result,p.id)){q.x=p.x;q.y=p.y;}
      }
    }
    if(flight.risk){removeUnit(result,p.id);result.historyMessage='Aircraft intercepted; passengers remaining aboard were lost.';}
  }
  if(ctx){if(!ctx.spent.includes(p.id))ctx.spent.push(p.id);if(weapon)ctx.weapons[p.id]=[...(ctx.weapons[p.id]||[]),weapon];}
  // Check is recomputed after real captures; HQ protection and sea fire use the same actions.
  for(const q of result.pieces)if(q.alive&&!q.hero&&givesCheck(result,q))q.hero=true;
  const battle=checkDivisionVictory(result,p.team),ownLoss=checkDivisionVictory(result,opponent(p.team));
  if(battle){result.winner=p.team;result.winReason=battle;}
  else if(ownLoss){result.winner=opponent(p.team);result.winReason=ownLoss;}
  else if(commanderFacing(result)){result.winner=opponent(p.team);result.winReason='facing-commanders';}
  result.lastMove={...chosen,from:start,...(action.carryIds?{carryIds:[...action.carryIds]}:{})};result.ply++;
  if(result.winner||!ctx||!ctx.participants.some(id=>legalActions(result,id).length))return completeTurn(result);
  return result;
}
// Wikimedia starting diagram coordinates. UNIT IDENTITIES are a RECONSTRUCTION, not verified official arrangement.
const RED_SETUP=[
  ['commander',6,0],['navy',1,1],['antiair',4,1],['headquarters',5,1],['antiair',7,1],['headquarters',8,1],
  ['aircraft',3,2],['missile',6,2],['aircraft',9,2],
  ['navy',2,3],['tank',4,3],['engineer',5,3],['engineer',7,3],['tank',8,3],
  ['infantry',2,4],['artillery',3,4],['militia',6,4],['artillery',9,4],['infantry',10,4]
];
export function createInitialState(mode=DEFAULT_PROFILE) {
  const rulesProfile=resolveProfile(mode);
  if(!RULE_PROFILES[rulesProfile])throw Error('Unknown rules profile');
  const pieces=[];
  for(const team of TEAMS){
    RED_SETUP.forEach(([type,x,y],i)=>pieces.push({id:`${team}-${String(i+1).padStart(2,'0')}`,type,team,
      x,y:team==='red'?y:11-y,hero:false,alive:true,carrier:null}));
  }
  return {rulesVersion:VERSION,mode,rulesProfile,turn:'red',pieces,captures:[],historyMessage:'',lastMove:null,ply:0,winner:null,winReason:null,setupVerified:false,fordsVerified:false,turnContext:null,turnNumber:0};
}
export function allLegalActions(state,team=state.turn){
  if(state.winner)return [];
  const position={...state,turn:team},actions=state.pieces.filter(p=>p.alive&&p.team===team).flatMap(p=>legalActions(position,p.id));
  if(state.turnContext&&team===state.turn)actions.push({id:'turn',kind:'end-turn'});
  return actions;
}
export function chooseBotMove(state,level='medium'){
  const options=allLegalActions(state);if(!options.length)return null;
  const score=a=>{const target=byId(state,a.targetId);return (target?TYPES[target.type].points*12:0)-(a.risk?500:0)+(a.kind==='end-turn'?-30:a.kind==='embark'||a.kind==='load'?15:0)+(a.kind==='move'?(state.turn==='red'?a.y:11-a.y)*2:0);};
  if(level==='easy')return options[Math.floor(Math.random()*options.length)];
  const rated=options.map(a=>({a,v:score(a)+(level==='hard'?0:Math.random()*20)})).sort((a,b)=>b.v-a.v);
  if(level!=='hard')return rated[0].a;
  return rated.slice(0,12).map(({a,v})=>{const next=applyAction(state,a);const enemyBest=allLegalActions({...next,turnContext:null},opponent(state.turn)).reduce((m,b)=>Math.max(m,TYPES[byId(next,b.targetId)?.type]?.points||0),0);return {a,v:v-enemyBest*7+(next.winner===state.turn?100000:0)};}).sort((a,b)=>b.v-a.v)[0].a;
}
