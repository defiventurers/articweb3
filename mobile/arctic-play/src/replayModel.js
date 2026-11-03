import {VERSION,game,pieces} from './games.ts';
import {firstPosition,firstSteps} from './firstJourney.js';
import {coursePosition,activityPosition} from './courseActivities.js';
import {courseCards} from './curriculum.js';
import {missionFor} from './adventures.js';
const token=v=>typeof v==='string'&&/^[a-z0-9-]{1,70}$/.test(v);
export function replayRequest(value){
 if(!game(value?.id))throw Error('Choose a game from the collection.');const{id,task}=value;
 if(['first','course'].includes(task)&&token(value.key))return{id,task,key:value.key};
 if(task==='scene'&&token(value.mission))return{id,task,mission:value.mission};
 if(task==='activity'&&value.activity?.kind==='scene'&&token(value.activity.mission))return{id,task:'scene',mission:value.activity.mission};
 if(task==='activity'&&value.activity?.kind==='lesson'&&['move','capture','special'].includes(value.activity.lesson))return{id,task,activity:{kind:'lesson',lesson:value.activity.lesson}};
 throw Error('This memory needs a guided move or challenge.');
}
export function replayPosition(request,path=[]){const r=replayRequest(request);if(r.task==='first')return firstPosition(r.id,r.key,path);if(r.task==='course')return coursePosition(r.id,r.key,path);return activityPosition(r.id,r.task==='scene'?{kind:'scene',mission:r.mission}:r.activity,path);}
export function replayProof(value){
 if(value?.version&&value.version!==VERSION)throw Error('This memory uses another rules version. It stays in your Archive; try a new discovery to replay.');
 const request=replayRequest(value?.request),path=value?.actionIds;
 if(!Array.isArray(path)||path.length>12||path.some(a=>typeof a!=='string'||a.length>200))throw Error('This move record is invalid.');
 const frames=[],moves=[];let p=replayPosition(request,[]);frames.push(p.state);
 for(let i=0;i<path.length;i++){const a=p.legal.find(a=>a.id===path[i]);if(!a)throw Error('That move is not legal in this discovery.');moves.push({from:pieces(request.id,p.state).find(u=>u.source===a.source)?.cell||null,to:a.target});p=replayPosition(request,path.slice(0,i+1));frames.push(p.state);}
 const title=request.task==='first'?firstSteps(request.id).find(s=>s.key===request.key)?.title:request.task==='course'?courseCards(request.id).find(s=>s.key===request.key)?.title:request.task==='scene'?missionFor(request.id,request.mission).title:'A first guided move';
 return{request,actionIds:[...path],frames,moves,complete:p.complete===true&&path.length>0,title,caption:p.after||'A legal discovery, earned together.',version:VERSION};
}
