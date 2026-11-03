import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),engine=require('../build/games.cjs');
const {chromium}=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'));
const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.resolve(process.env.DOMINION_QA_DIR||path.join(mobile,'verification/end-turn'));
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||chromium.executablePath(),args:['--no-sandbox','--no-zygote','--disable-gpu','--allow-file-access-from-files']});
const checks=[],errors=[];
const record=label=>{checks.push(label);console.log('PASS',label);};
const teams=['green','red','blue','yellow'],roleTypes={1:['snow-guard','frost-king'],2:['war-mammoth'],3:['aurora-unicorn'],4:['icebreaker'],5:['snow-guard','frost-king'],6:['icebreaker']};
function rolled(team,values){const state=engine.create('dominion');state.currentPlayerIndex=teams.indexOf(team);state.turn=team;state.dice={rolled:true,values,used:[false,false]};return state;}
async function open(state,{theme='dark',width=320,height=740,humans=teams}={}){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  await context.addInitScript(({state,theme,humans})=>{
    if(location.protocol!=='file:')return;
    localStorage.setItem('arctic-play.v1.theme',JSON.stringify(theme));
    localStorage.setItem('arctic-play.v1.practice.dominion',JSON.stringify({id:'dominion',matchId:'end-turn-qa',state,mode:'hotseat',humans,history:[]}));
    localStorage.setItem('arctic-play.v1.last-table',JSON.stringify({id:'dominion',at:Date.now()}));
    window.Android={setDarkTheme(){},appReady(){}};
  },{state,theme,humans});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(mobile,'android/app/src/main/assets/index.html')).href);
  await page.locator('.home-continue').click();await page.locator('.dice-tray').waitFor();
  await page.waitForFunction(()=>{const text=document.querySelector('.selection-hint')?.textContent;return !!text&&text!=='Checking the position…';},null,{timeout:10000});
  return{page,context};
}
async function imagesFit(page,state){
  const dice=page.locator('.die');assert.equal(await dice.count(),2);
  const team=state.turn==='yellow'?'pink':state.turn;
  for(let i=0;i<2;i++){
    const images=dice.nth(i).locator('.dice-activation-images img'),types=roleTypes[state.dice.values[i]];
    assert.equal(await images.count(),types.length);
    for(let j=0;j<types.length;j++){
      await images.nth(j).evaluate(i=>i.decode());
      assert.match(await images.nth(j).getAttribute('src'),new RegExp(`dominion/${team}-${types[j]}\\.webp$`));
      assert.equal(await images.nth(j).evaluate(i=>i.naturalWidth>0),true);
      const parent=await dice.nth(i).boundingBox(),image=await images.nth(j).boundingBox();
      assert.ok(image.width>=29&&image.height>=33,'piece remains readable');
      assert.ok(image.x>=parent.x&&image.x+image.width<=parent.x+parent.width&&image.y+image.height<=parent.y+parent.height,'piece fits its die card');
    }
    assert.ok(!/Guard|King|Mammoth|Unicorn|Icebreaker/.test(await dice.nth(i).innerText()),'piece names are replaced by images');
    assert.match(await dice.nth(i).getAttribute('aria-label'),/available|used/,'accessible description is retained');
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  const button=await page.getByRole('button',{name:'End turn',exact:true}).boundingBox();assert.ok(button.height>=44,'End turn is a full touch target');
}
try{
  if(process.env.DOMINION_QA_SCOPE!=='flows')for(const theme of ['dark','light'])for(const team of teams)for(const values of [[1,2],[3,4],[5,6]]){
    const state=rolled(team,values),{page,context}=await open(state,{theme});
    await imagesFit(page,state);assert.equal(await page.getByRole('button',{name:'End turn',exact:true}).isEnabled(),true);
    record(`${theme} 320px: ${team} dice ${values.join('/')} show the correct pieces and fit`);await context.close();
  }
  for(const [theme,width,height] of [['light',390,844],['dark',320,740],['light',800,360]]){
    const state=rolled('red',[1,5]),{page,context}=await open(state,{theme,width,height});await imagesFit(page,state);
    await page.screenshot({path:path.join(output,`dice-${theme}-${width}.png`)});
    await page.getByRole('button',{name:'End turn',exact:true}).click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('arctic-play.v1.practice.dominion')).state.turn==='blue',null,{timeout:10000});
    const next=await page.evaluate(()=>JSON.parse(localStorage.getItem('arctic-play.v1.practice.dominion')).state);
    assert.deepEqual(next.board,state.board);assert.equal(next.dice.rolled,false);
    assert.equal(await page.getByRole('button',{name:'End turn',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Roll both dice',exact:true}).isEnabled(),true);
    record(`${theme} ${width}×${height}: End turn after zero moves advances and resets dice`);await context.close();
  }
  {
    const state=rolled('red',[1,5]),{page,context}=await open(state,{theme:'light',width:390,height:844});
    const move=engine.actions('dominion',state).find(a=>a.kind==='move'&&a.raw.dieIndex===0),piece=engine.pieces('dominion',state).find(p=>p.source===move.source);
    await page.locator(`[data-cell="${piece.cell}"]`).click();await page.locator(`[data-cell="${move.target}"]`).click();
    await page.getByRole('button',{name:'Use die 1 (1)',exact:true}).click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('arctic-play.v1.practice.dominion')).state.dice.used[0]);
    await page.waitForFunction(()=>document.querySelector('.dice-end-turn')?.disabled===false);
    assert.equal(await page.locator('.die.used').count(),1);assert.equal(await page.locator('.die.used').innerText().then(s=>s.includes('Used')),true);
    const partial=await page.evaluate(()=>JSON.parse(localStorage.getItem('arctic-play.v1.practice.dominion')).state);
    assert.equal(partial.turn,'red');assert.ok(engine.actions('dominion',partial).some(a=>a.kind==='move'));
    await page.screenshot({path:path.join(output,'one-move-light-390.png')});
    await page.getByRole('button',{name:'End turn',exact:true}).click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('arctic-play.v1.practice.dominion')).state.turn==='blue',null,{timeout:10000});
    const next=await page.evaluate(()=>JSON.parse(localStorage.getItem('arctic-play.v1.practice.dominion')).state);
    assert.deepEqual(next.board,partial.board);assert.equal(next.dice.rolled,false);
    record('Real board tap, die choice and End turn after one move preserve the accepted move');await context.close();
  }
  {
    const {page,context}=await open(rolled('red',[3,3]),{humans:[]});
    assert.equal(await page.getByRole('button',{name:'End turn',exact:true}).isDisabled(),true);
    record('End turn is disabled for a nonacting player');await context.close();
  }
  assert.deepEqual(errors,[]);record('No browser JavaScript errors');
  await fs.rm(path.join(output,'browser-failure.txt'),{force:true});
  await fs.writeFile(path.join(output,'browser-report.json'),JSON.stringify({checks,errors},null,2));
}catch(error){console.error(error);await fs.writeFile(path.join(output,'browser-failure.txt'),String(error.stack||error));throw error;}finally{await browser.close();}
