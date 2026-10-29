const {parentPort}=require('node:worker_threads');
const engine=require('./arcticPlayEngine.cjs');
parentPort.on('message',async job=>{
  try {
    if(job.foundationProof){const proof=await require('./companyFoundation.cjs').verifyFoundation(job.foundationProof);parentPort.postMessage({id:job.id,state:proof});return;}
    if(job.accessProof){const proof=require('../mobile/arctic-play/src/unlockModel.cjs').verifyReplay(engine,job.accessProof);parentPort.postMessage({id:job.id,state:proof});return;}
    if(job.proof){const proof=require('./companyLessons.cjs').replayProof(job.proof);parentPort.postMessage({id:job.id,state:proof});return;}
    const action=job.bot?engine.chooseBot(job.tableId,job.state):job.actionId;
    if(!action)throw new Error('No legal action is available for this turn.');
    parentPort.postMessage({id:job.id,state:engine.apply(job.tableId,job.state,action)});
  } catch(error) {parentPort.postMessage({id:job.id,error:error.message});}
});
