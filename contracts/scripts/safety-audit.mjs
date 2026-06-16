import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contractPath = path.resolve(__dirname, "../contracts/EthGameEscrow.sol");
const source = fs.readFileSync(contractPath, "utf8");

const requiredSnippets = [
  ["nonReentrant modifier", "modifier nonReentrant()"],
  ["deposit pause flag", "bool public depositsPaused"],
  ["lock pause flag", "bool public locksPaused"],
  ["settlement pause flag", "bool public settlementPaused"],
  ["withdrawal pause flag", "bool public withdrawalsPaused"],
  ["max entry cap", "uint256 public maxEntryAmount"],
  ["active lock cap", "uint256 public maxActiveLocks"],
  ["active lock counter", "uint256 public activeLocks"],
  ["lock timeout", "uint256 public defaultLockTimeout"],
  ["lock deadline mapping", "mapping(bytes32 => mapping(address => uint256)) public lockDeadline"],
  ["expired refund path", "function refundExpiredEntry"],
  ["no direct owner drain", "function _sendEth(address to, uint256 amount) private"],
  ["settlement total check", "if (payoutTotal != lockedTotal) revert InvalidPayoutTotal();"],
  ["duplicate player check", "if (players[j] == player) revert InvalidPlayers();"],
  ["deposit pause setter", "function setDepositsPaused"],
  ["settlement pause setter", "function setSettlementPaused"],
  ["withdrawal pause setter", "function setWithdrawalsPaused"]
];

const forbiddenSnippets = [
  ["owner ETH drain", "selfdestruct"],
  ["arbitrary tx origin auth", "tx.origin"],
  ["delegatecall backdoor", "delegatecall"],
  ["unrestricted owner withdraw all", "withdrawAll"],
  ["sweep function", "sweep"]
];

const failures = [];

for (const [label, snippet] of requiredSnippets) {
  if (!source.includes(snippet)) failures.push(`Missing ${label}: ${snippet}`);
}

for (const [label, snippet] of forbiddenSnippets) {
  if (source.includes(snippet)) failures.push(`Forbidden ${label}: ${snippet}`);
}

if (failures.length) {
  console.error("ETH escrow safety audit failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("ETH escrow safety audit passed.");
