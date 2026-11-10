import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedWallet, formatEth, readEthBalance, nftImageUrl, normalizeNft, nftCursor, readNftPage, mergeNfts} from '../src/walletPortfolio.js';
const address='0x1234567890123456789012345678901234567890', contract='0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const identity={accountId:'account-a',wallet:{provider:'para',address,chainId:46630}};
const wallet=verifiedWallet(identity,'account-a');
const json=payload=>({ok:true,json:async()=>payload});
const nft=(id='7',type='ERC-721')=>({id,token_type:type,value:'3',token:{address_hash:contract,name:'Lantern Collection'},metadata:{name:'My Lantern',image:'ipfs://QmSomeCid/lantern.png'},holder_address_hash:address});

test('only the authenticated account Para wallet supplies address and chain',()=>{
 assert.equal(wallet.address,address);assert.equal(wallet.chain.id,46630);assert.equal(wallet.chain.testnet,true);
 assert.throws(()=>verifiedWallet(identity,'account-b'),/account changed/);
 assert.equal(verifiedWallet({...identity,wallet:{provider:'external',address,chainId:46630}},'account-a'),null);
 assert.throws(()=>verifiedWallet({...identity,wallet:{...identity.wallet,address:'0x'+'0'.repeat(40)}},'account-a'),/unavailable/);
 assert.throws(()=>verifiedWallet({...identity,wallet:{...identity.wallet,chainId:1}},'account-a'),/not supported/);
});
test('ETH is formatted exactly without Number precision loss or fake zero',()=>{
 assert.equal(formatEth('0'),'0');assert.equal(formatEth('1'),'<0.000001');
 assert.equal(formatEth('1234567891234567891'),'1.234567');
 assert.equal(formatEth('900719925474099312345678901234567891'),'900719925474099312.345678');
 assert.throws(()=>formatEth('-1'));
});
test('balance verifies the RPC chain before reading the verified address; no session headers',async()=>{
 const calls=[];const result=await readEthBalance(wallet,{fetchImpl:async(url,options)=>{
  calls.push({url,options});const body=JSON.parse(options.body);
  assert.equal(options.credentials,'omit');assert.equal(options.headers.Authorization,undefined);
  return json({id:body.id,result:body.method==='eth_chainId'?'0xb626':'0xde0b6b3a7640000'});
 }});
 assert.equal(result.formatted,'1');assert.deepEqual(JSON.parse(calls[1].options.body).params,[address,'latest']);
 assert.equal(calls[0].url,'https://rpc.testnet.chain.robinhood.com');
});
test('wrong-chain, HTTP and malformed balance responses fail without becoming zero',async()=>{
 let calls=0;await assert.rejects(readEthBalance(wallet,{fetchImpl:async()=>{calls++;return json({id:1,result:'0x1'})}}),/different chain/);assert.equal(calls,1);
 await assert.rejects(readEthBalance(wallet,{fetchImpl:async()=>({ok:false})}),/unavailable/);
 await assert.rejects(readEthBalance(wallet,{fetchImpl:async()=>json({id:1,result:'0'})}),/invalid balance/);
});
test('ERC-721/1155 retain full token IDs and quantities, chain keys and current owner',()=>{
 const a=normalizeNft(nft(),wallet);assert.equal(a.tokenId,'7');assert.equal(a.quantity,'1');assert.equal(a.chainId,46630);
 const big='90071992547409931234567890',b=normalizeNft({...nft(big,'ERC-1155'),value:big},wallet);assert.equal(b.quantity,big);assert.equal(b.tokenId,big);
 assert.equal(normalizeNft({...nft(),holder_address_hash:contract},wallet),null);
 assert.equal(normalizeNft({...nft('7','ERC-20')},wallet),null);
 assert.equal(normalizeNft({...nft('7','ERC-1155'),value:'0'},wallet),null);
 assert.equal(mergeNfts([a],[a,b]).length,2);
});
test('NFT metadata stays text and media accepts only HTTPS or IPFS',()=>{
 for(const url of ['javascript:alert(1)','data:image/svg+xml,<svg/>','file:///etc/passwd','http://x.test/a','https://user:password@x.test/a'])assert.equal(nftImageUrl(url),null);
 assert.equal(nftImageUrl('ipfs://QmSomeCid/a.png'),'https://ipfs.io/ipfs/QmSomeCid/a.png');
 assert.equal(nftImageUrl('ipfs://QmCid/../secret'),null);
 assert.equal(normalizeNft({...nft(),metadata:{name:'<img src=x onerror=alert(1)>',image:'javascript:alert(1)'}},wallet).image,null);
});
test('NFT reads use fixed chain-specific origin, pass all pagination fields and deduplicate',async()=>{
 const next={token_contract_address_hash:contract,token_id:'7',token_type:'ERC-721',items_count:50};let url;
 const first=await readNftPage(wallet,null,{fetchImpl:async(u,o)=>{url=u;assert.equal(o.credentials,'omit');assert.equal(o.headers,undefined);return json({items:[nft(),nft()],next_page_params:next})}});
 assert.equal(first.items.length,1);assert.equal(new URL(url).origin,wallet.nftOrigin);
 const page=await readNftPage(wallet,next,{fetchImpl:async(u)=>{url=u;return json({items:[nft('8')],next_page_params:null})}});
 assert.equal(new URL(url).searchParams.get('items_count'),'50');assert.equal(new URL(url).searchParams.get('type'),'ERC-721,ERC-1155');assert.equal(page.next,null);
 assert.equal(mergeNfts(first.items,page.items).length,2);
});
test('NFT failure, malformed or repeated pages and unsupported networks never report an empty collection',async()=>{
 await assert.rejects(readNftPage(wallet,null,{fetchImpl:async()=>json({})}),/incomplete/);
 await assert.rejects(readNftPage(wallet,null,{fetchImpl:async()=>({ok:false})}),/unavailable/);
 const cursor={token_id:'7'};await assert.rejects(readNftPage(wallet,cursor,{fetchImpl:async()=>json({items:[],next_page_params:cursor})}),/repeated/);
 assert.throws(()=>nftCursor({url:{nested:'value'}}),/invalid/);
 const partial=await readNftPage(wallet,null,{fetchImpl:async()=>json({items:[{}],next_page_params:null})});assert.equal(partial.skipped,1);
 const abstract=verifiedWallet({...identity,wallet:{...identity.wallet,chainId:2741}},'account-a');
 await assert.rejects(readNftPage(abstract,null,{fetchImpl:()=>{throw Error('Must not request unsupported API')}}),/not available/);
});
