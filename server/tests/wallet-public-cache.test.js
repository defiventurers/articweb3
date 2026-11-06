const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {serveGameWallet}=require('../gameWalletWeb');
test('wallet caching applies only to hashed public bundles; auth HTML and errors stay private',async t=>{
 const root=path.join(__dirname,'../gameWalletWeb'),suffix=process.pid;
 const files=[`cache-check-${suffix}.html`,`assets/cache-check-${suffix}-A1b2C3d4.js`,`cache-check-${suffix}.js`];
 await fs.mkdir(path.join(root,'assets'),{recursive:true});
 for(const name of files)await fs.writeFile(path.join(root,name),'public test fixture');
 t.after(async()=>{for(const name of files)await fs.unlink(path.join(root,name));});
 function head(url,method='HEAD'){let code,headers;const res={writeHead:(c,h)=>{code=c;headers=h;},end(){}};const handled=serveGameWallet({method},res,new URL(url,'https://example.test'));return{handled,code,headers};}
 const prefix='/arctic-play/wallet/';
 const hashed=head(prefix+files[1]);assert.equal(hashed.code,200);assert.equal(hashed.headers['Cache-Control'],'public, max-age=31536000, immutable');
 for(const name of [files[0]+'?attempt='+'a'.repeat(43),files[2]]){const r=head(prefix+name);assert.equal(r.code,200);assert.equal(r.headers['Cache-Control'],'no-store');assert.match(r.headers['Content-Security-Policy'],/frame-ancestors 'none'/);}
 for(const url of [prefix+'missing.js',prefix+'%2e%2e%2fcompanyService.js',prefix+'%00.js']){const r=head(url);assert.ok(r.code>=400);assert.equal(r.headers['Cache-Control'],'no-store');}
 assert.equal(head(prefix+files[1],'POST').code,405);
 assert.equal(head('/arctic-play/v3/auth/para/attempt').handled,false);
});
