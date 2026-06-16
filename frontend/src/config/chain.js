import { isAddress } from "viem";
import { abstract, abstractTestnet } from "viem/chains";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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

export function isZeroAddress(address) {
  return String(address || "").toLowerCase() === ZERO_ADDRESS.toLowerCase();
}

const selectedChainEnv = chainEnv();

export const abstractChain = selectedChainEnv === "mainnet" ? abstract : abstractTestnet;

export const appConfig = Object.freeze({
  chainEnv: selectedChainEnv,
  isMainnet: selectedChainEnv === "mainnet",
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

export function getHighStakesConfigIssue() {
  try {
    assertExpectedAbstractConfig();
  } catch (err) {
    return err.message || "Invalid Abstract chain configuration.";
  }

  if (!appConfig.features.highStakes) return "Locked Match Mode is disabled for this environment.";
  if (isZeroAddress(appConfig.contracts.ethVault)) return "ETH vault contract address is not configured.";
  if (!isAddress(appConfig.contracts.ethVault)) return "ETH vault contract address is invalid.";
  if (appConfig.isMainnet && appConfig.features.sessionKeys) return "Session keys are enabled on mainnet. Disable them unless Abstract mainnet session-key approval is complete.";
  return "";
}
