// SHA-pinned presentation update to the shipped runtime, which is newer than main's App.jsx.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const mobile=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(path.join(mobile,'build-deps/package.json'));
const {parse}=require('acorn'),{build}=await import(require.resolve('rolldown'));
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: patch-heritage-home.mjs input.js output.js');
let source=await fs.readFile(input,'utf8');
if(createHash('sha256').update(source).digest('hex')!=='26d591b01cc15f56574cd226a5131097aae2997bf159991a2703bf29bd45a42e')throw Error('Expected the verified shipped v5.9.11 runtime.');
const ast=parse(source,{ecmaVersion:'latest'});let target;
function walk(n){if(!n||typeof n!=='object')return;if(n.type==='FunctionDeclaration'&&n.id?.name==='NC'){if(target)throw Error('Duplicate home');target=n;}for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}
walk(ast);if(!target)throw Error('Expected HomeLanding component missing.');
const generated=path.join(mobile,'build/heritage-home.iife.js');await fs.mkdir(path.dirname(generated),{recursive:true});
await build({input:path.join(mobile,'src/HomeLanding.jsx'),external:['react'],platform:'browser',transform:{jsx:{runtime:'classic'},target:'es2020'},output:{file:generated,name:'AKHeritageHomeModule',format:'iife',globals:{react:'window.__AKReact'},minify:true},onwarn(w,d){if(['UNRESOLVED_IMPORT','MISSING_GLOBAL_NAME'].includes(w.code))throw Error(w.message);d(w);}});
source=source.slice(0,target.start)+'function NC(props){return d.createElement(window.__AKHeritageHome,props)}'+source.slice(target.end);
const marker=';(0,Gl.createRoot)(document.getElementById(`root`)).render(';const at=source.lastIndexOf(marker);if(at<0)throw Error('Expected runtime mount missing.');
source=source.slice(0,at)+';'+await fs.readFile(generated,'utf8')+';window.__AKHeritageHome=AKHeritageHomeModule.HomeLanding;'+source.slice(at);
const version='versionName:`5.9.11`,versionCode:99';if(source.split(version).length!==2)throw Error('Unexpected version marker');source=source.replace(version,'versionName:`5.9.12`,versionCode:100');
parse(source,{ecmaVersion:'latest'});await fs.writeFile(output,source);console.log('Home presentation patched; React instance, callback props and all game modules retained.');
