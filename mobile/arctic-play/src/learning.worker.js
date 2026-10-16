import {lessonPosition,piecePosition,acceptLesson} from './learning.js';
self.onmessage=({data})=>{
  try{
    const response=data.task==='lesson'?lessonPosition(data.id,data.kind):data.task==='piece'?piecePosition(data.id,data.role):data.task==='lesson-apply'?{state:acceptLesson(data.id,data.position,data.actionId)}:null;
    if(!response)throw new Error('This lesson is not available.');
    self.postMessage({requestId:data.requestId,...response});
  }catch(error){self.postMessage({requestId:data.requestId,error:error.message});}
};
