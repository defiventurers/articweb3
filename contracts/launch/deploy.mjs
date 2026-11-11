// Explicit Robinhood testnet adapter. No default broadcasting or mainnet path.
import fs from 'node:fs';
import {JsonRpcProvider,Wallet,ContractFactory,getAddress} from 'ethers';
import {compile} from './compile.mjs';
const id=Number(process.env.AK_LAUNCH_CHAIN_ID||46630);
if(id!==46630)throw Error('This adapter permits Robinhood testnet 46630 only. Abstract retains separate deployment tooling.');
const artifacts=compile();
if(process.argv.includes('--offline')){console.log(JSON.stringify({mode:'offline-plan',chainId:id,contracts:Object.keys(artifacts),broadcast:false,networkVerified:false},null,2));process.exit(0);}
const rpc=process.env.AK_LAUNCH_RPC_URL||'https://rpc.testnet.chain.robinhood.com',url=new URL(rpc);
if(url.protocol!=='https:'||url.username||url.password||url.hash)throw Error('Use an HTTPS testnet RPC without embedded credentials.');
if(!process.env.AK_LAUNCH_DEPLOYER_KEY)throw Error('A separate funded testnet deployer key is required in the private environment.');
const provider=new JsonRpcProvider(rpc);
try{
 if(Number((await provider.getNetwork()).chainId)!==id)throw Error('RPC chain mismatch.');
 const signer=new Wallet(process.env.AK_LAUNCH_DEPLOYER_KEY,provider),minter=getAddress(process.env.AK_LAUNCH_MINTER_ADDRESS||signer.address);
 const base=process.env.AK_PASSPORT_METADATA_BASE||`https://articweb3.onrender.com/arctic-play/v3/passport/metadata/${id}/`,metadata=new URL(base);
 if(metadata.protocol!=='https:'||metadata.username||metadata.password||metadata.search||metadata.hash||!base.endsWith('/'))throw Error('Use a public HTTPS metadata base ending with slash.');
 const balance=await provider.getBalance(signer.address),broadcast=process.argv.includes('--broadcast');
 const request=await new ContractFactory(artifacts.AntarcticPassport.abi,artifacts.AntarcticPassport.bytecode,signer).getDeployTransaction(signer.address,minter,base);
 if(!broadcast)console.log(JSON.stringify({mode:'dry-run',chainId:id,deployer:signer.address,minter,balanceWei:String(balance),passportGasEstimate:String(await provider.estimateGas({...request,from:signer.address})),broadcast:false},null,2));
 else{
  if(balance===0n)throw Error('Fund the testnet deployer before broadcasting.');
  const file=process.env.AK_LAUNCH_DEPLOYMENT_RECORD||`deployment-${id}-${Date.now()}.json`;
  const record={chainId:id,network:'testnet',startedAt:new Date().toISOString(),deployer:signer.address,minter,contracts:{},metadataBase:base,mainnetMigration:'Separate contracts and reviewed account mapping; no automatic bridging.'};
  fs.writeFileSync(file,JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});const save=()=>fs.writeFileSync(file,JSON.stringify(record,null,2)+'\n',{mode:0o600});
  async function deploy(name,args){const c=await new ContractFactory(artifacts[name].abi,artifacts[name].bytecode,signer).deploy(...args);record.contracts[name]={transactionHash:c.deploymentTransaction().hash,status:'submitted'};save();await c.waitForDeployment();const r=await c.deploymentTransaction().wait(2);if(r.status!==1)throw Error(name+' deployment reverted.');record.contracts[name]={...record.contracts[name],address:await c.getAddress(),blockNumber:r.blockNumber,blockHash:r.blockHash,status:'confirmed',compiler:artifacts[name].compiler,sourceSha256:artifacts[name].sourceSha256};save();return c;}
  const passport=await deploy('AntarcticPassport',[signer.address,minter,base]);
  if(process.argv.includes('--with-keepsakes')){const keepBase=process.env.AK_KEEPSAKES_METADATA_BASE||`https://articweb3.onrender.com/arctic-play/v3/passport/achievement-metadata/${id}/{id}.json`;const keepsakes=await deploy('AntarcticKeepsakes',[signer.address,minter,await passport.getAddress(),keepBase]);const tx=await passport.grantRole(await passport.METADATA_ROLE(),await keepsakes.getAddress());record.keepsakesRoleTransaction=tx.hash;save();await tx.wait(2);}
  record.completedAt=new Date().toISOString();save();console.log(JSON.stringify(record,null,2));
 }
}finally{provider.destroy();}
