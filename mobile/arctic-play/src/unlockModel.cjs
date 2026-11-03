// Shared by the Android/browser UI and the room service. No prices or secrets here.
const VERSION=1,KEY_THRESHOLD=3;
const CATALOG=Object.freeze({
  dominion:{starter:true,name:'Chaturanga'},
  xiangqi:{starter:true,name:'Xiangqi'},
  shogi:{starter:true,name:'Shogi'},
  sanguo:{wins:['xiangqi'],name:'Sanguo Qi'},
  sanyou:{wins:['xiangqi'],name:'San You Qi'},
  sannin:{wins:['shogi'],name:'Sannin Shogi'},
  yanyi:{wins:['sanguo','sanyou'],name:'Sanguo Yan Yi Qi'}
});
const GAME_IDS=Object.freeze(Object.keys(CATALOG));
const PRODUCTS=Object.freeze([
  ...GAME_IDS.filter(id=>!CATALOG[id].starter).map(id=>({id:'hall-'+id+'-v1',name:CATALOG[id].name+' · Permanent access',kind:'hall',games:[id]})),
  {id:'all-halls-v1',name:'All Access Pass',kind:'pass',games:GAME_IDS,futureGames:false},
  {id:'offline-access-v1',name:'Offline Access Pass',kind:'offline',games:[],oneTime:true}
]);
const POINTS=[10,25,40].flatMap((n,ring)=>[[n,n],[50,n],[100-n,n],[100-n,50],[100-n,100-n],[50,100-n],[n,100-n],[n,50]].map(([x,y],i)=>({id:ring*8+i,x,y})));
const MILLS=[0,8,16].flatMap(n=>[[n,n+1,n+2],[n+2,n+3,n+4],[n+4,n+5,n+6],[n+6,n+7,n]]).concat([[1,9,17],[3,11,19],[5,13,21],[7,15,23]]);
const millOrder=[0,1,2,3,4,5,6,7,12,13,14,15];
const CHALLENGES=Object.freeze(millOrder.map((index,i)=>{
  const mill=MILLS[index],missing=mill[i%3],own=mill.filter(p=>p!==missing);
  const other=POINTS.map(p=>p.id).filter(p=>!mill.includes(p)).filter((_,j)=>j%7===i%7).slice(0,2);
  return {id:'formation-'+String(i+1).padStart(2,'0'),title:['North gate','Eastern watch','South lanterns','Western bridge','Inner courtyard','Frost arch','Moon terrace','Harbor wall','Lantern avenue','River crossing','Southern passage','Western passage'][i],own,other};
}));
function solved(id,point){const p=CHALLENGES.find(p=>p.id===id);return !!(p&&Number.isInteger(point)&&point>=0&&point<24&&!p.own.includes(point)&&!p.other.includes(point)&&MILLS.some(m=>m.includes(point)&&m.every(n=>n===point||p.own.includes(n))));}
function empty(){return {version:VERSION,wins:{},solutions:{},foundationWins:{},keyHalls:{}};}
function clean(value={}){
  const next=empty();
  for(const id of GAME_IDS){const win=value?.wins?.[id];if(win&&typeof win.matchId==='string'&&win.matchId.length<=120&&Number.isFinite(win.at))next.wins[id]={matchId:win.matchId,at:win.at};}
  for(const c of CHALLENGES)if(solved(c.id,value?.solutions?.[c.id]))next.solutions[c.id]=value.solutions[c.id];
  for(const [signature,entry]of Object.entries(value?.foundationWins||{}).slice(0,4))if(/^[a-f0-9]{64}$/.test(signature)&&typeof entry?.matchId==='string'&&entry.matchId.length<=120&&Number.isFinite(entry.at))next.foundationWins[signature]={matchId:entry.matchId,at:entry.at};
  const available=Math.floor(Object.keys(next.solutions).length/KEY_THRESHOLD)+Object.keys(next.foundationWins).length;
  for(const [id,at]of Object.entries(value?.keyHalls||{}))if(CATALOG[id]&&!CATALOG[id].starter&&Number.isFinite(at)&&Object.keys(next.keyHalls).length<available)next.keyHalls[id]=at;
  return next;
}
function merge(a,b){a=clean(a);b=clean(b);return clean({wins:{...b.wins,...a.wins},solutions:{...b.solutions,...a.solutions},foundationWins:{...a.foundationWins,...b.foundationWins},keyHalls:{...a.keyHalls,...b.keyHalls}});}
function balance(value){const p=clean(value);return Math.floor(Object.keys(p.solutions).length/KEY_THRESHOLD)+Object.keys(p.foundationWins).length-Object.keys(p.keyHalls).length;}
function earned(id,value){const p=clean(value),c=CATALOG[id];return !!(c&&(c.starter||p.keyHalls[id]||c.wins?.some(prerequisite=>p.wins[prerequisite])));}
function access(id,{progress,entitlements={},festivals=[],now=0}={}){
  if(!CATALOG[id])return {open:false,reason:'unknown'};
  if(entitlements['owner-access-v1']?.active===true&&entitlements['owner-access-v1']?.mode==='owner')return {open:true,reason:'owner'};
  if(CATALOG[id].starter)return {open:true,reason:'starter'};
  if(earned(id,progress))return {open:true,reason:'earned'};
  const purchase=PRODUCTS.find(p=>p.games.includes(id)&&entitlements[p.id]?.active===true&&entitlements[p.id]?.mode==='live');
  if(purchase)return {open:true,reason:'purchased',product:purchase.id};
  const festival=festivals.find(f=>validFestival(f)&&f.games.includes(id)&&now>=f.startsAt&&now<f.endsAt);
  if(festival)return {open:true,reason:'festival',festival:festival.id,endsAt:festival.endsAt};
  return {open:false,reason:'locked'};
}
function validFestival(f){return !!(f&&typeof f.id==='string'&&typeof f.name==='string'&&Array.isArray(f.games)&&f.games.length&&f.games.every(id=>CATALOG[id])&&Number.isSafeInteger(f.startsAt)&&Number.isSafeInteger(f.endsAt)&&f.endsAt>f.startsAt);}
function festivalsFrom(value){if(!Array.isArray(value))return [];return value.filter(validFestival).map(f=>({id:f.id,name:f.name,games:[...new Set(f.games)],startsAt:f.startsAt,endsAt:f.endsAt}));}
function complete(progress,id,point){if(!solved(id,point))throw Error('Place your lantern on an empty point that completes a line of three.');const p=clean(progress);return clean({...p,solutions:{...p.solutions,[id]:point}});}
function spend(progress,id,now=Date.now()){
  const p=clean(progress);if(!CATALOG[id]||CATALOG[id].starter)throw Error('Choose a locked hall.');
  if(earned(id,p))return p;
  if(balance(p)<1)throw Error('Complete three different formations to earn a Lantern Key.');
  return clean({...p,keyHalls:{...p.keyHalls,[id]:now}});
}
function win(progress,id,matchId,now=Date.now()){if(!CATALOG[id]||typeof matchId!=='string'||!matchId||matchId.length>120)throw Error('Invalid completed match.');const p=clean(progress);return p.wins[id]?p:clean({...p,wins:{...p.wins,[id]:{matchId,at:now}}});}
function foundationWin(progress,verified,now=Date.now()){if(verified?.id!=='nine-ice-forts'||!/^[a-f0-9]{64}$/.test(verified.signature||'')||typeof verified.matchId!=='string'||!verified.matchId||verified.matchId.length>120)throw Error('Invalid foundation-game result.');const p=clean(progress);if(p.foundationWins[verified.signature]||Object.keys(p.foundationWins).length>=4)return p;return clean({...p,foundationWins:{...p.foundationWins,[verified.signature]:{matchId:verified.matchId,at:now}}});}
function winningSeats(outcome){if(!outcome||outcome.draw)return [];return [...new Set((Array.isArray(outcome.winners)?outcome.winners:typeof outcome.winner==='string'?outcome.winner.split(/\s*\+\s*/):[]).filter(v=>typeof v==='string'))];}
function verifyReplay(engine,proof){
  if(!proof||!['xiangqi','shogi','sanguo','sanyou'].includes(proof.id)||typeof proof.matchId!=='string'||proof.matchId.length>120||!proof.matchId||!engine.game(proof.id)?.seats.includes(proof.seat)||!Array.isArray(proof.actions)||!proof.actions.length||proof.actions.length>2000||proof.eligible===false)throw Error('This practice match has no complete qualifying move record.');
  let state=engine.create(proof.id);
  for(const action of proof.actions){if(typeof action!=='string'||action.length>180||engine.result(state))throw Error('This move record is invalid.');state=engine.apply(proof.id,state,action);}
  const result=engine.result(state);
  if(!winningSeats(result).includes(proof.seat))throw Error('Finish a winning game to open the next hall.');
  return {id:proof.id,matchId:proof.matchId,seat:proof.seat};
}
function requirement(id){const p=CATALOG[id];return !p?'Unknown hall':p.starter?'Open from your first visit':'Win '+p.wins.map(id=>CATALOG[id].name).join(' or ')+', or use 1 Lantern Key.';}
function destinations(id){return GAME_IDS.filter(key=>CATALOG[key].wins?.includes(id));}
function validateCatalogue(catalog=CATALOG){
  const visiting=new Set(),visited=new Set();
  function visit(id){if(!catalog[id])throw Error('Unknown prerequisite: '+id);if(visiting.has(id))throw Error('Progression contains a cycle.');if(visited.has(id))return;visiting.add(id);if(!catalog[id].starter&&!catalog[id].wins?.length)throw Error('A hall has no free win route.');for(const p of catalog[id].wins||[])visit(p);visiting.delete(id);visited.add(id);}
  for(const id of Object.keys(catalog))visit(id);return true;
}
validateCatalogue();
module.exports={VERSION,KEY_THRESHOLD,CATALOG,GAME_IDS,PRODUCTS,POINTS,MILLS,CHALLENGES,empty,clean,merge,balance,earned,access,solved,complete,spend,win,foundationWin,winningSeats,verifyReplay,requirement,destinations,validFestival,festivalsFrom,validateCatalogue};
