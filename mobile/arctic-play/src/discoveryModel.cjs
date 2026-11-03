const model=require('./unlockModel.cjs');
// Presentation only: the verified unlock ledger remains the authority.
const ORDER=['sanyou','sanguo','sannin','yanyi'];
const TEASERS={
  xiangqi:{hook:'What waits on the far bank?',reveal:'Cross the river. Let a Cannon strike over one intervening piece.',detail:'Two palaces, one river and a battle of timing.'},
  shogi:{hook:'Can a captured piece become your next move?',reveal:'Captured pieces can return under your command, following the drop rules.',detail:'A second chance can turn the whole board.'},
  sanyou:{hook:'Why does this board have three entrances?',reveal:'Three armies meet around the mountains. Fire and Flag pieces bring new moves.',detail:'Your familiar Xiangqi pieces have two new neighbours.'},
  sanguo:{hook:'What happens to an army when its leader falls?',reveal:'In this edition, the surviving army changes command. Read the owner rings.',detail:'Three banners. One surprising change of command.'},
  sannin:{hook:'What is waiting in the centre of the garden?',reveal:'Three armies meet on a hexagonal board. A safe, unallied King has a special Garden route.',detail:'The third player changes every plan.'},
  yanyi:{hook:'Who will awaken the Yellow Lantern Court?',reveal:'A Horse can capture the Han Emperor, change command and reshape the alliances.',detail:'Three armies. A fourth force waiting for its moment.'},
  dominion:{hook:'Which kingdom will the dice call next?',reveal:'Four clans share an ice arena. Choose one die, two dice or skip your turn.',detail:'Bring a partner for a two-against-two celebration.'}
};
function permanent(id,state){const a=model.access(id,state);return a.open&&a.reason!=='festival';}
function nextMatch(id,state,seen=new Set()){
  if(!model.CATALOG[id]||seen.has(id))return null;
  if(model.access(id,state).open)return id;
  const path=new Set([...seen,id]),parents=model.CATALOG[id].wins||[];
  const ready=parents.find(p=>model.access(p,state).open);
  return ready||parents.map(p=>nextMatch(p,state,path)).find(Boolean)||null;
}
function journey(state={},preferred){
  const progress=model.clean(state.progress),clean={...state,progress};
  const remaining=ORDER.filter(id=>!permanent(id,clean));
  const target=remaining.includes(preferred)?preferred:remaining.find(id=>(model.CATALOG[id].wins||[]).some(p=>model.access(p,clean).open))||remaining[0]||null;
  const completed=Object.keys(progress.solutions).length;
  return {target,match:target?nextMatch(target,clean):null,open:model.GAME_IDS.filter(id=>permanent(id,clean)).length,total:model.GAME_IDS.length,remaining,keys:model.balance(progress),formations:completed,formationsNeeded:model.KEY_THRESHOLD-completed%model.KEY_THRESHOLD,temporary:target&&model.access(target,clean).reason==='festival'};
}
function destinations(id,state){return model.destinations(id).filter(next=>!permanent(next,state));}
module.exports={ORDER,TEASERS,permanent,nextMatch,journey,destinations};
