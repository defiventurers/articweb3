// A lightweight guard, not a substitute for a provider-backed secret scanner.
// Findings never print credential values.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const files=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
const rules=[
 ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
 ['provider-token',/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,}|AKIA[A-Z0-9]{16}|sk_live_[A-Za-z0-9]{16,}|xox[baprs]-[A-Za-z0-9-]{20,})/g],
 ['wallet-private-key',/(?:private[_-]?key|signer[_-]?key)\s*[:=]\s*["'](?:0x)?[0-9a-f]{64}["']/gi],
 ['database-credential',/(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:/"'`]+:[^\s@"'`]{8,}@[^\s/"'`]+/g]
];
const findings=[];let scanned=0;
for(const file of files){
 const absolute=path.join(root,file);let bytes;try{if(fs.statSync(absolute).size>5_000_000)continue;bytes=fs.readFileSync(absolute);}catch{continue;}
 if(bytes.includes(0))continue;const text=bytes.toString('utf8');scanned++;
 for(const [rule,regex]of rules){regex.lastIndex=0;for(const match of text.matchAll(regex)){
  if(rule==='database-credential'){try{const host=new URL(match[0]).hostname;if(['localhost','127.0.0.1','[::1]'].includes(host)||host.endsWith('.test')||host.endsWith('.example'))continue;}catch{}}
  findings.push({file,line:text.slice(0,match.index).split('\n').length,rule});
 }}
}
console.log(JSON.stringify({scanned,findings},null,2));
if(findings.length)process.exitCode=1;
