import {practiceRequest} from './practiceBoard.js';
import {replayProof,replayPosition} from './replayModel.js';
import {firstPosition} from './firstJourney.js';
import {coursePosition,activityPosition} from './courseActivities.js';
import {soloPosition} from './soloPractice.js';
import {lessonPosition,piecePosition,acceptLesson} from './learning.js';
import {adventurePosition} from './adventures.js';
self.onmessage=({data})=>{
  try{
    const response=data.task==='practice'?practiceRequest(data):data.task==='proof'?replayProof(data.value):data.task==='replay-position'?replayPosition(data.request,data.actionIds):data.task==='first'?firstPosition(data.id,data.key,data.actionIds):data.task==='course'?coursePosition(data.id,data.key,data.actionIds,data.inspected):data.task==='activity'?activityPosition(data.id,data.activity,data.actionIds,data.inspected):data.task==='solo'?soloPosition(data.id,data.role,data.path,data.opening):data.task==='adventure'?adventurePosition(data.id,data.mission,data.variant,data.actionIds):data.task==='lesson'?lessonPosition(data.id,data.kind):data.task==='piece'?piecePosition(data.id,data.role):data.task==='lesson-apply'?{state:acceptLesson(data.id,data.position,data.actionId)}:null;
    if(!response)throw new Error('This lesson is not available.');
    self.postMessage({requestId:data.requestId,...response});
  }catch(error){self.postMessage({requestId:data.requestId,error:error.message});}
};
