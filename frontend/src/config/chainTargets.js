import { isAddress } from "viem";
import { appConfig, isZeroAddress } from "./chain.js";

export const ABSTRACT_TESTNET_USDC = "0xe4C7fBB0a626ed208021ccabA6Be1566905E2dFc";

export const TOKEN_ADDRESS = appConfig.contracts.token;
export const VAULT_ADDRESS = appConfig.contracts.tokenVault;
export const ETH_VAULT_ADDRESS = appConfig.contracts.ethVault;
export const GAME_VERIFIER_CONTRACT_ADDRESS = appConfig.contracts.gameVerifier;
export const TOKEN_DECIMALS = 6;
export const ETH_DECIMALS = 18;

export const CHAIN_TARGETS_READY =
  isAddress(TOKEN_ADDRESS) && !isZeroAddress(TOKEN_ADDRESS) &&
  isAddress(VAULT_ADDRESS) && !isZeroAddress(VAULT_ADDRESS);

export const ETH_TARGETS_READY =
  isAddress(ETH_VAULT_ADDRESS) && !isZeroAddress(ETH_VAULT_ADDRESS);
