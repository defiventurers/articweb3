#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  collectLockedMatchRehearsalEvidence,
  buildMarkdownEvidence
} = require("../lockedMatchRehearsalEvidence.js");

collectLockedMatchRehearsalEvidence()
  .then((report) => {
    for (const result of report.checks) {
      const marker = result.ok ? "PASS" : "FAIL";
      const detail = result.detail ? ` - ${result.detail}` : "";
      console.log(`[${marker}] ${result.name}${detail}`);
    }

    writeEvidence(report);
    console.log(JSON.stringify({
      ok: report.ok,
      roomCode: report.roomCode,
      contractMatchId: report.room?.contractMatchId || null,
      status: report.room?.status || null,
      settlementStatus: report.settlement?.settlementStatus || null,
      passed: report.passed,
      failed: report.failed,
      generatedAt: report.generatedAt
    }, null, 2));

    if (!report.ok) process.exitCode = 1;
  })
  .catch((err) => {
    console.error(`[FAIL] locked match rehearsal evidence crashed: ${err.message || err}`);
    process.exitCode = 1;
  });

function writeEvidence(report) {
  const reportPath = process.env.REHEARSAL_REPORT_PATH || "";
  const markdownPath = process.env.REHEARSAL_MARKDOWN_PATH || "";
  const githubSummaryPath = process.env.GITHUB_STEP_SUMMARY || "";
  const markdown = buildMarkdownEvidence(report);

  if (reportPath) writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  if (markdownPath) writeFile(markdownPath, markdown);
  if (githubSummaryPath) fs.appendFileSync(githubSummaryPath, markdown, "utf8");
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}
