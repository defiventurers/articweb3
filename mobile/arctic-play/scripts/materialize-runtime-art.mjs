// Restore the byte-for-byte public artwork pack before a clean source build.
// ZIP entries are stored uncompressed; no package installation or APK is needed.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function materializeRuntimeArt(mobile){
 const manifest=JSON.parse(await fs.readFile(path.join(mobile,'runtime-art-pack.json'))),parts=[];
 for(const part of manifest.parts){
  if(!/^runtime-art-part-\d+\.bin$/.test(part.file))throw Error('Invalid artwork part name.');
  const bytes=await fs.readFile(path.join(mobile,'runtime-art-pack',part.file));
  if(bytes.length!==part.bytes||sha(bytes)!==part.sha256)throw Error('Artwork pack part changed: '+part.file);
  parts.push(bytes);
 }
 const archive=Buffer.concat(parts);if(sha(archive)!==manifest.sha256)throw Error('Artwork pack checksum mismatch.');
 const destination=path.join(mobile,'runtime-assets'),seen=new Set();let offset=0;
 while(offset+4<=archive.length&&archive.readUInt32LE(offset)===0x04034b50){
  if(offset+30>archive.length)throw Error('Incomplete artwork header.');
  const flags=archive.readUInt16LE(offset+6),method=archive.readUInt16LE(offset+8),length=archive.readUInt32LE(offset+18),plain=archive.readUInt32LE(offset+22),nameLength=archive.readUInt16LE(offset+26),extraLength=archive.readUInt16LE(offset+28);
  if(method!==0||(flags&~0x800)||length!==plain)throw Error('Only stored, unencrypted artwork entries are supported.');
  const start=offset+30+nameLength+extraLength,end=start+length;
  if(end>archive.length)throw Error('Incomplete artwork entry.');
  const relative=archive.subarray(offset+30,offset+30+nameLength).toString('utf8');
  if(!relative.startsWith('art/')||relative.includes('\\')||relative.includes('\0')||relative.split('/').some(p=>!p||p==='.'||p==='..')||seen.has(relative))throw Error('Invalid artwork path.');
  if(!/\.(webp|png|jpe?g|svg|json|woff2?|mp3|ogg|wav)$/i.test(relative))throw Error('Unexpected artwork format.');
  seen.add(relative);const file=path.join(destination,relative);
  try{await fs.access(file);}catch{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,archive.subarray(start,end));}
  offset=end;
 }
 if(seen.size!==manifest.files||archive.readUInt32LE(offset)!==0x02014b50)throw Error('Artwork pack index mismatch.');
 // build-current checks each individual asset against runtime-art-sources.json.
 return seen.size;
}
