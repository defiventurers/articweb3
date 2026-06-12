import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contractsRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(contractsRoot, "..");

exportArtifact({
  contractName: "GameEscrow",
  sourceName: "GameEscrow.sol",
  abiExport: "GAME_ESCROW_ABI",
  bytecodeExport: "GAME_ESCROW_BYTECODE",
  outputFile: "frontend/src/contracts/gameEscrowArtifact.js"
});

exportArtifact({
  contractName: "EthGameEscrow",
  sourceName: "EthGameEscrow.sol",
  abiExport: "ETH_GAME_ESCROW_ABI",
  bytecodeExport: "ETH_GAME_ESCROW_BYTECODE",
  outputFile: "frontend/src/contracts/ethGameEscrowArtifact.js"
});

function exportArtifact({ contractName, sourceName, abiExport, bytecodeExport, outputFile }) {
  const candidates = [
    path.join(contractsRoot, `artifacts-zk/contracts/${sourceName}/${contractName}.json`),
    path.join(contractsRoot, `artifacts/contracts/${sourceName}/${contractName}.json`)
  ];

  const artifactPath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!artifactPath) {
    console.error(`${contractName} artifact not found. Run npm run compile first.`);
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abi = artifact.abi;
  const bytecode = artifact.bytecode || artifact.bytecodeObject;

  if (!bytecode || bytecode === "0x") {
    console.error(`${contractName} bytecode missing from artifact.`);
    process.exit(1);
  }

  const output = `export const ${abiExport} = ${JSON.stringify(abi, null, 2)};\n\nexport const ${bytecodeExport} = ${JSON.stringify(bytecode)};\n`;
  const outputPath = path.join(repoRoot, outputFile);
  fs.writeFileSync(outputPath, output);
  console.log(`Wrote ${outputFile}`);
}
