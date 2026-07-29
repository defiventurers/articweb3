const fs = require("fs");
const path = require("path");

const sourcePath = path.join(__dirname, "..", "frontend", "src", "games", "khasi-fishflow", "rules.js");
let source = fs.readFileSync(sourcePath, "utf8")
  .replace(/export\s+const\s+/g, "const ")
  .replace(/export\s+function\s+/g, "function ");
source += `\nmodule.exports = { KHASI_FISHFLOW_RULESET, PLAYERS, otherPlayer, pitKey, createKhasiFishflowState, createKhasiHandicapDrill, clockwiseRoute, getLegalActions, validateAction, applyAction, getCounts, describeTurn, resultTitle, resultDetail, actionSummary, scoreAction, assertInvariant };`;
const moduleShim = { exports: {} };
new Function("module", "exports", "require", "__dirname", "__filename", source)(moduleShim, moduleShim.exports, require, path.dirname(sourcePath), sourcePath);
module.exports = moduleShim.exports;
