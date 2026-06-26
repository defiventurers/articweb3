const fs = require("fs");
const path = require("path");
const Module = require("module");

const HIGH_STAKES_PAYOUT_MULTIPLIERS = [3n, 1n, 0n, 0n];
const HIGH_STAKES_POINTS = [3000, 2000, 1000, 100];

function findFunctionEnd(source, startIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }

  throw new Error("Unable to locate end of buildPayoutPlan.");
}

function replaceBuildPayoutPlan(source) {
  const signature = "function buildPayoutPlan(room, placements)";
  const start = source.indexOf(signature);
  if (start === -1) throw new Error("Unable to locate buildPayoutPlan.");

  const openBrace = source.indexOf("{", start);
  if (openBrace === -1) throw new Error("Unable to locate buildPayoutPlan body.");

  const end = findFunctionEnd(source, openBrace);
  const replacement = `function buildPayoutPlan(room, placements) {
  const entry = BigInt(room.entryWei || "0");
  const payouts = [entry * 3n, entry * 1n, 0n, 0n];
  const points = [3000, 2000, 1000, 100];
  return placements.map((team, index) => ({
    position: index + 1,
    team,
    wallet: teamWallet(room, team),
    payoutWei: payouts[index].toString(),
    points: points[index]
  }));
}`;

  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

function loadPrizeBackend() {
  const indexPath = require.resolve("./index.js");
  if (require.cache[indexPath]) return require.cache[indexPath].exports;

  const source = fs.readFileSync(indexPath, "utf8");
  const transformed = replaceBuildPayoutPlan(source);
  const backendModule = new Module(indexPath, module.parent);
  backendModule.filename = indexPath;
  backendModule.paths = Module._nodeModulePaths(path.dirname(indexPath));
  require.cache[indexPath] = backendModule;
  backendModule._compile(transformed, indexPath);
  return backendModule.exports;
}

module.exports = {
  loadPrizeBackend,
  replaceBuildPayoutPlan,
  HIGH_STAKES_PAYOUT_MULTIPLIERS,
  HIGH_STAKES_POINTS
};
