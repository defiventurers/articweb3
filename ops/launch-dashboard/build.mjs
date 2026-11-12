import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.dirname(new URL(import.meta.url).pathname),arg=process.argv.indexOf('--site-dir');
if(arg<0)throw Error('Provide --site-dir for the selected owner-private Site.');
const target=path.resolve(process.argv[arg+1]);
const [html,app,css,worker]=await Promise.all(['index.html','app.js','style.css','worker.mjs'].map(n=>fs.readFile(path.join(root,n),'utf8')));
const code='const HTML='+JSON.stringify(html)+';\nconst APP='+JSON.stringify(app)+';\nconst CSS='+JSON.stringify(css)+';\n'+worker;
await fs.mkdir(path.join(target,'worker'),{recursive:true});await fs.writeFile(path.join(target,'worker/index.js'),code);
console.log(JSON.stringify({siteDirectory:target,bytes:code.length,secretsIncluded:false}));
