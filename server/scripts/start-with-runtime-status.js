require("dotenv").config();

const { installRuntimeStatusEndpoints } = require("../runtimeStatusBootstrap.js");

installRuntimeStatusEndpoints();
// Separate, opt-in Robinhood evidence index. Existing Abstract vault indexing,
// gameplay services and chain defaults are not redirected.
if(process.env.AK_RH_EVENT_INDEX_ENABLED==='true'){
 const rhIndexer=require('../robinhoodEventIndexer').createRobinhoodEventIndexer();
 rhIndexer.start().catch(()=>console.error('[robinhood-index] Startup check pending.'));
 process.on('SIGTERM',()=>rhIndexer.stop());process.on('SIGINT',()=>rhIndexer.stop());
}
require("./start-with-indexer.js");
