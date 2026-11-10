// Install pinned build dependencies and compile the same source as Android.
const {execFileSync}=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),npm=process.platform==='win32'?'npm.cmd':'npm';
for(const folder of ['mobile/arctic-play/build-deps','shared/fair-play'])execFileSync(npm,['ci','--ignore-scripts','--no-audit','--no-fund'],{cwd:path.join(root,folder),stdio:'inherit'});
execFileSync(process.execPath,['mobile/arctic-play/scripts/build-current.mjs'],{cwd:root,stdio:'inherit'});
