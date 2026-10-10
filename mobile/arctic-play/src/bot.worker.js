import { chooseBot, actions, apply, inCheck } from './games.ts';
self.onmessage=({data})=>{
  try {
    if(data.task==='legal') self.postMessage({requestId:data.requestId,legal:actions(data.id,data.state),checked:inCheck(data.id,data.state)});
    else if(data.task==='apply') self.postMessage({requestId:data.requestId,state:apply(data.id,data.state,data.actionId)});
    else {const action=chooseBot(data.id,data.state);self.postMessage({sequence:data.sequence,action,state:action?apply(data.id,data.state,action):null});}
  }
  catch(error) { self.postMessage({sequence:data.sequence,requestId:data.requestId,error:error.message}); }
};
