// GENERATED from frontend/src/games/co-tu-lenh/rules.js; do not edit
/**
 * Antarctic Kingdoms Cờ Tư Lệnh — BGA-inspired PRACTICE RECONSTRUCTION v0.2.
 * Two-player deterministic rules. No chain dependencies. Not a certified rulebook implementation.
 * Initial piece identities are inferred from a 512px Wikimedia diagram and require primary-source review.
 * Unsupported multi-capture stacking and official timed scoring are intentionally excluded.
 */
const VERSION = 'co-tu-lenh-practice-0.2';
const FILES = 11;
const RANKS = 12;
const TEAMS = ['red','blue'];
const FORDS = [5,7];
const TYPES = Object.freeze({
  commander:{label:'Commander',native:'Tư lệnh',count:1,range:10,points:100},
  infantry:{label:'Infantry',native:'Bộ binh',count:2,range:1,points:10},
  tank:{label:'Tank',native:'Xe tăng',count:2,range:2,points:20},
  militia:{label:'Militia',native:'Dân quân',count:1,range:1,points:10,diagonal:true},
  engineer:{label:'Engineer',native:'Công binh',count:2,range:1,points:10},
  artillery:{label:'Artillery',native:'Pháo binh',count:2,range:3,points:30,diagonal:true},
  antiair:{label:'Anti-aircraft',native:'Cao xạ',count:2,range:1,points:10,airDefence:1},
  missile:{label:'Missile',native:'Tên lửa',count:1,range:2,points:20,diagonalRange:1,airDefence:2},
  aircraft:{label:'Aircraft',native:'Không quân',count:2,range:4,points:40,diagonal:true,canJump:true},
  navy:{label:'Navy',native:'Hải quân',count:2,range:4,points:80,diagonal:true,canJump:true,airDefence:1},
  headquarters:{label:'Headquarters',native:'Sở chỉ huy',count:2,range:0,points:0}
});
const POINT_VALUES=Object.fromEntries(Object.entries(TYPES).map(([k,v])=>[k,v.points]));
const ORTHO = [[1,0],[-1,0],[0,1],[0,-1]];
const DIAG = [[1,1],[1,-1],[-1,1],[-1,-1]];
const at=(x,y)=>`${x},${y}`;
const inside=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<FILES&&y>=0&&y<RANKS;
const water=(x,y)=>x<=1||y===5||y===6;
const coast=(x,y)=>x===2;
const nautical=(x,y)=>water(x,y)||coast(x,y);
const opponent=team=>team==='red'?'blue':'red';
const byId=(state,id)=>state.pieces.find(p=>p.id===id&&p.alive);
const atPoint=(state,x,y)=>state.pieces.filter(p=>p.alive&&p.x===x&&p.y===y);
const cargoOf=(state,id)=>state.pieces.filter(p=>p.alive&&p.carrier===id);
const direction=(dx,dy)=>(dx===0||dy===0)?'orthogonal':Math.abs(dx)===Math.abs(dy)?'diagonal':null;
const maxRange=p=>(TYPES[p.type]?.range||0)+(p.hero?1:0);
const piecesAt=(state,x,y)=>atPoint(state,x,y);
const isHeavy=t=>['artillery','antiair','missile'].includes(t);
const seaPoint=(x,y)=>x<=1;
const crossedRiver=(y1,y2)=>(y1<=5&&y2>=6)||(y1>=6&&y2<=5);
const linePoints=(p,x,y)=>{
  const dx=Math.sign(x-p.x),dy=Math.sign(y-p.y),n=Math.max(Math.abs(x-p.x),Math.abs(y-p.y));
  return Array.from({length:n},(_,i)=>({x:p.x+(i+1)*dx,y:p.y+(i+1)*dy}));
};
function canCarry(carrierType, passengerType, existing) {
  if(carrierType==='headquarters')return passengerType==='commander'&&existing.length===0;
  if(carrierType==='engineer')return isHeavy(passengerType)&&existing.length===0;
  if(carrierType==='tank')return ['commander','infantry','militia'].includes(passengerType)&&existing.length<2&&
    !(passengerType==='infantry'&&existing.some(p=>p.type==='infantry'));
  if(carrierType==='aircraft')return ['commander','infantry','militia','tank'].includes(passengerType)&&existing.length<2&&
    !(passengerType==='tank'&&existing.some(p=>p.type==='tank'));
  if(carrierType==='navy')return ['commander','infantry','militia','tank','aircraft'].includes(passengerType)&&existing.length<2&&
    !(passengerType==='tank'&&existing.some(p=>p.type==='tank'));
  return false;
}
function travelAllowed(state,p,x,y,actionKind='move') {
  if(!inside(x,y)||p.type==='headquarters')return false;
  if(p.type==='navy'&&(!nautical(x,y)||linePoints(p,x,y).some(pt=>!nautical(pt.x,pt.y))))return false;
  if(p.type!=='navy'&&p.type!=='aircraft'&&seaPoint(x,y)&&!coast(x,y))return actionKind==='fire';
  if(isHeavy(p.type)&&crossedRiver(p.y,y)&&!FORDS.includes(p.x))return false;
  if(isHeavy(p.type)&&crossedRiver(p.y,y)&&!FORDS.includes(x))return false;
  return true;
}
function threatenedByAirDefence(state,x,y,owner) {
  return state.pieces.filter(p=>p.alive&&p.team!==owner&&TYPES[p.type].airDefence&&!p.carrier).some(p=>{
    const r=TYPES[p.type].airDefence;
    return (p.x-x)**2+(p.y-y)**2<=r*r;
  });
}
function projectedAirRisk(state,p,x,y){
  if(p.type!=='aircraft'||p.hero)return false;
  return linePoints(p,x,y).some(pt=>threatenedByAirDefence(state,pt.x,pt.y,p.team));
}
function blocked(state,p,x,y,allowJump) {
  if(allowJump)return false;
  const line=linePoints(p,x,y);line.pop();
  return line.some(pt=>piecesAt(state,pt.x,pt.y).some(q=>q.type!=='navy'||p.type==='navy'));
}
/** Returns authoritatively filtered actions; no target coordinate is trusted directly by applyAction. */
function legalActions(state,id) {
  const p=byId(state,id);
  if(!p||p.team!==state.turn||state.winner)return [];
  if(p.type==='headquarters')return [];
  const acts=[];
  const spec=TYPES[p.type],r=maxRange(p);
  const dirs=p.hero||spec.diagonal||spec.diagonalRange?ORTHO.concat(DIAG):ORTHO;
  for(const [dx,dy] of dirs){
    const diagonal=dx&&dy;
    const lim=diagonal&&!p.hero&&!spec.diagonal&&spec.diagonalRange?spec.diagonalRange:r;
    for(let step=1;step<=lim;step++) {
      const x=p.x+dx*step,y=p.y+dy*step;
      if(!inside(x,y))break;
      if(p.type==='commander'&&step>1){ /* commander moves far, but only adjacent captures */ }
      if(p.type==='engineer'&&cargoOf(state,p.id).length && (!crossedRiver(p.y,y)||!FORDS.includes(p.x)||!FORDS.includes(x)||step!==1))continue;
      if(p.type==='navy'&&linePoints(p,x,y).some(pt=>!nautical(pt.x,pt.y)))continue;
      const location=piecesAt(state,x,y);
      const foes=location.filter(q=>q.team!==p.team),friends=location.filter(q=>q.team===p.team);
      const isArtilleryCapture=p.type==='artillery'&&foes.length>0;
      const pass=spec.canJump||p.type==='artillery';
      const obstructed=blocked(state,p,x,y,false);
      if(!pass&&obstructed)break;
      const risk=projectedAirRisk(state,p,x,y);
      if(friends.length){
        const carrier=friends.find(q=>!q.carrier&&canCarry(q.type,p.type,cargoOf(state,q.id)));
        if(carrier&&step===1&&(!p.carrier)&&!(cargoOf(state,p.id).length)&&
          (carrier.type!=='engineer'||(FORDS.includes(x)&&[5,6].includes(y))))acts.push({id:p.id,kind:'embark',x,y,carrierId:carrier.id});
        if(!pass)break;
        continue;
      }
      if(foes.length){
        if(p.type==='commander'&&step>1)break;
        const target=foes.find(q=>!q.carrier)||foes[0];
        if(p.type==='aircraft'&&target.type==='aircraft'){
          acts.push({id:p.id,kind:'capture',x,y,targetId:target.id,risk});
        }else if(p.type==='navy'&&!nautical(x,y)){
          if(step<=3)acts.push({id:p.id,kind:'fire',x,y,targetId:target.id});
        }else if(travelAllowed(state,p,x,y)){
          const kind=(p.type!=='navy'&&target.type==='navy'&&seaPoint(x,y))?'fire':'capture';
          acts.push({id:p.id,kind,x,y,targetId:target.id,risk});
          if(p.type==='aircraft')acts.push({id:p.id,kind:'bomb',x,y,targetId:target.id,risk});
        }else if(p.type!=='navy'&&target.type==='navy'&&seaPoint(x,y)){
          acts.push({id:p.id,kind:'fire',x,y,targetId:target.id});
        }
        if(!pass)break;
      }else if(!obstructed&&travelAllowed(state,p,x,y)) {
        acts.push({id:p.id,kind:'move',x,y,risk});
      }
      if(p.type==='navy'&&!nautical(x,y))break;
    }
  }
  // Naval gun has distinct stationary three-point shoreline reach.
  if(p.type==='navy')for(const [dx,dy] of ORTHO.concat(DIAG))for(let step=1;step<=3;step++){
    const x=p.x+dx*step,y=p.y+dy*step;
    if(!inside(x,y))break;
    if(nautical(x,y))continue;
    for(const target of piecesAt(state,x,y).filter(q=>q.team!==p.team)){
      if(!acts.some(a=>a.kind==='fire'&&a.targetId===target.id))acts.push({id:p.id,kind:'fire',x,y,targetId:target.id});
    }
  }
  return acts;
}
function countArmy(state,team){return state.pieces.filter(p=>p.alive&&p.team===team).length;}
function checkDivisionVictory(state,team){
  const enemy=opponent(team),left=state.pieces.filter(p=>p.alive&&p.team===enemy);
  if(!left.some(p=>p.type==='commander'))return 'commander';
  if(state.mode==='division'){
    if(!left.some(p=>p.type==='navy'))return 'navy';
    if(!left.some(p=>p.type==='aircraft'))return 'air';
    if(!left.some(p=>['infantry','tank','artillery'].includes(p.type)))return 'land';
  }
  return null;
}
function commanderFacing(state){
  const a=state.pieces.find(p=>p.alive&&p.team==='red'&&p.type==='commander');
  const b=state.pieces.find(p=>p.alive&&p.team==='blue'&&p.type==='commander');
  return Boolean(a&&b&&(a.x===b.x||a.y===b.y)&&!blocked(state,a,b.x,b.y,false));
}
function givesCheck(state,p){
  const e=state.pieces.find(q=>q.alive&&q.team!==p.team&&q.type==='commander');
  if(!e||p.type==='headquarters')return false;
  const dx=e.x-p.x,dy=e.y-p.y,shape=direction(dx,dy);
  if(!shape||(dx===0&&dy===0))return false;
  const limit=(shape==='diagonal'&&!p.hero&&!TYPES[p.type].diagonal&&TYPES[p.type].diagonalRange)
    ?TYPES[p.type].diagonalRange:maxRange(p);
  if(shape==='diagonal'&&!p.hero&&!TYPES[p.type].diagonal&&!TYPES[p.type].diagonalRange)return false;
  if(Math.max(Math.abs(dx),Math.abs(dy))>limit)return false;
  if(p.type==='commander'&&Math.max(Math.abs(dx),Math.abs(dy))>1)return false;
  return !blocked(state,p,e.x,e.y,p.type==='aircraft'||p.type==='navy'||p.type==='artillery');
}
function applyAction(state,action){
  if(!action||typeof action!=='object')throw Error('Invalid action');
  const legal=legalActions(state,action.id);
  const chosen=legal.find(a=>a.kind===action.kind&&a.x===action.x&&a.y===action.y&&
    (a.targetId||'')===(action.targetId||'')&&(a.carrierId||'')===(action.carrierId||''));
  if(!chosen)throw Error('Illegal move for current turn');
  const result=structuredClone(state),p=byId(result,action.id),start={x:p.x,y:p.y},op=opponent(p.team);
  if(chosen.kind==='embark') {
    p.x=chosen.x;p.y=chosen.y;p.carrier=chosen.carrierId;
  } else {
    if(p.carrier)p.carrier=null;
    const passengers=cargoOf(result,p.id);
    if(chosen.targetId){
      const killed=byId(result,chosen.targetId);
      if(killed){
        killed.alive=false;
        for(const cargo of cargoOf(result,killed.id))cargo.alive=false;
        result.captures.push({by:p.team,type:killed.type,turn:result.ply+1});
      }
    }
    const move=!['fire','bomb'].includes(chosen.kind);
    if(move){p.x=chosen.x;p.y=chosen.y;for(const c of passengers){c.x=p.x;c.y=p.y;}}
    // A returning bomber stays at origin. Aircraft in hostile defensive fire can be sacrificed.
    if(chosen.risk&&!p.hero){
      p.alive=false;
      for(const c of passengers)c.alive=false;
      result.historyMessage=`${p.team} aircraft was shot down by air defence`;
      if(chosen.targetId){
        // A suicidal aircraft may capture a defended target, if it reaches the target within hostile airspace.
        const trajectory=linePoints({...p,...start},chosen.x,chosen.y);
        if(trajectory.slice(0,-1).some(pt=>threatenedByAirDefence(state,pt.x,pt.y,p.team))){
          const killed=byId(result,chosen.targetId);
          if(!killed){const orig=result.pieces.find(q=>q.id===chosen.targetId);if(orig){orig.alive=true;for(const cargo of result.pieces.filter(q=>q.carrier===orig.id))cargo.alive=true;}result.captures.pop();}
        }
      }
    }
  }
  // Hero grant is permanent when a piece acquires a direct Commander attack line.
  for(const q of result.pieces){if(q.alive&&q.team===p.team&&!q.hero&&givesCheck(result,q))q.hero=true;}
  const battle=checkDivisionVictory(result,p.team);
  if(battle){result.winner=p.team;result.winReason=battle;}
  else if(commanderFacing(result)){result.winner=op;result.winReason='facing-commanders';}
  result.lastMove={...chosen,from:start};result.ply+=1;
  result.turn=op;
  return result;
}
// Wikimedia starting diagram coordinates. UNIT IDENTITIES are a RECONSTRUCTION, not verified official arrangement.
const RED_SETUP=[
  ['commander',6,0],['navy',1,1],['antiair',4,1],['headquarters',5,1],['antiair',7,1],['headquarters',8,1],
  ['aircraft',3,2],['missile',6,2],['aircraft',9,2],
  ['navy',2,3],['tank',4,3],['engineer',5,3],['engineer',7,3],['tank',8,3],
  ['infantry',2,4],['artillery',3,4],['militia',6,4],['artillery',9,4],['infantry',10,4]
];
function createInitialState(mode='division') {
  if(!['division','commander'].includes(mode))throw Error('Unknown match mode');
  const pieces=[];
  for(const team of TEAMS){
    RED_SETUP.forEach(([type,x,y],i)=>pieces.push({id:`${team}-${String(i+1).padStart(2,'0')}`,type,team,
      x,y:team==='red'?y:11-y,hero:false,alive:true,carrier:null}));
  }
  return {rulesVersion:VERSION,mode,turn:'red',pieces,captures:[],historyMessage:'',lastMove:null,ply:0,winner:null,winReason:null,setupVerified:false};
}
function allLegalActions(state,team=state.turn){
  if(state.winner)return [];
  return state.pieces.filter(p=>p.alive&&p.team===team).flatMap(p=>legalActions({...state,turn:team},p.id));
}
function chooseBotMove(state,level='medium'){
  const options=allLegalActions(state);if(!options.length)return null;
  const score=a=>{
    const target=byId(state,a.targetId);
    let value=target?TYPES[target.type].points*12:0;
    if(a.risk)value-=500;
    if(a.kind==='bomb')value-=2;
    if(a.kind==='embark')value+=15;
    if(a.kind==='move')value+=(state.turn==='red'?a.y:11-a.y)*2;
    return value;
  };
  if(level==='easy')return options[Math.floor(Math.random()*options.length)];
  const rated=options.map(a=>({a,v:score(a)+(level==='hard'?0:Math.random()*20)})).sort((a,b)=>b.v-a.v);
  if(level!=='hard')return rated[0].a;
  const beam=rated.slice(0,12);
  return beam.map(({a,v})=>{
    const next=applyAction(state,a);
    const enemyBest=allLegalActions(next).reduce((m,b)=>Math.max(m,TYPES[byId(next,b.targetId)?.type]?.points||0),0);
    return {a,v:v-enemyBest*7+(next.winner===state.turn?100000:0)};
  }).sort((a,b)=>b.v-a.v)[0].a;
}

module.exports={VERSION,FILES,RANKS,TEAMS,FORDS,TYPES,POINT_VALUES,at,inside,water,coast,nautical,opponent,byId,atPoint,cargoOf,threatenedByAirDefence,legalActions,countArmy,checkDivisionVictory,applyAction,createInitialState,allLegalActions,chooseBotMove};
