// Readiness only: never retries credentials or grants access.
export function createHarborConnection({fetchImpl=(...args)=>fetch(...args),now=()=>Date.now(),online=()=>typeof navigator==='undefined'||navigator.onLine!==false,sleep=ms=>new Promise(r=>setTimeout(r,ms)),budgetMs=120000,requestTimeoutMs=10000,pollMs=2500,readyTtlMs=30000}={}) {
 let state={phase:'idle',elapsedMs:0,attempts:0,message:''},flight=null,readyAt=-Infinity,generation=0,cancellation=0,active=null;
 const listeners=new Set(),snapshot=()=>state;
 const publish=patch=>{state={...state,...patch};for(const fn of listeners)fn(state);};
 const error=(message,code)=>Object.assign(new Error(message),{code});
 function ensureReady({force=false}={}){
  if(flight)return flight;
  if(!force&&online()&&now()-readyAt<readyTtlMs)return Promise.resolve();
  const run=++generation,start=now();
  const valid=()=>{if(run!==generation)throw error('Connection check cancelled. Try again when you’re ready.','CANCELLED');};
  publish({phase:'warming',elapsedMs:0,attempts:0,message:'Connecting to Lantern Harbor…'});
  const tick=setInterval(()=>{if(run===generation&&state.phase==='warming')publish({elapsedMs:Math.max(0,now()-start)});},1000);
  const task=Promise.resolve().then(async()=>{
   try{
    while(now()-start<budgetMs){
     valid();
     if(!online())throw error('Connect to the internet, then try again.','OFFLINE');
     publish({attempts:state.attempts+1,elapsedMs:Math.max(0,now()-start)});
     const controller=new AbortController();active=controller;let timeout;
     try{
      const response=await Promise.race([
       fetchImpl('https://articweb3.onrender.com/arctic-play/v3/capabilities',{method:'GET',cache:'no-store',credentials:'omit',headers:{Accept:'application/json'},signal:controller.signal}),
       new Promise((_,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(error('Readiness request timed out.','PROBE_TIMEOUT'));},Math.min(requestTimeoutMs,Math.max(1,budgetMs-(now()-start))));})
      ]);
      valid();
      // Render's HTML waiting page is never proof that the account API is ready.
      if(response.ok){
       const value=await response.json();valid();
       if(value?.version>=2&&value.cloud===true&&value.accountPlay===true){readyAt=now();publish({phase:'ready',elapsedMs:now()-start,message:'Lantern Harbor is ready.'});return;}
       if(value?.version>=2&&value.cloud===false)throw error('The account service is unavailable. Please try again shortly.','SERVICE_UNAVAILABLE');
      }
     }catch(e){valid();if(e.code==='SERVICE_UNAVAILABLE')throw e;}
     finally{clearTimeout(timeout);controller.abort();if(active===controller)active=null;}
     if(now()-start<budgetMs)await sleep(Math.min(pollMs,budgetMs-(now()-start)));
    }
    throw error('Lantern Harbor is taking longer than usual. Please try again.','HARBOR_TIMEOUT');
   }catch(e){if(run===generation)publish({phase:e.code==='OFFLINE'?'offline':e.code==='CANCELLED'?'cancelled':'error',elapsedMs:now()-start,message:e.message});throw e;}
   finally{clearInterval(tick);if(flight===task)flight=null;}
  });
  flight=task;return task;
 }
 return {snapshot,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},ensureReady,captureIntent:()=>cancellation,assertIntent(value){if(value!==cancellation)throw error('Connection check cancelled. Try again when you’re ready.','CANCELLED');},cancel(){generation++;cancellation++;active?.abort();active=null;flight=null;readyAt=-Infinity;publish({phase:'cancelled',message:'Ready when you are.'});},invalidate(){readyAt=-Infinity;}};
}
export const harborConnection=createHarborConnection();
