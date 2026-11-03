const fs=require('node:fs');const path=require('node:path');
const frontendRoot=path.resolve(__dirname,'..');
const sourcePath=path.join(frontendRoot,'src/games/co-tu-lenh/rules.js');
const serverPath=path.resolve(frontendRoot,'../server/coTuLenhEngine.cjs');
let source=fs.readFileSync(sourcePath,'utf8');
const names=[];
source=source.replace(/export (const|function) (\w+)/g,(_,kind,name)=>{names.push(name);return `${kind} ${name}`;});
source=`// GENERATED from frontend/src/games/co-tu-lenh/rules.js; do not edit\n${source}\nmodule.exports={${names.join(',')}};\n`;
if(process.argv.includes('--check')){
 if(!fs.existsSync(serverPath)||fs.readFileSync(serverPath,'utf8')!==source)throw Error('Cờ Tư Lệnh server rules out of sync');
 console.log('Commander Chess server engine synchronized');
} else {fs.mkdirSync(path.dirname(serverPath),{recursive:true});fs.writeFileSync(serverPath,source);console.log('Generated Commander Chess server engine');}
