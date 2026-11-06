// Compress public build artifacts once at build time, never during sign-in.
import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const root=new URL('../gameWalletWeb/assets/',import.meta.url);
let before=0,after=0,count=0;
for(const name of await fs.readdir(root)){
 if(!/\.(js|css|wasm)$/.test(name))continue;
 const data=await fs.readFile(new URL(name,root)),gzip=gzipSync(data,{level:9});
 if(gzip.length>=data.length)continue;
 await fs.writeFile(new URL(name+'.gz',root),gzip);
 before+=data.length;after+=gzip.length;count++;
}
console.log(`Precompressed ${count} public files: ${before} → ${after} bytes`);
