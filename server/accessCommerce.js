// Direct-APK access products. Disabled until merchant configuration AND prices exist.
const {createHmac,timingSafeEqual}=require('node:crypto');
const {config,configured,safeUrl}=require('./companyCommerce');
const {PRODUCTS,access}=require('../mobile/arctic-play/src/unlockModel.cjs');
function readPrices(){try{return JSON.parse(process.env.AK_UNLOCK_PRICES||'{}');}catch{return {};}}
function createAccessCommerce({settings=config(),prices=readPrices(),fetcher=fetch,provider,offlineReady=false}={}){
  prices=prices&&typeof prices==='object'&&!Array.isArray(prices)?prices:{};
  const definitions=PRODUCTS.map(p=>{const price=prices[p.id];let valid=false;try{new Intl.NumberFormat('en',{style:'currency',currency:price?.currency});valid=Number.isSafeInteger(price?.amount)&&price.amount>0&&/^[A-Z]{3}$/.test(price.currency);}catch{}return {...p,...(valid?{amount:price.amount,currency:price.currency}:{}),available:valid&&configured(settings)&&(p.kind!=='offline'||offlineReady)};});
  async function api(path,method='GET',data){const response=await fetcher('https://api.razorpay.com/v1/'+path,{method,headers:{Authorization:'Basic '+Buffer.from(settings.keyId+':'+settings.keySecret).toString('base64'),'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(12000)});const value=await response.json();if(!response.ok)throw Error('Checkout is unavailable. Please try again later.');return value;}
  provider||={
    async ensureLink(accountId,attemptId,p){const prior=await api('payment_links?reference_id='+encodeURIComponent(attemptId));const found=prior.payment_links?.find(l=>l.reference_id===attemptId);if(found)return found;return api('payment_links/','POST',{amount:p.amount,currency:p.currency,accept_partial:false,reference_id:attemptId,description:'Antarctic Kingdoms — '+p.name,expire_by:Math.floor(Date.now()/1000)+1800,notify:{sms:false,email:false},reminder_enable:false,notes:{ak_account:accountId,ak_product:p.id},callback_url:'https://articweb3.onrender.com/arctic-play/payment-return',callback_method:'get'});},link:id=>api('payment_links/'+id),payment:id=>api('payments/'+id)
  };
  function refreshEntitlement(a,product,now){a.entitlements||={};a.entitlements[product]={active:Object.values(a.accessOrders||{}).some(o=>o.product===product&&o.mode===settings.mode&&o.status==='owned'&&!o.revoked),mode:settings.mode,verifiedAt:now()};}
  function verifyLink(link,order,accountId,attemptId,error){if(!link||link.id!==order.providerId||link.reference_id!==attemptId||link.amount!==order.amount||link.currency!==order.currency||link.notes?.ak_account!==accountId||link.notes?.ak_product!==order.product||link.accept_partial!==false)throw error('Purchase details could not be verified.',409);}
  async function reconcile(store,accountId,attemptId,error,now){let response,mapping;
    await store.transact('account',accountId,async a=>{if(!a)throw error('Restore your recovery account first.',401);const order=a.accessOrders?.[attemptId];if(!order)throw error('Purchase not found.',404);if(order.mode!==settings.mode){response={status:'other-mode',entitlements:a.entitlements||{}};return a;}
      const link=await provider.link(order.providerId);verifyLink(link,order,accountId,attemptId,error);let status=['cancelled','expired'].includes(link.status)?link.status:'pending';
      if(link.status==='paid'&&link.amount_paid===order.amount){for(const item of (link.payments||[]).slice(0,10)){if(!/^pay_[a-zA-Z0-9]{5,40}$/.test(item.payment_id||''))continue;const p=await provider.payment(item.payment_id);if(p.id!==item.payment_id||p.order_id!==link.order_id||p.amount!==order.amount||p.currency!==order.currency)throw error('Payment details could not be verified.',409);mapping={id:p.id,accountId,attemptId};if(p.status==='refunded'||p.amount_refunded>0||p.refund_status){status='refunded';break;}if(p.status==='captured'&&p.captured===true)status='owned';}}
      order.status=order.revoked?'revoked':status;order.checkedAt=now();refreshEntitlement(a,order.product,now);response={status:order.status,entitlements:a.entitlements};return a;
    });if(mapping)await store.transact('access-payment',mapping.id,()=>mapping);return response;
  }
  async function route({req,path,method,body,authenticated,store,error,now}){
    if(path==='/access/catalog'&&method==='GET')return {products:definitions.map(p=>({...p,available:p.available&&store.configured})),mode:settings.mode,merchant:settings.merchant,support:settings.support,terms:settings.terms,privacy:settings.privacy};
    if(path==='/access/checkout'&&method==='POST'){
      const b=await body(req),product=definitions.find(p=>p.id===b.product);
      if(!product?.available||!store.configured)throw error('Purchases have not opened yet. You can earn every hall through play.',503);
      if(!/^[a-f0-9-]{36}$/.test(b.attemptId||''))throw error('Start a new checkout.');
      return authenticated(req,async a=>{if(product.kind!=='offline'&&product.games.every(id=>access(id,{progress:a.accessProgress,entitlements:a.entitlements||{}}).open))throw error('These halls are already permanently open on your account.',409);if(a.entitlements?.[product.id]?.active&&a.entitlements[product.id].mode===settings.mode)throw error('You already own this product. Restore purchases to refresh it.',409);a.accessOrders||={};const old=a.accessOrders[b.attemptId];if(old&&old.product!==product.id)throw error('This checkout belongs to another product.',409);const waiting=Object.entries(a.accessOrders).find(([,o])=>o.product===product.id&&o.mode===settings.mode&&o.status==='pending'&&now()-o.createdAt<1800000);if(waiting)return {attemptId:waiting[0],url:waiting[1].url,mode:settings.mode};if(old)throw error('Start a new checkout for this product.',409);if(Object.values(a.accessOrders).filter(o=>now()-o.createdAt<3600000).length>=6)throw error('Restore purchases before opening another checkout.',429);
        const link=await provider.ensureLink(a.id,b.attemptId,product),order={product:product.id,mode:settings.mode,providerId:link.id,amount:product.amount,currency:product.currency,url:link.short_url,status:'pending',createdAt:now()};
        if(!/^plink_[a-zA-Z0-9]{5,40}$/.test(link.id||'')||!safeUrl(link.short_url))throw error('Checkout details could not be verified.',409);verifyLink(link,order,a.id,b.attemptId,error);a.accessOrders[b.attemptId]=order;return {attemptId:b.attemptId,url:link.short_url,mode:settings.mode};
      });
    }
    if(path==='/access/purchases/restore'&&method==='POST'){
      const a=await authenticated(req,a=>({id:a.id,orders:Object.keys(a.accessOrders||{}).slice(-60)}));
      if(configured(settings))for(const id of a.orders)await reconcile(store,a.id,id,error,now);
      return authenticated(req,a=>({entitlements:a.entitlements||{},pending:Object.values(a.accessOrders||{}).some(o=>o.status==='pending')}));
    }
    if(path==='/access/razorpay/webhook'&&method==='POST'){
      if(!configured(settings))throw error('Purchases are not enabled.',503);
      const chunks=[];let bytes=0;for await(const c of req){bytes+=c.length;if(bytes>150000)throw error('Request too large.',413);chunks.push(c);}const raw=Buffer.concat(chunks),signature=String(req.headers['x-razorpay-signature']||''),expected=createHmac('sha256',settings.webhookSecret).update(raw).digest('hex');if(!/^[a-f0-9]{64}$/.test(signature)||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw error('Invalid webhook signature.',401);
      let event;try{event=JSON.parse(raw);}catch{throw error('Invalid webhook.');}let accountId,attemptId;
      const linkId=event.payload?.payment_link?.entity?.id,paymentId=event.payload?.refund?.entity?.payment_id||event.payload?.payment?.entity?.id||event.payload?.dispute?.entity?.payment_id;
      if(/^plink_[a-zA-Z0-9]{5,40}$/.test(linkId||'')){const link=await provider.link(linkId);if(link.id!==linkId)throw error('Invalid purchase link.',409);accountId=link.notes?.ak_account;attemptId=link.reference_id;}
      else if(/^pay_[a-zA-Z0-9]{5,40}$/.test(paymentId||'')){const m=await store.get('access-payment',paymentId);accountId=m?.accountId;attemptId=m?.attemptId;}
      if(!accountId||!attemptId)return {ok:true,ignored:true};
      if(/^payment\.dispute\./.test(event.event)){await store.transact('account',accountId,a=>{const order=a?.accessOrders?.[attemptId];if(order){order.revoked=true;order.status='revoked';refreshEntitlement(a,order.product,now);}return a;});return {ok:true};}
      await reconcile(store,accountId,attemptId,error,now);return {ok:true};
    }
  }
  return {route};
}
module.exports={createAccessCommerce};
