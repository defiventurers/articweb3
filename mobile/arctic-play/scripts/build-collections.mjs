import path from 'node:path';
import fs from 'node:fs/promises';

// Masters are retained in the design kit. Runtime assets are already sized WebP.
export async function buildCollections(mobile,destination){
  await fs.cp(path.join(mobile,'art/collections'),path.join(destination,'art/collections'),{recursive:true});
  await fs.appendFile(path.join(destination,'app.css'),'\n'+await fs.readFile(path.join(mobile,'src/aurora.css'),'utf8'));
}
