#!/usr/bin/env node

const { runLiveMainnetSmoke } = require("../liveMainnetSmoke.js");

runLiveMainnetSmoke()
  .then((report) => {
    for (const result of report.results) {
      const marker = result.ok ? "PASS" : "FAIL";
      const detail = result.detail ? ` - ${result.detail}` : "";
      console.log(`[${marker}] ${result.name}${detail}`);
    }

    console.log(JSON.stringify({
      ok: report.ok,
      backendUrl: report.backendUrl,
      expectedMode: report.expectedMode,
      expectedChainId: report.expectedChainId,
      passed: report.passed,
      failed: report.failed,
      generatedAt: report.generatedAt
    }, null, 2));

    if (!report.ok) process.exitCode = 1;
  })
  .catch((err) => {
    console.error(`[FAIL] live mainnet smoke crashed: ${err.message || err}`);
    process.exitCode = 1;
  });
