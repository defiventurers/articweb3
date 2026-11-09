// Rename authored display strings in the shipped v5.9.8 bundle, preserving its
// newer UI that is not reproducible from the older main App.jsx snapshot.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {GUIDES,LEGACY_GUIDE_NAMES} from '../src/brand.js';
const require=createRequire(new URL('../build-deps/package.json',import.meta.url));
const {parse}=require('acorn');
const [input,output,...flags]=process.argv.slice(2),worker=flags.includes('--worker');
if(!input||!output)throw Error('Usage: rename-mascot-bundle.mjs input.js output.js [--worker]');
let source=fs.readFileSync(input,'utf8');
if(!worker&&createHash('sha256').update(source).digest('hex')!=='6e9f12d4730dbc0cd6fd0726ea58ebcebd9111d7699c26720a3a8925597006db')throw Error('Expected the shipped v5.9.8 app.js; refusing a different runtime.');
const names=Object.fromEntries(Object.keys(GUIDES).flatMap(id=>[[LEGACY_GUIDE_NAMES[id],GUIDES[id].name],[LEGACY_GUIDE_NAMES[id].toUpperCase(),GUIDES[id].name.toUpperCase()]]));
const pattern=/\b(Polly|Retsba|Pengu|Abster|POLLY|RETSBA|PENGU|ABSTER)\b/g;
const rename=text=>text.replace(pattern,name=>names[name]);
const patches=[];
function walk(node){
  if(!node||typeof node!=='object')return;
  if(node.type==='Literal'&&typeof node.value==='string'&&rename(node.value)!==node.value)patches.push({start:node.start,end:node.end,text:JSON.stringify(rename(node.value))});
  if(node.type==='TemplateElement'&&rename(node.value.cooked||'')!==(node.value.cooked||'')){
    const raw=source.slice(node.start,node.end),text=rename(raw);
    if(raw===text)throw Error('Escaped mascot name requires an explicit localization edit.');
    patches.push({start:node.start,end:node.end,text});
  }
  for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);
}
walk(parse(source,{ecmaVersion:'latest'}));
for(const p of patches.sort((a,b)=>b.start-a.start))source=source.slice(0,p.start)+p.text+source.slice(p.end);
function once(old,replacement){if(source.split(old).length!==2)throw Error('Unexpected bundle anchor: '+old.slice(0,90));source=source.replace(old,replacement);}
if(!worker){
  if(!source.startsWith('(function(){'))throw Error('Unexpected outer bundle wrapper');
  source='(function(){const __AKLegacyGuideNames='+JSON.stringify(LEGACY_GUIDE_NAMES)+';'+source.slice('(function(){'.length);
  once('function Dv(e){return typeof e==`string`&&wv.find(t=>Ev(t.id)===e)||null}',
    'function Dv(e){return typeof e==`string`&&wv.find(t=>Ev(t.id)===e||e===`🎉 ${__AKLegacyGuideNames[t.host]}: ${t.label}`)||null}');
  once('function lb(e){for(let t of By)for(let n of sb)if(e===cb(t,n.id))return{host:t,...n};return null}',
    'function lb(e){for(let t of By)for(let n of sb)if(e===cb(t,n.id)||e===`🐧 ${__AKLegacyGuideNames[t]}: ${n.label}`)return{host:t,...n};return null}');
  once('function Gb(e){let t=Lb.find(t=>t.id===e);return t?`🐧 ${t.host[0].toUpperCase()+t.host.slice(1)}: ${t.label} · Little Victories`:null}',
    'function Gb(e){let t=Lb.find(t=>t.id===e);return t?`🐧 ${$v[t.host].name}: ${t.label} · Little Victories`:null}');
  once('function Kb(e){return Lb.find(t=>e===Gb(t.id))||null}',
    'function Kb(e){return Lb.find(t=>e===Gb(t.id)||e===`🐧 ${__AKLegacyGuideNames[t.host]}: ${t.label} · Little Victories`)||null}');
  once('versionName:`5.9.8`,versionCode:96','versionName:`5.9.9`,versionCode:97');
}
parse(source,{ecmaVersion:'latest'});
fs.writeFileSync(output,source);
console.log(JSON.stringify({input,literalEdits:patches.length,worker,output}));
