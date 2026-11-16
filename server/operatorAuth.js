const {timingSafeEqual}=require('node:crypto');
function operatorAuthorized(req,key){const provided=(req.headers?.authorization||'').replace(/^Bearer /,'');return typeof key==='string'&&key.length>=32&&Buffer.byteLength(provided)===Buffer.byteLength(key)&&timingSafeEqual(Buffer.from(provided),Buffer.from(key));}
module.exports={operatorAuthorized};
