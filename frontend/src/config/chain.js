import { isAddress } from "viem";
import { abstract, abstractTestnet } from "viem/chains";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const VALID_LAUNCH_MODES = new Set([
  "free_play",
  "testnet_lock_lab",
  "capped_mainnet_rehearsal",
  "closed_beta_mainnet",
  "public_mainnet"
]);

function envValue(name, fallback = "") {
  const value = import.meta.env[name];
  return value === undefined || value === null ? fallback : String(value).trim();
}

function requiredEnv(name) {
  const value = envValue(name);
  if (!value) throw new Error(`Missing required env variable: ${name}`);
  return value;
}

function numberEnv(name) {
  const raw = requiredEnv(name);
  const value = Number(raw);
  if (!Number.isInteger(value)) throw new Error(`Invalid numeric env variable ${name}: ${raw}`);
  return value;
}

function booleanEnv(name, fallback = false) {
  const raw = envValue(name, String(fallback)).toLowerCase();
  if (raw !== "true" && raw !== "false") throw new Error(`Invalid boolean env variable ${name}: ${raw}`);
  return raw === "true";
}

function chainEnv() {
  const value = requiredEnv("VITE_CHAIN_ENV");
  if (value !== "testnet" && value !== "mainnet") throw new Error(`Invalid VITE_CHAIN_ENV: ${value}`);
  return value;
}

function addressEnv(name, fallback = ZERO_ADDRESS) {
  const value = envValue(name, fallback);
  if (!isAddress(value)) throw new Error(`Invalid address for ${name}: ${value}`);
  return value;
}

function launchModeEnv(isMainnet) {
  const raw = envValue("VITE_APP_LAUNCH_MODE", envValue("VITE_LAUNCH_MODE", "")).toLowerCase();
  if (VALID_LAUNCH_MODES.has(raw)) return raw;
  return isMainnet ? "capped_mainnet_rehearsal" : "testnet_lock_lab";
}

export function isZeroAddress(address) {
  return String(address || "").toLowerCase() === ZERO_ADDRESS.toLowerCase();
}

const selectedChainEnv = chainEnv();
const selectedIsMainnet = selectedChainEnv === "mainnet";

export const abstractChain = selectedIsMainnet ? abstract : abstractTestnet;

export const appConfig = Object.freeze({
  chainEnv: selectedChainEnv,
  isMainnet: selectedIsMainnet,
  isTestnet: selectedChainEnv === "testnet",
  chainId: numberEnv("VITE_ABSTRACT_CHAIN_ID"),
  rpcUrl: requiredEnv("VITE_ABSTRACT_RPC"),
  wsUrl: requiredEnv("VITE_ABSTRACT_WS"),
  explorerUrl: requiredEnv("VITE_ABSTRACT_EXPLORER"),
  verifyUrl: requiredEnv("VITE_ABSTRACT_VERIFY_URL"),
  apiBaseUrl: envValue("VITE_API_BASE_URL", ""),
  lobbyWsUrl: envValue("VITE_WS_URL", "ws://localhost:10000"),
  features: Object.freeze({
    highStakes: booleanEnv("VITE_ENABLE_HIGH_STAKES", false),
    sessionKeys: booleanEnv("VITE_ENABLE_SESSION_KEYS", false),
    sponsoredTx: booleanEnv("VITE_ENABLE_SPONSORED_TX", false)
  }),
  launch: Object.freeze({
    mode: launchModeEnv(selectedIsMainnet),
    internalMainnetRehearsalEnabled: booleanEnv("VITE_INTERNAL_MAINNET_REHEARSAL_ENABLED", false),
    closedBetaMainnetEnabled: booleanEnv("VITE_CLOSED_BETA_MAINNET_ENABLED", false),
    legalPublicMainnetApproved: booleanEnv("VITE_LEGAL_PUBLIC_MAINNET_APPROVED", false) || booleanEnv("VITE_PUBLIC_MAINNET_APPROVED", false)
  }),
  contracts: Object.freeze({
    ethVault: addressEnv("VITE_ETH_VAULT_ADDRESS"),
    gameVerifier: addressEnv("VITE_GAME_VERIFIER_CONTRACT_ADDRESS"),
    token: addressEnv("VITE_TOKEN_ADDRESS"),
    tokenVault: addressEnv("VITE_VAULT_ADDRESS")
  })
});

export function assertExpectedAbstractConfig() {
  if (appConfig.isMainnet && appConfig.chainId !== 2741) throw new Error(`Mainnet build has wrong chain ID: ${appConfig.chainId}`);
  if (appConfig.isTestnet && appConfig.chainId !== 11124) throw new Error(`Testnet build has wrong chain ID: ${appConfig.chainId}`);
}

export function getLaunchModeIssue() {
  const launch = appConfig.launch;
  if (launch.mode === "free_play") return "Locked Match Lab is disabled in Free Play launch mode.";
  if (launch.mode === "testnet_lock_lab") return appConfig.isMainnet ? "Testnet Lock Lab cannot run on mainnet." : "";
  if (launch.mode === "capped_mainnet_rehearsal") {
    if (!appConfig.isMainnet) return "Capped mainnet rehearsal mode requires Abstract Mainnet.";
    if (!launch.internalMainnetRehearsalEnabled) return "Internal mainnet rehearsal is disabled by launch controls.";
    return "";
  }
  if (launch.mode === "closed_beta_mainnet") {
    if (!appConfig.isMainnet) return "Closed Beta Mainnet mode requires Abstract Mainnet.";
    if (!launch.closedBetaMainnetEnabled) return "Closed Beta Mainnet is disabled by launch controls.";
    return "";
  }
  if (launch.mode === "public_mainnet") {
    if (!appConfig.isMainnet) return "Public Mainnet mode requires Abstract Mainnet.";
    if (!launch.legalPublicMainnetApproved) return "Public Mainnet is disabled until legal/compliance approval is recorded.";
    return "";
  }
  return "Unknown launch mode.";
}

export function getHighStakesConfigIssue() {
  try {
    assertExpectedAbstractConfig();
  } catch (err) {
    return err.message || "Invalid Abstract chain configuration.";
  }

  const launchIssue = getLaunchModeIssue();
  if (launchIssue) return launchIssue;
  if (!appConfig.features.highStakes) return "Locked Match Mode is disabled for this environment.";
  if (isZeroAddress(appConfig.contracts.ethVault)) return "ETH vault contract address is not configured.";
  if (!isAddress(appConfig.contracts.ethVault)) return "ETH vault contract address is invalid.";
  if (appConfig.isMainnet && appConfig.features.sessionKeys) return "Session keys are enabled on mainnet. Disable them unless Abstract mainnet session-key approval is complete.";
  return "";
}
