import { chooseBot, actions, apply, inCheck } from './games.ts';
import * as engine from './games.ts';
import unlockModel from './unlockModel.cjs';
import * as foundation from './foundation.js';
self.onmessage=async({data})=>{
  try {
    if(data.task==='foundation-bot'){const action=foundation.beginnerAction(data.state);if(!action)throw Error('No legal foundation move is available.');const next=foundation.applyAction(data.state,action);if(next.error)throw Error(next.error);self.postMessage({requestId:data.requestId,state:next.state,action:foundation.actionKey(action)});}
    else if(data.task==='verify-foundation')self.postMessage({requestId:data.requestId,win:await foundation.verifyFoundation(data.proof)});
    else if(data.task==='verify-progress')self.postMessage({requestId:data.requestId,win:unlockModel.verifyReplay(engine,data.proof)});
    else if(data.task==='legal') self.postMessage({requestId:data.requestId,legal:actions(data.id,data.state),checked:inCheck(data.id,data.state)});
    else if(data.task==='apply') self.postMessage({requestId:data.requestId,state:apply(data.id,data.state,data.actionId)});
    else {const action=chooseBot(data.id,data.state);self.postMessage({sequence:data.sequence,action,state:action?apply(data.id,data.state,action):null});}
  }
  catch(error) { self.postMessage({sequence:data.sequence,requestId:data.requestId,error:error.message}); }
};
