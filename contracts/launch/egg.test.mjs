import test from 'node:test';
import assert from 'node:assert/strict';
import ganache from 'ganache';
import {Wallet,BrowserProvider,ContractFactory,ZeroAddress} from 'ethers';
import {compile} from './compile.mjs';

test('Mystery Golden Egg contract: passport-first, fixed editions, idempotent claims and authorization',async()=>{
 const chain=ganache.provider({logging:{quiet:true},chain:{chainId:46630}}),provider=new BrowserProvider(chain,undefined,{cacheTimeout:0});
 const signer=await provider.getSigner(0),attacker=await provider.getSigner(1),artifacts=compile();
 const passport=await new ContractFactory(artifacts.AntarcticPassport.abi,artifacts.AntarcticPassport.bytecode,signer).deploy(await signer.getAddress(),await signer.getAddress(),'https://example.test/passport/');await passport.waitForDeployment();
 const egg=await new ContractFactory(artifacts.AntarcticMysteryEgg.abi,artifacts.AntarcticMysteryEgg.bytecode,signer).deploy(await signer.getAddress(),await signer.getAddress(),await passport.getAddress(),'https://example.test/egg/');await egg.waitForDeployment();
 const first=Wallet.createRandom().address,second=Wallet.createRandom().address,claim='0x'+'1'.repeat(64);
 await assert.rejects(egg.mintEgg(first,claim,1),/revert|PassportRequired|missing revert data/i);
 await (await passport.mintVisa(first,'0x'+'a'.repeat(64))).wait();
 await assert.rejects(egg.connect(attacker).mintEgg(first,claim,1),/revert|access|missing revert data/i);
 await (await egg.mintEgg(first,claim,1)).wait();
 assert.equal(await egg.ownerOf(1),first);assert.equal(Number(await egg.mintedCount()),1);
 await (await egg.mintEgg(first,claim,1)).wait();assert.equal(Number(await egg.mintedCount()),1);
 await assert.rejects(egg.mintEgg(first,'0x'+'2'.repeat(64),1),/revert|ClaimConflict|missing revert data/i);
 await (await passport.mintVisa(second,'0x'+'b'.repeat(64))).wait();
 await assert.rejects(egg.mintEgg(second,'0x'+'3'.repeat(64),34),/revert|InvalidClaim|missing revert data/i);
 await (await egg.mintEgg(second,'0x'+'3'.repeat(64),33)).wait();
 assert.equal(Number(await egg.mintedCount()),2);assert.equal(await egg.ownerOf(33),second);
 assert.equal(await egg.tokenURI(33),'https://example.test/egg/33.json');
});
