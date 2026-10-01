import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const sourceDir = path.join(frontendRoot, "src", "games", "sannin-shogi");
const outPath = path.join(repoRoot, "server", "sanninEngine.cjs");

function stripImports(source) {
  return source.replace(/^import\s*\{[\s\S]*?\}\s*from\s*"\.\/[^"]+";\s*/gm, "");
}

function stripExports(source) {
  return source
    .replace(/\bexport\s+const\s+/g, "const ")
    .replace(/\bexport\s+function\s+/g, "function ")
    .replace(/\bexport\s+class\s+/g, "class ");
}

const hex = stripExports(fs.readFileSync(path.join(sourceDir, "hex.js"), "utf8"));
const rules = stripExports(stripImports(fs.readFileSync(path.join(sourceDir, "rules.js"), "utf8")));
const bot = stripExports(stripImports(fs.readFileSync(path.join(sourceDir, "bot.js"), "utf8")));

const output = `// GENERATED FILE. Do not edit directly.
// Source: frontend/src/games/sannin-shogi/{hex.js,rules.js,bot.js}
// Regenerate with: npm run build:sannin-engine

${hex}

${rules}

${bot}

module.exports = {
  GAME_ID,
  RULESET_VERSION,
  FACTIONS,
  FACTION_LABELS,
  HEX_CELLS,
  createInitialState,
  getLegalActions,
  validateAction,
  applyAction,
  chooseSanninBotAction,
  isInCheck,
};
`;

if (process.argv.includes("--check")) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
  if (current !== output) {
    console.error("server/sanninEngine.cjs is out of date. Run npm run build:sannin-engine.");
    process.exit(1);
  }
  console.log("server/sanninEngine.cjs is current.");
} else {
  fs.writeFileSync(outPath, output);
  console.log(`Wrote ${path.relative(repoRoot, outPath)}`);
}
