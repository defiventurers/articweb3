import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const [input,output,esbuildRoot]=process.argv.slice(2),require=createRequire(path.join(esbuildRoot,'package.json'));
const esbuild=require(esbuildRoot),acorn=require('acorn'),src=path.resolve(import.meta.dirname,'../src');
let code=fs.readFileSync(input,'utf8');
const tree=acorn.parse(code,{ecmaVersion:'latest',sourceType:'script'}),matches=[];
function visit(n){if(!n||typeof n!=='object')return;if(n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id?.name==='AKPassportUI')){if(n.declarations.length!==1)throw Error('Unexpected shared declaration');matches.push(n);}for(const [k,v]of Object.entries(n)){if(k==='start'||k==='end')continue;if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v);}}
visit(tree);if(matches.length!==1)throw Error('Expected one v5.9.6 Passport module');
const result=await esbuild.build({stdin:{contents:fs.readFileSync(path.join(src,'PassportBook.jsx'),'utf8'),resolveDir:src,loader:'jsx'},bundle:true,write:false,format:'iife',globalName:'AKPassportUI',target:'es2020',jsxFactory:'__AKVisaH',jsxFragment:'x.Fragment',charset:'utf8',plugins:[{name:'share-runtime',setup(build){build.onResolve({filter:/^react$/},()=>({path:'react',namespace:'ak-runtime'}));build.onLoad({filter:/.*/,namespace:'ak-runtime'},()=>({contents:'export default d; export const {useState,useEffect,useRef}=d;',loader:'js'}));}}]});
const compiled=result.outputFiles[0].text,n=matches[0];code=code.slice(0,n.start)+compiled+code.slice(n.end);
const from='versionName:`5.9.6`,versionCode:94,distribution:`direct-apk`';if(code.split(from).length!==2)throw Error('Unexpected version anchor');
code=code.replace(from,'versionName:`5.9.7`,versionCode:95,distribution:`direct-apk`');acorn.parse(code,{ecmaVersion:'latest',sourceType:'script'});fs.writeFileSync(output,code);
console.log('Recompiled only Passport; updated version to 5.9.7.');
