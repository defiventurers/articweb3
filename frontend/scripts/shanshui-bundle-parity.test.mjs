import test from 'node:test';
import assert from 'node:assert/strict';
import {sameExecutableBundle} from './shanshui-bundle-parity.mjs';
test('compiler comments and redundant braces do not change bundle parity',async()=>{
 assert.equal(await sameExecutableBundle('//#region rules\nexports.f=function(x){if(x)if(x>2)return 3;else return 4;else return 5;};','// rules\nexports.f=function(x){if(x){if(x>2)return 3;else return 4;}else return 5;};'),true);
});
test('rule changes and changed dangling-else binding still fail parity',async()=>{
 assert.equal(await sameExecutableBundle('exports.f=x=>x+1;','exports.f=x=>x+2;'),false);
 assert.equal(await sameExecutableBundle('exports.f=function(x){if(x)if(x>2)return 3;else return 4;};','exports.f=function(x){if(x){if(x>2)return 3;}else return 4;};'),false);
});
