// Operator-only, explicit Robinhood testnet deployment. Never redeploy the existing Passport.
import {JsonRpcProvider,Wallet,Contract,ContractFactory} from 'ethers';
import {compile} from './compile.mjs';
const chainId=46630,passport=process.env.AK_VISA_CONTRACT_46630||process.env.AK_EXISTING_PASSPORT_CONTRACT;
const rpc=process.env.AK_LAUNCH_RPC_URL||'https://rpc.testnet.chain.robinhood.com';
if(!/^0x[0-9a-fA-F]{40}$/.test(passport||'')||/^0x0{40}$/i.test(passport||''))throw Error('Set AK_EXISTING_PASSPORT_CONTRACT to the already deployed, reviewed Passport contract.');
const url=new URL(rpc);if(url.protocol!=='https:'||url.username||url.password)throw Error('Use an HTTPS RPC without credentials.');
const artifacts=compile(),abi=artifacts.AntarcticMysteryEgg.abi,metadata='https://articweb3.onrender.com/arctic-play/v3/passport/egg-metadata/46630/';
if(!process.argv.includes('--broadcast')){console.log(JSON.stringify({mode:'PLAN_ONLY',chainId,passport,contract:'AntarcticMysteryEgg',maxSupply:33,metadata,requires:'Owner / deployer wallet and separate reviewed minter, funded with test ETH; existing Passport untouched.',broadcast:false},null,2));process.exit(0);}
if(!process.env.AK_LAUNCH_DEPLOYER_KEY)throw Error('Configure a dedicated testnet deployer private key in the secure operator environment, never in source.');
const provider=new JsonRpcProvider(rpc,undefined,{cacheTimeout:0});
try{
 if(Number((await provider.getNetwork()).chainId)!==chainId)throw Error('Robinhood testnet chain mismatch.');
 const code=await provider.getCode(passport);if(code==='0x')throw Error('Existing Passport contract does not exist on this chain.');
 const signer=new Wallet(process.env.AK_LAUNCH_DEPLOYER_KEY,provider),admin=process.env.AK_EGG_ADMIN_ADDRESS||signer.address,minter=process.env.AK_PASSPORT_SIGNER_ADDRESS_46630;
 if(!/^0x[0-9a-fA-F]{40}$/.test(minter||'')||/^0x0{40}$/i.test(minter))throw Error('Set reviewed AK_PASSPORT_SIGNER_ADDRESS_46630 as the egg minter.');
 const factory=new ContractFactory(abi,artifacts.AntarcticMysteryEgg.bytecode,signer);
 const egg=await factory.deploy(admin,minter,passport,metadata),tx=egg.deploymentTransaction();
 const receipt=await tx.wait(2);if(receipt.status!==1)throw Error('Egg deployment reverted.');
 console.log(JSON.stringify({chainId,eggAddress:await egg.getAddress(),passport,admin,minter,transactionHash:tx.hash,blockNumber:receipt.blockNumber,blockHash:receipt.blockHash,metadata,confirmedL2:true,mainnetDeployment:false},null,2));
}finally{provider.destroy();}
