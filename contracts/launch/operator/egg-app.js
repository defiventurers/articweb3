// No external scripts, keys, minting, registration or Render credentials.
const $=id=>document.getElementById(id),key='ak.egg-deployment.46630.v1';
let wallet,busy=false,record={},connected=false,found=false;
try{record=JSON.parse(localStorage.getItem(key)||'{}');}catch{}
$('plan').textContent=JSON.stringify({network:'Robinhood Testnet (46630)',owner:PLAN.admin,minter:PLAN.minter,existingPassport:PLAN.passport,maximumEditions:33,metadataBase:PLAN.metadata,sourceCommit:PLAN.sourceCommit},null,2);
function save(){localStorage.setItem(key,JSON.stringify(record));$('hash').value=record.transactionHash||'';$('result').textContent=JSON.stringify(record,null,2);$('export').disabled=!record.transactionHash;}
function status(s){$('status').textContent=s;}
async function run(fn){if(busy)return;busy=true;$('connect').disabled=true;$('deploy').disabled=true;try{await fn();}catch(e){status(e.shortMessage||e.message||String(e));}finally{busy=false;$('connect').disabled=false;$('deploy').disabled=!connected||found||!!record.transactionHash||record.pendingNonce!==undefined;save();}}
async function rpc(method,params=[]){const r=await fetch(PLAN.rpc,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('RPC unavailable; keep this page and retry Check / resume.');const j=await r.json();if(j.error)throw Error(j.error.message);return j.result;}
async function digest(hex){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',Uint8Array.from(hex.slice(2).match(/../g)||[],x=>parseInt(x,16)))),x=>x.toString(16).padStart(2,'0')).join('');}
const call=(to,data)=>rpc('eth_call',[{to,data},'latest']);
async function verify(address){
 const code=await rpc('eth_getCode',[address,'latest']);if(code==='0x')throw Error('Contract not confirmed yet. Use Check / resume.');
 if(await digest(code)!==PLAN.runtimeSha256)throw Error('Runtime differs from the compiled Egg. Do not deploy again; inspect this address.');
 const [admin,minter,passport,cap,count]=await Promise.all(['admin','minter','passport','cap','count'].map(k=>call(address,PLAN.calls[k])));
 if(BigInt(admin)!==1n||BigInt(minter)!==1n||'0x'+passport.slice(-40).toLowerCase()!==PLAN.passport.toLowerCase()||BigInt(cap)!==33n)throw Error('Contract roles, Passport or cap differ. Stop and report this address.');
 found=true;record={...record,chainId:46630,eggAddress:address,admin:PLAN.admin,minter:PLAN.minter,passport:PLAN.passport,maxSupply:33,mintedCount:Number(BigInt(count)),metadata:PLAN.metadata,runtimeVerified:true,rolesVerified:true};save();
}
async function inspectReceipt(hash){
 if(!/^0x[0-9a-f]{64}$/i.test(hash))throw Error('Paste the full transaction hash.');
 const tx=await rpc('eth_getTransactionByHash',[hash]);if(!tx)throw Error('Transaction is not visible yet. Keep its hash and retry.');
 if(tx.to!==null||tx.from.toLowerCase()!==PLAN.admin.toLowerCase()||tx.input.toLowerCase()!==PLAN.data.toLowerCase()||BigInt(tx.value)!==0n)throw Error('This is not the reviewed Egg creation transaction.');
 record.transactionHash=hash;save();
 const receipt=await rpc('eth_getTransactionReceipt',[hash]);if(!receipt){status('Deployment submitted; awaiting receipt. Press Check / resume.');return;}
 if(BigInt(receipt.status)!==1n)throw Error('Deployment reverted. Report its transaction hash; do not submit again.');
 const block=await rpc('eth_getBlockByNumber',[receipt.blockNumber,false]);if(block.hash!==receipt.blockHash)throw Error('Receipt is not canonical. Retry later.');
 await verify(receipt.contractAddress);
 const head=BigInt(await rpc('eth_blockNumber')),confirmations=Number(head-BigInt(receipt.blockNumber)+1n);
 record={...record,blockNumber:Number(BigInt(receipt.blockNumber)),blockHash:receipt.blockHash,confirmations,confirmedL2:confirmations>=2};save();
 status(confirmations>=2?'Egg confirmed. Copy the transaction hash back to ChatGPT for Render configuration and backend verification.':'Egg created. Wait a moment, then Check / resume for two confirmations.');
}
async function scan(){
 if(await rpc('eth_chainId')!==PLAN.chainId)throw Error('RPC network mismatch.');
 if(record.transactionHash){await inspectReceipt(record.transactionHash);return true;}
 const nonce=Number(BigInt(await rpc('eth_getTransactionCount',[PLAN.admin,'latest']))),pending=Number(BigInt(await rpc('eth_getTransactionCount',[PLAN.admin,'pending'])));
 if(nonce>=PLAN.candidates.length)throw Error('Owner nonce exceeds this reviewed signing page. Request an updated page.');
 // Inspect every possible direct creation by this owner, including a tx whose wallet response was lost.
 for(let i=0;i<=nonce;i++){
  const address=PLAN.candidates[i],code=await rpc('eth_getCode',[address,'latest']);if(code==='0x')continue;
  if(await digest(code)===PLAN.runtimeSha256){await verify(address);status('Existing Egg found; deployment is blocked. Report the address to ChatGPT.');return true;}
  const raw=await call(address,PLAN.calls.name).catch(()=>null);
  if(raw&&new TextDecoder().decode(Uint8Array.from(raw.slice(2).match(/../g)||[],x=>parseInt(x,16))).includes('Antarctic Mystery Golden Egg')){found=true;throw Error('An existing Egg with different configuration exists at '+address+'. Report it; do not deploy a duplicate.');}
 }
 if(pending!==nonce)throw Error('The owner has a pending transaction. Resolve it in Zerion, then Check / resume.');
 if(record.pendingNonce!==undefined)throw Error('An earlier wallet request may exist at nonce '+record.pendingNonce+'. Inspect Zerion activity and provide its hash; deployment stays blocked.');
 return false;
}
async function connect(){
 const providers=[],announce=e=>providers.push(e.detail);window.addEventListener('eip6963:announceProvider',announce);window.dispatchEvent(new Event('eip6963:requestProvider'));await new Promise(r=>setTimeout(r,300));window.removeEventListener('eip6963:announceProvider',announce);
 wallet=providers.find(p=>p.info?.rdns==='io.zerion.wallet')?.provider||window.ethereum?.providers?.find(p=>p.isZerion)||(window.ethereum?.isZerion?window.ethereum:null);
 if(!wallet)throw Error('Enable Zerion in this desktop browser and reload this page.');
 const accounts=await wallet.request({method:'eth_requestAccounts'});if(accounts[0]?.toLowerCase()!==PLAN.admin.toLowerCase())throw Error('Select owner '+PLAN.admin+' in Zerion, then connect again.');
 try{await wallet.request({method:'wallet_switchEthereumChain',params:[{chainId:PLAN.chainId}]});}catch(e){if(e.code!==4902)throw e;await wallet.request({method:'wallet_addEthereumChain',params:[{chainId:PLAN.chainId,chainName:'Robinhood Chain Testnet',nativeCurrency:{name:'Test Ether',symbol:'ETH',decimals:18},rpcUrls:[PLAN.rpc],blockExplorerUrls:[PLAN.explorer]}]});}
 if(await wallet.request({method:'eth_chainId'})!==PLAN.chainId)throw Error('Switch Zerion to Robinhood Testnet 46630.');
 connected=true;if(!await scan())status('Owner connected. No existing Egg found. Review & deploy requests one contract-creation signature with 0 ETH value.');
}
$('connect').onclick=()=>run(connect);
$('deploy').onclick=()=>run(async()=>{
 if(!connected)throw Error('Connect Zerion first.');if(await scan())return;
 if(await wallet.request({method:'eth_chainId'})!==PLAN.chainId)throw Error('Zerion changed networks. Reconnect.');
 const accounts=await wallet.request({method:'eth_accounts'});if(accounts[0]?.toLowerCase()!==PLAN.admin.toLowerCase())throw Error('Zerion changed accounts. Reconnect.');
 const nonce=await rpc('eth_getTransactionCount',[PLAN.admin,'pending']);
 const gas='0x'+(BigInt(await rpc('eth_estimateGas',[{from:PLAN.admin,data:PLAN.data,value:'0x0'}]))*12n/10n).toString(16);
 record.pendingNonce=Number(BigInt(nonce));record.predictedAddress=PLAN.candidates[record.pendingNonce];save();
 try{
  const hash=await wallet.request({method:'eth_sendTransaction',params:[{from:PLAN.admin,data:PLAN.data,value:'0x0',nonce,gas,chainId:PLAN.chainId}]});
  record.transactionHash=hash;save();await inspectReceipt(hash);
 }catch(e){if(e.code===4001){delete record.pendingNonce;delete record.predictedAddress;save();}throw e;}
});
$('refresh').onclick=()=>run(async()=>{if(!await scan())status('No existing Egg or pending deployment found. Connect Zerion to deploy.');});
$('recover').onclick=()=>run(async()=>{await inspectReceipt($('hash').value.trim());});
$('cancelled').onclick=()=>run(async()=>{
 if(record.transactionHash)throw Error('A transaction hash is saved. Use Check / resume.');
 const nonce=record.pendingNonce;
 if(!Number.isInteger(nonce)||!PLAN.candidates[nonce])throw Error('No cancelled wallet request needs clearing.');
 if(await rpc('eth_chainId')!==PLAN.chainId)throw Error('RPC network mismatch.');
 const latest=Number(BigInt(await rpc('eth_getTransactionCount',[PLAN.admin,'latest']))),pending=Number(BigInt(await rpc('eth_getTransactionCount',[PLAN.admin,'pending'])));
 if(latest!==nonce||pending!==nonce)throw Error('The nonce is pending or already used. Inspect Zerion activity and resume its transaction hash.');
 if(await rpc('eth_getCode',[PLAN.candidates[nonce],'latest'])!=='0x')throw Error('A contract exists at this nonce. Use Check / resume.');
 delete record.pendingNonce;delete record.predictedAddress;save();
 status('Cancelled request cleared after chain checks. Connect Zerion, then Review & deploy Egg.');
});
$('export').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));a.download='Antarctic-Egg-46630-Receipt.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
save();
