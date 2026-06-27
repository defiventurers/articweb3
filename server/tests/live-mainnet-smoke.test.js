const assert = require("assert/strict");
const { normalizeBaseUrl } = require("../liveMainnetSmoke.js");

assert.equal(normalizeBaseUrl("https://example.com/"), "https://example.com");
assert.equal(normalizeBaseUrl("wss://example.com/ws"), "https://example.com/ws");
assert.equal(normalizeBaseUrl("ws://localhost:10000"), "http://localhost:10000");
assert.equal(normalizeBaseUrl(""), "");
assert.equal(normalizeBaseUrl(null), "");

console.log("[live-mainnet-smoke] evidence passed");
