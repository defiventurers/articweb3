import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contractsRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(contractsRoot, "..");

const candidates = [
  path.join(contractsRoot, "artifacts-zk/contracts/GameEscrow.sol/GameEscrow.json"),
  path.join(contractsRoot, "artifacts/contracts/GameEscrow.sol/GameEscrow.json")
];

const artifactPath = candidates.find((candidate) => fs.existsSync(candidate));

if (!artifactPath) {
  console.error("GameEscrow artifact not found. Run npm run compile first.");
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const abi = artifact.abi;
const bytecode = artifact.bytecode || artifact.bytecodeObject;

if (!bytecode || bytecode === "0x") {
  console.error("GameEscrow bytecode missing from artifact.");
  process.exit(1);
}

const output = `export const GAME_ESCROW_ABI = ${JSON.stringify(abi, null, 2)};\n\nexport const GAME_ESCROW_BYTECODE = ${JSON.stringify(bytecode)};\n`;
const outputPath = path.join(repoRoot, "frontend/src/contracts/gameEscrowArtifact.js");
fs.writeFileSync(outputPath, output);
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
