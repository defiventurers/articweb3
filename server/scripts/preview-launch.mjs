// Internal UI QA only. Production continues to use the existing backend bootstrap.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{serveArcticPlayWeb}=require('../arcticPlayWeb.js'),root=fileURLToPath(new URL('../arcticPlayWeb/',import.meta.url));
http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');if(u.pathname==='/'){res.writeHead(302,{Location:'/arctic-play/app/'});res.end();return;}if(u.pathname==='/qa.html'||u.pathname==='/qa.js'||u.pathname==='/qa-mobile.html'){const f=path.join(root,u.pathname.slice(1));if(fs.existsSync(f)){res.writeHead(200,{'Content-Type':u.pathname.endsWith('.js')?'text/javascript':'text/html'});fs.createReadStream(f).pipe(res);return;}}if(serveArcticPlayWeb(req,res,u))return;res.writeHead(404);res.end('Preview route not found.');}).listen(Number(process.argv.includes('--port')?process.argv[process.argv.indexOf('--port')+1]:process.env.PORT||5173),'0.0.0.0');
