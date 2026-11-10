// Dry run by default. Only verified test networks; never uses zkSync deployers.
import fs from 'node:fs';
import {JsonRpcProvider,Wallet,ContractFactory,Contract} from 'ethers';
import {compile} from './compile.mjs';
const id=Number(process.env.AK_LAUNCH_CHAIN_ID||46630),rpc=process.env.AK_LAUNCH_RPC_URL||({46630:'https://rpc.testnet.chain.robinhood.com',11124:'https://api.testnet.abs.xyz'})[id];
if(![46630,11124].includes(id)||!rpc)throw Error('Launch script permits Robinhood/Abstract testnets only.');
if(!process.env.AK_LAUNCH_DEPLOYER_KEY)throw Error('Set the testnet deployer key privately in the environment.');
const provider=new JsonRpcProvider(rpc),network=await provider.getNetwork();if(Number(network.chainId)!==id)throw Error('RPC network mismatch.');
const signer=new Wallet(process.env.AK_LAUNCH_DEPLOYER_KEY,provider),minter=process.env.AK_LAUNCH_MINTER_ADDRESS||signer.address,registrar=process.env.AK_FAIR_RELAYER_ADDRESS||signer.address;
const base=process.env.AK_PASSPORT_METADATA_BASE||`https://articweb3.onrender.com/arctic-play/v3/passport/metadata/${id}/`;
if(!base.startsWith('https://')||!base.endsWith('/'))throw Error('Use an HTTPS metadata base ending with slash.');
const a=compile(),balance=await provider.getBalance(signer.address),broadcast=process.argv.includes('--broadcast');
if(!broadcast){const request=await new ContractFactory(a.AntarcticPassport.abi,a.AntarcticPassport.bytecode,signer).getDeployTransaction(signer.address,minter,base);console.log(JSON.stringify({mode:'dry-run',chainId:id,deployer:signer.address,minter,registrar,balanceWei:String(balance),passportGasEstimate:String(await provider.estimateGas({...request,from:signer.address})),otherContracts:'Keepstakes and registry require the deployed passport; estimates follow deployment.'},null,2));provider.destroy();process.exit(0);}
if(balance===0n)throw Error('Fund the separate testnet deployer from the official faucet before broadcasting.');
async function deploy(name,args){const c=await new ContractFactory(a[name].abi,a[name].bytecode,signer).deploy(...args);await c.waitForDeployment();const r=await c.deploymentTransaction().wait(2);if(r.status!==1)throw Error('Deployment reverted.');return {contract:c,address:await c.getAddress(),transactionHash:r.hash,blockNumber:r.blockNumber};}
const passport=await deploy('AntarcticPassport',[signer.address,minter,base]);const keepsakes=await deploy('AntarcticKeepsakes',[signer.address,minter,passport.address,`https://articweb3.onrender.com/arctic-play/v3/passport/achievement-metadata/{id}.json`]);
await(await passport.contract.grantRole(await passport.contract.METADATA_ROLE(),keepsakes.address)).wait(2);
const registry=await deploy('FairPlayRegistry',[registrar]);
const record={chainId:id,network:'testnet',deployedAt:new Date().toISOString(),deployer:signer.address,minter,registrar,contracts:Object.fromEntries(Object.entries({passport,keepsakes,registry}).map(([n,v])=>[n,{address:v.address,transactionHash:v.transactionHash,blockNumber:v.blockNumber}])),artifacts:Object.fromEntries(Object.entries(a).map(([n,v])=>[n,{compiler:v.compiler,sourceSha256:v.sourceSha256,runtimeHash:v.runtimeHash}])),mainnetMigration:'Separate deployment; no automatic bridging or asset deletion.'};
fs.writeFileSync(process.env.AK_LAUNCH_DEPLOYMENT_RECORD||`deployment-${id}.json`,JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record,null,2));provider.destroy();
