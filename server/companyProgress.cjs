// Only achievement documents cross devices. Seats, chats, private invitations,
// device settings and an in-progress board are deliberately device-local.
const KEYS=['archive-journal','how-to-play.v1','little-adventures.v1','companion-journey.v1','frozen-library.v1','replay-cards.v1',...['shogi','sannin','sanguo','sanyou','yanyi','xiangqi','dominion'].flatMap(id=>['complete-rule-guide.v1.'+id,'first-game-path.v1.'+id])];
const safeKey=k=>/^[a-zA-Z0-9_.: -]{1,100}$/.test(k)&&!['__proto__','constructor','prototype'].includes(k);
function object(v){return v&&typeof v==='object'&&!Array.isArray(v);}
function merge(a,b,depth=0){
  if(depth>5)return undefined;
  if(typeof b==='number'&&Number.isFinite(b)&&b>0)return typeof a==='number'&&a>0?Math.min(a,b):b;
  if(typeof b==='string'&&b.length<=100)return typeof a==='string'?[a,b].sort()[0]:b;
  if(Array.isArray(b))return [...new Set([...(Array.isArray(a)?a:[]),...b].filter(v=>typeof v==='string'&&v.length<=100))].sort().slice(-366);
  if(object(b)){const out=object(a)?{...a}:{};for(const[k,v]of Object.entries(b).slice(0,500))if(safeKey(k)){const next=merge(out[k],v,depth+1);if(next!==undefined)out[k]=next;}return out;}
  // Cosmetic choices and event counters are device preferences, not achievements.
  return undefined;
}
function cleanDocument(key,value){
  if(key==='replay-cards.v1'){const cards={};for(const[k,c]of Object.entries(value||{}).slice(0,60)){const r=c?.request;if(!safeKey(k)||!r||!['shogi','sannin','sanguo','sanyou','yanyi','xiangqi','dominion'].includes(r.id)||!['first','course','scene','activity'].includes(r.task)||!Array.isArray(c.actionIds)||!c.actionIds.length||c.actionIds.length>12||!c.actionIds.every(a=>typeof a==='string'&&a.length<=200)||!Number.isFinite(c.at)||c.at<=0)continue;const request={id:r.id,task:r.task};if(typeof r.key==='string'&&/^[a-z0-9-]{1,70}$/.test(r.key))request.key=r.key;if(typeof r.mission==='string'&&/^[a-z0-9-]{1,70}$/.test(r.mission))request.mission=r.mission;if(r.task==='activity'&&r.activity?.kind==='lesson'&&['move','capture','special'].includes(r.activity.lesson))request.activity={kind:'lesson',lesson:r.activity.lesson};cards[k]={request,actionIds:[...c.actionIds],at:c.at,...(typeof c.version==='string'&&c.version.length<=100?{version:c.version}:{})};}return cards;}

  if(key==='companion-journey.v1')return merge({}, {memories:value?.memories||{},daily:value?.daily||{},visits:value?.visits||[],finished:value?.finished||[]});
  const cleaned=merge({},value)||{};delete cleaned.index;return cleaned;
}
function mergeCards(a,b){const out={...a};for(const[k,v]of Object.entries(b))if(!out[k]||v.at<out[k].at||v.at===out[k].at&&JSON.stringify(v)<JSON.stringify(out[k]))out[k]=v;return Object.fromEntries(Object.entries(out).sort((a,b)=>a[0].localeCompare(b[0])).slice(0,60));}
function mergeProgress(local,incoming){const out={};for(const key of KEYS)out[key]=key==='replay-cards.v1'?mergeCards(cleanDocument(key,local?.[key]),cleanDocument(key,incoming?.[key])):merge(cleanDocument(key,local?.[key]),cleanDocument(key,incoming?.[key]));return out;}
module.exports={PROGRESS_KEYS:KEYS,mergeProgress};
