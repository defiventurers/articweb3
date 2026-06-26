const http = require("http");
const { buildRuntimeStatus } = require("./runtimeStatus.js");
const { getLaunchStatus } = require("./launchMode.js");
const { getVaultIndexerHealth } = require("./vaultEventIndexer.js");
const { getHighStakesTierSnapshot } = require("./highStakesTiers.js");
const { roomStoreStatus } = require("./roomStore.js");
const { historyStoreStatus } = require("./historyStore.js");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function installRuntimeStatusEndpoints() {
  if (http.__articRuntimeStatusInstalled) return;
  http.__articRuntimeStatusInstalled = true;

  const originalCreateServer = http.createServer.bind(http);
  http.createServer = function createServerWithRuntimeStatus(listener) {
    return originalCreateServer((req, res) => {
      const fullUrl = new URL(req.url || "/", "http://localhost");
      const path = fullUrl.pathname;
      const isRuntimePath = path === "/healthz" || path === "/runtime/status";

      if (req.method === "OPTIONS" && isRuntimePath) return writeJson(res, 204, null);

      if (req.method === "GET" && path === "/healthz") {
        return writeJson(res, 200, { ok: true, service: "artic-web3-server", generatedAt: new Date().toISOString() });
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

function writeJson(res, status, body) {
  res.writeHead(status, { ...CORS_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store" });
  if (status === 204 || body === null) return res.end();
  res.end(JSON.stringify(body));
}

module.exports = { installRuntimeStatusEndpoints };
