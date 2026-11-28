const http = require("http");
const { buildRuntimeStatus } = require("./runtimeStatus.js");
const { getLaunchStatus } = require("./launchMode.js");
const { getVaultIndexerHealth } = require("./vaultEventIndexer.js");
const { getHighStakesTierSnapshot } = require("./highStakesTiers.js");
const { roomStoreStatus } = require("./roomStore.js");
const { historyStoreStatus } = require("./historyStore.js");
const { createHealthStatus } = require("./healthStatus.js");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function installRuntimeStatusEndpoints({ health = createHealthStatus() } = {}) {
  if (http.__articRuntimeStatusInstalled) return;
  http.__articRuntimeStatusInstalled = true;

  const originalCreateServer = http.createServer.bind(http);
  http.createServer = function createServerWithRuntimeStatus(listener) {
    return originalCreateServer(async (req, res) => {
      const fullUrl = new URL(req.url || "/", "http://localhost");
      const path = fullUrl.pathname;
      const isHealthPath = path === "/healthz" || path === "/readyz";
      const isRuntimePath = isHealthPath || path === "/runtime/status";

      if (req.method === "OPTIONS" && isRuntimePath) return writeJson(res, 204, null);

      if (isHealthPath) {
        if (req.method !== "GET" && req.method !== "HEAD") {
          res.setHeader("Allow", "GET, HEAD, OPTIONS");
          return writeJson(res, 405, { ok: false, error: "Method not allowed." });
        }
        const body = path === "/healthz" ? health.liveness() : await health.readiness();
        return writeJson(res, body.ok ? 200 : 503, body, req.method === "HEAD");
      }

      if (req.method === "GET" && path === "/runtime/status") {
        return writeJson(res, 200, buildRuntimeStatus({
          getLaunchStatus,
          getVaultIndexerHealth,
          getHighStakesTierSnapshot,
          roomStoreStatus,
          historyStoreStatus
        }));
      }

      return listener(req, res);
    });
  };
}

function writeJson(res, status, body, head = false) {
  res.writeHead(status, { ...CORS_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store", "CDN-Cache-Control": "no-store" });
  if (status === 204 || body === null || head) return res.end();
  res.end(JSON.stringify(require("./requestSecurity").safeDiagnostics(body)));
}

module.exports = { installRuntimeStatusEndpoints };
