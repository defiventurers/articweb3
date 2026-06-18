#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const DEFAULT_TEMPLATE = path.join(repoRoot, "ops/mainnet/deployment-record.template.json");
const DEFAULT_RECORD = path.join(repoRoot, "ops/mainnet/deployment-record.json");
const MAINNET_CHAIN_ID = 2741;
const DEFAULT_RPC = "https://api.mainnet.abs.xyz";
const DEFAULT_WS = "wss://api.mainnet.abs.xyz/ws";
const DEFAULT_EXPLORER = "https://abscan.org";
const DEFAULT_VERIFY = "https://api.abscan.org/api";
const ZERO = "0x0000000000000000000000000000000000000000";
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const TX_RE = /^0x[a-fA-F0-9]{64}$/;

const args = parseArgs(process.argv.slice(2));
const templatePath = path.resolve(repoRoot, args.template || DEFAULT_TEMPLATE);
const recordPath = path.resolve(repoRoot, args.record || DEFAULT_RECORD);

main();

function main() {
  const vaultAddress = requiredAddress(args.vault || process.env.MAINNET_ETH_VAULT_ADDRESS, "--vault");
  const deployTx = requiredTx(args.deployTx || process.env.MAINNET_VAULT_DEPLOY_TX, "--deployTx");
  const ownerAddress = requiredAddress(args.owner || process.env.MAINNET_VAULT_OWNER_ADDRESS, "--owner");
  const gameServerAddress = requiredAddress(args.gameServer || process.env.MAINNET_VAULT_GAME_SERVER_ADDRESS, "--gameServer");

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Missing template ${relative(templatePath)}`);
  }

  const record = fs.existsSync(recordPath)
    ? JSON.parse(fs.readFileSync(recordPath, "utf8"))
    : JSON.parse(fs.readFileSync(templatePath, "utf8"));

  const now = new Date().toISOString();
  record.schema = "artic.mainnet.deployment.v1";
  record.status = args.status || record.status || "READY_FOR_REHEARSAL";
  record.createdAt = !record.createdAt || String(record.createdAt).startsWith("YYYY") ? now : record.createdAt;
  record.updatedAt = now;

  record.release = {
    ...(record.release || {}),
    name: args.name || record.release?.name || "capped-mainnet-rehearsal-001",
    scope: args.scope || record.release?.scope || "internal-capped-rehearsal",
    frontendCommit: args.frontendCommit || process.env.FRONTEND_COMMIT || record.release?.frontendCommit || "",
    backendCommit: args.backendCommit || process.env.BACKEND_COMMIT || record.release?.backendCommit || "",
    contractCommit: args.contractCommit || process.env.CONTRACT_COMMIT || record.release?.contractCommit || "",
    operator: args.operator || record.release?.operator || "",
    reviewer: args.reviewer || record.release?.reviewer || ""
  };

  record.chain = {
    env: "mainnet",
    chainId: MAINNET_CHAIN_ID,
    rpcUrl: DEFAULT_RPC,
    wsUrl: DEFAULT_WS,
    explorerUrl: DEFAULT_EXPLORER,
    verifyApiUrl: DEFAULT_VERIFY
  };

  record.contracts = {
    ...(record.contracts || {}),
    ethVaultAddress: vaultAddress,
    deployTx,
    ownerAddress,
    gameServerAddress,
    verifiedOnExplorer: String(args.verified || record.contracts?.verifiedOnExplorer || "false") === "true",
    verificationUrl: args.verificationUrl || record.contracts?.verificationUrl || "",
    sourceCompilerVersion: args.compiler || record.contracts?.sourceCompilerVersion || "",
    constructorArgs: readConstructorArgs(args.constructorArgs || record.contracts?.constructorArgs)
  };

  record.frontendEnv = {
    ...(record.frontendEnv || {}),
    VITE_CHAIN_ENV: "mainnet",
    VITE_ABSTRACT_CHAIN_ID: "2741",
    VITE_ABSTRACT_RPC_URL: DEFAULT_RPC,
    VITE_ABSTRACT_RPC: DEFAULT_RPC,
    VITE_ABSTRACT_WS: DEFAULT_WS,
    VITE_ABSTRACT_EXPLORER_URL: DEFAULT_EXPLORER,
    VITE_ABSTRACT_EXPLORER: DEFAULT_EXPLORER,
    VITE_ABSTRACT_VERIFY_URL: DEFAULT_VERIFY,
    VITE_ETH_VAULT_ADDRESS: vaultAddress,
    VITE_ENABLE_HIGH_STAKES: "true",
    VITE_ENABLE_VAULT_DEPLOYER: "false",
    VITE_ENABLE_SETTLEMENT_ADMIN: "true"
  };

  record.backendEnv = {
    ...(record.backendEnv || {}),
    CHAIN_ENV: "mainnet",
    ABSTRACT_CHAIN_ID: "2741",
    ABSTRACT_RPC_URL: DEFAULT_RPC,
    ABSTRACT_WS_URL: DEFAULT_WS,
    ABSTRACT_EXPLORER_URL: DEFAULT_EXPLORER,
    ETH_VAULT_ADDRESS: vaultAddress,
    HIGH_STAKES_ENABLED: "true",
    ETH_INDEXER_AUTO_RUN: record.backendEnv?.ETH_INDEXER_AUTO_RUN || "true",
    ETH_INDEXER_SCHEDULED_RUN: record.backendEnv?.ETH_INDEXER_SCHEDULED_RUN || "true",
    ETH_INDEXER_HEARTBEAT: record.backendEnv?.ETH_INDEXER_HEARTBEAT || "true"
  };

  record.preflight = {
    ...(record.preflight || {}),
    backendPreflightUrl: record.preflight?.backendPreflightUrl || "https://articweb3.onrender.com/mainnet/preflight",
    lastReadiness: record.preflight?.lastReadiness || "HOLD",
    lastCheckedAt: record.preflight?.lastCheckedAt || "",
    failedGates: Array.isArray(record.preflight?.failedGates) ? record.preflight.failedGates : []
  };

  record.launchGuards = {
    ...(record.launchGuards || {}),
    publicLaunchApproved: false,
    realMoneyRewardsDisabled: true,
    cappedInternalOnly: true
  };

  record.notes = Array.isArray(record.notes) ? record.notes : [];
  record.notes.push(`Mainnet deployment record updated from public deployment values at ${now}.`);

  fs.mkdirSync(path.dirname(recordPath), { recursive: true });
  fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + "\n");

  console.log(JSON.stringify({
    ok: true,
    record: relative(recordPath),
    vaultAddress,
    deployTx,
    status: record.status,
    next: "Run node scripts/validate-mainnet-deployment.mjs ops/mainnet/deployment-record.json"
  }, null, 2));
}

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) out[key] = true;
    else {
      out[key] = next;
      index += 1;
    }
  }
  return out;
}

function requiredAddress(value, label) {
  const text = String(value || "").trim();
  if (!ADDRESS_RE.test(text) || text.toLowerCase() === ZERO.toLowerCase()) throw new Error(`${label} must be a non-zero address`);
  return toChecksumLike(text);
}

function requiredTx(value, label) {
  const text = String(value || "").trim();
  if (!TX_RE.test(text)) throw new Error(`${label} must be a 32-byte tx hash`);
  return text;
}

function toChecksumLike(value) {
  return value.slice(0, 2).toLowerCase() + value.slice(2);
}

function readConstructorArgs(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error("not array");
    return parsed;
  } catch {
    throw new Error("--constructorArgs must be a JSON array when provided");
  }
}

function relative(value) {
  return path.relative(repoRoot, value).replaceAll("\\", "/");
}
