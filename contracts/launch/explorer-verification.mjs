import {ContractFactory} from 'ethers';
import {TESTNET,verifyDeployment} from './testnet.mjs';
const api=TESTNET.explorer+'/api';
async function request(params,fetcher,post=false){
 const body=new URLSearchParams(params),r=await fetcher(post?api:api+'?'+body,{...(post?{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:String(body)}:{}),signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('Explorer verification API is unavailable. Keep the Solidity verification input and retry later.');
 return r.json();
}
export async function verifyExplorerSources({provider,record,artifacts,input,fetcher=fetch,save=()=>{}}){
 if(!(await verifyDeployment({provider,record,artifacts})).ready)throw Error('Confirm the contract code and creation receipts before publishing source verification.');
 record.sourceVerification||={};
 for(const name of ['FairPlayRegistry','AntarcticPassport']){
  const a=artifacts[name],address=record.contracts[name].address;
  const source=await request({module:'contract',action:'getsourcecode',address},fetcher),details=Array.isArray(source.result)?source.result[0]:null;
  if(source.status==='1'&&details?.SourceCode&&details.ContractName===name&&String(details.CompilerVersion).includes('0.8.24+commit.e11b9ed9')){
   record.sourceVerification[name]={status:'verified',address,checkedAt:new Date().toISOString()};await save(record);continue;
  }
  const prior=record.sourceVerification[name];
  if(prior?.guid){
   const result=await request({module:'contract',action:'checkverifystatus',guid:prior.guid},fetcher);
   record.sourceVerification[name]={...prior,status:'pending',lastResult:String(result.result).slice(0,500),checkedAt:new Date().toISOString()};await save(record);continue;
  }
  const args=name==='FairPlayRegistry'?[record.operator]:[record.owner,record.operator,record.metadataBase];
  const data=(await new ContractFactory(a.abi,a.bytecode).getDeployTransaction(...args)).data;
  const result=await request({module:'contract',action:'verifysourcecode',codeformat:'solidity-standard-json-input',contractaddress:address,contractname:name+'.sol:'+name,compilerversion:'v'+a.compiler.split('.Emscripten')[0],sourceCode:JSON.stringify(input),constructorArguments:data.slice(a.bytecode.length),autodetectConstructorArguments:'false'},fetcher,true);
  if(result.status!=='1')throw Error('Explorer did not accept '+name+' verification. Retain its standard JSON input for manual verification.');
  record.sourceVerification[name]={status:'submitted',guid:String(result.result),address,submittedAt:new Date().toISOString()};await save(record);
 }
 return {verified:['FairPlayRegistry','AntarcticPassport'].every(n=>record.sourceVerification[n]?.status==='verified'),contracts:record.sourceVerification};
}
