const {parentPort}=require('node:worker_threads');
const engine=require('./arcticPlayEngine.cjs');
parentPort.on('message',job=>{
  try {
    const action=job.bot?engine.chooseBot(job.tableId,job.state):job.actionId;
    if(!action)throw new Error('No legal action is available for this turn.');
    parentPort.postMessage({id:job.id,state:engine.apply(job.tableId,job.state,action)});
  } catch(error) {parentPort.postMessage({id:job.id,error:error.message});}
});
