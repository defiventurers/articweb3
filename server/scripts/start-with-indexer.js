require("dotenv").config();

require("../index.js");

const { runVaultEventIndexer } = require("../vaultEventIndexer.js");

const AUTO_RUN = process.env.ETH_INDEXER_AUTO_RUN !== "false";
const DELAY_MS = Math.max(1000, Number(process.env.ETH_INDEXER_BOOT_DELAY_MS || 10000));

if (AUTO_RUN) {
  setTimeout(async () => {
    try {
      console.log("[vault-indexer] boot run starting");
      const result = await runVaultEventIndexer();
      console.log(`[vault-indexer] boot run finished ${JSON.stringify(result)}`);
    } catch (err) {
      console.error(`[vault-indexer] boot run failed: ${err.message || err}`);
    }
  }, DELAY_MS);
} else {
  console.log("[vault-indexer] boot run disabled by ETH_INDEXER_AUTO_RUN=false");
}
