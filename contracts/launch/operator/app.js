import {BrowserProvider,JsonRpcProvider,formatEther} from 'ethers';
import artifacts from 'virtual:launch-artifacts';
import {TESTNET,newDeployment,checkRecord,deployTestnet,verifyDeployment,runRegistryRehearsal,freshRehearsal} from '../testnet.mjs';
import {indexDeployment,snapshotStore} from '../event-index.mjs';
import {verifyExplorerSources} from '../explorer-verification.mjs';
import {authorizePassportDelivery} from '../passport-delivery.mjs';
const $=id=>document.getElementById(id),recordKey='ak.operator.robinhood46630.record.v1',eventsKey='ak.operator.robinhood46630.events.v1';
let provider,signer,owner,record,indexReport,busy=false,verified=false;
try{const stored=localStorage.getItem(recordKey);if(stored)record=checkRecord(JSON.parse(stored));}catch{message('A saved record could not be loaded. Import its original JSON to recover.');}
function message(text,error=false){$('status').textContent=text;$('status').className=error?'notice error':'notice';}
function persist(value){record=value;localStorage.setItem(recordKey,JSON.stringify(record));render();}
function render(){
 $('wallet').textContent=owner||'Wallet not connected';$('chain').textContent=owner?'Robinhood testnet · 46630':'Testnet only · 46630';
 $('deploy').disabled=busy||!signer;$('rehearse').disabled=busy||!signer||!record?.contracts?.AntarcticPassport?.transactionHash;$('index').disabled=busy||!record?.contracts?.AntarcticPassport?.transactionHash;
 $('verify').disabled=busy||!record?.contracts?.AntarcticPassport?.transactionHash;$('export').disabled=busy||!record;
 $('source').disabled=busy||!record?.contracts?.AntarcticPassport?.transactionHash;
 $('fresh').disabled=busy||!record?.smoke?.confirmed;
 $('passport-authorize').disabled=busy||!signer||!record?.contracts?.AntarcticPassport?.address;
 $('passport-refresh').disabled=busy;
 $('connect').disabled=busy;$('import').disabled=busy;$('operator').disabled=busy||!!record?.contracts?.FairPlayRegistry;
 $('contracts-state').textContent=verified?'Code, roles and receipts verified':record?'Saved plan · verify before relying on it':'Awaiting deployment';
 $('rehearsal-state').textContent=record?.smoke?.confirmed?'Saved rehearsal · run verification/indexing':'Pending test transactions';
 $('index-state').textContent=indexReport?.ready&&indexReport?.reconciliation?.rehearsalIndexed&&indexReport?.reconciliation?.futureRoundClientTimeRecorded?'Confirmed events reconciled':'Awaiting complete event/timing check';
 const list=$('contracts');list.replaceChildren();
 for(const [name,c]of Object.entries(record?.contracts||{})){
  const item=document.createElement('li'),label=document.createElement('strong'),value=document.createElement('code');label.textContent=name;value.textContent=c.address;item.append(label,value);
  if(c.transactionHash){const link=document.createElement('a');link.href=TESTNET.explorer+'/tx/'+c.transactionHash;link.target='_blank';link.rel='noreferrer';link.textContent='Inspect deployment receipt ↗';item.append(link);}list.append(item);
 }
 $('receipt-list').replaceChildren();
 for(const event of indexReport?.reconciliation?.rehearsalEvents||[]){const row=document.createElement('li'),link=document.createElement('a');link.href=TESTNET.explorer+'/tx/'+event.transactionHash;link.target='_blank';link.rel='noreferrer';link.textContent=event.name+' · block '+event.blockNumber+' ↗';row.append(link);$('receipt-list').append(row);}
 $('summary').textContent=indexReport?.ready?JSON.stringify(indexReport,null,2):'No live deployment or event acceptance has been established on this page yet.';
}
async function run(fn){if(busy)return;busy=true;render();try{await fn();}catch(e){message(e.shortMessage||e.message||'This step did not finish. Keep your record and retry.',true);}finally{busy=false;render();}}
function resetConnection(){provider?.destroy();provider=null;signer=null;owner=null;verified=false;indexReport=null;message('Wallet or network changed. Reconnect on Robinhood testnet.');render();}
$('connect').onclick=()=>run(async()=>{
 const wallet=window.ethereum;if(!wallet)throw Error('Open this page in a browser with an EVM wallet, such as MetaMask. Wallet keys stay in that wallet.');
 await wallet.request({method:'eth_requestAccounts'});
 try{await wallet.request({method:'wallet_switchEthereumChain',params:[{chainId:'0xb626'}]});}
 catch(e){if(e.code!==4902)throw e;await wallet.request({method:'wallet_addEthereumChain',params:[{chainId:'0xb626',chainName:TESTNET.name,nativeCurrency:{name:'Test Ether',symbol:'ETH',decimals:18},rpcUrls:[TESTNET.rpc],blockExplorerUrls:[TESTNET.explorer]}]});}
 provider=new BrowserProvider(wallet,undefined,{cacheTimeout:0});provider.pollingInterval=1500;
 signer=await provider.getSigner();owner=await signer.getAddress();
 const balance=await provider.getBalance(owner);$('balance').textContent=formatEther(balance)+' test ETH';
 message(balance===0n?'Connected. Request free test ETH from the official faucet for the wallet address shown above.':'Connected to Robinhood testnet. Review the operator role, then deploy.');
});
window.ethereum?.on?.('accountsChanged',resetConnection);window.ethereum?.on?.('chainChanged',resetConnection);
$('deploy').onclick=()=>run(async()=>{
 if(!record){record=newDeployment({owner,operator:$('operator').value.trim()||owner});persist(record);}
 await deployTestnet({provider,signer,artifacts,record,save:persist,progress:message});verified=true;message('Both testnet contracts are confirmed. Code, constructor arguments and roles match the plan.');
});
$('verify').onclick=()=>run(async()=>{
 provider||=new JsonRpcProvider(TESTNET.rpc,undefined,{cacheTimeout:0});
 const r=await verifyDeployment({provider,record,artifacts});verified=r.ready;
 message(r.ready?'Deployment code, roles and creation receipts verified.':'A deployment is still missing. Keep the record and resume its owner wallet.');
});
$('rehearse').onclick=()=>run(async()=>{
 await runRegistryRehearsal({provider,signer,artifacts,record,save:persist,progress:message});verified=true;
 message('Operator rehearsal transactions are confirmed. Run the event check to reconcile them.');
});
$('fresh').onclick=()=>run(async()=>{freshRehearsal(record);indexReport=null;persist(record);message('Earlier rehearsal preserved. Press Run testnet registry rehearsal for three new test transactions using a future wall-clock round.');});
$('source').onclick=()=>run(async()=>{
 provider||=new JsonRpcProvider(TESTNET.rpc,undefined,{cacheTimeout:0});
 message('Submitting/checking the public Solidity source on the official testnet explorer…');
 const response=await fetch('standard-input.json');if(!response.ok)throw Error('The Solidity verification input could not be loaded.');
 const result=await verifyExplorerSources({provider,record,artifacts,input:await response.json(),save:persist});
 message(result.verified?'Both contract sources are verified on the explorer.':'Source verification is submitted or pending. Press this button again to check its status.');
});
$('index').onclick=()=>run(async()=>{
 provider||=new JsonRpcProvider(TESTNET.rpc,undefined,{cacheTimeout:0});
 message('Checking confirmed chain events and comparing passport issuance with the contract…');
 const saved=localStorage.getItem(eventsKey),store=snapshotStore(saved?JSON.parse(saved):null,s=>localStorage.setItem(eventsKey,JSON.stringify(s)));
 indexReport=await indexDeployment({provider,record,artifacts,store});record.indexReport=indexReport;persist(record);verified=true;
  message(indexReport.ready&&indexReport.reconciliation.rehearsalIndexed&&indexReport.reconciliation.futureRoundClientTimeRecorded?'Deployment, rehearsal and confirmed event reconciliation passed. Export the record and attach it in the work chat.':indexReport.ready&&indexReport.reconciliation.rehearsalIndexed?'Receipt events are indexed, but this older rehearsal lacks a future client-time check. Preserve it and start a fresh rehearsal; keep the existing deployments.':'Index scan is incomplete or the rehearsal is missing. Continue the pending step, then run this check again.');
});
$('export').onclick=()=>{
 const blob=new Blob([JSON.stringify(record,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Antarctic-Robinhood-Testnet-Deployment.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('import').onclick=()=>$('file').click();
$('file').onchange=()=>run(async()=>{
 const file=$('file').files[0];if(!file)return;if(file.size>2000000)throw Error('Choose the deployment JSON smaller than 2 MB.');
 const next=checkRecord(JSON.parse(await file.text()));record=next;verified=false;indexReport=null;persist(next);message('Imported. Reconnect its owner wallet to resume, or verify the existing receipts.');$('file').value='';
});
render();
async function passportStatus(){
 const r=await fetch('https://articweb3.onrender.com/arctic-play/v3/passport/delivery/config',{credentials:'omit',cache:'no-store'});
 if(!r.ok)throw Error('The passport backend update is not live yet. Keep your existing deployments.');
 const config=await r.json();
 $('passport-state').textContent=config.status==='ready'?'Ready for your Para sign-in test':config.status.replaceAll('_',' ');
 $('passport-signer').textContent=config.signer||'Awaiting secure backend configuration';
 $('passport-contract').textContent=config.contract||'Awaiting configuration';
 return config;
}
$('passport-refresh').onclick=()=>run(async()=>{await passportStatus();message('Passport backend status refreshed.');});
$('passport-authorize').onclick=()=>run(async()=>{
 const config=await passportStatus();
 await authorizePassportDelivery({provider,signer,record,config,artifacts,save:persist,progress:message});
 await passportStatus();message('Owner setup transactions confirmed. The backend rechecks permissions and gas within 15 seconds. Continue with the Para passport check.');
});
passportStatus().catch(()=>{$('passport-state').textContent='Backend update pending';});
