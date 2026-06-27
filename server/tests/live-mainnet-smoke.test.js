const assert = require("assert/strict");
const { normalizeBaseUrl } = require("../liveMainnetSmoke.js");
const { buildMarkdownReport, summarizeReport } = require("../scripts/live-mainnet-smoke.js");

assert.equal(normalizeBaseUrl("https://example.com/"), "https://example.com");
assert.equal(normalizeBaseUrl("wss://example.com/ws"), "https://example.com/ws");
assert.equal(normalizeBaseUrl("ws://localhost:10000"), "http://localhost:10000");
assert.equal(normalizeBaseUrl(""), "");
assert.equal(normalizeBaseUrl(null), "");

const report = {
  ok: true,
  backendUrl: "https://example.com",
  expectedMode: "internal",
  expectedChainId: 2741,
  passed: 1,
  failed: 0,
  generatedAt: "2026-06-27T00:00:00.000Z",
  results: [{ name: "healthz ok", ok: true, detail: "" }]
};

const summary = summarizeReport(report);
assert.equal(summary.ok, true);
assert.equal(summary.expectedMode, "internal");

const markdown = buildMarkdownReport(report, summary);
assert.match(markdown, /Live Mainnet Smoke Report/);
assert.match(markdown, /healthz ok/);
assert.match(markdown, /PASS/);
assert.match(markdown, /2741/);

console.log("[live-mainnet-smoke] evidence passed");
