const test=require('node:test'),assert=require('node:assert/strict');
const {createArcticPlayService}=require('../arcticPlayService');
test('Invitation page keeps the room code, explains sign-in and offers browser and Android entry',t=>{
 const service=createArcticPlayService({requireLogin:false,accessOptions:{requireAccount:false},rooms:new Map(),send(){},ok(){},fail(){}});t.after(()=>service.close());
 function page(code){const response={writeHead(status,headers){this.status=status;this.headers=headers;},end(body){this.body=body;}};assert.equal(service.handleHttp({url:'/arctic-play/join?room='+encodeURIComponent(code)},response),true);return response;}
 const good=page('abc234');assert.equal(good.status,200);assert.ok(good.body.indexOf('/arctic-play/app/?room=ABC234')<good.body.indexOf('arcticplay://room/ABC234'));
 assert.match(good.body,/No download needed/);assert.match(good.body,/Open in Safari, sign in and join/);assert.doesNotMatch(good.body,/No download or account needed/);assert.match(good.headers['Content-Security-Policy'],/img-src 'self'/);
 const bad=page('<script>alert(1)</script>');assert.ok(!bad.body.includes('<script>'));assert.ok(!bad.body.includes('arcticplay://room/'));assert.match(bad.body,/complete room invitation/);
});
