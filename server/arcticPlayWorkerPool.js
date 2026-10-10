const {Worker}=require('node:worker_threads');
const path=require('node:path');
// Keep Android rule calculations away from the existing website event loop.
function createArcticPlayWorkerPool(){
  const workers=[],queue=[];let serial=0,closed=false;
  function boot(slot){
    const worker=new Worker(path.join(__dirname,'arcticPlayWorker.js'));slot.worker=worker;worker.unref();
    worker.on('message',message=>{
      const job=slot.job;if(!job||message.id!==job.id)return;
      clearTimeout(slot.timer);slot.job=null;message.error?job.reject(new Error(message.error)):job.resolve(message.state);pump();
    });
    worker.on('error',error=>{
      if(slot.worker!==worker)return;clearTimeout(slot.timer);slot.job?.reject(error);slot.job=null;worker.terminate();if(!closed){boot(slot);pump();}
    });
  }
  function pump(){
    if(closed)return;
    for(const slot of workers){
      if(slot.job||!queue.length)continue;
      const job=queue.shift();slot.job=job;
      slot.timer=setTimeout(()=>{
        if(slot.job!==job)return;slot.job=null;const old=slot.worker;slot.worker=null;old.terminate();job.reject(new Error('Rule validation took too long. Reconnect and try again.'));if(!closed){boot(slot);pump();}
      },20000);slot.timer.unref?.();
      slot.worker.postMessage({id:job.id,...job.payload});
    }
  }
  // Workers are created lazily, so idle free rooms add no running threads.
  function run(payload){
    if(closed)return Promise.reject(new Error('The game service is restarting.'));
    if(queue.length>=16)return Promise.reject(new Error('The game server is busy. Try again in a moment.'));
    return new Promise((resolve,reject)=>{
      queue.push({id:++serial,payload,resolve,reject});
      if(workers.length<2){const slot={worker:null,job:null,timer:null};workers.push(slot);boot(slot);}pump();
    });
  }
  function close(){closed=true;for(const slot of workers){clearTimeout(slot.timer);slot.job?.reject(new Error('Game service closed.'));slot.worker?.terminate();}for(const job of queue)job.reject(new Error('Game service closed.'));queue.length=0;}
  return {run,close};
}
module.exports={createArcticPlayWorkerPool};
