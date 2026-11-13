import {Contract,getAddress,id,parseEther,sha256} from 'ethers';
export async function authorizePassportDelivery({provider,signer,record,config,artifacts,save=()=>{},progress=()=>{}}){
 if(Number((await provider.getNetwork()).chainId)!==46630||config.chainId!==46630)throw Error('Use Robinhood testnet, chain 46630.');
 const address=record?.contracts?.AntarcticPassport?.address;
 if(!address||address.toLowerCase()!==config.contract?.toLowerCase()||!config.enabled)throw Error('The backend and saved passport deployment must match.');
 const recipient=getAddress(config.signer);if(/^0x0{40}$/i.test(recipient))throw Error('A dedicated backend signer is required.');
 if(sha256(await provider.getCode(address)).slice(2)!==artifacts.AntarcticPassport.runtimeHash)throw Error('Passport bytecode differs from the reviewed contract.');
 const contract=new Contract(address,artifacts.AntarcticPassport.abi,signer),role=id('MINTER_ROLE');
 record.passportDelivery||={chainId:46630,contract:address,signer:recipient,transactions:{}};
 if(record.passportDelivery.signer.toLowerCase()!==recipient.toLowerCase())throw Error('The backend signer changed. Review its old grants before continuing.');
 const saveTx=async(name,tx)=>{record.passportDelivery.transactions[name]=tx.hash;await save(record);const receipt=await tx.wait(2);if(receipt.status!==1)throw Error('The testnet setup transaction reverted.');};
 if(!await contract.hasRole(role,recipient)){
  if(!await contract.hasRole('0x'+'00'.repeat(32),await signer.getAddress()))throw Error('Connect the passport contract owner to grant minting access.');
  progress('Approve the passport minting role for the backend signer in your wallet.');
  await saveTx('minterRole',await contract.grantRole(role,recipient));
 }
 // Gas only, fixed maximum top-up. No settlement or treasury permissions.
 const target=parseEther('0.005'),balance=await provider.getBalance(recipient);
 if(parseEther(config.minimumBalance||'0')>target)throw Error('Current gas estimate exceeds the console top-up limit. Review the backend status.');
 if(balance<target){progress('Approve a top-up to 0.005 free test ETH for passport minting gas.');await saveTx('testGas',await signer.sendTransaction({to:recipient,value:target-balance}));}
 record.passportDelivery.checkedAt=new Date().toISOString();record.passportDelivery.minter=await contract.hasRole(role,recipient);record.passportDelivery.funded=(await provider.getBalance(recipient))>0n;await save(record);
 return record.passportDelivery;
}
