// Desktop browser measurements; do not represent these as Android device FPS.
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
const here=path.dirname(fileURLToPath(import.meta.url)),require=createRequire(import.meta.url),runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=runtime?require(path.join(runtime,'playwright')):require('../../../frontend/node_modules/playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||chromium.executablePath(),args:['--no-sandbox','--no-zygote','--single-process','--disable-gpu','--allow-file-access-from-files']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await page.goto(pathToFileURL(path.resolve(here,'../android/app/src/main/assets/index.html')).href);await page.locator('.harbor-home').waitFor();
 const samples=[];
 for(const theme of ['dark','light']){
  if(theme==='light'){await page.locator('.bottom-nav').getByRole('button',{name:'Profile',exact:true}).click();await page.getByRole('switch',{name:'Dark mode',exact:true}).click();await page.locator('.bottom-nav').getByRole('button',{name:'Home',exact:true}).click();}
  samples.push({theme,...await page.evaluate(async()=>{
   const frames=[];await new Promise(resolve=>{function frame(t){frames.push(t);if(frames.length===21)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);});
   const intervals=frames.slice(1).map((t,i)=>t-frames[i]).sort((a,b)=>a-b);
   return{sampledIdleFrames:intervals.length,medianFrameIntervalMs:intervals[Math.floor(intervals.length/2)],maxFrameIntervalMs:Math.max(...intervals),firstContentfulPaintMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,usedJsHeapBytes:performance.memory?.usedJSHeapSize};
  })});
 }
 const report={viewport:{width:390,height:844},samples,scope:'Desktop headless Chromium, idle Home cadence, reduced motion. This does not measure physical Android frame rate, native memory, battery usage, cold installation or slow-network behavior.'};
 const output=path.resolve(here,'../verification/gathering/performance.json');await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
