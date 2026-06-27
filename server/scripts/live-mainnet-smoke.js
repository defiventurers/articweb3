#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { runLiveMainnetSmoke } = require("../liveMainnetSmoke.js");

runLiveMainnetSmoke()
  .then((report) => {
    for (const result of report.results) {
      const marker = result.ok ? "PASS" : "FAIL";
      const detail = result.detail ? ` - ${result.detail}` : "";
      console.log(`[${marker}] ${result.name}${detail}`);
    }

    const summary = {
      ok: report.ok,
      backendUrl: report.backendUrl,
      expectedMode: report.expectedMode,
      expectedChainId: report.expectedChainId,
      passed: report.passed,
      failed: report.failed,
      generatedAt: report.generatedAt
    };

    console.log(JSON.stringify(summary, null, 2));
    writeReports(report, summary);

    if (!report.ok) process.exitCode = 1;
  })
  .catch((err) => {
    console.error(`[FAIL] live mainnet smoke crashed: ${err.message || err}`);
    process.exitCode = 1;
  });

function writeReports(report, summary) {
  const reportPath = process.env.SMOKE_REPORT_PATH || "";
  const markdownPath = process.env.SMOKE_MARKDOWN_PATH || "";
  const githubSummaryPath = process.env.GITHUB_STEP_SUMMARY || "";

  if (reportPath) writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  const markdown = buildMarkdownReport(report, summary);
  if (markdownPath) writeFile(markdownPath, markdown);
  if (githubSummaryPath) fs.appendFileSync(githubSummaryPath, markdown, "utf8");
}

function buildMarkdownReport(report, summary) {
  const rows = report.results
    .map((result) => `| ${result.ok ? "PASS" : "FAIL"} | ${escapePipe(result.name)} | ${escapePipe(result.detail || "")} |`)
    .join("\n");

  return `# Live Mainnet Smoke Report\n\n` +
    `| Field | Value |\n` +
    `| --- | --- |\n` +
    `| Status | ${summary.ok ? "PASS" : "FAIL"} |\n` +
    `| Backend | ${escapePipe(summary.backendUrl)} |\n` +
    `| Expected mode | ${escapePipe(summary.expectedMode)} |\n` +
    `| Expected chain ID | ${summary.expectedChainId} |\n` +
    `| Passed | ${summary.passed} |\n` +
    `| Failed | ${summary.failed} |\n` +
    `| Generated at | ${summary.generatedAt} |\n\n` +
    `## Checks\n\n` +
    `| Result | Check | Detail |\n` +
    `| --- | --- | --- |\n` +
    `${rows}\n`;
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function escapePipe(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}
