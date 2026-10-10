export class RuleClient {
  constructor(){this.worker=null;this.pending=new Map();}
  call(task,payload){
    if(!this.worker){
      this.worker=new Worker('bot.js');
      this.worker.onmessage=({data})=>{const job=this.pending.get(data.requestId);if(!job)return;this.pending.delete(data.requestId);clearTimeout(job.timer);data.error?job.reject(new Error(data.error)):job.resolve(data);};
      this.worker.onerror=()=>this.reset('The rule worker stopped. Reopen the game to retry.');
    }
    return new Promise((resolve,reject)=>{
      const requestId=crypto.randomUUID(),timer=setTimeout(()=>this.reset('Rule calculation took too long. Reopen the game to retry.'),25000);
      this.pending.set(requestId,{resolve,reject,timer});this.worker.postMessage({task,requestId,...payload});
    });
  }
  reset(message){this.worker?.terminate();this.worker=null;for(const job of this.pending.values()){clearTimeout(job.timer);job.reject(new Error(message));}this.pending.clear();}
}
