// Verified online-account fixture for legacy UI regression suites only.
export function verifiedAccount(window,{fetchImpl}={}){
 const id='11111111-1111-4111-8111-111111111111';window.localStorage.setItem('arctic-play.v1.cloud-session',JSON.stringify({accountId:id,session:id+'.'+'q'.repeat(43)}));
 const passport={id:'passport-fixture',number:'AK-FIXTURE',playerName:'Saved Player',wallet:'0x1234567890123456789012345678901234567890',deliveries:[]};window.localStorage.setItem('arctic-play.v1.antarctic-visa.v1.'+id,JSON.stringify(passport));
 // Never inherit JSDOM's real network fetch. Tests can explicitly supply a mock.
 window.fetch=async(input,options)=>{if(String(input).endsWith('/capabilities'))return{ok:true,json:async()=>({version:2,cloud:true,accountPlay:true})};if(String(input).endsWith('/passport'))return{ok:true,json:async()=>({identity:{accountId:id,displayName:'Saved Player'},passport})};if(String(input).endsWith('/play-access'))return{ok:true,json:async()=>({accountId:id,online:true,leaseSeconds:60,offlineOwned:false,license:null,marketingChoiceNeeded:false})};if(String(input).endsWith('/auth/providers'))return{ok:true,json:async()=>({google:true,email:true,recovery:true})};if(fetchImpl)return fetchImpl(input,options);throw Error('Offline test fixture');};
}
