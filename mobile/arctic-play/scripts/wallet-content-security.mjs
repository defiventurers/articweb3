import chains from '../../../server/gameWalletChains.json' with {type:'json'};
export function walletContentSecurity(html) {
  let replaced=0;
  const result=html.replace(/(http-equiv="Content-Security-Policy" content=")([^"]+)(")/,(_,before,value,after)=>{
    replaced++;
    const directives=value.split(';').map(s=>s.trim().split(/\s+/)).filter(s=>s[0]);
    const connect=directives.find(d=>d[0]==='connect-src'),images=directives.find(d=>d[0]==='img-src');
    if(!connect||!images)throw Error('Expected existing app CSP');
    for(const origin of [...Object.values(chains).flatMap(c=>c.rpcUrls.default.http),'https://robinhoodchain.blockscout.com','https://explorer.testnet.chain.robinhood.com'])if(!connect.includes(origin))connect.push(origin);
    if(!images.includes('https:'))images.push('https:');
    return before+directives.map(d=>d.join(' ')).join('; ')+after;
  });
  if(replaced!==1)throw Error('Expected one app CSP');
  return result;
}
if(process.argv[1]?.endsWith('wallet-content-security.mjs')){
  const fs=await import('node:fs/promises'),[input,output]=process.argv.slice(2);
  await fs.writeFile(output,walletContentSecurity(await fs.readFile(input,'utf8')));
}
