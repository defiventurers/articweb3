#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const filePath = process.argv[2] || "ops/mainnet/deployment-record.json";
const recordPath = path.resolve(process.cwd(), filePath);
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const TX_RE = /^0x[a-fA-F0-9]{64}$/;
const ZERO = "0x0000000000000000000000000000000000000000";

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function isUsableAddress(value) {
  return ADDRESS_RE.test(String(value || "")) && String(value).toLowerCase() !== ZERO.toLowerCase();
}

function get(obj, keyPath, fallback = "") {
  return keyPath.split(".").reduce((next, key) => next && next[key], obj) ?? fallback;
}

const errors = [];
const warnings = [];

if (!fs.existsSync(recordPath)) {
  console.error(`[mainnet deployment] missing record: ${recordPath}`);
  console.error("Copy ops/mainnet/deployment-record.template.json to ops/mainnet/deployment-record.json and fill it in.");
  process.exit(1);
}

const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));

if (record.schema !== "artic.mainnet.deployment.v1") fail("schema must be artic.mainnet.deployment.v1");
if (!record.status || !["DRAFT", "READY_FOR_REHEARSAL", "REHEARSAL_PASSED", "BLOCKED"].includes(record.status)) fail("status must be DRAFT, READY_FOR_REHEARSAL, REHEARSAL_PASSED, or BLOCKED");

if (get(record, "chain.env") !== "mainnet") fail("chain.env must be mainnet");
if (Number(get(record, "chain.chainId")) !== 2741) fail("chain.chainId must be 2741");
if (!String(get(record, "chain.rpcUrl")).includes("api.mainnet.abs.xyz")) fail("chain.rpcUrl must point to Abstract mainnet RPC");
if (!String(get(record, "chain.wsUrl")).includes("api.mainnet.abs.xyz/ws")) fail("chain.wsUrl must point to Abstract mainnet websocket");
if (!String(get(record, "chain.explorerUrl")).includes("abscan.org")) fail("chain.explorerUrl must point to mainnet explorer");

const ethVaultAddress = get(record, "contracts.ethVaultAddress");
if (!isUsableAddress(ethVaultAddress)) fail("contracts.ethVaultAddress must be a non-zero address");
if (!TX_RE.test(String(get(record, "contracts.deployTx")))) warn("contracts.deployTx is missing or not a 32-byte tx hash");
if (!isUsableAddress(get(record, "contracts.ownerAddress"))) fail("contracts.ownerAddress must be a non-zero address");
if (!isUsableAddress(get(record, "contracts.gameServerAddress"))) fail("contracts.gameServerAddress must be a non-zero address");
if (!get(record, "contracts.verifiedOnExplorer")) warn("contracts.verifiedOnExplorer is false; mainnet rehearsal can proceed only if source review is otherwise documented, public launch cannot");

const frontendVault = get(record, "frontendEnv.VITE_ETH_VAULT_ADDRESS");
const backendVault = get(record, "backendEnv.ETH_VAULT_ADDRESS");
if (frontendVault.toLowerCase() !== ethVaultAddress.toLowerCase()) fail("frontend VITE_ETH_VAULT_ADDRESS does not match contracts.ethVaultAddress");
if (backendVault.toLowerCase() !== ethVaultAddress.toLowerCase()) fail("backend ETH_VAULT_ADDRESS does not match contracts.ethVaultAddress");

if (get(record, "frontendEnv.VITE_CHAIN_ENV") !== "mainnet") fail("frontend VITE_CHAIN_ENV must be mainnet");
if (String(get(record, "frontendEnv.VITE_ABSTRACT_CHAIN_ID")) !== "2741") fail("frontend VITE_ABSTRACT_CHAIN_ID must be 2741");
if (!String(get(record, "frontendEnv.VITE_ABSTRACT_RPC")).includes("api.mainnet.abs.xyz")) fail("frontend VITE_ABSTRACT_RPC must point to mainnet");
if (!String(get(record, "frontendEnv.VITE_ABSTRACT_WS")).includes("api.mainnet.abs.xyz/ws")) fail("frontend VITE_ABSTRACT_WS must point to mainnet");
if (String(get(record, "frontendEnv.VITE_ENABLE_SESSION_KEYS", "false")).toLowerCase() === "true") fail("frontend mainnet session keys must stay disabled");

if (get(record, "backendEnv.CHAIN_ENV") !== "mainnet") fail("backend CHAIN_ENV must be mainnet");
if (String(get(record, "backendEnv.ABSTRACT_CHAIN_ID")) !== "2741") fail("backend ABSTRACT_CHAIN_ID must be 2741");
if (!String(get(record, "backendEnv.ABSTRACT_RPC_URL")).includes("api.mainnet.abs.xyz")) fail("backend ABSTRACT_RPC_URL must point to mainnet");
if (!String(get(record, "backendEnv.ABSTRACT_WS_URL")).includes("api.mainnet.abs.xyz/ws")) fail("backend ABSTRACT_WS_URL must point to mainnet");

if (get(record, "launchGuards.publicLaunchApproved") === true) fail("publicLaunchApproved must stay false until legal/compliance and closed beta pass");
if (get(record, "launchGuards.legalComplianceReviewed") !== true) warn("legalComplianceReviewed is not true; public launch remains blocked");
if (get(record, "launchGuards.realMoneyRewardsDisabled") !== true) fail("realMoneyRewardsDisabled must remain true before compliance approval");
if (get(record, "launchGuards.cappedInternalOnly") !== true && record.status !== "REHEARSAL_PASSED") fail("cappedInternalOnly must remain true before rehearsal passes");

const output = {
  ok: errors.length === 0,
  file: filePath,
  status: record.status,
  errors,
  warnings
};

console.log(JSON.stringify(output, null, 2));
process.exit(errors.length ? 1 : 0);
