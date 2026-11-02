// Build the public system-browser wallet portal during the existing Render build.
// App credentials are fetched at runtime; no secret is compiled into the portal.
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const cwd=path.resolve(__dirname,'../wallet-build');
const npm=process.platform==='win32'?'npm.cmd':'npm';
execFileSync(npm,['ci','--omit=dev','--ignore-scripts','--no-audit','--no-fund'],{cwd,stdio:'inherit'});
execFileSync(npm,['run','build'],{cwd,stdio:'inherit'});
