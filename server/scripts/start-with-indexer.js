require("dotenv").config();

console.log("[vault-indexer] wrapper loaded");
require("../index.js");
console.log("[vault-indexer] backend loaded");

const { runVaultEventIndexer } = require("../vaultEventIndexer.js");

const AUTO_RUN = process.env.ETH_INDEXER_AUTO_RUN !== "false";
const DELAY_MS = Math.max(1000, Number(process.env.ETH_INDEXER_BOOT_DELAY_MS || 2000));

console.log("[vault-indexer] auto run", AUTO_RUN, "delay", DELAY_MS);

if (AUTO_RUN) {
  setTimeout(async () => {
    try {
      console.log("[vault-indexer] boot run starting");
      const result = await runVaultEventIndexer();
      console.log("[vault-indexer] boot run finished", JSON.stringify(result));
    } catch (err) {
      console.error("[vault-indexer] boot run error", err.message || err);
    }
  }, DELAY_MS);
} else {
  console.log("[vault-indexer] boot run disabled");
}
