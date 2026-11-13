import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url)),npm=process.platform==='win32'?'npm.cmd':'npm';
for(const folder of ['mobile/arctic-play/build-deps','shared/fair-play'])execFileSync(npm,['ci','--ignore-scripts','--no-audit','--no-fund'],{cwd:path.join(root,folder),stdio:'inherit'});
execFileSync(process.execPath,['mobile/arctic-play/scripts/build-current.mjs','--frontend'],{cwd:root,stdio:'inherit'});
