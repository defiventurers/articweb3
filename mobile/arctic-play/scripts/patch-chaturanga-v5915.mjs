import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
import {CH_RULES,CH_HISTORY,CH_PRESENTATION} from '../src/chaturangaHeritage.js';
const mobile=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(mobile+'/build-deps/package.json'),{parse}=require('acorn'),{build}=await import(require.resolve('rolldown'));
const [input,output,kind='app']=process.argv.slice(2);if(!input||!output)throw Error('Supply baseline file, output path and app/bot/learn/fair');
let source=await fs.readFile(input,'utf8');const digest=createHash('sha256').update(source).digest('hex');
const hashes={"app": "08981bf6b08852074c6fa7dfa3b7b8f7efea4f653c884c7a9e0a6497a04cc567", "bot": "445bb82c70ebf628e268994c15c3da26a83b451d3e9dfb4493d038af957c3eb2", "fair": "c58c1cdc9bb8c661edc3a4912d5fa8d264f0585279e0646ed260a4c8659c887b", "learn": "c4082e1473bdc2b3c440a7ba9b207b7e5799047b37051e1537796b287e4ee6ef"};
if(digest!==hashes[kind])throw Error('Expected verified v5.9.14 '+kind+' runtime');
const ast=parse(source,{ecmaVersion:'latest'}),nodes=[],functions=[],edits=[];
const prop=(n,k)=>n?.type==='ObjectExpression'?n.properties.find(p=>p.key?.name===k||p.key?.value===k)?.value:null;
const key=p=>p.key?.name||p.key?.value;
const lit=n=>n?.type==='Literal'?n.value:n?.type==='TemplateLiteral'&&!n.expressions.length?n.quasis[0].value.cooked:null;
const raw=n=>n?source.slice(n.start,n.end):'',add=(n,text)=>edits.push({start:n.start,end:n.end,text});
function walk(n,parents=[]){if(!n||typeof n!=='object')return;nodes.push({n,parents});if(n.type==='FunctionDeclaration')functions.push(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(c=>walk(c,[...parents,n]));else if(v&&typeof v==='object')walk(v,[...parents,n]);}walk(ast);
const one=(list,label)=>{if(list.length!==1)throw Error(label+' matches: '+list.length);return list[0]};
const owner=record=>[...record.parents].reverse().find(n=>n.type==='FunctionDeclaration');
const engine=kind==='app'?'window.AKChaturangaRelease':'globalThis.AKChaturangaEngine';
const createFn=one(functions.filter(f=>f.params.length<=1&&raw(f).includes('createInitialGameState()')&&raw(f).includes('mobileTurnNumber')),'createDominion');
const actionsFn=one(functions.filter(f=>f.params.length===1&&raw(f).includes('roll-one|control:roll-one')&&raw(f).length<5000),'dominionActions');
const applyFn=one(functions.filter(f=>f.params.length===3&&raw(f).includes('The verified dice do not match')),'applyDominion');
for(const [fn,name]of [[createFn,'createDominion'],[actionsFn,'dominionActions'],[applyFn,'applyDominion']])add(fn,`function ${fn.id.name}(...args){return ${engine}.${name}(...args)}`);
const createGame=one(functions.filter(f=>f.body.body.some(n=>n.type==='SwitchStatement'&&n.cases.some(c=>lit(c.test)==='dominion'))),'create game');
const botMatches=functions.filter(f=>f.params.length>=2&&f.params.length<=3&&raw(f).length<10000&&raw(f).includes('roll|control:roll')&&raw(f).includes('dice.rolled')&&!raw(f).includes('The verified dice'));const bot=kind!=='bot'&&botMatches.length===0?null:one(botMatches,'bot selector');
if(bot)edits.push({start:bot.body.start+1,end:bot.body.start+1,text:`if(${raw(bot.params[0])}==='dominion'&&${engine}.isLongDiceState(${raw(bot.params[1])}))return ${engine}.chooseLongDiceBot(${raw(bot.params[1])});`});
const result=one(functions.filter(f=>f.params.length===1&&raw(f).length<2000&&raw(f).includes('Last surviving royal kingdom')),'result');
edits.push({start:result.body.start+1,end:result.body.start+1,text:`if(${engine}.isLongDiceState(${raw(result.params[0])}))return ${engine}.longDiceResult(${raw(result.params[0])});`});
// Migrate deterministic teaching dice without changing any other game's lessons.
const teaching=functions.filter(f=>f.params.length===1&&raw(f).length<350&&raw(f).includes('currentPlayerIndex=1'));
for(const fn of teaching){const call=nodes.find(r=>r.n.type==='CallExpression'&&r.n.callee?.name===createGame.id.name&&owner(r)===fn)?.n;if(call?.arguments.length===1)edits.push({start:call.end-1,end:call.end-1,text:`,{rulesProfile:${raw(call.arguments[0])}==='dominion'?'chaturanga-long-dice-v1':undefined}`});}
for(const {n,parents}of nodes){
 if(n.type==='ObjectExpression'&&prop(n,'rolled')&&prop(n,'values')?.type==='ArrayExpression'&&prop(n,'used')){
  const values=prop(n,'values'),nums=values.elements.map(lit),replacement={'1,3':[5,3],'4,6':[2,5],'3,6':[3,5]}[nums.join(',')];
  if(replacement)add(values,JSON.stringify(replacement));
  if(values.elements[1]&&lit(values.elements[1])===6&&raw(values.elements[0]).includes('king:1'))add(values.elements[1],'5');
 }
 if(n.type==='ObjectExpression'&&n.properties.length===5&&owner({parents})&&raw(owner({parents})).includes('Choose a piece from the guide.')&&n.properties.map(key).sort().join(',')==='elephant,horse,king,pawn,ship'&&lit(prop(n,'king'))===1&&lit(prop(n,'elephant'))===2&&lit(prop(n,'ship'))===4)add(n,'{king:5,pawn:5,elephant:4,horse:3,ship:2}');
}
let mountMarker,appending='';
if(kind==='app'){
 const trayCall=one(nodes.filter(r=>r.n.type==='CallExpression'&&prop(r.n.arguments[1],'onChoices')&&prop(r.n.arguments[1],'canAct')&&prop(r.n.arguments[1],'legal')),'dice tray call');
 const app=owner(trayCall),tray=trayCall.n,trayProps=tray.arguments[1],state=raw(prop(trayProps,'state')),legal=raw(prop(trayProps,'legal')),canAct=raw(prop(trayProps,'canAct'));
 const promptCall=one(nodes.filter(r=>r.n.type==='CallExpression'&&prop(r.n.arguments[1],'onOne')),'turn prompt call'),prompt=promptCall.n,promptProps=prompt.arguments[1];
 const choose=raw(prop(promptProps,'onBoth').body.callee);
 const boardCall=one(nodes.filter(r=>owner(r)===app&&r.n.type==='CallExpression'&&prop(r.n.arguments[1],'onTarget')&&raw(prop(r.n.arguments[1],'state'))===state),'game board call');
 const select=raw(prop(boardCall.n.arguments[1],'onSelect')),gameId=raw(prop(boardCall.n.arguments[1],'id'));
 const rootCall=one(nodes.filter(r=>owner(r)===app&&r.n.type==='CallExpression'&&prop(r.n.arguments[1],'data-screen')&&prop(r.n.arguments[1],'data-tab')),'app root').n,screen=raw(prop(rootCall.arguments[1],'data-screen'));
 const walletSheet=one(nodes.filter(r=>owner(r)===app&&r.n.type==='CallExpression'&&lit(prop(r.n.arguments[1],'title'))==='Your Antarctic Visa'),'sheet host').n;
 const setter=raw(prop(walletSheet.arguments[1],'onClose').body.callee),sheetComponent=raw(walletSheet.arguments[0]);
 const sheetLogic=one(nodes.filter(r=>r.n.type==='LogicalExpression'&&r.n.right===walletSheet),'sheet condition').n,sheetState=raw(sheetLogic.left.left);
 for(const call of [tray,prompt]){const fn=one(functions.filter(f=>f.id.name===call.arguments[0].name),'component');add(fn,`function ${fn.id.name}(props){return d.createElement(${engine}.${call===tray?'DiceTray':'DominionTurnPrompt'},props)}`);}
 add(trayProps,`{...${raw(trayProps)},onRoll:()=>${choose}(${engine}.rollActionId(${state})),onSelect:${select}}`);
 add(promptProps,'{'+promptProps.properties.filter(p=>key(p)!=='onOne').map(p=>key(p)==='onBoth'?`onBoth:()=>${choose}(${engine}.rollActionId(${state}))`:key(p)==='busy'?`busy:(${raw(p.value)})||!${canAct}`:raw(p)).join(',')+'}');
 const boardWrap=one(boardCall.parents.filter(n=>n.type==='CallExpression'&&raw(prop(n.arguments[1],'className')||{start:0,end:0}).includes('match-board-wrap')),'board frame');
 add(boardWrap,`d.createElement(${engine}.ChaturangaBoardSpace,{id:${gameId},children:${raw(boardWrap)}})`);
 const promptSheet=one(promptCall.parents.filter(n=>n.type==='CallExpression'&&prop(n.arguments[1],'children')===prompt),'turn sheet'),promptLogic=one(nodes.filter(r=>r.n.type==='LogicalExpression'&&r.n.right===promptSheet),'turn sheet condition').n;
 edits.push({start:promptLogic.end,end:promptLogic.end,text:`,${sheetState}==='dominion-roll-help'&&${gameId}==='dominion'&&${state}?.dice?.rolled&&d.createElement(${sheetComponent},{title:'Your rolled moves',onClose:()=>${setter}(null),children:d.createElement(${engine}.DominionRollGuide,{state:${state},legal:${legal},onSelect:${select},onClose:()=>${setter}(null)})})`});
 const turnKey=one(nodes.filter(r=>owner(r)===app&&r.n.type==='VariableDeclarator'&&r.n.init&&raw(r.n.init).includes('mobileTurnNumber')&&raw(r.n.init).includes('${')),'turn key');
 const declaration=[...turnKey.parents].reverse().find(n=>n.type==='VariableDeclaration');
 edits.push({start:declaration.end,end:declaration.end,text:`${engine}.usePostRollHelp({id:${gameId},state:${state},legal:${legal},canAct:${canAct},screen:${screen},sheet:${sheetState},matchId:${turnKey.n.id.name},onOpen:()=>${setter}('dominion-roll-help')});`});
 for(const {n,parents}of nodes)if(owner({parents})===app&&n.type==='UnaryExpression'&&n.operator==='!'&&raw(n.argument)===`${state}.dice.rolled`)edits.push({start:n.end,end:n.end,text:`&&!${engine}.needsKingReturn(${state})`});
 const home=one(nodes.filter(r=>owner(r)===app&&r.n.type==='CallExpression'&&prop(r.n.arguments[1],'onBrowse')&&prop(r.n.arguments[1],'continueLabel')),'home').n;
 const pick=one(functions.filter(f=>raw(f).length<300&&f.params.length===1&&raw(f).includes(`${setter}(\`game\`)`)),'pick game');
 add(home.arguments[0],`${engine}.HomeLanding`);add(home.arguments[1],`{...${raw(home.arguments[1])},onChaturanga:()=>${pick.id.name}('dominion')}`);
 // Fresh local games explicitly select the new profile; resume never rewrites a saved state.
 for(const r of nodes)if(r.parents.includes(app)&&r.n.type==='CallExpression'&&r.n.callee.name===createGame.id.name&&prop(r.n.arguments[1],'teamMode')){const p=r.n.arguments[1];edits.push({start:p.end-1,end:p.end-1,text:`,rulesProfile:${raw(r.n.arguments[0])}==='dominion'?'chaturanga-long-dice-v1':undefined`});}
 const createRoom=one(functions.filter(f=>f.params.length===3&&raw(f).includes('ap_room_create')&&raw(f).includes('dominion-room')),'create room');
 const requireFeature=one(nodes.filter(r=>owner(r)===createRoom&&r.n.type==='CallExpression'&&lit(r.n.arguments[0])==='dominion-teams-v1'),'online capability');
 add(requireFeature.n.arguments[0],"'chaturanga-long-dice-v1'");
 const gate=[...requireFeature.parents].reverse().find(n=>n.type==='LogicalExpression'&&n.operator==='&&'&&raw(n).includes('2v2'));
 if(gate?.left?.type==='LogicalExpression')add(gate.left,`${raw(createRoom.params[0].left)}==='dominion'`);
 const roomCall=one(nodes.filter(r=>owner(r)===createRoom&&r.n.type==='CallExpression'&&lit(r.n.arguments[0])==='ap_room_create'),'room payload').n,payload=roomCall.arguments[1];
 edits.push({start:payload.end-1,end:payload.end-1,text:`,rulesProfile:${raw(prop(payload,'tableId'))}==='dominion'?'chaturanga-long-dice-v1':undefined`});
 const requirement=one(functions.filter(f=>f.id.name===requireFeature.n.callee.name&&raw(f).includes('/arctic-play/health')),'feature function'),oldFeatureName='__AKPreviousFeatureGate';
 const reqRaw=raw(requirement).replace('function '+requirement.id.name+'(','function '+oldFeatureName+'(');
 add(requirement,`async function ${requirement.id.name}(feature){if(feature==='chaturanga-long-dice-v1')return ${engine}.requireLongDiceService();return ${oldFeatureName}(feature)}`+reqRaw);
 const caps=one(nodes.filter(r=>r.n.type==='ArrayExpression'&&r.n.elements.map(lit).includes('dominion-flex-dice-v1')&&r.n.elements.map(lit).includes('fair-play-v1')),'client capabilities').n;edits.push({start:caps.start+1,end:caps.start+1,text:"'chaturanga-long-dice-v1',"});
 // Both the app and the passport's independent art map use the updated cover.
 for(const {n}of nodes)if(n.type==='ObjectExpression'&&prop(n,'image')&&prop(n,'card')&&raw(prop(n,'image')).includes('art/tables-3d-v3/'))for(const k of ['image','card']){const value=prop(n,k),id=value.left?.right;if(id?.type==='Identifier')add(value,`${raw(id)}==='dominion'?'art/chaturanga-heritage-v1/cover.webp':${raw(value)}`);}
 for(const {n}of nodes)if(n.type==='ObjectExpression'){
  const dom=prop(n,'dominion');if(dom?.type==='ArrayExpression'&&lit(prop(dom.elements[0],'title'))==='Four kingdoms')add(dom,JSON.stringify(CH_RULES));
  else if(dom?.type==='ObjectExpression'&&prop(dom,'sortYear'))add(dom,JSON.stringify(CH_HISTORY));
  else if(dom?.type==='ObjectExpression'&&prop(dom,'tag')&&prop(dom,'shape')&&prop(dom,'tips'))add(dom,JSON.stringify(CH_PRESENTATION));
 }
 mountMarker=';(0,Gl.createRoot)(document.getElementById(`root`)).render(';
}else{
 // Preserve every other game's worker code. Only extend the Chaturanga authority and teaching dice.
 const mapper=functions.find(f=>raw(f).includes('AK-DICE-V1')&&f.params.length===3&&raw(f).length<2000);
 if(mapper){const intent=raw(mapper.params[1]),count=raw(mapper.params[2]);edits.push({start:mapper.body.start+1,end:mapper.body.start+1,text:`const __AKLongFaces=${intent}.actionId==='roll-long|control:roll-long';if(__AKLongFaces&&${count}!==2)throw Error('Long dice require two dice.');`});for(const {n,parents}of nodes)if(owner({parents})===mapper&&n.type==='LogicalExpression'&&n.operator==='&&'&&n.left.type==='BinaryExpression'&&n.left.right.value===4294967292){
  add(n.left,`(__AKLongFaces||${raw(n.left)})`);
  const push=nodes.find(r=>r.n.type==='CallExpression'&&r.n.callee.property?.name==='push'&&r.n.start>n.start&&r.n.end<=n.end)?.n;
  if(!push)throw Error('Randomness mapping missing');const expression=push.arguments[0],word=raw(expression.left.left);add(expression,`__AKLongFaces?${word}%4+2:${raw(expression)}`);
 }}
}
// Keep the existing deterministic lesson interactions, with current dice terminology.
const words=[['practice die 1 on a Guard','practice die 5 on a Guard'],['Use die 1 to capture','Use die 5 to capture'],['Die 4 or 6 activates the Icebreaker.','Die 2 activates the Boat / Icebreaker.'],['Die 1 or 5.','Die 5.'],['Die 2. This Mammoth','Die 4. This Mammoth'],['fixed at 1 and 3. The 1 wakes','fixed at 5 and 3. The 5 wakes'],['practice die showing 1','practice die showing 5'],['Losing your original royal King removes your whole army.','Losing your original royal King freezes its remaining army.'],['Capturing an original royal King eliminates its whole kingdom.','Capturing an original royal King freezes that kingdom; its remaining pieces stay on the board.'],['Green’s remaining army was removed','Green’s remaining army is frozen']];
for(const {n}of nodes){const value=lit(n);if(typeof value!=='string'||!['Literal','TemplateLiteral'].includes(n.type)||edits.some(e=>e.start<=n.start&&e.end>=n.end))continue;let changed=value;for(const[a,b]of words)changed=changed.replaceAll(a,b);if(changed!==value)add(n,JSON.stringify(changed));}
for(const e of edits.sort((a,b)=>b.start-a.start)){const overlaps=edits.some(o=>o!==e&&o.start<e.start&&o.end>e.start);if(overlaps)throw Error('Overlapping patch '+e.start);source=source.slice(0,e.start)+e.text+source.slice(e.end);}
const file=path.join(mobile,'build',kind==='app'?'chaturanga-release.iife.js':'chaturanga-engine.iife.js');await fs.mkdir(path.dirname(file),{recursive:true});
const inputModule=path.join(mobile,'src',kind==='app'?'ChaturangaRelease.jsx':'ChaturangaWorker.js');
await build({input:inputModule,platform:'browser',external:kind==='app'?['react']:[],plugins:[{name:'css',load(id){if(id.endsWith('.css'))return{code:'',moduleType:'js'}}}],transform:{jsx:{runtime:'classic'},target:'es2020'},output:{file,name:kind==='app'?'AKChaturangaRelease':'AKChaturangaEngine',format:'iife',globals:{react:'window.__AKReact'},minify:true},onwarn(w,n){if(['UNRESOLVED_IMPORT','MISSING_GLOBAL_NAME'].includes(w.code))throw Error(w.message);n(w)}});
const library=await fs.readFile(file,'utf8');
if(kind==='app'){const at=source.lastIndexOf(mountMarker);if(at<0)throw Error('App mount missing');source=source.slice(0,at)+';'+library+';window.AKChaturangaRelease=AKChaturangaRelease;'+source.slice(at);const version='versionName:`5.9.14`,versionCode:102';if(source.split(version).length!==2)throw Error('Version mismatch');source=source.replace(version,'versionName:`5.9.15`,versionCode:103');}
else source+=';'+library+';globalThis.AKChaturangaEngine=AKChaturangaEngine;';
parse(source,{ecmaVersion:'latest'});await fs.writeFile(output,source);console.log(JSON.stringify({kind,patches:edits.length,bytes:source.length,newProfile:'chaturanga-long-dice-v1',legacyPreserved:true}));
