import {test,expect} from '@playwright/test';
const address='0x'+'1'.repeat(40),hash='0x'+'a'.repeat(64),eggHash='0x'+'b'.repeat(64);
async function mockPassport(page,pending=false){
 await page.addInitScript(()=>sessionStorage.setItem('ak.first33.session.v1','browser-test-fixture'));
 await page.route('https://articweb3.onrender.com/arctic-play/v3/**',route=>{const url=route.request().url(),egg=url.includes('/egg/'),kind=egg?'egg':'visa';let body;
 if(url.endsWith('/passport'))body={identity:{wallet:{provider:'para',address,chainId:46630},needsEarlySignup:false},passport:{wallet:address,chainId:46630,playerName:'Explorer',eggSerial:7,deliveries:['visa','egg'].map(k=>({kind:k,chainId:46630,status:pending?'queued':'confirmed',tokenId:k==='visa'?'104':'7',transactionHash:pending?null:k==='visa'?hash:eggHash}))}};
 else if(url.endsWith('/acceptance'))body={confirmed:true,paraWalletVerified:true,chainId:46630,wallet:address,tokenId:kind==='visa'?'104':'7',transactionHash:kind==='visa'?hash:eggHash};
 else body={enabled:true,earlySignup:{enabled:true}};
 return route.fulfill({json:body,headers:{'Access-Control-Allow-Origin':'*'}});
 });
}
for(const viewport of [{width:320,height:640},{width:360,height:740},{width:393,height:852},{width:1280,height:800}]){
 test(`Passport wallet, NFT cards and receipts fit without scrolling at ${viewport.width}x${viewport.height}`,async({page},testInfo)=>{
  await page.setViewportSize(viewport);await mockPassport(page);await page.goto('/early/');await expect(page.locator('#visa-state')).toContainText('Received');await expect(page.locator('#egg-state')).toContainText('Received');
  await expect(page.locator('#created-wallet')).toHaveText(address);await expect(page.locator('#register')).toHaveCount(0);await expect(page.locator('#visa-tx')).toBeVisible();await expect(page.locator('#egg-tx')).toBeVisible();await expect(page.locator('#sign-out')).toBeVisible();
  const geometry=await page.evaluate(()=>{const main=document.querySelector('#main'),nav=document.querySelector('.bottom-nav'),footer=document.querySelector('.passport-footer');return{scroll:main.scrollHeight,client:main.clientHeight,bodyScroll:document.documentElement.scrollHeight,viewport:innerHeight,width:document.documentElement.scrollWidth,viewportWidth:innerWidth,footerBottom:footer.getBoundingClientRect().bottom,navTop:nav.getBoundingClientRect().top};});
  expect(geometry.scroll).toBeLessThanOrEqual(geometry.client+1);expect(geometry.bodyScroll).toBeLessThanOrEqual(geometry.viewport+1);expect(geometry.width).toBeLessThanOrEqual(geometry.viewportWidth);expect(geometry.footerBottom).toBeLessThanOrEqual(geometry.navTop+1);
  await page.screenshot({path:testInfo.outputPath('passport.png'),fullPage:true});
 });
}
test('pending collectibles remain automatic and visible on a small phone',async({page})=>{await page.setViewportSize({width:320,height:640});await mockPassport(page,true);await page.goto('/early/');await expect(page.locator('#visa-state')).toContainText('Waiting to mint');await expect(page.locator('#egg-state')).toContainText('Waiting to mint');await expect(page.locator('#visa-tx')).toBeHidden();await expect(page.locator('#register')).toHaveCount(0);});
test('early dashboard displays scoped counts and retains them when a refresh fails',async({page},testInfo)=>{
 let fail=false;await page.setViewportSize({width:393,height:852});await page.route('https://articweb3.onrender.com/arctic-play/v3/launch/early',route=>fail?route.fulfill({status:503,json:{error:'Unavailable'}}):route.fulfill({headers:{'Access-Control-Allow-Origin':'*'},json:{source:'antarcticgaming.co/early',generatedAt:Date.now(),signups:12,today:3,passportsReceived:10,passportsPending:2,eggsReceived:9,eggsReserved:12,eggsRemaining:21,olderUnattributedAccounts:4}}));
 await page.goto('/early/dashboard/');await expect(page.locator('#signups')).toHaveText('12');await expect(page.locator('#passports')).toHaveText('10');await expect(page.locator('#eggs')).toHaveText('9');await expect(page.locator('#remaining')).toHaveText('21');await page.screenshot({path:testInfo.outputPath('dashboard.png'),fullPage:true});fail=true;await page.locator('#refresh').click();await expect(page.locator('#error')).toBeVisible();await expect(page.locator('#signups')).toHaveText('12');await expect(page.locator('#status')).toContainText('last available');
});
