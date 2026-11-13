require("dotenv").config();

const { installRuntimeStatusEndpoints } = require("../runtimeStatusBootstrap.js");

installRuntimeStatusEndpoints();
if(process.env.AK_PASSPORT_RUNTIME_ENABLED==='true'){
 const {runtime}=require('../passportDeliveryRuntime');runtime.start();
 process.on('SIGTERM',()=>runtime.stop());process.on('SIGINT',()=>runtime.stop());
}
// Separate, opt-in Robinhood evidence index. Existing Abstract vault indexing,
// gameplay services and chain defaults are not redirected.
if(process.env.AK_RH_EVENT_INDEX_ENABLED==='true'){
 const rhIndexer=require('../robinhoodEventIndexer').createRobinhoodEventIndexer();
 rhIndexer.start().catch(()=>console.error('[robinhood-index] Startup check pending.'));
 process.on('SIGTERM',()=>rhIndexer.stop());process.on('SIGINT',()=>rhIndexer.stop());
}
require("./start-with-indexer.js");
