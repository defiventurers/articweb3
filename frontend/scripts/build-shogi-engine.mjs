import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const sourceDir = path.join(frontendRoot, "src", "games", "shogi-frozen-shogunate");
const outPath = path.join(repoRoot, "server", "shogiEngine.cjs");

function stripImports(source) {
  return source.replace(/^import\s*\{[\s\S]*?\}\s*from\s*"\.\/[^"]+";\s*/gm, "");
}

function stripExports(source) {
  return source
    .replace(/\bexport\s+const\s+/g, "const ")
    .replace(/\bexport\s+function\s+/g, "function ")
    .replace(/\bexport\s+class\s+/g, "class ");
}

const rules = stripExports(fs.readFileSync(path.join(sourceDir, "rules.js"), "utf8"));
const bot = stripExports(stripImports(fs.readFileSync(path.join(sourceDir, "bot.js"), "utf8")));
const output = `// GENERATED FILE. Do not edit directly.
// Source: frontend/src/games/shogi-frozen-shogunate/{rules.js,bot.js}
// Regenerate with: npm run build:shogi-engine

${rules}
${bot}

module.exports = {
  RULESET_VERSION: "standard-hon-shogi-v1",
  SIDES, HAND_TYPES, createShogiState, createEmptyShogiState, getLegalActions,
  applyShogiAction, chooseShogiSearchAction, actionKey, isInCheck, indexOf,
};
`;

if (process.argv.includes("--check")) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
  if (current !== output) {
    console.error("server/shogiEngine.cjs is out of date. Run npm run build:shogi-engine.");
    process.exit(1);
  }
  console.log("server/shogiEngine.cjs is current.");
} else {
  fs.writeFileSync(outPath, output);
  console.log(`Wrote ${path.relative(repoRoot, outPath)}`);
}
