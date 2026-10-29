// Serve the exact bundled Android web assets under an isolated browser route.
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.join(__dirname,'arcticPlayWeb');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8'};
function serveArcticPlayWeb(req,res,url){
  if(url.pathname==='/arctic-play/app'){
    res.writeHead(302,{Location:'/arctic-play/app/'+url.search,'Cache-Control':'no-store'});res.end();return true;
  }
  if(!url.pathname.startsWith('/arctic-play/app/'))return false;
  const error=(code,message)=>{res.writeHead(code,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(message);return true;};
  if(!['GET','HEAD'].includes(req.method||'GET'))return error(405,'Use GET to open this game.');
  let relative;try{relative=decodeURIComponent(url.pathname.slice('/arctic-play/app/'.length))||'index.html';}catch{return error(400,'Invalid game URL.');}
  const file=path.resolve(ROOT,relative),type=MIME[path.extname(file)];
  if(!file.startsWith(ROOT+path.sep)||!type||relative.includes('\0')||relative.includes('\\'))return error(404,'Game file not found.');
  let stat;try{stat=fs.statSync(file);}catch{return error(404,'Game file not found.');}
  if(!stat.isFile())return error(404,'Game file not found.');
  res.writeHead(200,{'Content-Type':type,'Content-Length':stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://articweb3.onrender.com wss://articweb3.onrender.com https://raw.githubusercontent.com; worker-src 'self'; font-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'"});
  if(req.method==='HEAD')res.end();else fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  return true;
}
module.exports={serveArcticPlayWeb};
