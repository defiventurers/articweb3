#!/usr/bin/env node
// Static hosting has a per-file size cap. Preserve the exact signed APK as hashed parts.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const mobile=fileURLToPath(new URL('../',import.meta.url));
const flags={};
for(let i=2;i<process.argv.length;i+=2){const key=process.argv[i];if(!['--apk','--web-output','--version','--version-code','--expected-sha256'].includes(key)||!process.argv[i+1]||flags[key])throw Error('Invalid or duplicate argument: '+key);flags[key]=process.argv[i+1];}
if(Object.keys(flags).length!==5)throw Error('Supply --apk, --web-output, --version, --version-code and --expected-sha256.');
const apk=path.resolve(flags['--apk']),output=path.resolve(flags['--web-output']),version=flags['--version'],versionCode=Number(flags['--version-code']),expected=flags['--expected-sha256'];
const filename=path.basename(apk),stat=await fs.lstat(apk),chunkBytes=8*1024*1024;
if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>100*1024*1024||filename!==`AntarcticKingdoms-v${version}.apk`||!/^\d+\.\d+\.\d+$/.test(version)||!Number.isSafeInteger(versionCode)||versionCode<1||versionCode>2147483647||!/^[a-f0-9]{64}$/.test(expected))throw Error('Invalid APK file, version, size or expected digest.');
if(await fs.readFile(path.join(output,'.incremental-web-build'),'utf8').catch(()=>'')!=='xyz.arcticdominion.play\n')throw Error('Use a web output created by the incremental builder.');
const bytes=await fs.readFile(apk),digest=value=>createHash('sha256').update(value).digest('hex');
if(digest(bytes)!==expected)throw Error('APK differs from the exact reviewed digest.');
const destination=path.join(output,'downloads');
let existing=[];try{existing=await fs.readdir(destination);}catch(error){if(error.code!=='ENOENT')throw error;}
if(existing.length&&await fs.readFile(path.join(destination,'.antarctic-download-parts'),'utf8').catch(()=>'')!=='1\n')throw Error('Refuse to replace an unrecognized downloads directory.');
const staging=await fs.mkdtemp(path.join(output,'.apk-download-staging-'));
try{
 const parts=[];
 for(let start=0,index=0;start<bytes.length;start+=chunkBytes,index++){
  const part=bytes.subarray(start,Math.min(bytes.length,start+chunkBytes)),file=`part-${String(index).padStart(3,'0')}.bin`;
  await fs.writeFile(path.join(staging,file),part);parts.push({file,bytes:part.length,sha256:digest(part)});
 }
 const manifest={schemaVersion:1,review:true,version,versionCode,filename,bytes:bytes.length,sha256:expected,chunkBytes,parts};
 await fs.writeFile(path.join(staging,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 for(const file of ['index.html','download.js'])await fs.copyFile(path.join(mobile,'src/downloads',file),path.join(staging,file));
 await fs.writeFile(path.join(staging,'.antarctic-download-parts'),'1\n');
 if(existing.length)await fs.rm(destination,{recursive:true});
 else await fs.rmdir(destination).catch(error=>{if(error.code!=='ENOENT')throw error;});
 await fs.rename(staging,destination);
 console.log(JSON.stringify({directory:destination,filename,bytes:bytes.length,sha256:expected,partCount:parts.length,largestPartBytes:Math.max(...parts.map(p=>p.bytes)),containsFullApk:false,signatureVerification:'Not performed by this packaging tool; use the native signing verification report.'}));
}catch(error){await fs.rm(staging,{recursive:true,force:true});throw error;}
